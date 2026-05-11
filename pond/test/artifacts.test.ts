import { describe, it, expect } from "vitest";
import {
  pickFoundMaterial, pickSpawnLocation,
  chainLength, chooseHeir,
  type ProvenanceStep,
} from "../src/artifacts.js";
import { Rng } from "../src/rng.js";
import { POND, SIM } from "../src/constants.js";
import { createKoi } from "../src/koi.js";
import type { KoiState } from "../src/types.js";

// ─── Material distribution ──────────────────────────────────────────

describe("artifacts — material distribution", () => {
  it("produces every declared material type over enough samples", () => {
    const rng = new Rng(42);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const m = pickFoundMaterial(rng);
      counts[m.type] = (counts[m.type] ?? 0) + 1;
    }
    expect(counts["pebble"]).toBeGreaterThan(800);  // weight 0.52
    expect(counts["reed_fragment"]).toBeGreaterThan(300);  // weight 0.24
    expect(counts["snail_shell"]).toBeGreaterThan(100);  // weight 0.10
    expect(counts["lily_petal"]).toBeGreaterThan(100);
    expect(counts["shed_scale"]).toBeGreaterThan(30);     // weight 0.04
  });

  it("is deterministic given a fixed seed", () => {
    const run = (seed: number) => {
      const rng = new Rng(seed);
      return Array.from({ length: 20 }, () => pickFoundMaterial(rng).type);
    };
    expect(run(77)).toEqual(run(77));
  });

  it("never produces name_tile as a found material", () => {
    const rng = new Rng(1);
    for (let i = 0; i < 500; i++) {
      expect(pickFoundMaterial(rng).type).not.toBe("name_tile");
      expect(pickFoundMaterial(rng).type).not.toBe("sky_stone");
    }
  });
});

// ─── Spawn locations respect material biology ─────────────────────

describe("artifacts — spawn locations", () => {
  it("places lily petals near the surface", () => {
    const rng = new Rng(5);
    const template = { type: "lily_petal" as const,
      substance: "petal", colorPalette: ["#fff"],
      motifs: [], rarity: 0.5, weight: 0.1, sacred: false };
    for (let i = 0; i < 50; i++) {
      const loc = pickSpawnLocation(rng, template);
      // Petals at -0.08 — essentially on the surface
      expect(Math.abs(loc.y - (-0.08))).toBeLessThan(0.01);
    }
  });

  it("places reed fragments on the shelf band", () => {
    const rng = new Rng(11);
    const template = { type: "reed_fragment" as const,
      substance: "reed", colorPalette: ["#fff"],
      motifs: [], rarity: 0.4, weight: 0.24, sacred: false };
    for (let i = 0; i < 50; i++) {
      const loc = pickSpawnLocation(rng, template);
      const r = Math.hypot(loc.x, loc.z);
      // Shelf radial band is [rMin, rMax]
      expect(r).toBeGreaterThanOrEqual(POND.shelfRadiusMin - 0.01);
      expect(r).toBeLessThanOrEqual(POND.shelfRadiusMax + 0.01);
    }
  });

  it("places floor items on the floor and within the pond radius", () => {
    const rng = new Rng(17);
    const template = { type: "pebble" as const,
      substance: "quartz", colorPalette: ["#fff"],
      motifs: [], rarity: 0.3, weight: 0.52, sacred: false };
    for (let i = 0; i < 50; i++) {
      const loc = pickSpawnLocation(rng, template);
      // y should be near the floor — below surface
      expect(loc.y).toBeLessThan(-2.5);
      // Radial position should be within 85% of pond radius
      expect(Math.hypot(loc.x, loc.z)).toBeLessThanOrEqual(POND.radius * 0.85 + 0.01);
    }
  });
});

// ─── Provenance chain semantics ────────────────────────────────────

