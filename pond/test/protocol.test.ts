import { describe, it, expect } from "vitest";
import {
  SnapshotMessageSchema,
  TickMessageSchema,
  AmbientEventMessageSchema,
  CognitionResponseSchema,
  TwilightReflectionSchema,
  KoiFrameSchema,
} from "../src/protocol.js";

describe("protocol — WS envelopes", () => {
  it("parses a snapshot exactly as usePond.ts emits/expects", () => {
    const msg = {
      t: "snapshot",
      tick: 1234,
      now: 1_744_000_000_000,
      fish: [
        {
          id: "koi_00",
          name: "Kishi",
          stage: "adult",
          x: 1.2, y: -1.2, z: -0.5,
          h: 0.3,
          s: 1.0,
          c: "kohaku",
          m: { v: 0.1, a: 0.4 },
        },
      ],
      pondMeta: {
        version: "0.1.0",
        created_at: 1_744_000_000_000,
        tick_interval_ms: 500,
        t_day: 0.42,
        season: "spring",
      },
    };
    const parsed = SnapshotMessageSchema.parse(msg);
    expect(parsed.t).toBe("snapshot");
    expect(parsed.fish[0]!.id).toBe("koi_00");
  });

  it("allows minimum KoiFrame (id, x, y, z, h only)", () => {
    // usePond.ts tolerates missing optional fields; our schema must too.
    const frame = { id: "k", x: 0, y: 0, z: 0, h: 0 };
    expect(KoiFrameSchema.parse(frame)).toBeTruthy();
  });

  it("parses a tick message", () => {
    const msg = {
      t: "tick",
      tick: 5000,
      now: Date.now(),
      fish: [],
    };
    expect(TickMessageSchema.parse(msg)).toBeTruthy();
  });

  it("parses an ambient death event", () => {
    const msg = {
      t: "ambient",
      kind: "died",
      tick: 200_000,
      now: Date.now(),
      details: { name: "Moon-Watcher" },
    };
    expect(AmbientEventMessageSchema.parse(msg)).toBeTruthy();
  });

  it("rejects a mangled snapshot (string tick)", () => {
    const bad = {
      t: "snapshot",
      tick: "not-a-number",
      now: 0,
      fish: [],
      pondMeta: { version: "0", created_at: 0, tick_interval_ms: 500, t_day: 0, season: "spring" },
    };
    expect(() => SnapshotMessageSchema.parse(bad)).toThrow();
  });
});

describe("protocol — LLM response", () => {
  it("accepts a minimal valid cognition response", () => {
    const r = {
      intent: "swim",
      target_koi: null,
      mechanism: null,
      mood_delta: {},
      utterance: null,
      importance: 1,
      memory_write: null,
      belief_update: null,
      drawn_to: null,
    };
    expect(CognitionResponseSchema.parse(r)).toBeTruthy();
  });

  it("accepts a rich response with utterance and memory write", () => {
    const r = {
      intent: "linger",
      target_koi: "koi_02",
      mechanism: "parallel_presence",
      mood_delta: { p: 0.05, a: -0.02 },
      utterance: "warm here. the one who ripples the surface is still.",
      importance: 4,
      memory_write: {
        kind: "observation",
        content: "still with koi_02 at the shelf. sun high.",
        emotional_valence: 0.2,
        participants: ["koi_02"],
      },
      belief_update: null,
      drawn_to: null,
    };
    expect(CognitionResponseSchema.parse(r)).toBeTruthy();
  });

  it("accepts a twilight response with drawn_to populated", () => {
    const r = {
      intent: "linger",
      target_koi: "koi_03",
      mechanism: null,
      mood_delta: {},
      utterance: null,
      importance: 3,
      memory_write: null,
      belief_update: null,
      drawn_to: {
        koi_id: "koi_03",
        noticing: "swimming behind them at the shelf. quieter when near.",
      },
    };
    expect(CognitionResponseSchema.parse(r)).toBeTruthy();
  });

  it("rejects an invalid intent", () => {
    const r = {
      intent: "negotiate",   // not in vocabulary
      target_koi: null, mechanism: null, mood_delta: {},
      utterance: null, importance: 1,
      memory_write: null, belief_update: null, drawn_to: null,
    };
    expect(() => CognitionResponseSchema.parse(r)).toThrow();
  });

  it("rejects utterance over 120 chars", () => {
    const r = {
      intent: "swim", target_koi: null, mechanism: null, mood_delta: {},
      utterance: "a".repeat(121), importance: 1,
      memory_write: null, belief_update: null, drawn_to: null,
    };
    expect(() => CognitionResponseSchema.parse(r)).toThrow();
  });

  it("accepts a twilight reflection with null drawn_to", () => {
    const r = {
      sensory_summary: "cool water, tight shoal at dawn, one bump at the ring.",
      relationship_deltas: [
        { koi_id: "k1", valence_delta: 0.05, summary: "swam beside. calm." },
      ],
      drawn_to: null,
      soft_intent_tomorrow: "the shelf at morning.",
      persona_drift: null,
    };
    expect(TwilightReflectionSchema.parse(r)).toBeTruthy();
  });
});
