// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Meditation mode (§ XVII)
//  ─────────────────────────────────────────────────────────────────────────
//  When cognition is off — either because OpenRouter is unconfigured, the
//  monthly budget is exhausted, or the pond is genuinely in "meditation
//  mode" — the fish still need intents to execute. This module produces
//  them deterministically from the fish's state, its neighbors, the
//  world clock, and a dose of RNG for variance.
//
//  The goal is that a casual visitor cannot tell, from surface behavior
//  alone, that no LLM ran. Shoaling tightens at dawn and dusk. Elders
//  drift low and still. Dying koi descend to the bottom. Storms push
//  everyone toward shelter. Solstice pulls bonded koi to the shaft.
//  Play happens when fish are satiated and unstressed.
//
//  This is not a shortcut — it is the floor. The LLM layer, when on,
//  *chooses* from the same intent vocabulary with richer priors from
//  memory. The surface behavior is continuous across the transition.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  KoiState, WorldState, Intent, IntentKind, SimTick, KoiId,
} from "./types.js";
import { dayMoment, stormStress } from "./world.js";
import { Rng } from "./rng.js";
import { POND } from "./constants.js";
import { SHELF_BAND } from "./reproduction.js";

// ───────────────────────────────────────────────────────────────────
//  Intent scoring — each candidate intent is scored, highest wins.
//  Scores are soft — we sample proportionally, not deterministically,
//  so neighboring fish with similar state don't all pick the same
//  intent every time.
// ───────────────────────────────────────────────────────────────────

function distance(a: KoiState, b: KoiState): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

interface IntentCandidate {
  kind: IntentKind;
  score: number;
  targetId?: string;
  target?: { x: number; y: number; z: number };
}

/**
 * Build the candidate list. We score every intent that might apply given
 * the fish's context, then the caller samples one.
 */
