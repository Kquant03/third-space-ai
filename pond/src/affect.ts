// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Affect (§ VIII)
//  ─────────────────────────────────────────────────────────────────────────
//  Every koi carries a PAD vector:
//
//    p (pleasure/valence)  ∈ [-1,  1]   half-life 6 h
//    a (arousal)           ∈ [ 0,  1]   half-life 2 h
//    d (dominance)         ∈ [-1,  1]   half-life 24 h
//
//  The vector decays exponentially toward persona baseline, so a startle
//  wears off fast, a good afternoon colors the evening, and a temperament
//  shift persists for a day.
//
//  Appraisal is deterministic. A non-LLM function maps event types and
//  goal-congruence onto mood deltas. This keeps the system from drifting
//  into whatever narrative the LLM is inclined toward. The LLM's own
//  proposed delta is blended 0.7 deterministic / 0.3 LLM, so the LLM
//  can color state but cannot hijack it.
// ═══════════════════════════════════════════════════════════════════════════

import { AFFECT } from "./constants.js";
import type { PAD, MoodDelta, LifeStage } from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Baselines — one set per life stage, so a fry feels different from
//  an elder even before anything has happened. These are the "persona
//  priors" the PAD decays toward in the absence of events.
// ───────────────────────────────────────────────────────────────────

const BASELINE_BY_STAGE: Record<LifeStage, PAD> = {
  egg:        { p:  0.00, a: 0.10, d:  0.0 },
  fry:        { p:  0.15, a: 0.55, d: -0.4 },   // curious, jumpy, low status
  juvenile:   { p:  0.18, a: 0.50, d: -0.3 },
  adolescent: { p:  0.10, a: 0.45, d: -0.1 },
  adult:      { p:  0.05, a: 0.35, d:  0.1 },   // settled, moderate everything
  elder:      { p:  0.10, a: 0.25, d:  0.2 },   // calmer, higher status
  dying:      { p: -0.05, a: 0.15, d:  0.0 },
  dead:       { p:  0.00, a: 0.00, d:  0.0 },   // null state; row pending cleanup
};

export function baselineFor(stage: LifeStage): PAD {
  const b = BASELINE_BY_STAGE[stage];
  return { p: b.p, a: b.a, d: b.d };
}

// ───────────────────────────────────────────────────────────────────
//  Clamping
// ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampPad(pad: PAD): PAD {
  return {
    p: clamp(pad.p, AFFECT.pleasureMin, AFFECT.pleasureMax),
    a: clamp(pad.a, AFFECT.arousalMin,  AFFECT.arousalMax),
    d: clamp(pad.d, AFFECT.dominanceMin, AFFECT.dominanceMax),
  };
}

// ───────────────────────────────────────────────────────────────────
//  Exponential decay toward baseline
//
//  PAD(t+Δt) = baseline + (PAD(t) - baseline) · 0.5^(Δt / halfLife)
// ───────────────────────────────────────────────────────────────────

export function decayPad(pad: PAD, stage: LifeStage, dtSeconds: number): PAD {
  const b = baselineFor(stage);
  const kP = Math.pow(0.5, dtSeconds / (AFFECT.halfLifeHours.pleasure * 3600));
  const kA = Math.pow(0.5, dtSeconds / (AFFECT.halfLifeHours.arousal  * 3600));
  const kD = Math.pow(0.5, dtSeconds / (AFFECT.halfLifeHours.dominance * 3600));
  return clampPad({
    p: b.p + (pad.p - b.p) * kP,
    a: b.a + (pad.a - b.a) * kA,
    d: b.d + (pad.d - b.d) * kD,
  });
}

// ───────────────────────────────────────────────────────────────────
//  Blending LLM's proposed delta with deterministic (§ VIII)
// ───────────────────────────────────────────────────────────────────

export function blendDeltas(
  deterministic: MoodDelta,
  llm: MoodDelta,
): MoodDelta {
  const wD = AFFECT.blendDeterministic;
  const wL = AFFECT.blendLlm;
  return {
    p: (deterministic.p ?? 0) * wD + (llm.p ?? 0) * wL,
    a: (deterministic.a ?? 0) * wD + (llm.a ?? 0) * wL,
    d: (deterministic.d ?? 0) * wD + (llm.d ?? 0) * wL,
  };
}

export function applyDelta(pad: PAD, delta: MoodDelta): PAD {
  return clampPad({
    p: pad.p + (delta.p ?? 0),
    a: pad.a + (delta.a ?? 0),
    d: pad.d + (delta.d ?? 0),
  });
}

// ───────────────────────────────────────────────────────────────────
//  Deterministic appraisal catalogue (§ VIII)
//
//  Every distinct event type that affects a koi's mood has an entry
//  here. The manifesto specifies numeric deltas for several; those are
//  used verbatim. Others are filled in proportionately.
//
//  Self vs. witness: many events produce different deltas for the
//  primary actor versus a koi that merely observed it. We model this
//  via `role`.
// ───────────────────────────────────────────────────────────────────

