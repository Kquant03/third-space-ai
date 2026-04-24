// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Genealogy (§ XII extension, Stage 9.5)
//  ─────────────────────────────────────────────────────────────────────────
//  The koi_lineage table records who-begat-whom. This module operationalizes
//  it: generation assignment at hatch, ancestor queries, descendant queries,
//  and the family-tree reader that powers both the research surface and the
//  kin-imprinting path (next pass).
//
//  The LLM never reads anything in this module. Kin biology is systemic:
//  the system knows, the fish feel. What the fish feel is expressed in
//  relationship_card.valence and the forthcoming familiarity_prior field,
//  both of which this module's writes inform.
//
//  "Your mother" is a sentence this codebase will never produce.
//  "The slow one whose movement your body knows" is a sentence it can
//  make inevitable, given the right cards.
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiId, SimTick } from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Generation assignment
// ───────────────────────────────────────────────────────────────────

/** Seed cohort fish are generation 0. Every descendant is parent-max + 1. */
export function computeGenerationFromParents(
  sql: SqlStorage,
  parentAId: KoiId | null,
  parentBId: KoiId | null,
): number {
  if (!parentAId || !parentBId) return 0;  // seed cohort

  const rows = sql.exec(
    `SELECT MAX(generation) AS g FROM koi_lineage
      WHERE koi_id IN (?, ?)`,
    parentAId, parentBId,
  ).toArray();
  const g = rows[0]?.["g"];
  const parentMax = typeof g === "number" ? g : 0;
  return parentMax + 1;
}

/** Write or update a koi_lineage row. Idempotent on koi_id. */
export function writeLineageRow(
  sql: SqlStorage,
  koiId: KoiId,
  parentAId: KoiId | null,
  parentBId: KoiId | null,
  birthCohortTick: SimTick,
  generation: number,
): void {
  sql.exec(
    `INSERT INTO koi_lineage
       (koi_id, parent_a_id, parent_b_id, birth_cohort_tick, generation)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(koi_id) DO UPDATE SET
       parent_a_id = excluded.parent_a_id,
       parent_b_id = excluded.parent_b_id,
       generation = excluded.generation`,
    koiId, parentAId, parentBId, birthCohortTick, generation,
  );
}

/** Attach a name-tile artifact id to a koi's lineage row — they are
 *  carrying an inherited name-tile from an elder. */
export function attachNameTile(
  sql: SqlStorage, koiId: KoiId, nameTileArtifactId: string,
): void {
  sql.exec(
    `UPDATE koi_lineage SET name_tile_artifact_id = ? WHERE koi_id = ?`,
    nameTileArtifactId, koiId,
  );
}

// ───────────────────────────────────────────────────────────────────
//  Ancestor queries
// ───────────────────────────────────────────────────────────────────

export interface LineageRow {
  koiId: KoiId;
  parentAId: KoiId | null;
  parentBId: KoiId | null;
  generation: number;
  birthCohortTick: SimTick;
}

function rowToLineage(r: Record<string, unknown>): LineageRow {
  return {
    koiId: r["koi_id"] as string,
    parentAId: (r["parent_a_id"] as string | null) ?? null,
    parentBId: (r["parent_b_id"] as string | null) ?? null,
    generation: r["generation"] as number,
    birthCohortTick: r["birth_cohort_tick"] as number,
  };
}

/** Load a single koi's lineage row, or null if none. */
export function loadLineage(sql: SqlStorage, koiId: KoiId): LineageRow | null {
  const rows = sql.exec(
    `SELECT koi_id, parent_a_id, parent_b_id, generation, birth_cohort_tick
       FROM koi_lineage WHERE koi_id = ?`,
    koiId,
  ).toArray();
  return rows.length > 0 ? rowToLineage(rows[0]!) : null;
}

/** Return the direct parents of a koi, if any. Either or both may be null
 *  (seed cohort, or partial records). */
