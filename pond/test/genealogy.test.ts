import { describe, it, expect } from "vitest";
import {
  computeGenerationFromParents, writeLineageRow,
  loadLineage, parentsOf, ancestorsOf, descendantsOf,
  childrenOf, siblingsOf, kinRelation,
  buildLineagePayload,
} from "../src/genealogy.js";

// ─── Minimal stub for SqlStorage that records lineage rows ──────────
//
// Pure-function tests use an in-memory sqlite stand-in that implements
// exactly the query shapes genealogy.ts uses. No wrangler needed.

function makeSqlStub(): SqlStorage {
  // Rows: { koi_id, parent_a_id, parent_b_id, birth_cohort_tick, generation }
  const rows: Record<string, unknown>[] = [];

  const exec = (
    sql: string, ...args: unknown[]
  ): SqlStorageCursor<Record<string, SqlStorageValue>> => {
    const rowsOut: Record<string, unknown>[] = [];

    // SELECT MAX(generation) from parents
    if (sql.includes("SELECT MAX(generation)")) {
      const [a, b] = args as [string, string];
      const gens = rows
        .filter((r) => r["koi_id"] === a || r["koi_id"] === b)
        .map((r) => r["generation"] as number);
      rowsOut.push({ g: gens.length > 0 ? Math.max(...gens) : null });
    }
    // INSERT ... ON CONFLICT UPDATE for lineage
    else if (sql.includes("INSERT INTO koi_lineage")) {
      const [koi_id, parent_a_id, parent_b_id, birth_cohort_tick, generation]
        = args as [string, string | null, string | null, number, number];
      const existing = rows.findIndex((r) => r["koi_id"] === koi_id);
      const row = { koi_id, parent_a_id, parent_b_id, birth_cohort_tick, generation };
      if (existing >= 0) rows[existing] = row;
      else rows.push(row);
    }
    // SELECT loadLineage / parentsOf
    else if (sql.includes("FROM koi_lineage WHERE koi_id = ?")) {
      const [koi_id] = args as [string];
      const match = rows.find((r) => r["koi_id"] === koi_id);
      if (match) rowsOut.push(match);
    }
    // childrenOf: WHERE parent_a_id = ? OR parent_b_id = ?
    else if (sql.includes("WHERE parent_a_id = ? OR parent_b_id = ?")) {
      const [pa, pb] = args as [string, string];
      for (const r of rows) {
        if (r["parent_a_id"] === pa || r["parent_b_id"] === pb) {
          rowsOut.push({ koi_id: r["koi_id"] });
        }
      }
    }
    // buildLineagePayload — full dump
    else if (sql.includes("FROM koi_lineage\n") || sql.includes("ORDER BY generation ASC")) {
      const sorted = [...rows].sort((a, b) => {
        const dg = (a["generation"] as number) - (b["generation"] as number);
        if (dg !== 0) return dg;
        return (a["birth_cohort_tick"] as number) - (b["birth_cohort_tick"] as number);
      });
      rowsOut.push(...sorted);
    }

    return {
      toArray: () => rowsOut,
    } as unknown as SqlStorageCursor<Record<string, SqlStorageValue>>;
  };

  return { exec } as unknown as SqlStorage;
}

// ─── Generation arithmetic ──────────────────────────────────────────

describe("genealogy — computeGenerationFromParents", () => {
  it("returns 0 for seed cohort (both parents null)", () => {
    const sql = makeSqlStub();
    expect(computeGenerationFromParents(sql, null, null)).toBe(0);
  });

  it("returns 0 when one parent is null (defensive)", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    expect(computeGenerationFromParents(sql, "alpha", null)).toBe(0);
    expect(computeGenerationFromParents(sql, null, "alpha")).toBe(0);
  });

  it("returns max(parentGens) + 1 for known parents", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "beta",  null, null, 0, 0);
    expect(computeGenerationFromParents(sql, "alpha", "beta")).toBe(1);
  });

  it("elevates to next generation when parents are asymmetric", () => {
    const sql = makeSqlStub();
    // Gen 0 seed
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "beta",  null, null, 0, 0);
    // Gen 1 child
    writeLineageRow(sql, "gamma", "alpha", "beta", 100, 1);
    // Alpha (gen 0) x gamma (gen 1) → gen 2
    expect(computeGenerationFromParents(sql, "alpha", "gamma")).toBe(2);
  });
});

