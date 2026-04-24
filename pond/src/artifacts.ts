// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Artifacts (§ XII + Stage 9)
//  ─────────────────────────────────────────────────────────────────────────
//  Artifacts are small objects that circulate through the colony — pebbles,
//  reed fragments, shed scales, lily petals, and the occasional name-tile
//  created when a koi dies and a survivor brings something to the shrine.
//
//  Three things make artifacts interesting rather than just objects:
//
//    1. PROVENANCE    Every transfer writes a row to artifact_provenance.
//                     The chain from originator to current-holder is
//                     queryable and constitutes the paper's hero figure
//                     (§ XV — longest chains in the longest-running colony).
//
//    2. SCARCITY      Each koi produces at most one gift per 7 sim-days
//                     (§ IX). Inventory capped at 3 items. Found materials
//                     spawn at ~0.5 items per sim-day pond-wide. Resources
//                     are genuinely finite.
//
//    3. PERSISTENCE   Artifacts survive their producer's death. A name-tile
//                     deposited for an elder remains at the shrine for all
//                     subsequent koi to perceive. Heirloom pebbles can
//                     outlive three generations.
//
//  This module is pure SQLite-and-constructors — the creation TRIGGERS
//  (gift detection, death → name-tile, offering at shrine) live elsewhere
//  and call into here.
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiId, KoiState, SimTick } from "./types.js";
import { POND } from "./constants.js";
import { Rng } from "./rng.js";

// ───────────────────────────────────────────────────────────────────
//  Types
// ───────────────────────────────────────────────────────────────────

export type ArtifactType =
  | "pebble"          // smooth stone; by far most common
  | "reed_fragment"   // broken reed tip; fragile, high wear rate
  | "snail_shell"     // small spiral; rare
  | "shed_scale"      // a koi's own sloughed scale, rare
  | "lily_petal"      // ephemeral, decays quickly
  | "name_tile"       // only made by the death ritual; sacred
  | "sky_stone";      // legendary, only from solstice-lit shelf

export type ArtifactState =
  | "held"      // carried by a koi (current_holder set)
  | "placed"    // deposited at shrine or another fixed point
  | "offered"   // placed specifically at the shrine, anonymous
  | "lost"      // dropped; can be found again
  | "hidden";   // inside the passage network, discoverable

export type ProvenanceMode =
  | "found"        // koi encountered a loose material and picked it up
  | "created"      // koi produced an artifact from materials (rare)
  | "given"        // transferred from one koi to another
  | "inherited"    // death → heir transfer
  | "offered"      // placed at the shrine
  | "lost"         // dropped, untenanted
  | "died_with"    // an artifact whose holder died and no heir qualified
  | "discovered";  // found in passage or at shrine

export interface ArtifactRow {
  id: string;
  type: ArtifactType;
  originEventId: string | null;
  createdAtTick: SimTick;
  substance: string;       // "quartz", "reed", "calcium", …
  color: string;           // hex or palette name
  wear: number;            // 0..1; rises over time
  luminosity: number;      // 0..1; sky-stones glow
  inscription: string | null;
  motifs: string[];        // semantic tags
  rarity: number;          // 0..1
  sacred: boolean;
  state: ArtifactState;
  currentHolder: KoiId | null;
  loc: { x: number; y: number; z: number } | null;
}

// ───────────────────────────────────────────────────────────────────
//  Scarcity constants (§ IX, § XII)
// ───────────────────────────────────────────────────────────────────

export const ARTIFACT_LIMITS = {
  /** Per-koi cap on gift production, in sim-days. */
  giftCooldownSimDays: 7,
  /** Max items a koi can carry. */
  maxInventoryPerKoi: 3,
  /** Pond-wide spawn rate for found materials, in items per sim-day. */
  foundMaterialSpawnRatePerDay: 0.5,
  /** Wear increment per sim-day of being held. */
  wearPerSimDay: 0.01,
  /** Wear threshold past which an artifact becomes too worn and dissolves. */
  wearDissolveThreshold: 0.95,
  /** Lily petals decay faster. */
  wearPerSimDayLilyPetal: 0.12,
} as const;