export type AppraisalRole = "self" | "bonded_witness" | "pond_witness";

export type AppraisalEvent =
  | { kind: "witnessed_by_familiar" }
  | { kind: "bumped_by_unfamiliar" }
  | { kind: "bumped_by_dominant" }
  | { kind: "fry_hatched_in_pond" }
  | { kind: "elder_died" }
  | { kind: "peer_died" }
  | { kind: "visitor_pebble_placed" }
  | { kind: "visitor_fed" }
  | { kind: "storm_began" }
  | { kind: "storm_ended" }
  | { kind: "solstice_shaft_entered_with_bonded" }
  | { kind: "solstice_shaft_entered_alone" }
  | { kind: "play_succeeded" }
  | { kind: "apology_received" }
  | { kind: "apology_offered" }
  | { kind: "forgiveness_received" }
  | { kind: "rupture_unrepaired" }
  | { kind: "mutual_drawn_to" }
  | { kind: "gift_received" }
  | { kind: "gift_given" }
  | { kind: "teaching_succeeded" }
  | { kind: "seasonal_change"; season: "spring" | "summer" | "autumn" | "winter" }
  | { kind: "food_received" }
  | { kind: "food_denied" }
  | { kind: "prolonged_solitude" }
  | { kind: "sustained_parallel_presence" };

/**
 * The appraisal catalogue. Values are drawn from § VIII where specified
 * and filled in proportionately otherwise. Keep this table the SINGLE
 * source of truth for event → mood deltas; the simulation should not
 * set mood deltas anywhere else.
 */
export function appraise(
  event: AppraisalEvent,
  role: AppraisalRole,
): MoodDelta {
  switch (event.kind) {
    case "witnessed_by_familiar":
      // § VIII: Δp +0.2, Δd +0.05
      return role === "self"
        ? { p: +0.20, a: +0.02, d: +0.05 }
        : { p: +0.05 };

    case "bumped_by_unfamiliar":
      // § VIII: Δa +0.3, Δp -0.1
      return role === "self"
        ? { p: -0.10, a: +0.30, d: -0.05 }
        : { a: +0.08 };

    case "bumped_by_dominant":
      return role === "self"
        ? { p: -0.12, a: +0.20, d: -0.08 }
        : { a: +0.05 };

    case "fry_hatched_in_pond":
      // § VIII: Δp +0.1 colony-wide
      return { p: +0.10, a: +0.05 };

    case "elder_died":
      // § VIII: Δp -0.4 bonded, -0.1 pond-wide
      if (role === "bonded_witness") return { p: -0.40, a: +0.10, d: -0.05 };
      return { p: -0.10, a: +0.04 };

    case "peer_died":
      if (role === "bonded_witness") return { p: -0.30, a: +0.08, d: -0.03 };
      return { p: -0.08, a: +0.03 };

    case "visitor_pebble_placed":
      // § VIII: Δa +0.2
      return { a: +0.20 };

    case "visitor_fed":
      return { p: +0.08, a: +0.12 };

    case "storm_began":
      // § VIII: Δa +0.5, Δp -0.3
      return { p: -0.30, a: +0.50, d: -0.05 };

    case "storm_ended":
      return { p: +0.10, a: -0.25 };

    case "solstice_shaft_entered_with_bonded":
      // § VIII: Δp +0.3
      return { p: +0.30, a: -0.05, d: +0.05 };

    case "solstice_shaft_entered_alone":
      return { p: +0.10, a: -0.02 };

    case "play_succeeded":
      return { p: +0.18, a: +0.05, d: +0.02 };

    case "apology_received":
      return { p: +0.20, a: -0.05, d: +0.02 };

    case "apology_offered":
      return { p: +0.10, a: -0.02 };

    case "forgiveness_received":
      return { p: +0.22, a: -0.08 };

    case "rupture_unrepaired":
      return { p: -0.12, a: +0.10, d: -0.02 };

    case "mutual_drawn_to":
      // Small, because this is felt as noticing, not as triumph.
      return { p: +0.08, a: +0.04 };

    case "gift_received":
      return { p: +0.15, a: +0.03 };

    case "gift_given":
      return { p: +0.10, d: +0.02 };

    case "teaching_succeeded":
      return role === "self"  // teacher
        ? { p: +0.10, d: +0.05 }
        : { p: +0.15 };        // learner

    case "seasonal_change":
      switch (event.season) {
        case "spring": return { p: +0.08, a: +0.04 };
        case "summer": return { p: +0.05, a: +0.02 };
        case "autumn": return { p: -0.02, a: -0.01 };
        case "winter": return { p: -0.05, a: -0.03, d: -0.01 };
      }

    case "food_received":
      return { p: +0.10, a: +0.08 };

    case "food_denied":
      return { p: -0.05, a: +0.04 };

    case "prolonged_solitude":
      return { p: -0.04, a: -0.02 };

    case "sustained_parallel_presence":
      // Witnessing family, regenerative. Both parties gain.
      return { p: +0.06, a: -0.02 };
  }
}
