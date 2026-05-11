// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Reproduction (§ X)
//  ─────────────────────────────────────────────────────────────────────────
//  The centerpiece of the thesis and the single hardest design problem.
//
//  Reproduction gates on **bond intensity** — a scalar ∈ [0, 1] derived
//  from the relationship card via mechanisms/bond.ts, accumulating
//  through proximity, witnessing, and survived events together. Two
//  beings are reproduction-eligible when both directions of their card
//  pair (a→b and b→a) clear BOND.reproductionThreshold. The LLMs do
//  not know about this rule. They reflect honestly each twilight; the
//  cards consolidate; the world responds when bond has formed.
//
//  This file enforces three conceptual layers cleanly:
//
//    1. DETECTION — `detectBondedPairs` scans relationship cards among
//       living mature koi and returns those whose bidirectional bond
//       intensity clears threshold. Runs once per sim-day at the
//       morning boundary (t_day ≈ 0.05). Replaces the earlier 3-of-7
//       drawn-to scan over `drawn_to_log`.
//
//    2. PERMISSION — a row in `reproduction_permission` granted to each
//       detected pair, valid for 2 sim-days. Permission is NOT an
//       instruction. The fish may still drift apart. If they don't
//       happen to converge at the shelf within the permission window,
//       the permission expires and nothing happens.
//
//    3. SPAWNING — fires at the tick when both permitted fish are
//       simultaneously within SPAWNING_PROXIMITY of each other AND
//       within the shelf zone. Additional adult koi nearby at that
//       tick are logged as co-present witnesses (biology is chaotic)
//       but only the primary pair receives lineage credit.
//
//  Density gate: BOND.populationGate caps the alive count at which new
//  permissions can be granted. The pond runs sparse on purpose — too
//  many beings flatten the relational topology.
//
//  The kinematic bias toward the shelf when permission is active lives
//  in meditation.ts — a small scoring bump on candidates that happen to
//  trend shelfward. It is never a forced migration.
//
//  "Either fish can defect by swimming away; the condition enforces
//   only permission, not act." (§ X)
//
//  Historical note: `DRAWN_TO`, `DrawnToLogRow`, and `countMutualDays`
//  are deprecated and retained briefly for back-compat / migration.
//  `drawn_to_log` continues to be written by twilight reflection (it
//  feeds RelationshipCard.drawnCount7d, which contributes to the
//  card's overall valence trajectory) — but reproduction no longer
//  reads from it. Remove DRAWN_TO and the deprecated helpers when no
//  caller remains.
// ═══════════════════════════════════════════════════════════════════════════

import { POND, BOND, DRAWN_TO, SIM, LIFE } from "./constants.js";
import { Rng } from "./rng.js";
import type { KoiId, KoiState, RelationshipCard, SimTick, WorldState } from "./types.js";
import { bondIntensity, isMutuallyBonded } from "./mechanisms/bond.js";

// ───────────────────────────────────────────────────────────────────
//  Constants — all derived from DRAWN_TO + geometry
// ───────────────────────────────────────────────────────────────────

/** A permitted pair has this many sim-days before permission lapses. */
export const PERMISSION_LIFETIME_SIM_DAYS = 2;

/** Both fish must be within this many meters of each other for the
 *  spawning moment to fire. */
export const SPAWNING_PROXIMITY_M = 0.4;

/** Eggs are laid within this radial band — the shallow vegetated shelf
 *  from § XI. Matches POND.shelfRadiusMin/Max. */
export const SHELF_BAND = {
  rMin: POND.shelfRadiusMin,
  rMax: POND.shelfRadiusMax,
  yMin: -0.6,     // shallow
  yMax: -0.3,
};

/** Eggs per spawning — weighted toward 3-4, rare 8-10. Real koi lay
 *  far more but the pond is small and deliberately sparse. (§ X)
 *
 *  Rebalanced April 2026: old weights produced too many large clutches
 *  for a 5-6 steady-state pond. New distribution: ~65% of spawnings
 *  yield 3-4 eggs, ~30% yield 5-6, ~5% yield a rare bumper cohort of
 *  8-10. With ~2% fry mortality, average survival is ~1-2 per spawning
 *  which, at one spawning per 10-14 sim-days, matches the target rate. */