// ───────────────────────────────────────────────────────────────────
//  Material palette
//
//  Each found type has a substance, a base color, and a rarity weight.
//  Name-tiles are produced only by the death ritual and are never
//  found-material.
// ───────────────────────────────────────────────────────────────────

interface MaterialTemplate {
  type: ArtifactType;
  substance: string;
  colorPalette: readonly string[];
  motifs: readonly string[];
  rarity: number;
  weight: number;
  sacred: boolean;
}

const FOUND_MATERIALS: readonly MaterialTemplate[] = [
  {
    type: "pebble", substance: "quartz",
    colorPalette: ["#b8b2a0", "#8f8a78", "#cfcbbd", "#6f6c5e"],
    motifs: ["stone", "smooth"],
    rarity: 0.3, weight: 0.52, sacred: false,
  },
  {
    type: "reed_fragment", substance: "reed",
    colorPalette: ["#9cad62", "#76873f", "#bcc88b"],
    motifs: ["plant", "fragile"],
    rarity: 0.4, weight: 0.24, sacred: false,
  },
  {
    type: "snail_shell", substance: "calcium",
    colorPalette: ["#e6d4a8", "#c8a572", "#a17a48"],
    motifs: ["spiral", "empty-home"],
    rarity: 0.7, weight: 0.10, sacred: false,
  },
  {
    type: "lily_petal", substance: "petal",
    colorPalette: ["#f2d1e0", "#e8a7c4", "#fcecf2"],
    motifs: ["flower", "ephemeral"],
    rarity: 0.5, weight: 0.10, sacred: false,
  },
  {
    type: "shed_scale", substance: "keratin",
    colorPalette: ["#d4c08a", "#b89e5a", "#e8d8a8", "#968042"],
    motifs: ["body", "self-remnant"],
    rarity: 0.8, weight: 0.04, sacred: false,
  },
] as const;

/** Sample a material template weighted by each type's frequency. */
export function pickFoundMaterial(rng: Rng): MaterialTemplate {
  const totalWeight = FOUND_MATERIALS.reduce((a, m) => a + m.weight, 0);
  let u = rng.float() * totalWeight;
  for (const m of FOUND_MATERIALS) {
    u -= m.weight;
    if (u <= 0) return m;
  }
  return FOUND_MATERIALS[0]!;
}

/** Pick a random location in the pond where a material can plausibly rest. */
export function pickSpawnLocation(
  rng: Rng, template: MaterialTemplate,
): { x: number; y: number; z: number } {
  // Petals float near the surface; others sit on the bottom or shelf
  if (template.type === "lily_petal") {
    const ang = rng.float() * 2 * Math.PI;
    const r = rng.float() * POND.radius * 0.8;
    return { x: r * Math.cos(ang), y: -0.08, z: r * Math.sin(ang) };
  }
  // Reeds concentrate in the shelf
  if (template.type === "reed_fragment") {
    const ang = rng.float() * 2 * Math.PI;
    const r = POND.shelfRadiusMin + rng.float() *
      (POND.shelfRadiusMax - POND.shelfRadiusMin);
    return { x: r * Math.cos(ang), y: -0.35, z: r * Math.sin(ang) };
  }
  // Pebbles, shells, scales can be anywhere on the floor
  const ang = rng.float() * 2 * Math.PI;
  const r = rng.float() * POND.radius * 0.85;
  return { x: r * Math.cos(ang), y: -POND.maxDepth + 0.1, z: r * Math.sin(ang) };
}

// ───────────────────────────────────────────────────────────────────
//  Construction
// ───────────────────────────────────────────────────────────────────

export interface CreateFoundMaterialInit {
  atTick: SimTick;
  rng: Rng;
}

/** Create a found-material artifact row. Loc is already picked. */
export function createFoundMaterial(
  sql: SqlStorage,
  init: CreateFoundMaterialInit,
): ArtifactRow {
  const template = pickFoundMaterial(init.rng);
  const loc = pickSpawnLocation(init.rng, template);
  const color = template.colorPalette[
    init.rng.int(0, template.colorPalette.length)
  ] ?? "#888";
  const id = `art_${init.atTick.toString(36)}_${
    init.rng.int(0, 0xffff).toString(16).padStart(4, "0")
  }`;

  const artifact: ArtifactRow = {
    id,
    type: template.type,
    originEventId: null,
    createdAtTick: init.atTick,
    substance: template.substance,
    color,
    wear: 0,
    luminosity: 0,
    inscription: null,
    motifs: [...template.motifs],
    rarity: template.rarity,
    sacred: template.sacred,
    state: "lost",
    currentHolder: null,
    loc,
  };

  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: id, atTick: init.atTick, mode: "found",
    fromHolder: null, toHolder: null, note: "materialized",
  });
  return artifact;
}

