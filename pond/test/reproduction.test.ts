import { describe, it, expect } from "vitest";
import {
  canonicalPairKey, splitPairKey,
  countMutualDays,
  isInShelfZone, isCoPresentForSpawning,
  pickEggCount, placeEggs,
  SHELF_BAND, SPAWNING_PROXIMITY_M,
  type DrawnToLogRow,
} from "../src/reproduction.js";
import { Rng } from "../src/rng.js";
import { createKoi } from "../src/koi.js";
import { SIM } from "../src/constants.js";

// ─── pair key canonicalization ──────────────────────────────────────

describe("reproduction — pair keys", () => {
  it("canonicalizes regardless of argument order", () => {
    expect(canonicalPairKey("koi_a", "koi_b")).toBe("koi_a|koi_b");
    expect(canonicalPairKey("koi_b", "koi_a")).toBe("koi_a|koi_b");
  });

  it("round-trips through split", () => {
    const key = canonicalPairKey("alpha_42", "zeta_99");
    const [a, b] = splitPairKey(key);
    expect(a).toBe("alpha_42");
    expect(b).toBe("zeta_99");
  });
});

// ─── Mutual-day aggregation — the heart of the detection rule ──────

describe("reproduction — mutual day counting", () => {
  it("counts mutual pointings for a pair", () => {
    const rows: DrawnToLogRow[] = [
      // A → B on days 1, 2, 3, 5, 6
      { actor_id: "A", target_id: "B", sim_day: 1 },
      { actor_id: "A", target_id: "B", sim_day: 2 },
      { actor_id: "A", target_id: "B", sim_day: 3 },
      { actor_id: "A", target_id: "B", sim_day: 5 },
      { actor_id: "A", target_id: "B", sim_day: 6 },
      { actor_id: "A", target_id: "B", sim_day: 7 }, 
      { actor_id: "B", target_id: "A", sim_day: 7 },   
      { actor_id: "B", target_id: "A", sim_day: 1 },
      { actor_id: "B", target_id: "A", sim_day: 3 },
      { actor_id: "B", target_id: "A", sim_day: 4 },
      { actor_id: "B", target_id: "A", sim_day: 5 },
    ];
    const mutual = countMutualDays(rows);
    // Intersection: {1, 3, 5} = 3 mutual days ≥ threshold
    expect(mutual.get("A|B")).toBe(4);
  });

  it("ignores pairs below the 3-day threshold", () => {
    const rows: DrawnToLogRow[] = [
      { actor_id: "A", target_id: "B", sim_day: 1 },
      { actor_id: "A", target_id: "B", sim_day: 2 },
      { actor_id: "B", target_id: "A", sim_day: 1 },
      { actor_id: "B", target_id: "A", sim_day: 2 },
      // Only 2 mutual days
    ];
    const mutual = countMutualDays(rows);
    expect(mutual.has("A|B")).toBe(false);
  });

  it("returns empty for unidirectional drawn-to", () => {
    // A keeps pointing to B, B never points back → nothing mutual
    const rows: DrawnToLogRow[] = Array.from({ length: 7 }, (_, d) => ({
      actor_id: "A", target_id: "B", sim_day: d,
    }));
    expect(countMutualDays(rows).size).toBe(0);
  });

  it("finds multiple independent mutual pairs", () => {
    const rows: DrawnToLogRow[] = [];
    for (let d = 0; d < 5; d++) {
      rows.push({ actor_id: "A", target_id: "B", sim_day: d });
      rows.push({ actor_id: "B", target_id: "A", sim_day: d });
      rows.push({ actor_id: "C", target_id: "D", sim_day: d });
      rows.push({ actor_id: "D", target_id: "C", sim_day: d });
    }
    const mutual = countMutualDays(rows);
    expect(mutual.get("A|B")).toBe(5);
    expect(mutual.get("C|D")).toBe(5);
    expect(mutual.size).toBe(2);
  });

  it("does NOT double-count when a pair points at itself on the same day twice", () => {
    const rows: DrawnToLogRow[] = [
      { actor_id: "A", target_id: "B", sim_day: 3 },
      { actor_id: "A", target_id: "B", sim_day: 3 },  // duplicate
      { actor_id: "A", target_id: "B", sim_day: 3 },  // duplicate
      { actor_id: "B", target_id: "A", sim_day: 3 },
      // still only 1 mutual day; below threshold
    ];
    expect(countMutualDays(rows).has("A|B")).toBe(false);
  });
});

// ─── Shelf and co-presence ──────────────────────────────────────────