// ─── Lineage row roundtrip ──────────────────────────────────────────

describe("genealogy — writeLineageRow / loadLineage", () => {
  it("writes and reads a full lineage row", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    const loaded = loadLineage(sql, "alpha");
    expect(loaded).not.toBeNull();
    expect(loaded!.koiId).toBe("alpha");
    expect(loaded!.parentAId).toBeNull();
    expect(loaded!.parentBId).toBeNull();
    expect(loaded!.generation).toBe(0);
  });

  it("returns null for unknown koi", () => {
    const sql = makeSqlStub();
    expect(loadLineage(sql, "ghost")).toBeNull();
  });

  it("upsert semantics — rewrites generation on conflict", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "alpha", "parent_a", "parent_b", 100, 3);
    const loaded = loadLineage(sql, "alpha");
    expect(loaded!.generation).toBe(3);
    expect(loaded!.parentAId).toBe("parent_a");
  });
});

// ─── Parents / children / siblings ──────────────────────────────────

describe("genealogy — parentsOf / childrenOf / siblingsOf", () => {
  it("parentsOf returns [null, null] for seed and [a, b] for children", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "beta",  null, null, 0, 0);
    writeLineageRow(sql, "gamma", "alpha", "beta", 100, 1);
    expect(parentsOf(sql, "alpha")).toEqual([null, null]);
    expect(parentsOf(sql, "gamma")).toEqual(["alpha", "beta"]);
  });

  it("childrenOf lists every koi whose parent_a or parent_b matches", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "beta",  null, null, 0, 0);
    writeLineageRow(sql, "child1", "alpha", "beta", 100, 1);
    writeLineageRow(sql, "child2", "alpha", "beta", 200, 1);
    const kids = childrenOf(sql, "alpha").sort();
    expect(kids).toEqual(["child1", "child2"]);
  });

  it("siblingsOf finds fish sharing at least one parent", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "beta",  null, null, 0, 0);
    writeLineageRow(sql, "c1", "alpha", "beta", 100, 1);
    writeLineageRow(sql, "c2", "alpha", "beta", 200, 1);
    expect(siblingsOf(sql, "c1")).toEqual(["c2"]);
  });

  it("siblingsOf returns empty for seed cohort", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "alpha", null, null, 0, 0);
    writeLineageRow(sql, "beta",  null, null, 0, 0);
    expect(siblingsOf(sql, "alpha")).toEqual([]);
  });
});

// ─── Ancestors / descendants (multi-generation) ─────────────────────

describe("genealogy — ancestorsOf / descendantsOf", () => {
  function buildThreeGen(sql: SqlStorage): void {
    writeLineageRow(sql, "A", null, null, 0, 0);
    writeLineageRow(sql, "B", null, null, 0, 0);
    writeLineageRow(sql, "C", "A", "B", 100, 1);       // gen 1
    writeLineageRow(sql, "D", null, null, 0, 0);
    writeLineageRow(sql, "E", "C", "D", 200, 2);       // gen 2 (grandchild of A, B)
  }

  it("walks ancestors up to the root", () => {
    const sql = makeSqlStub();
    buildThreeGen(sql);
    const ancestors = ancestorsOf(sql, "E");
    expect(ancestors.has("C")).toBe(true);
    expect(ancestors.has("D")).toBe(true);
    expect(ancestors.has("A")).toBe(true);
    expect(ancestors.has("B")).toBe(true);
    expect(ancestors.size).toBe(4);
  });

  it("descendantsOf returns all leaves reachable", () => {
    const sql = makeSqlStub();
    buildThreeGen(sql);
    const descendants = descendantsOf(sql, "A");
    expect(descendants.has("C")).toBe(true);
    expect(descendants.has("E")).toBe(true);
    expect(descendants.size).toBe(2);
  });

  it("seed cohort has no ancestors", () => {
    const sql = makeSqlStub();
    buildThreeGen(sql);
    expect(ancestorsOf(sql, "A").size).toBe(0);
  });
});