export function parentsOf(sql: SqlStorage, koiId: KoiId): [KoiId | null, KoiId | null] {
  const row = loadLineage(sql, koiId);
  return row ? [row.parentAId, row.parentBId] : [null, null];
}

/** Return all ancestors of a koi up to a depth limit, as a set.
 *  Depth 1 = parents, depth 2 = +grandparents, etc. Cycles are impossible
 *  (generations strictly increase) but we guard with a visited set anyway. */
export function ancestorsOf(
  sql: SqlStorage, koiId: KoiId, maxDepth = 10,
): Set<KoiId> {
  const result = new Set<KoiId>();
  let frontier: KoiId[] = [koiId];
  for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
    const next: KoiId[] = [];
    for (const id of frontier) {
      const [pa, pb] = parentsOf(sql, id);
      for (const p of [pa, pb]) {
        if (p && !result.has(p)) {
          result.add(p);
          next.push(p);
        }
      }
    }
    frontier = next;
  }
  return result;
}

/** Shortest ancestry relationship between two koi. Returns:
 *  - "self" if same id
 *  - "parent" / "child" — direct
 *  - "grandparent" / "grandchild", "great-grandparent" / "great-grandchild", …
 *  - "sibling" — share at least one parent
 *  - "cousin" — share at least one grandparent (not sibling)
 *  - "ancestor" / "descendant" — deeper relation, unspecified depth
 *  - null — no traceable shared lineage
 *
 *  This function is for research surface labels, NOT for anything the
 *  LLM sees. The LLM never reads a relationship label. */
export function kinRelation(
  sql: SqlStorage, fromId: KoiId, toId: KoiId, maxDepth = 8,
): string | null {
  if (fromId === toId) return "self";

  // Direct parent/child
  const [fa, fb] = parentsOf(sql, fromId);
  if (fa === toId || fb === toId) return "parent";
  const [ta, tb] = parentsOf(sql, toId);
  if (ta === fromId || tb === fromId) return "child";

  // Siblings (share at least one parent)
  const fromParents = new Set([fa, fb].filter(Boolean) as KoiId[]);
  const toParents = new Set([ta, tb].filter(Boolean) as KoiId[]);
  for (const p of fromParents) if (toParents.has(p)) return "sibling";

  // Grandparent / grandchild / great-* / …
  const fromAncestors = ancestorsOf(sql, fromId, maxDepth);
  if (fromAncestors.has(toId)) {
    const depth = depthTo(sql, fromId, toId, maxDepth);
    return depthLabel(depth, "ancestor");
  }
  const toAncestors = ancestorsOf(sql, toId, maxDepth);
  if (toAncestors.has(fromId)) {
    const depth = depthTo(sql, toId, fromId, maxDepth);
    return depthLabel(depth, "descendant");
  }

  // Cousin — share any ancestor
  for (const a of fromAncestors) if (toAncestors.has(a)) return "cousin";

  return null;
}

function depthTo(
  sql: SqlStorage, fromId: KoiId, targetId: KoiId, maxDepth: number,
): number {
  let frontier: KoiId[] = [fromId];
  for (let d = 1; d <= maxDepth && frontier.length > 0; d++) {
    const next: KoiId[] = [];
    for (const id of frontier) {
      const [pa, pb] = parentsOf(sql, id);
      for (const p of [pa, pb]) {
        if (p === targetId) return d;
        if (p) next.push(p);
      }
    }
    frontier = next;
  }
  return maxDepth + 1;
}

function depthLabel(depth: number, role: "ancestor" | "descendant"): string {
  if (role === "ancestor") {
    if (depth === 1) return "parent";
    if (depth === 2) return "grandparent";
    if (depth === 3) return "great-grandparent";
    if (depth === 4) return "great-great-grandparent";
    return `${role}-${depth}`;
  }
  if (depth === 1) return "child";
  if (depth === 2) return "grandchild";
  if (depth === 3) return "great-grandchild";
  if (depth === 4) return "great-great-grandchild";
  return `${role}-${depth}`;
}

