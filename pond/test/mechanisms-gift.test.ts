import { describe, it, expect } from "vitest";
import {
  giftDetectionToFiring, type GiftDetection,
} from "../src/mechanisms/gift.js";
import type { ArtifactRow } from "../src/artifacts.js";

function mkArtifact(partial: Partial<ArtifactRow> = {}): ArtifactRow {
  return {
    id: "art_001",
    type: "pebble",
    originEventId: null,
    createdAtTick: 0,
    substance: "quartz",
    color: "#b8b2a0",
    wear: 0,
    luminosity: 0,
    inscription: null,
    motifs: ["stone"],
    rarity: 0.3,
    sacred: false,
    state: "held",
    currentHolder: "alpha",
    loc: null,
    ...partial,
  };
}

describe("gift — firing shape", () => {
  it("produces a valid firing for a first-generation gift", () => {
    const detection: GiftDetection = {
      mechanism: "gift",
      giver: "alpha",
      recipient: "beta",
      artifact: mkArtifact(),
      giverValence: 0.4,
      chainLengthSoFar: 0,
    };
    const f = giftDetectionToFiring(detection, 1000);
    expect(f.mechanism).toBe("gift");
    expect(f.family).toBe("gift");
    expect(f.actor).toBe("alpha");
    expect(f.participants.sort()).toEqual(["alpha", "beta"]);
    expect(f.tick).toBe(1000);
    // Receiving a gift is bigger than giving — the invariant
    expect(f.participantDelta.p!).toBeGreaterThan(f.actorDelta.p!);
  });

  it("produces a pass_it_forward firing when the artifact was received", () => {
    const detection: GiftDetection = {
      mechanism: "pass_it_forward",
      giver: "beta",
      recipient: "gamma",
      artifact: mkArtifact(),
      giverValence: 0.5,
      chainLengthSoFar: 1,
    };
    const f = giftDetectionToFiring(detection, 2000);
    expect(f.mechanism).toBe("pass_it_forward");
    expect(f.family).toBe("gift");
    expect(f.payload["chain_length_so_far"]).toBe(1);
  });

  it("pass_it_forward has SMALLER impact than first-generation gift", () => {
    // § IX: pass_it_forward is recognition; gift is generation.
    const firstGen: GiftDetection = {
      mechanism: "gift", giver: "a", recipient: "b",
      artifact: mkArtifact(), giverValence: 0.5, chainLengthSoFar: 0,
    };
    const forward: GiftDetection = {
      mechanism: "pass_it_forward", giver: "a", recipient: "b",
      artifact: mkArtifact(), giverValence: 0.5, chainLengthSoFar: 2,
    };
    const fFirst = giftDetectionToFiring(firstGen, 1);
    const fForward = giftDetectionToFiring(forward, 1);
    expect(fForward.actorDelta.p!).toBeLessThan(fFirst.actorDelta.p!);
    expect(fForward.participantDelta.p!).toBeLessThan(fFirst.participantDelta.p!);
    expect(fForward.cardValenceBump).toBeLessThan(fFirst.cardValenceBump);
  });

  it("giver gains dominance; recipient gives a little way (§ VIII pattern)", () => {
    const d: GiftDetection = {
      mechanism: "gift", giver: "a", recipient: "b",
      artifact: mkArtifact(), giverValence: 0.4, chainLengthSoFar: 0,
    };
    const f = giftDetectionToFiring(d, 1);
    expect(f.actorDelta.d).toBeGreaterThan(0);      // giver: capable
    expect(f.participantDelta.d!).toBeLessThan(0);  // recipient: soft
  });

  it("includes the artifact id and type in the payload for event logging", () => {
    const d: GiftDetection = {
      mechanism: "gift", giver: "a", recipient: "b",
      artifact: mkArtifact({ id: "art_special", type: "snail_shell" }),
      giverValence: 0.3, chainLengthSoFar: 0,
    };
    const f = giftDetectionToFiring(d, 500);
    expect(f.payload["artifact_id"]).toBe("art_special");
    expect(f.payload["artifact_type"]).toBe("snail_shell");
    expect(f.payload["giver_valence"]).toBeCloseTo(0.3);
  });
});