describe("artifacts — provenance chain length", () => {
  it("counts unique holders in a linear chain", () => {
    const chain: ProvenanceStep[] = [
      { atTick: 0,   mode: "found",     fromHolder: null,  toHolder: "alpha", note: null },
      { atTick: 100, mode: "given",     fromHolder: "alpha", toHolder: "beta",  note: null },
      { atTick: 200, mode: "given",     fromHolder: "beta",  toHolder: "gamma", note: null },
    ];
    expect(chainLength(chain)).toBe(3);
  });

  it("deduplicates when a holder receives the same artifact twice", () => {
    const chain: ProvenanceStep[] = [
      { atTick: 0,   mode: "found", fromHolder: null,   toHolder: "alpha", note: null },
      { atTick: 100, mode: "given", fromHolder: "alpha",toHolder: "beta",  note: null },
      { atTick: 200, mode: "given", fromHolder: "beta", toHolder: "alpha", note: null },  // boomerang
    ];
    expect(chainLength(chain)).toBe(2);
  });

  it("ignores steps that have no new holder (lost, offered)", () => {
    const chain: ProvenanceStep[] = [
      { atTick: 0,   mode: "found",    fromHolder: null,   toHolder: "alpha", note: null },
      { atTick: 100, mode: "offered",  fromHolder: "alpha",toHolder: null,    note: null },
    ];
    expect(chainLength(chain)).toBe(1);
  });

  it("counts zero for an entirely lost chain", () => {
    const chain: ProvenanceStep[] = [
      { atTick: 0, mode: "found", fromHolder: null, toHolder: null, note: "materialized" },
    ];
    expect(chainLength(chain)).toBe(0);
  });
});

// ─── Heir selection ────────────────────────────────────────────────

/** Minimal SqlStorage stub that returns canned relationship_card rows. */
function stubSqlWithCards(cards: Record<string, number>): SqlStorage {
  return {
    exec: (sql: string, ...args: unknown[]): SqlStorageCursor<Record<string, SqlStorageValue>> => {
      if (sql.includes("SELECT valence FROM relationship_card")) {
        const self = args[0] as string;
        const other = args[1] as string;
        const v = cards[`${self}→${other}`];
        const rows = v != null ? [{ valence: v }] : [];
        return { toArray: () => rows } as unknown as SqlStorageCursor<Record<string, SqlStorageValue>>;
      }
      return { toArray: () => [] } as unknown as SqlStorageCursor<Record<string, SqlStorageValue>>;
    },
  } as unknown as SqlStorage;
}

const ADULT_AGE = 15 * SIM.realSecondsPerSimDay * SIM.tickHz;

function adult(id: string, overrides: Partial<KoiState> = {}): KoiState {
  const k = createKoi({
    id, name: id, ageTicks: ADULT_AGE,
    hatchedAtTick: 0, legendary: false, color: "kohaku",
    spawn: { x: 0, y: -1.2, z: 0, h: 0 },
    sex: "female"
  }, new Rng(id.charCodeAt(0)));
  return { ...k, ...overrides };
}

describe("artifacts — heir selection", () => {
  it("picks the single most-bonded survivor", () => {
    const sql = stubSqlWithCards({
      "beta→alpha": 0.8,
      "gamma→alpha": 0.4,
      "delta→alpha": 0.2,  // below threshold
    });
    const heir = chooseHeir(sql, "alpha", [
      adult("beta"), adult("gamma"), adult("delta"),
    ]);
    expect(heir).not.toBeNull();
    expect(heir!.koiId).toBe("beta");
    expect(heir!.valence).toBeCloseTo(0.8);
  });

  it("returns null when no survivor meets the 0.35 threshold", () => {
    const sql = stubSqlWithCards({
      "beta→alpha":  0.1,
      "gamma→alpha": 0.2,
      "delta→alpha": 0.05,
    });
    const heir = chooseHeir(sql, "alpha", [
      adult("beta"), adult("gamma"), adult("delta"),
    ]);
    expect(heir).toBeNull();
  });

  it("excludes eggs and fry as heir candidates", () => {
    const sql = stubSqlWithCards({
      "beta→alpha": 0.9,   // would win but is fry
      "gamma→alpha": 0.4,
    });
    const heir = chooseHeir(sql, "alpha", [
      adult("beta", { stage: "fry" }),
      adult("gamma"),
    ]);
    expect(heir).not.toBeNull();
    expect(heir!.koiId).toBe("gamma");
  });

  it("excludes the deceased from their own inheritance", () => {
    const sql = stubSqlWithCards({
      "alpha→alpha": 1.0,  // pathological but safe to test
      "beta→alpha": 0.5,
    });
    const heir = chooseHeir(sql, "alpha", [
      adult("alpha"), adult("beta"),
    ]);
    expect(heir!.koiId).toBe("beta");
  });
});