// ───────────────────────────────────────────────────────────────────
//  Descendant queries
// ───────────────────────────────────────────────────────────────────

/** Direct children of a koi. */
export function childrenOf(sql: SqlStorage, koiId: KoiId): KoiId[] {
  const rows = sql.exec(
    `SELECT koi_id FROM koi_lineage
      WHERE parent_a_id = ? OR parent_b_id = ?`,
    koiId, koiId,
  ).toArray();
  return rows.map((r) => r["koi_id"] as string);
}

/** All descendants of a koi, any depth. Returned as a set. */
export function descendantsOf(
  sql: SqlStorage, koiId: KoiId, maxDepth = 10,
): Set<KoiId> {
  const result = new Set<KoiId>();
  let frontier = [koiId];
  for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
    const next: KoiId[] = [];
    for (const id of frontier) {
      for (const c of childrenOf(sql, id)) {
        if (!result.has(c)) {
          result.add(c);
          next.push(c);
        }
      }
    }
    frontier = next;
  }
  return result;
}

/** Siblings (share at least one parent, excluding self). */
export function siblingsOf(sql: SqlStorage, koiId: KoiId): KoiId[] {
  const [pa, pb] = parentsOf(sql, koiId);
  if (!pa && !pb) return [];
  const parentIds = [pa, pb].filter(Boolean) as KoiId[];
  const out = new Set<KoiId>();
  for (const p of parentIds) {
    for (const c of childrenOf(sql, p)) {
      if (c !== koiId) out.add(c);
    }
  }
  return [...out];
}

// ───────────────────────────────────────────────────────────────────
//  Research surface — the endpoint payload for /lineage
// ───────────────────────────────────────────────────────────────────

export interface LineageNode {
  koi_id: KoiId;
  parent_a_id: KoiId | null;
  parent_b_id: KoiId | null;
  generation: number;
  birth_cohort_tick: SimTick;
  child_ids: KoiId[];
}

export interface LineagePayload {
  generations: {
    /** 0 = seed cohort, 1 = first children, etc. */
    depth: number;
    count: number;
  }[];
  koi: LineageNode[];
}

/** Produce the full lineage tree for the research endpoint. Dumps every
 *  koi (alive or deceased) with their parents, generation, and children. */
export function buildLineagePayload(sql: SqlStorage): LineagePayload {
  const rows = sql.exec(
    `SELECT koi_id, parent_a_id, parent_b_id, generation, birth_cohort_tick
       FROM koi_lineage
      ORDER BY generation ASC, birth_cohort_tick ASC`,
  ).toArray();

  const byId = new Map<KoiId, LineageNode>();
  for (const r of rows) {
    const id = r["koi_id"] as string;
    byId.set(id, {
      koi_id: id,
      parent_a_id: (r["parent_a_id"] as string | null) ?? null,
      parent_b_id: (r["parent_b_id"] as string | null) ?? null,
      generation: r["generation"] as number,
      birth_cohort_tick: r["birth_cohort_tick"] as number,
      child_ids: [],
    });
  }

  // Second pass: populate children
  for (const node of byId.values()) {
    if (node.parent_a_id) {
      const pa = byId.get(node.parent_a_id);
      if (pa && !pa.child_ids.includes(node.koi_id)) {
        pa.child_ids.push(node.koi_id);
      }
    }
    if (node.parent_b_id && node.parent_b_id !== node.parent_a_id) {
      const pb = byId.get(node.parent_b_id);
      if (pb && !pb.child_ids.includes(node.koi_id)) {
        pb.child_ids.push(node.koi_id);
      }
    }
  }

  // Aggregate per-generation counts
  const perGen = new Map<number, number>();
  for (const node of byId.values()) {
    perGen.set(node.generation, (perGen.get(node.generation) ?? 0) + 1);
  }
  const generations = [...perGen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([depth, count]) => ({ depth, count }));

  return {
    generations,
    koi: [...byId.values()],
  };
}