/** Create a name-tile. Called from the death ritual in pond-do.ts.
 *  This is the only sacred artifact type and the only way for a
 *  visitor to eventually learn a dead koi's name. */
export function createNameTile(
  sql: SqlStorage,
  init: {
    atTick: SimTick;
    deceasedName: string;
    deceasedId: KoiId;
    placedByKoiId: KoiId;
    shrineLoc: { x: number; y: number; z: number };
    rng: Rng;
  },
): ArtifactRow {
  const id = `art_tile_${init.atTick.toString(36)}_${
    init.deceasedId.slice(-4)
  }`;
  const artifact: ArtifactRow = {
    id,
    type: "name_tile",
    originEventId: null,
    createdAtTick: init.atTick,
    substance: "slate",
    color: "#2a2c2e",
    wear: 0,
    luminosity: 0,
    inscription: init.deceasedName,
    motifs: ["memorial", "name", "shrine"],
    rarity: 1.0,
    sacred: true,
    state: "placed",
    currentHolder: null,
    loc: init.shrineLoc,
  };
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: id, atTick: init.atTick, mode: "created",
    fromHolder: null, toHolder: init.placedByKoiId,
    note: `for:${init.deceasedId}`,
  });
  // One provenance row for the placement itself
  writeProvenance(sql, {
    artifactId: id, atTick: init.atTick, mode: "offered",
    fromHolder: init.placedByKoiId, toHolder: null,
    note: "placed at shrine",
  });
  return artifact;
}

// ───────────────────────────────────────────────────────────────────
//  Persistence primitives
// ───────────────────────────────────────────────────────────────────

export function writeArtifactRow(sql: SqlStorage, a: ArtifactRow): void {
  sql.exec(
    `INSERT INTO artifact (
       id, type, origin_event_id, created_at_tick, substance, color,
       wear, luminosity, inscription, motifs_json, rarity, sacred,
       state, current_holder, current_loc_x, current_loc_y, current_loc_z
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state = excluded.state,
       current_holder = excluded.current_holder,
       current_loc_x = excluded.current_loc_x,
       current_loc_y = excluded.current_loc_y,
       current_loc_z = excluded.current_loc_z,
       wear = excluded.wear,
       inscription = excluded.inscription`,
    a.id, a.type, a.originEventId, a.createdAtTick, a.substance, a.color,
    a.wear, a.luminosity, a.inscription, JSON.stringify(a.motifs),
    a.rarity, a.sacred ? 1 : 0,
    a.state, a.currentHolder,
    a.loc?.x ?? null, a.loc?.y ?? null, a.loc?.z ?? null,
  );
}

export interface ProvenanceInit {
  artifactId: string;
  atTick: SimTick;
  mode: ProvenanceMode;
  fromHolder: KoiId | null;
  toHolder: KoiId | null;
  note: string | null;
}