function buildCandidates(
  self: KoiState,
  others: readonly KoiState[],
  world: WorldState,
  rng: Rng,
  permittedMate?: KoiId,
): IntentCandidate[] {
  const moment = dayMoment(world.tDay);
  const stress = stormStress(world.weather);
  const cs: IntentCandidate[] = [];

  // ── Swim — always available, baseline ──────────────────────────────
  cs.push({ kind: "swim", score: 1.0 });

  // ── Stage-specific posture ────────────────────────────────────────
  if (self.stage === "dying") {
    // Dying koi: quiet descent, stillness near the bottom. (§ VII)
    cs.push({
      kind: "rest",
      score: 12.0,
      target: { x: self.x * 0.7, y: -2.6, z: self.z * 0.7 },
    });
    if (rng.chance(0.02)) {
      cs.push({ kind: "surface_breach", score: 3.0 });
    }
    return cs;
  }

  if (self.stage === "egg") {
    cs.push({ kind: "rest", score: 100.0 });
    return cs;
  }

  // ── Shoaling bias by time of day ──────────────────────────────────
  // Carp shoal tight at dawn, loosen at midday, re-form at dusk.
  // (Springer Movement Ecology 2023, cited in § IV)
  if (moment === "dawn" || moment === "golden_morning" || moment === "amber_dusk") {
    cs.push({ kind: "shoal", score: 4.0 });
  } else if (moment === "high_noon") {
    cs.push({ kind: "solitary", score: 1.6 });
    cs.push({ kind: "rest", score: 1.2 });
  } else if (moment === "blue_hour" || moment === "full_night" || moment === "pre_dawn") {
    cs.push({ kind: "rest", score: 2.2 });
  }

  // ── Storm → shelter ───────────────────────────────────────────────
  if (stress > 0.6) {
    cs.push({
      kind: "shelter",
      score: 6.0 * stress,
      target: POND.shrine,
    });
    cs.push({ kind: "retreat", score: 2.0 * stress });
  }

  // ── Solstice → attend ─────────────────────────────────────────────
  if (world.solsticeActive) {
    // Only adults and elders attend. Fry don't have the affect yet.
    if (self.stage === "adult" || self.stage === "elder") {
      cs.push({
        kind: "attend_solstice",
        score: 7.0 + (self.legendary ? 2.0 : 0),
        target: POND.shrine,
      });
    }
  }

  // ── Play — Burghardt criteria: satiated, unstressed, temp-comfortable
  // (§ XIII) — only for fish with good affect and no storm.
  const canPlay =
    self.pad.p > 0.15 &&
    self.pad.a < 0.6 &&
    stress < 0.2 &&
    world.temperature > 0.35 &&
    (self.stage === "adolescent" || self.stage === "adult");

  if (canPlay && rng.chance(0.12)) {
    // Pick a nearby peer as play target.
    const nearby = others.filter(
      (o) =>
        o.id !== self.id &&
        (o.stage === "adolescent" || o.stage === "adult") &&
        distance(self, o) < 2.2,
    );
    if (nearby.length > 0) {
      const target = rng.pick(nearby);
      cs.push({
        kind: "play_invite",
        score: 5.0,
        targetId: target.id,
      });
    }
  }

  // ── Drawn-to partner → linger (§ X, kinematic side) ───────────────
  // Even without memory wired, if drawnTo is set, the fish leans toward
  // lingering near the target. This is the mechanism's kinematic face.
  if (self.drawnTo) {
    const target = others.find((o) => o.id === self.drawnTo!.targetId);
    if (target && distance(self, target) > 0.4) {
      cs.push({
        kind: "linger",
        score: 4.0,
        targetId: target.id,
      });
    }
  }

  // ── Proximity-based ambient social ────────────────────────────────
  // Occasionally seek a peer the fish has encountered, without drama.
  if (rng.chance(0.04) && others.length > 1) {
    const others2 = others.filter((o) => o.id !== self.id && o.stage !== "egg" && o.stage !== "dying");
    if (others2.length > 0) {
      cs.push({
        kind: "approach",
        score: 2.0,
        targetId: rng.pick(others2).id,
      });
    }
  }

  // ── Arousal-modulated wandering ───────────────────────────────────
  if (self.pad.a > 0.7) {
    cs.push({ kind: "surface_breach", score: 1.8 });
  }

  // ── Elders rest more ──────────────────────────────────────────────
  if (self.stage === "elder") {
    cs.push({ kind: "rest", score: 3.0 });
  }

  // ── Reproduction permission → gentle shelf-ward bias (§ X) ─────────
  // The fish does not know it has permission; the LLM never sees it.
  // All this does is weight shelf-compatible intents higher so the
  // fish is more likely to happen to converge at the shelf near its
  // mate. Either fish can still drift away; defection is possible at
  // every tick.
  if (permittedMate) {
    const mate = others.find((o) => o.id === permittedMate);
    if (mate) {
      // Shelf point nearest the mate — gives the pair a place to meet.
      const mateR = Math.hypot(mate.x, mate.z);
      const targetR = Math.max(
        SHELF_BAND.rMin + 0.3,
        Math.min(SHELF_BAND.rMax - 0.3, mateR),
      );
      const ang = Math.atan2(mate.z, mate.x);
      const shelfPoint = {
        x: targetR * Math.cos(ang),
        y: (SHELF_BAND.yMin + SHELF_BAND.yMax) / 2,
        z: targetR * Math.sin(ang),
      };

      cs.push({ kind: "linger", score: 3.5, targetId: mate.id });

      // If the self is not at the shelf yet, prefer going there.
      const selfR = Math.hypot(self.x, self.z);
      const selfAtShelf =
        selfR >= SHELF_BAND.rMin && selfR <= SHELF_BAND.rMax;
      if (!selfAtShelf) {
        cs.push({ kind: "threadway", score: 4.0, target: shelfPoint });
      }
    }
  }

  return cs;
}

// ───────────────────────────────────────────────────────────────────
//  Weighted sample
// ───────────────────────────────────────────────────────────────────

function sample(
  candidates: readonly IntentCandidate[], rng: Rng,
): IntentCandidate {
  const total = candidates.reduce((s, c) => s + c.score, 0);
  if (total <= 0) return candidates[0]!;
  const u = rng.float() * total;
  let acc = 0;
  for (const c of candidates) {
    acc += c.score;
    if (u < acc) return c;
  }
  return candidates[candidates.length - 1]!;
}

// ───────────────────────────────────────────────────────────────────
//  Public entry point
// ───────────────────────────────────────────────────────────────────

/**
 * Pick an intent for `self` at `tick`. Idempotent within a tick: the
 * caller is expected to persist the result on the KoiState so the next
 * tick's kinematics use it until the koi's next cognition interval.
 *
 * `permittedMate` — if this koi has an active reproduction permission
 * with some other fish, pass that other fish's id here. Candidate
 * scoring will gently bias shelf-ward options. The LLM path does not
 * receive this information — see § X.
 */
export function pickMeditationIntent(
  self: KoiState,
  others: readonly KoiState[],
  world: WorldState,
  tick: SimTick,
  rng: Rng,
  permittedMate?: KoiId,
): Intent {
  const cs = buildCandidates(self, others, world, rng, permittedMate);
  const chosen = sample(cs, rng);
  return {
    kind: chosen.kind,
    atTick: tick,
    ...(chosen.targetId !== undefined ? { targetId: chosen.targetId } : {}),
    ...(chosen.target !== undefined ? { target: chosen.target } : {}),
  };
}