// ─── kinRelation — the research-surface label function ──────────────

describe("genealogy — kinRelation labels", () => {
  function buildFamily(sql: SqlStorage): void {
    writeLineageRow(sql, "grandma_a", null, null, 0, 0);
    writeLineageRow(sql, "grandpa_b", null, null, 0, 0);
    writeLineageRow(sql, "mom",       "grandma_a", "grandpa_b", 100, 1);
    writeLineageRow(sql, "aunt",      "grandma_a", "grandpa_b", 110, 1);
    writeLineageRow(sql, "dad",       null, null, 0, 0);
    writeLineageRow(sql, "child",     "mom", "dad", 200, 2);
    writeLineageRow(sql, "cousin",    "aunt", null, 200, 2);
  }

  it("self relation for same id", () => {
    const sql = makeSqlStub();
    buildFamily(sql);
    expect(kinRelation(sql, "child", "child")).toBe("self");
  });

  it("parent / child", () => {
    const sql = makeSqlStub();
    buildFamily(sql);
    expect(kinRelation(sql, "child", "mom")).toBe("parent");
    expect(kinRelation(sql, "mom",   "child")).toBe("child");
  });

  it("sibling detection (shared parent)", () => {
    const sql = makeSqlStub();
    buildFamily(sql);
    expect(kinRelation(sql, "mom", "aunt")).toBe("sibling");
  });

  it("grandparent / grandchild", () => {
    const sql = makeSqlStub();
    buildFamily(sql);
    expect(kinRelation(sql, "child", "grandma_a")).toBe("grandparent");
    expect(kinRelation(sql, "grandma_a", "child")).toBe("grandchild");
  });

  it("cousin relation (share grandparent, not sibling)", () => {
    const sql = makeSqlStub();
    buildFamily(sql);
    expect(kinRelation(sql, "child", "cousin")).toBe("cousin");
  });

  it("null for entirely unrelated koi", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "stranger_a", null, null, 0, 0);
    writeLineageRow(sql, "stranger_b", null, null, 0, 0);
    expect(kinRelation(sql, "stranger_a", "stranger_b")).toBeNull();
  });
});

// ─── Lineage payload structure ──────────────────────────────────────

describe("genealogy — buildLineagePayload", () => {
  it("produces per-generation counts correctly", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "A", null, null, 0, 0);
    writeLineageRow(sql, "B", null, null, 0, 0);
    writeLineageRow(sql, "C", "A", "B", 100, 1);
    writeLineageRow(sql, "D", "A", "B", 150, 1);
    writeLineageRow(sql, "E", "C", "D", 300, 2);
    const payload = buildLineagePayload(sql);
    const gens = payload.generations;
    expect(gens.find((g) => g.depth === 0)?.count).toBe(2);
    expect(gens.find((g) => g.depth === 1)?.count).toBe(2);
    expect(gens.find((g) => g.depth === 2)?.count).toBe(1);
  });

  it("populates child_ids on parent nodes", () => {
    const sql = makeSqlStub();
    writeLineageRow(sql, "A", null, null, 0, 0);
    writeLineageRow(sql, "B", null, null, 0, 0);
    writeLineageRow(sql, "C", "A", "B", 100, 1);
    writeLineageRow(sql, "D", "A", "B", 150, 1);
    const payload = buildLineagePayload(sql);
    const nodeA = payload.koi.find((n) => n.koi_id === "A");
    expect(nodeA?.child_ids.sort()).toEqual(["C", "D"]);
  });

  it("deduplicates children when parent_a = parent_b (pathological)", () => {
    // Shouldn't happen in practice but the code guards against double-adding
    const sql = makeSqlStub();
    writeLineageRow(sql, "A", null, null, 0, 0);
    writeLineageRow(sql, "C", "A", "A", 100, 1);
    const payload = buildLineagePayload(sql);
    const nodeA = payload.koi.find((n) => n.koi_id === "A");
    expect(nodeA?.child_ids).toEqual(["C"]);
  });
});