export function writeProvenance(
  sql: SqlStorage, p: ProvenanceInit,
): void {
  sql.exec(
    `INSERT INTO artifact_provenance
       (artifact_id, at_tick, mode, from_holder, to_holder, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    p.artifactId, p.atTick, p.mode, p.fromHolder, p.toHolder, p.note,
  );
}

// ───────────────────────────────────────────────────────────────────
//  Inventory queries
// ───────────────────────────────────────────────────────────────────

export function loadHeldArtifacts(
  sql: SqlStorage, holderId: KoiId,
): ArtifactRow[] {
  const rows = sql.exec(
    `SELECT * FROM artifact WHERE state = 'held' AND current_holder = ?`,
    holderId,
  ).toArray();
  return rows.map(rowToArtifact);
}

export function countHeldBy(sql: SqlStorage, holderId: KoiId): number {
  const row = sql.exec(
    `SELECT COUNT(*) AS n FROM artifact
      WHERE state = 'held' AND current_holder = ?`,
    holderId,
  ).toArray()[0];
  return (row?.["n"] as number | undefined) ?? 0;
}

export function hasCapacity(sql: SqlStorage, holderId: KoiId): boolean {
  return countHeldBy(sql, holderId) < ARTIFACT_LIMITS.maxInventoryPerKoi;
}

export function loadNearbyLooseArtifacts(
  sql: SqlStorage, loc: { x: number; z: number }, radius: number,
): ArtifactRow[] {
  // SQLite doesn't have trig; filter loosely by bounding box then Pythagoras
  const rows = sql.exec(
    `SELECT * FROM artifact
      WHERE state IN ('lost', 'placed')
        AND current_loc_x BETWEEN ? AND ?
        AND current_loc_z BETWEEN ? AND ?`,
    loc.x - radius, loc.x + radius,
    loc.z - radius, loc.z + radius,
  ).toArray();
  const r2 = radius * radius;
  return rows
    .filter((r) => {
      const dx = (r["current_loc_x"] as number) - loc.x;
      const dz = (r["current_loc_z"] as number) - loc.z;
      return dx * dx + dz * dz <= r2;
    })
    .map(rowToArtifact);
}

/** Last gift given by this koi, in ticks. Used for cooldown gating. */
export function lastGiftGivenTick(
  sql: SqlStorage, giverId: KoiId, nowTick: SimTick,
): SimTick | null {
  const row = sql.exec(
    `SELECT MAX(at_tick) AS t FROM artifact_provenance
      WHERE mode = 'given' AND from_holder = ? AND at_tick <= ?`,
    giverId, nowTick,
  ).toArray()[0];
  const t = row?.["t"] as number | null | undefined;
  return typeof t === "number" ? t : null;
}

// ───────────────────────────────────────────────────────────────────
//  Transfers
// ───────────────────────────────────────────────────────────────────

/** Pick up a loose artifact into a koi's inventory. */
export function pickUp(
  sql: SqlStorage,
  artifact: ArtifactRow, holder: KoiId, atTick: SimTick,
): void {
  artifact.state = "held";
  artifact.currentHolder = holder;
  artifact.loc = null;
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id, atTick, mode: "found",
    fromHolder: null, toHolder: holder, note: "picked up",
  });
}

/** Transfer a held artifact from one koi to another as a gift.
 *  Assumes the giver holds it; caller should verify. */
export function transferAsGift(
  sql: SqlStorage,
  artifact: ArtifactRow, from: KoiId, to: KoiId, atTick: SimTick,
): void {
  artifact.state = "held";
  artifact.currentHolder = to;
  artifact.loc = null;
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id, atTick, mode: "given",
    fromHolder: from, toHolder: to, note: null,
  });
}

/** Transfer a held artifact as an inheritance at death. */
export function transferAsHeirloom(
  sql: SqlStorage,
  artifact: ArtifactRow, from: KoiId, to: KoiId, atTick: SimTick,
): void {
  artifact.currentHolder = to;
  artifact.state = "held";
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id, atTick, mode: "inherited",
    fromHolder: from, toHolder: to, note: "upon death",
  });
}

/** Mark an artifact as died-with (holder died, no heir qualified). It
 *  becomes placed at the holder's last known position, discoverable. */
export function markDiedWith(
  sql: SqlStorage,
  artifact: ArtifactRow,
  from: KoiId, loc: { x: number; y: number; z: number },
  atTick: SimTick,
): void {
  artifact.state = "lost";
  artifact.currentHolder = null;
  artifact.loc = loc;
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id, atTick, mode: "died_with",
    fromHolder: from, toHolder: null, note: null,
  });
}

/** Place an artifact at the shrine as an offering. Uncommitted to any
 *  holder; anyone passing can witness or (rarely) take. */
export function offerAtShrine(
  sql: SqlStorage,
  artifact: ArtifactRow, from: KoiId, atTick: SimTick,
): void {
  artifact.state = "offered";
  artifact.currentHolder = null;
  artifact.loc = { x: POND.shrine.x, y: -POND.maxDepth + 0.05, z: POND.shrine.z };
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id, atTick, mode: "offered",
    fromHolder: from, toHolder: null, note: null,
  });
}

// ───────────────────────────────────────────────────────────────────
//  Provenance chain query — the paper's hero figure material
// ───────────────────────────────────────────────────────────────────

export interface ProvenanceStep {
  atTick: SimTick;
  mode: ProvenanceMode;
  fromHolder: KoiId | null;
  toHolder: KoiId | null;
  note: string | null;
}

/** Load the full ordered provenance chain for one artifact. */
export function loadProvenanceChain(
  sql: SqlStorage, artifactId: string,
): ProvenanceStep[] {
  const rows = sql.exec(
    `SELECT at_tick, mode, from_holder, to_holder, note
       FROM artifact_provenance
      WHERE artifact_id = ?
      ORDER BY at_tick ASC, id ASC`,
    artifactId,
  ).toArray();
  return rows.map((r) => ({
    atTick: r["at_tick"] as number,
    mode: r["mode"] as ProvenanceMode,
    fromHolder: (r["from_holder"] as string | null) ?? null,
    toHolder: (r["to_holder"] as string | null) ?? null,
    note: (r["note"] as string | null) ?? null,
  }));
}

/** Chain length — counted as number of distinct holders the artifact
 *  has passed through. Used by the § XV longest-chain research metric. */
export function chainLength(chain: readonly ProvenanceStep[]): number {
  const holders = new Set<string>();
  for (const s of chain) {
    if (s.toHolder) holders.add(s.toHolder);
  }
  return holders.size;
}

// ───────────────────────────────────────────────────────────────────
//  Heir selection at death (§ IX heirloom + Stage 9 name-tile)
// ───────────────────────────────────────────────────────────────────

export interface HeirCandidate {
  koiId: KoiId;
  valence: number;
}

/**
 * Choose the heir: the survivor with the highest outgoing
 * relationship_card valence toward the deceased. Requires that valence
 * be above a threshold — if no survivor was meaningfully bonded, no
 * heir is named and the artifacts die with the elder.
 *
 * Threshold is deliberately strict (§ XII — "not every death produces
 * an artifact"). A koi who was socially peripheral dies unmarked and
 * that is correct.
 */
const HEIR_MIN_VALENCE = 0.35;

export function chooseHeir(
  sql: SqlStorage, deceasedId: KoiId, livingKoi: readonly KoiState[],
): HeirCandidate | null {
  const candidates: HeirCandidate[] = [];
  for (const k of livingKoi) {
    if (k.id === deceasedId) continue;
    if (k.stage === "egg" || k.stage === "fry") continue;    // too young
    const row = sql.exec(
      `SELECT valence FROM relationship_card
        WHERE self_id = ? AND other_id = ?`,
      k.id, deceasedId,
    ).toArray()[0];
    const valence = (row?.["valence"] as number | undefined) ?? 0;
    if (valence >= HEIR_MIN_VALENCE) {
      candidates.push({ koiId: k.id, valence });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.valence - a.valence);
  return candidates[0]!;
}

// ───────────────────────────────────────────────────────────────────
//  Row ↔ type round-trip
// ───────────────────────────────────────────────────────────────────

function rowToArtifact(r: Record<string, unknown>): ArtifactRow {
  return {
    id: r["id"] as string,
    type: r["type"] as ArtifactType,
    originEventId: (r["origin_event_id"] as string | null) ?? null,
    createdAtTick: r["created_at_tick"] as number,
    substance: r["substance"] as string,
    color: r["color"] as string,
    wear: r["wear"] as number,
    luminosity: r["luminosity"] as number,
    inscription: (r["inscription"] as string | null) ?? null,
    motifs: JSON.parse(r["motifs_json"] as string),
    rarity: r["rarity"] as number,
    sacred: (r["sacred"] as number) === 1,
    state: r["state"] as ArtifactState,
    currentHolder: (r["current_holder"] as string | null) ?? null,
    loc: r["current_loc_x"] != null
      ? {
          x: r["current_loc_x"] as number,
          y: r["current_loc_y"] as number,
          z: r["current_loc_z"] as number,
        }
      : null,
  };
}