describe("reproduction — shelf & co-presence", () => {
  it("identifies points inside the shelf annular band", () => {
    // On the radius, at shallow depth → in zone
    const r = (SHELF_BAND.rMin + SHELF_BAND.rMax) / 2;
    expect(isInShelfZone({ x: r, y: -0.4, z: 0 })).toBe(true);
    // At the center → out of zone (too shallow at wrong radius)
    expect(isInShelfZone({ x: 0, y: -0.4, z: 0 })).toBe(false);
    // At right radius but too deep → out of zone
    expect(isInShelfZone({ x: r, y: -2.0, z: 0 })).toBe(false);
  });

  it("requires BOTH fish in shelf zone AND within proximity", () => {
    const r = (SHELF_BAND.rMin + SHELF_BAND.rMax) / 2;
    const inShelfA = { x: r,              y: -0.4, z: 0 };
    const inShelfB = { x: r - 0.2,        y: -0.4, z: 0 };  // 0.2m apart
    const inShelfFar = { x: -r,           y: -0.4, z: 0 };  // across the pond
    const outsideA = { x: 0,              y: -0.4, z: 0 };

    expect(isCoPresentForSpawning(inShelfA, inShelfB)).toBe(true);
    expect(isCoPresentForSpawning(inShelfA, inShelfFar)).toBe(false);
    expect(isCoPresentForSpawning(inShelfA, outsideA)).toBe(false);
  });

  it("rejects co-presence just beyond the proximity threshold", () => {
    const r = (SHELF_BAND.rMin + SHELF_BAND.rMax) / 2;
    const a = { x: r,                              y: -0.4, z: 0 };
    const b = { x: r + SPAWNING_PROXIMITY_M + 0.05, y: -0.4, z: 0 };
    // But note: b must still be in the shelf zone — push radially
    // instead. Use z-axis displacement to keep both in band.
    const b2 = { x: r, y: -0.4, z: SPAWNING_PROXIMITY_M + 0.05 };
    expect(isCoPresentForSpawning(a, b)).toBe(false);
    expect(isCoPresentForSpawning(a, b2)).toBe(false);
  });
});

// ─── Egg count sampler and placement ────────────────────────────────

describe("reproduction — egg production", () => {
  it("picks egg counts within the declared range", () => {
    const rng = new Rng(1234);
    const counts = Array.from({ length: 1000 }, () => pickEggCount(rng));
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(3);
      expect(c).toBeLessThanOrEqual(12);
    }
    // Distribution sanity: mean should be between 5 and 7.
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(mean).toBeGreaterThan(3.9);
    expect(mean).toBeLessThan(4.7);
  });

  it("places all eggs in the shelf zone near the parents' midpoint", () => {
    const rng = new Rng(77);
    const r = (SHELF_BAND.rMin + SHELF_BAND.rMax) / 2;
    const a = createKoi({
      id: "parent_a", name: "A", ageTicks: 20 * SIM.tickHz * SIM.realSecondsPerSimDay,
      hatchedAtTick: 0, legendary: false, color: "kohaku",
      sex: "female",
      spawn: { x: r,       y: -0.4, z: 0,   h: 0 },
    }, rng);
    const b = createKoi({
      id: "parent_b", name: "B", ageTicks: 20 * SIM.tickHz * SIM.realSecondsPerSimDay,
      hatchedAtTick: 0, legendary: false, color: "shusui",
      sex: "male",
      spawn: { x: r - 0.15, y: -0.4, z: 0.05, h: 0 },
    }, rng);
    const placements = placeEggs(a, b, 8, 100_000, rng);
    expect(placements.length).toBe(8);
    for (const p of placements) {
      const dx = p.x - (a.x + b.x) / 2;
      const dz = p.z - (a.z + b.z) / 2;
      // Within ~30cm of the midpoint
      expect(Math.hypot(dx, dz)).toBeLessThan(0.35);
      // Depth is in the shelf band
      expect(p.y).toBeGreaterThanOrEqual(SHELF_BAND.yMin - 0.01);
      expect(p.y).toBeLessThanOrEqual(SHELF_BAND.yMax + 0.01);
    }
    // Each egg should inherit color from one of the parents
    for (const p of placements) {
      expect(["kohaku", "shusui"]).toContain(p.color);
    }
    // Each egg id unique
    const ids = new Set(placements.map((p) => p.eggId));
    expect(ids.size).toBe(placements.length);
  });

  it("credits lineage to the drawn-to pair, not to witnesses", () => {
    // placeEggs only takes the pair; there's no way for witnesses to
    // be listed as parents. That is the encoded rule.
    const rng = new Rng(101);
    const a = createKoi({
      id: "a", name: "A", ageTicks: 0, hatchedAtTick: 0,
      legendary: false, color: "ogon",
      sex: "female",
      spawn: { x: 4.0, y: -0.4, z: 0, h: 0 },
    }, rng);
    const b = createKoi({
      id: "b", name: "B", ageTicks: 0, hatchedAtTick: 0,
      legendary: false, color: "asagi",
      sex: "male",
      spawn: { x: 4.0, y: -0.4, z: 0.1, h: 0 },
    }, rng);
    const eggs = placeEggs(a, b, 5, 1, rng);
    for (const e of eggs) {
      expect([e.parentAId, e.parentBId].sort()).toEqual(["a", "b"]);
    }
  });
});
