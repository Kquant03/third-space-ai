// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Reproduction (§ X)
//  ─────────────────────────────────────────────────────────────────────────
//  The centerpiece of the thesis and the single hardest design problem.
//
//  Reproduction is NOT a threshold on a bond counter. It is an emergent
//  consequence of both fish, independently, reflecting each twilight
//  that they are drawn to the other — and doing so on at least 3 of the
//  last 7 sim-days. The LLMs do not know about this rule. They just
//  reflect honestly, and the world responds when two honest reflections
//  have aligned over time.
//
//  This file enforces three conceptual layers cleanly:
//
//    1. DETECTION — a pure aggregation over the drawn_to_log that asks:
//       "which pairs have mutual pointings in ≥3 of the last 7 sim-days?"
//       Runs once per sim-day at a fixed phase (morning, t_day ≈ 0.05).
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
//  The kinematic bias toward the shelf when permission is active lives
//  in meditation.ts — a small scoring bump on candidates that happen to
//  trend shelfward. It is never a forced migration.
//
//  "Either fish can defect by swimming away; the condition enforces
//   only permission, not act." (§ X)
// ═══════════════════════════════════════════════════════════════════════════

import { POND, DRAWN_TO, SIM, LIFE } from "./constants.js";
import { Rng } from "./rng.js";
import type { KoiId, KoiState, SimTick, WorldState } from "./types.js";

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
export interface DrawnToLogRow {
  actor_id: string;
  target_id: string;
  sim_day: number;
}

export function countMutualDays(
  rows: readonly DrawnToLogRow[],
): Map<string, number> {
  // Build: (actor, target) → set of sim_days it appeared on
  const seen = new Map<string, Set<number>>();
  for (const r of rows) {
    const key = `${r.actor_id}→${r.target_id}`;
    let set = seen.get(key);
    if (!set) { set = new Set(); seen.set(key, set); }
    set.add(r.sim_day);
  }

  // For each pair, mutual days = intersection of days(A→B) and days(B→A)
  const mutual = new Map<string, number>();
  for (const [key, aDays] of seen.entries()) {
    const [a, b] = key.split("→") as [string, string];
    if (a >= b) continue;                  // canonical direction only
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
//  SQL — detection
//
//  Runs once per sim-day. Reads the last 7 sim-days of drawn_to_log.
//  Returns pair keys eligible for permission grant.
// ───────────────────────────────────────────────────────────────────

export interface DetectedPair {
  pairKey: string;
  aId: KoiId;
  bId: KoiId;
  mutualDays: number;
}

export function detectMutualPairs(
  sql: SqlStorage,
  nowSimDay: number,
): DetectedPair[] {
  const lowerBound = nowSimDay - DRAWN_TO.windowDays;
  const rows = sql.exec(
    `SELECT actor_id, target_id, sim_day
       FROM drawn_to_log
      WHERE sim_day > ? AND sim_day <= ?`,
    lowerBound, nowSimDay,
  ).toArray() as unknown as DrawnToLogRow[];

  const mutual = countMutualDays(rows);
  const out: DetectedPair[] = [];
  for (const [key, count] of mutual.entries()) {
    const [a, b] = splitPairKey(key);
    out.push({ pairKey: key, aId: a, bId: b, mutualDays: count });
  }
  return out;
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

/** Check cooldown: either fish spawned in last COOLDOWN_SIM_DAYS? */
function inCooldown(
  koi: Map<KoiId, KoiState>, aId: KoiId, bId: KoiId, nowTick: SimTick,
): boolean {
  const a = koi.get(aId), b = koi.get(bId);
  if (!a || !b) return true;              // missing fish => not eligible
  const cooldownTicks = DRAWN_TO.cooldownDays * TICKS_PER_SIM_DAY;
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
  sql.exec(
    `INSERT INTO reproduction_permission
       (pair_key, a_id, b_id, granted_at_tick, expires_at_tick, mutual_days)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(pair_key) DO UPDATE SET
       granted_at_tick = excluded.granted_at_tick,
       expires_at_tick = excluded.expires_at_tick,
       mutual_days = excluded.mutual_days,
       consumed_at_tick = NULL`,
    pair.pairKey, pair.aId, pair.bId, nowTick, expires, pair.mutualDays,
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
