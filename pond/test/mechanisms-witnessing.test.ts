import { describe, it, expect } from "vitest";
import {
  detectParallelPresence,
  detectMutualWitnessing,
  detectSharedAttention,
  detectBearingWitness,
  detectJoyfulReunion,
  WITNESSING_THRESHOLDS,
} from "../src/mechanisms/witnessing.js";
import type { DetectionContext, POI } from "../src/mechanisms/types.js";
import type { KoiState } from "../src/types.js";
import { Rng } from "../src/rng.js";
import { createKoi } from "../src/koi.js";
import { SIM } from "../src/constants.js";

// ─── stub SqlStorage that records what it's asked and returns empty ─

function stubSql(
  firedTicks: Array<{ type: string; actor: string; targets: string[]; tick: number; mechanism?: string }> = [],
  cardValences: Record<string, number> = {},
): SqlStorage {
  return {
    exec: (sql: string, ...args: unknown[]): SqlStorageCursor<Record<string, SqlStorageValue>> => {
      // lastFiredTick queries — return MAX(tick) from firedTicks matching mechanism+actor+targets
      if (sql.includes("SELECT MAX(tick)")) {
        const mechanism = args[2] as string;
        const actor = args[1] as string;
        const targetPatterns = args.slice(3) as string[];
        const match = firedTicks.find((e) => {
          if (e.type !== "event") return false;
          if (e.actor !== actor) return false;
          if (e.mechanism !== mechanism) return false;
          for (const pat of targetPatterns) {
            const id = pat.replace(/[%"]/g, "");
            if (!e.targets.includes(id)) return false;
          }
          return true;
        });
        const arr: Array<{ t: number | null }> = match
          ? [{ t: match.tick }]
          : [{ t: null }];
        return mockCursor(arr);
      }

      // relationship_card valence lookup (joyful_reunion)
      if (sql.includes("SELECT valence FROM relationship_card")) {
        const selfId = args[0] as string;
        const otherId = args[1] as string;
        const key = `${selfId}→${otherId}`;
        const v = cardValences[key];
        return mockCursor(v != null ? [{ valence: v }] : []);
      }

      return mockCursor([]);
    },
  } as unknown as SqlStorage;
}

function mockCursor<T extends Record<string, SqlStorageValue>>(rows: T[]): SqlStorageCursor<T> {
  return {
    toArray: () => rows,
    one: () => rows[0] ?? null,
    raw: () => rows.map((r) => Object.values(r)) as never,
    next: () => ({ done: true, value: undefined }) as never,
    [Symbol.iterator]: () => rows[Symbol.iterator]() as never,
    columnNames: [],
    rowsRead: 0,
    rowsWritten: 0,
  } as unknown as SqlStorageCursor<T>;
}

// ─── Koi factories ─────────────────────────────────────────────────

const ADULT_AGE = 15 * SIM.realSecondsPerSimDay * SIM.tickHz;

function adult(id: string, x: number, z: number, h = 0, overrides: Partial<KoiState> = {}): KoiState {
  const k = createKoi({
    id, name: id, ageTicks: ADULT_AGE,
    hatchedAtTick: 0, legendary: false, color: "kohaku",
    spawn: { x, y: -1.2, z, h },
  }, new Rng(id.charCodeAt(0) + 1));
  return { ...k, ...overrides };
}

function ctxOf(koi: KoiState[], pois: POI[] = [], sql?: SqlStorage): DetectionContext {
  return {
    tick: 100_000,
    tickHz: SIM.tickHz,
    simDay: 5,
    tDay: 0.3,
    koi,
    pois,
    sql: sql ?? stubSql(),
  };
}

// ═════════════════════════════════════════════════════════════════════
//  parallel_presence
// ═════════════════════════════════════════════════════════════════════

describe("witnessing — parallel_presence", () => {
  it("fires when two koi swim close with aligned headings", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.5, 0.0, 0.1);  // very similar heading
    const firings = detectParallelPresence(ctxOf([a, b]));
    expect(firings).toHaveLength(1);
    expect(firings[0]!.mechanism).toBe("parallel_presence");
    expect(firings[0]!.participants.sort()).toEqual(["a", "b"]);
    expect(firings[0]!.family).toBe("witnessing");
  });

  it("does NOT fire when too far apart", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult(
      "b", WITNESSING_THRESHOLDS.PARALLEL_PRESENCE.maxDistanceM + 0.5,
      0.0, 0,
    );
    expect(detectParallelPresence(ctxOf([a, b]))).toHaveLength(0);
  });

  it("does NOT fire when headings diverge", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.5, 0.0, Math.PI);  // opposite direction
    expect(detectParallelPresence(ctxOf([a, b]))).toHaveLength(0);
  });

  it("skips pairs on cooldown (event log shows recent firing)", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.5, 0.0, 0);
    const sql = stubSql([{
      type: "event", actor: "koi:a", targets: ["b"],
      tick: 99_000, mechanism: "parallel_presence",
    }]);
    expect(detectParallelPresence(ctxOf([a, b], [], sql))).toHaveLength(0);
  });

  it("skips eggs and dying koi", () => {
    const a = adult("a", 0, 0, 0, { stage: "egg" });
    const b = adult("b", 0.5, 0, 0);
    expect(detectParallelPresence(ctxOf([a, b]))).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  mutual_witnessing — both face each other
// ═════════════════════════════════════════════════════════════════════

describe("witnessing — mutual_witnessing", () => {
  it("fires when both koi face each other within 1m", () => {
    // A at origin facing +x (h=0); B at (0.6, 0) facing -x (h=π)
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.6, 0.0, Math.PI);
    const firings = detectMutualWitnessing(ctxOf([a, b]));
    expect(firings).toHaveLength(1);
    expect(firings[0]!.mechanism).toBe("witnessing");
  });

  it("does NOT fire when only one is facing the other", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.6, 0.0, 0);  // both facing +x, neither at each other
    expect(detectMutualWitnessing(ctxOf([a, b]))).toHaveLength(0);
  });

  it("does NOT fire when too far apart", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 2.0, 0.0, Math.PI);  // 2m apart, still facing
    expect(detectMutualWitnessing(ctxOf([a, b]))).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  shared_attention — multiple koi oriented at the same POI
// ═════════════════════════════════════════════════════════════════════

describe("witnessing — shared_attention", () => {
  it("fires when two koi point at the same pebble", () => {
    const poi: POI = {
      id: "pebble_1", kind: "pebble",
      x: 2.0, z: 0.0,
      createdTick: 99_000, expiresTick: 200_000,
    };
    // Both koi close, both facing the POI
    const a = adult("a", 0.8, 0.0, 0);  // at +x:0.8, facing +x → looking at POI
    const b = adult("b", 2.8, 0.0, Math.PI); // at +x:2.8, facing -x → looking at POI
    const firings = detectSharedAttention(ctxOf([a, b], [poi]));
    expect(firings).toHaveLength(1);
    expect(firings[0]!.mechanism).toBe("shared_attention");
    expect(firings[0]!.payload["poi_id"]).toBe("pebble_1");
    expect(firings[0]!.participants.sort()).toEqual(["a", "b"]);
  });

  it("does NOT fire if only one koi is oriented at the POI", () => {
    const poi: POI = {
      id: "pebble_1", kind: "pebble",
      x: 2.0, z: 0.0,
      createdTick: 99_000, expiresTick: 200_000,
    };
    const a = adult("a", 0.8, 0.0, 0);
    const b = adult("b", 0.5, 1.0, 0);  // not within 1.5m of POI
    expect(detectSharedAttention(ctxOf([a, b], [poi]))).toHaveLength(0);
  });

  it("does NOT fire for expired POIs", () => {
    const poi: POI = {
      id: "pebble_old", kind: "pebble",
      x: 2.0, z: 0.0,
      createdTick: 0, expiresTick: 50_000,  // expired
    };
    const a = adult("a", 0.8, 0.0, 0);
    const b = adult("b", 2.8, 0.0, Math.PI);
    expect(detectSharedAttention(ctxOf([a, b], [poi]))).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  bearing_witness — staying near a suffering koi
// ═════════════════════════════════════════════════════════════════════

describe("witnessing — bearing_witness", () => {
  it("fires when koi B is near koi A whose valence is low", () => {
    const a = adult("a", 0.0, 0.0, 0, {
      pad: { p: -0.6, a: 0.4, d: 0 },
    });
    const b = adult("b", 0.8, 0.0, 0);
    const firings = detectBearingWitness(ctxOf([a, b]));
    expect(firings).toHaveLength(1);
    expect(firings[0]!.mechanism).toBe("bearing_witness");
    // Actor is the witness (b); target's valence was the qualifier
    expect(firings[0]!.actor).toBe("b");
    // Target gets a bigger Δp than witness does — being seen repairs
    expect(firings[0]!.participantDelta.p!).toBeGreaterThan(firings[0]!.actorDelta.p!);
  });

  it("does NOT fire when the target's valence is neutral", () => {
    const a = adult("a", 0.0, 0.0, 0, { pad: { p: 0, a: 0.3, d: 0 } });
    const b = adult("b", 0.8, 0.0, 0);
    expect(detectBearingWitness(ctxOf([a, b]))).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  joyful_reunion — bonded pair meets again after being apart
// ═════════════════════════════════════════════════════════════════════

describe("witnessing — joyful_reunion", () => {
  it("fires when bonded pair is now close and was apart in the window", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.3, 0.2, 0);
    // cards show mutual bondedness; no parallel_presence fired in window
    const sql = stubSql(
      [],
      { "a→b": 0.45, "b→a": 0.40 },
    );
    const firings = detectJoyfulReunion(ctxOf([a, b], [], sql));
    expect(firings).toHaveLength(1);
    expect(firings[0]!.mechanism).toBe("joyful_reunion");
    expect(firings[0]!.actorDelta.p!).toBeGreaterThan(0.1);  // biggest Δp
  });

  it("does NOT fire when pair lacks bondedness", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.3, 0.2, 0);
    const sql = stubSql([], { "a→b": 0.1, "b→a": 0.1 });  // below 0.3
    expect(detectJoyfulReunion(ctxOf([a, b], [], sql))).toHaveLength(0);
  });

  it("does NOT fire when pair was in parallel_presence recently", () => {
    const a = adult("a", 0.0, 0.0, 0);
    const b = adult("b", 0.3, 0.2, 0);
    const sql = stubSql(
      [{
        type: "event", actor: "koi:a", targets: ["b"],
        tick: 99_500, mechanism: "parallel_presence",
      }],
      { "a→b": 0.45, "b→a": 0.40 },
    );
    // They were just together; this isn't a reunion.
    expect(detectJoyfulReunion(ctxOf([a, b], [], sql))).toHaveLength(0);
  });
});