const EGG_COUNT_WEIGHTS: ReadonlyArray<[number, number]> = [
  [3, 0.35], [4, 0.30], [5, 0.18], [6, 0.12],
  [8, 0.04], [10, 0.01],
];

/** Additional adults counted as co-present witnesses during spawning. */
export const WITNESS_PROXIMITY_M = 1.0;

/** Eggs hatch after this many sim-seconds. 1 sim-day ≈ 2700 real sec. */
export const EGG_HATCH_SIM_SECONDS = 1.2 * SIM.realSecondsPerSimDay;

// ───────────────────────────────────────────────────────────────────
//  Pure helpers — testable without DO context
// ───────────────────────────────────────────────────────────────────

/**
 * Canonical pair key — `"lo|hi"` where lo < hi lexicographically.
 * Ensures we don't double-insert permission rows for (A,B) and (B,A).
 */
export function canonicalPairKey(a: KoiId, b: KoiId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Parse back — useful when loading permission rows. */
export function splitPairKey(key: string): [KoiId, KoiId] {
  const parts = key.split("|");
  if (parts.length !== 2) throw new Error(`bad pair key: ${key}`);
  return [parts[0]!, parts[1]!];
}

/**
 * Is this fish currently inside the spawning shelf band?
 * Shelf = shallow annular ring, the vegetated shallows of § XI.
 */
export function isInShelfZone(k: { x: number; y: number; z: number }): boolean {
  const r = Math.hypot(k.x, k.z);
  return r >= SHELF_BAND.rMin && r <= SHELF_BAND.rMax &&
         k.y >= SHELF_BAND.yMin && k.y <= SHELF_BAND.yMax;
}

/** Are A and B co-present at the shelf right now? */
export function isCoPresentForSpawning(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): boolean {
  if (!isInShelfZone(a) || !isInShelfZone(b)) return false;
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.hypot(dx, dz) <= SPAWNING_PROXIMITY_M;
}

/** Sample an egg count from the weighted distribution. */
export function pickEggCount(rng: Rng): number {
  const u = rng.float();
  let acc = 0;
  for (const [n, w] of EGG_COUNT_WEIGHTS) {
    acc += w;
    if (u < acc) return n;
  }
  return 5;
}

/**
 * Pure aggregation: given rows from `drawn_to_log` within the
 * [nowSimDay - 7, nowSimDay) window, count mutual days per pair.
 *
 * Returns a Map from canonical pair-key → mutual-day count.
 */
/**
 * @deprecated Drawn-to log row shape. The drawn_to_log table still
 * exists and is still written by twilight reflection (it feeds
 * RelationshipCard.drawnCount7d), but reproduction no longer reads
 * from it. Retained for migration compatibility.
 */
export interface DrawnToLogRow {
  actor_id: string;
  target_id: string;
  sim_day: number;
}

/**
 * @deprecated Counts mutual days from a flat drawn_to_log row list.
 * Replaced by bond-intensity detection in `detectBondedPairs`.
 * Retained briefly so any migration code or analytics can still
 * read the old signal until it's fully retired.
 */
export function countMutualDays(
  rows: readonly DrawnToLogRow[],
): Map<string, number> {
  const seen = new Map<string, Set<number>>();
  for (const r of rows) {
    const key = `${r.actor_id}→${r.target_id}`;
    let set = seen.get(key);
    if (!set) { set = new Set(); seen.set(key, set); }
    set.add(r.sim_day);
  }

  const mutual = new Map<string, number>();
  for (const [key, aDays] of seen.entries()) {
    const [a, b] = key.split("→") as [string, string];
    if (a >= b) continue;
    const bDays = seen.get(`${b}→${a}`);
    if (!bDays) continue;
    let count = 0;
    for (const d of aDays) if (bDays.has(d)) count++;
    if (count >= DRAWN_TO.minDaysOfMutualInLast7) {
      mutual.set(canonicalPairKey(a, b), count);
    }
  }
  return mutual;
}

// ───────────────────────────────────────────────────────────────────
//  SQL — bond-based detection
//
//  Runs once per sim-day at the morning boundary. Loads the relevant
//  cards in a single query, filters mature/alive candidates, and
//  returns the pairs whose bidirectional bond intensity clears
//  BOND.reproductionThreshold.
// ───────────────────────────────────────────────────────────────────

export interface DetectedPair {
  pairKey: string;
  aId: KoiId;
  bId: KoiId;
  /** Bond intensity from a's card toward b. */
  bondIntensityAB: number;
  /** Bond intensity from b's card toward a. */
  bondIntensityBA: number;
}

/**
 * Map a relationship_card row (snake_case SQL) to the subset of
 * RelationshipCard fields bondIntensity actually reads. Inline rather
 * than a full row→card mapper because we don't need the LLM-authored
 * fields here, just the structural ones bond intensity weighs.
 */
function rowToBondCard(row: Record<string, unknown>): RelationshipCard {
  return {
    selfId: row["self_id"] as string,
    otherId: row["other_id"] as string,
    firstEncounterTick: (row["first_encounter_tick"] as number) ?? 0,
    interactionCount: (row["interaction_count"] as number) ?? 0,
    valence: (row["valence"] as number) ?? 0,
    valenceTrajectory7d: [],
    dominance: (row["dominance"] as number) ?? 0,
    trust: (row["trust"] as number) ?? 0,
    summary: (row["summary"] as string) ?? "",
    notableMemoryIds: [],
    drawnCount7d: (row["drawn_count_7d"] as number) ?? 0,
    lastAuthoredTick: (row["last_authored_tick"] as number) ?? 0,
    familiarityPrior: (row["familiarity_prior"] as number) ?? 0,
  };
}

/**
 * Detect pairs whose bidirectional bond intensity clears the
 * reproduction threshold. Replaces `detectMutualPairs`.
 *
 * Returns one entry per unordered pair (a < b lexicographically).
 * Only mature koi (adolescent / adult / elder) are candidates;
 * fry/juveniles and eggs are excluded at the SQL filter.
 *
 * Witnessing density is currently 0 in the bond formula — see
 * mechanisms/bond.ts for why. When the twilight-reflection pass
 * computes and stores `witnessingDensity7d` on the card, this
 * function should pass it to `bondIntensity` / `isMutuallyBonded`.
 */
export function detectBondedPairs(
  sql: SqlStorage,
  koi: readonly KoiState[],
): DetectedPair[] {
  const matureStages = new Set(["adolescent", "adult", "elder"]);
  const candidates = koi.filter((k) => matureStages.has(k.stage));
  if (candidates.length < 2) return [];

  const ids = candidates.map((k) => k.id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = sql.exec(
    `SELECT * FROM relationship_card
       WHERE self_id IN (${placeholders})
         AND other_id IN (${placeholders})`,
    ...ids, ...ids,
  ).toArray() as unknown as Record<string, unknown>[];

  // Build directional card map: "selfId→otherId" → card.
  const cardByDir = new Map<string, RelationshipCard>();
  for (const row of rows) {
    const card = rowToBondCard(row);
    cardByDir.set(`${card.selfId}→${card.otherId}`, card);
  }

  const out: DetectedPair[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const aId = candidates[i]!.id;
      const bId = candidates[j]!.id;
      const cardAB = cardByDir.get(`${aId}→${bId}`);
      const cardBA = cardByDir.get(`${bId}→${aId}`);
      if (!cardAB || !cardBA) continue;
      if (!isMutuallyBonded(cardAB, cardBA)) continue;
      out.push({
        pairKey: canonicalPairKey(aId, bId),
        aId, bId,
        bondIntensityAB: bondIntensity(cardAB),
        bondIntensityBA: bondIntensity(cardBA),
      });
    }
  }
  return out;
}

/**
 * @deprecated Use `detectBondedPairs` instead. This shim accepts the
 * same call signature pond-do.ts had pre-cleanup but routes through
 * the new bond detection. The `nowSimDay` parameter is ignored. Kept
 * one revision for migration; remove once all call sites switch.
 */
export function detectMutualPairs(
  sql: SqlStorage,
  _nowSimDay: number,
  koi?: readonly KoiState[],
): DetectedPair[] {
  if (!koi) {
    // Without the koi list we can't run bond detection. Old call sites
    // must add the koi argument; until they do, return empty so we
    // fail-safe rather than fall back to drawn-to scan.
    return [];
  }
  return detectBondedPairs(sql, koi);
}

// ───────────────────────────────────────────────────────────────────
//  SQL — permission lifecycle
// ───────────────────────────────────────────────────────────────────

export interface ActivePermission {
  pairKey: string;
  aId: KoiId;
  bId: KoiId;
  grantedAtTick: SimTick;
  expiresAtTick: SimTick;
}

const TICKS_PER_SIM_DAY = SIM.tickHz * SIM.realSecondsPerSimDay;

/**
 * Create the permission table. Called by the DO as part of schema setup.
 * The schema.sql file holds the canonical DDL; this is the
 * programmatically-applied mirror. (See schema.ts note on in-code DDL.)
 */
export const REPRODUCTION_DDL = `
CREATE TABLE IF NOT EXISTS reproduction_permission (
  pair_key         TEXT PRIMARY KEY,
  a_id             TEXT NOT NULL,
  b_id             TEXT NOT NULL,
  granted_at_tick  INTEGER NOT NULL,
  expires_at_tick  INTEGER NOT NULL,
  consumed_at_tick INTEGER,
  -- Repurposed May 2026 from "drawn-to mutual day count" to bond
  -- strength × 100 (rounded). Column name retained for migration
  -- compat; semantic is now "average of bondIntensityAB and
  -- bondIntensityBA at grant time, scaled to integer percent."
  -- Rename to bond_strength_x100 in next schema migration.
  mutual_days      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_permission_active
  ON reproduction_permission(consumed_at_tick, expires_at_tick);
`;

/** Load all permissions that are not yet consumed and not yet expired. */
export function loadActivePermissions(
  sql: SqlStorage, nowTick: SimTick,
): ActivePermission[] {
  const rows = sql.exec(
    `SELECT pair_key, a_id, b_id, granted_at_tick, expires_at_tick
       FROM reproduction_permission
      WHERE consumed_at_tick IS NULL
        AND expires_at_tick > ?`,
    nowTick,
  ).toArray();
  return rows.map((r) => ({
    pairKey: r["pair_key"] as string,
    aId: r["a_id"] as KoiId,
    bId: r["b_id"] as KoiId,
    grantedAtTick: r["granted_at_tick"] as number,
    expiresAtTick: r["expires_at_tick"] as number,
  }));
}

/** Test whether a pair already has an active (unconsumed, unexpired)
 *  permission. Called before grant to avoid duplicates. */
export function hasActivePermission(
  sql: SqlStorage, pairKey: string, nowTick: SimTick,
): boolean {
  const rows = sql.exec(
    `SELECT 1 FROM reproduction_permission
      WHERE pair_key = ? AND consumed_at_tick IS NULL AND expires_at_tick > ?
      LIMIT 1`,
    pairKey, nowTick,
  ).toArray();
  return rows.length > 0;
}

/** Check cooldown: either fish spawned in last BOND.postSpawningCooldownDays? */
function inCooldown(
  koi: Map<KoiId, KoiState>, aId: KoiId, bId: KoiId, nowTick: SimTick,
): boolean {
  const a = koi.get(aId), b = koi.get(bId);
  if (!a || !b) return true;              // missing fish => not eligible
  const cooldownTicks = BOND.postSpawningCooldownDays * TICKS_PER_SIM_DAY;
  if (nowTick - a.lastSpawningTick < cooldownTicks) return true;
  if (nowTick - b.lastSpawningTick < cooldownTicks) return true;
  return false;
}

/**
 * Filter detected pairs down to those that can actually receive
 * permission right now. Returns the eligible list.
 *
 * Filters:
 *   - season is spring
 *   - alive count below BOND.populationGate (density gate)
 *   - both fish alive (present in the koi map)
 *   - both at least adolescent (no fry reproduction; biology)
 *   - neither in cooldown from a recent spawning
 *   - no active permission already exists for this pair
 */
export function filterEligible(
  sql: SqlStorage,
  detected: readonly DetectedPair[],
  world: WorldState,
  koi: readonly KoiState[],
  nowTick: SimTick,
): DetectedPair[] {
  if (world.season !== "spring") return [];

  // Population gate — the pond runs sparse on purpose. When the alive
  // count is at or above the gate, no new permissions are granted; the
  // existing colony plays out without further reproduction until
  // attrition reopens the gate. (Stage transitions out of "egg" count
  // toward the cap so we don't issue permissions that would push us
  // past the gate by hatch time.)
  const aliveCount = koi.filter((k) => k.stage !== "dead" && k.stage !== "dying").length;
  if (aliveCount >= BOND.populationGate) return [];

  const koiById = new Map(koi.map((k) => [k.id, k]));
  const matureStages = new Set(["adolescent", "adult", "elder"]);

  return detected.filter((p) => {
    const a = koiById.get(p.aId);
    const b = koiById.get(p.bId);
    if (!a || !b) return false;
    if (!matureStages.has(a.stage)) return false;
    if (!matureStages.has(b.stage)) return false;
    if (inCooldown(koiById, p.aId, p.bId, nowTick)) return false;
    if (hasActivePermission(sql, p.pairKey, nowTick)) return false;
    return true;
  });
}

/** Grant a permission. Idempotent on pair_key — re-grants extend the expiry. */
export function grantPermission(
  sql: SqlStorage, pair: DetectedPair, nowTick: SimTick,
): void {
  const expires = nowTick + PERMISSION_LIFETIME_SIM_DAYS * TICKS_PER_SIM_DAY;
  // Repurposed mutual_days column: now stores bond strength × 100
  // (rounded), averaged across the two directions. See DDL comment.
  const bondStrengthX100 = Math.round(
    (pair.bondIntensityAB + pair.bondIntensityBA) * 50,
  );
  sql.exec(
    `INSERT INTO reproduction_permission
       (pair_key, a_id, b_id, granted_at_tick, expires_at_tick, mutual_days)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(pair_key) DO UPDATE SET
       granted_at_tick = excluded.granted_at_tick,
       expires_at_tick = excluded.expires_at_tick,
       mutual_days = excluded.mutual_days,
       consumed_at_tick = NULL`,
    pair.pairKey, pair.aId, pair.bId, nowTick, expires, bondStrengthX100,
  );
}

/** Mark a permission consumed at the spawning moment. */
export function consumePermission(
  sql: SqlStorage, pairKey: string, nowTick: SimTick,
): void {
  sql.exec(
    `UPDATE reproduction_permission
        SET consumed_at_tick = ?
      WHERE pair_key = ?`,
    nowTick, pairKey,
  );
}

/** Find witnesses — nearby adults who are not in the primary pair. */
export function findWitnesses(
  koi: readonly KoiState[], aId: KoiId, bId: KoiId,
): KoiState[] {
  const pair = new Set([aId, bId]);
  const a = koi.find((k) => k.id === aId);
  if (!a) return [];
  const matureStages = new Set(["adolescent", "adult", "elder"]);
  return koi.filter((k) => {
    if (pair.has(k.id)) return false;
    if (!matureStages.has(k.stage)) return false;
    const d = Math.hypot(k.x - a.x, k.z - a.z);
    return d <= WITNESS_PROXIMITY_M;
  });
}

// ───────────────────────────────────────────────────────────────────
//  Egg placement
//
//  Eggs are placed in a tight cluster on the shelf near where the
//  pair converged, with small positional jitter. Each egg gets an
//  independent legendary roll and a color drawn from either parent's
//  line (50/50). The koi_lineage row is inserted separately by the
//  caller (in pond-do.ts) so that the event schema stays in one place.
// ───────────────────────────────────────────────────────────────────

export interface EggPlacement {
  eggId: KoiId;
  parentAId: KoiId;
  parentBId: KoiId;
  x: number; y: number; z: number;
  legendary: boolean;
  color: string;
}

export function placeEggs(
  a: KoiState, b: KoiState,
  count: number, atTick: SimTick,
  rng: Rng,
): EggPlacement[] {
  const cx = (a.x + b.x) / 2;
  const cz = (a.z + b.z) / 2;
  const out: EggPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const ang = rng.float() * Math.PI * 2;
    const r = 0.08 + rng.float() * 0.22;
    const x = cx + r * Math.cos(ang);
    const z = cz + r * Math.sin(ang);
    const y = SHELF_BAND.yMin + (SHELF_BAND.yMax - SHELF_BAND.yMin) * rng.float();
    const legendary = rng.chance(LIFE.legendaryRate);
    const color = rng.chance(0.5) ? a.color : b.color;
    out.push({
      eggId: eggIdFor(atTick, i, rng),
      parentAId: a.id, parentBId: b.id,
      x, y, z, legendary, color,
    });
  }
  return out;
}

function eggIdFor(atTick: SimTick, i: number, rng: Rng): KoiId {
  // Short, stable, sortable.
  const rand = rng.int(0, 0xffff).toString(16).padStart(4, "0");
  return `koi_e${atTick.toString(36)}_${i.toString(16)}_${rand}`;
}
