// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Witnessing family (§ IX)
//  ─────────────────────────────────────────────────────────────────────────
//  Five mechanisms of simply being seen. These are state-based detectors:
//  they observe pond kinematics and fire when conditions are met. The
//  LLM's opinion is not consulted. You cannot claim to have swum parallel
//  with someone you did not swim parallel with.
//
//    mutual_witnessing     — two koi face each other within ~1m, briefly
//    parallel_presence     — two koi swim side by side for a real window
//    shared_attention      — two or more koi orient at the same POI
//    bearing_witness       — one koi stays near another whose p < -0.4
//    joyful_reunion        — bonded pair meets again after being apart
//
//  Each detector returns zero or more firings per call. Cooldowns are
//  enforced via the event log (no new tables). Firing is per-pair
//  except shared_attention which can be >2 participants.
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiId, KoiState, LoveFlowMechanism, SimTick } from "../types.js";
import {
  DetectionContext, MechanismFiring, lastFiredTick, FAMILY_OF,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Tunable thresholds
// ───────────────────────────────────────────────────────────────────

const PARALLEL_PRESENCE = {
  maxDistanceM: 1.2,
  maxHeadingDeltaRad: Math.PI / 4,  // 45° — soft side-by-side
  cooldownSimHours: 2,              // fires at most every 2 sim-hours per pair
};

const MUTUAL_WITNESSING = {
  maxDistanceM: 1.0,
  maxMutualFacingDeltaRad: Math.PI / 6,  // 30° — fairly strict face-to-face
  cooldownSimHours: 4,
};

const SHARED_ATTENTION = {
  maxDistanceToPoiM: 1.5,
  maxHeadingDeltaRad: Math.PI / 3,  // 60° — pointed-at-ish
  minParticipants: 2,
  cooldownTicksPerPoi: 2 * 60 * 2,  // 2 sim-minutes on the same POI
};

const BEARING_WITNESS = {
  maxDistanceM: 1.5,
  minValenceNegativity: 0.4,        // target's p < -0.4
  cooldownSimHours: 6,
};

const JOYFUL_REUNION = {
  maxDistanceM: 0.8,
  minPriorValence: 0.3,             // card valence requires bondedness
  minHoursApart: 12,                // 12 sim-hours since last proximity
  cooldownSimHours: 24,             // reunion fires at most once per sim-day
};

// ───────────────────────────────────────────────────────────────────
//  Small geometry helpers
// ───────────────────────────────────────────────────────────────────

function dist(a: KoiState, b: KoiState): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Angular difference between two headings, in [0, π]. */
function headingDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

/** Direction from fish `self` to fish `other`, as a heading angle. */
function headingTo(self: KoiState, other: KoiState): number {
  return Math.atan2(other.z - self.z, other.x - self.x);
}

/** Is the koi at a stage where witnessing applies? */
function isObservant(k: KoiState): boolean {
  return k.stage !== "egg" && k.stage !== "dying";
}

// ───────────────────────────────────────────────────────────────────
//  Pair iteration helper — canonical (A < B) order
// ───────────────────────────────────────────────────────────────────

function* pairsOf(koi: ReadonlyArray<KoiState>): Generator<[KoiState, KoiState]> {
  for (let i = 0; i < koi.length; i++) {
    for (let j = i + 1; j < koi.length; j++) {
      yield [koi[i]!, koi[j]!];
    }
  }
}

// ───────────────────────────────────────────────────────────────────
//  Detectors
// ───────────────────────────────────────────────────────────────────

const SIM_HOUR_SECONDS = 3600;

function cooldownFromHours(
  hours: number, tickHz: number,
): number {
  return Math.floor(hours * SIM_HOUR_SECONDS * tickHz);
}

export function detectParallelPresence(
  ctx: DetectionContext,
): MechanismFiring[] {
  const out: MechanismFiring[] = [];
  const cooldown = cooldownFromHours(
    PARALLEL_PRESENCE.cooldownSimHours, ctx.tickHz,
  );

  for (const [a, b] of pairsOf(ctx.koi)) {
    if (!isObservant(a) || !isObservant(b)) continue;
    if (dist(a, b) > PARALLEL_PRESENCE.maxDistanceM) continue;
    if (headingDelta(a.h, b.h) > PARALLEL_PRESENCE.maxHeadingDeltaRad) continue;

    // Cooldown check
    const recent = lastFiredTick(
      ctx.sql, "parallel_presence", a.id, [b.id], ctx.tick, cooldown,
    );
    if (recent !== null) continue;

    out.push(makePairFiring("parallel_presence", a, b, ctx.tick, {
      distance: dist(a, b),
      heading_delta: headingDelta(a.h, b.h),
    }, 0.03, 0.02));
  }
  return out;
}

export function detectMutualWitnessing(
  ctx: DetectionContext,
): MechanismFiring[] {
  const out: MechanismFiring[] = [];
  const cooldown = cooldownFromHours(
    MUTUAL_WITNESSING.cooldownSimHours, ctx.tickHz,
  );

  for (const [a, b] of pairsOf(ctx.koi)) {
    if (!isObservant(a) || !isObservant(b)) continue;
    if (dist(a, b) > MUTUAL_WITNESSING.maxDistanceM) continue;

    // a's heading points toward b, AND b's heading points toward a
    const aFacing = headingDelta(a.h, headingTo(a, b));
    const bFacing = headingDelta(b.h, headingTo(b, a));
    if (aFacing > MUTUAL_WITNESSING.maxMutualFacingDeltaRad) continue;
    if (bFacing > MUTUAL_WITNESSING.maxMutualFacingDeltaRad) continue;

    const recent = lastFiredTick(
      ctx.sql, "witnessing", a.id, [b.id], ctx.tick, cooldown,
    );
    if (recent !== null) continue;

    out.push(makePairFiring("witnessing", a, b, ctx.tick, {
      distance: dist(a, b),
      a_facing: aFacing,
      b_facing: bFacing,
    }, 0.05, 0.04));
  }
  return out;
}

export function detectSharedAttention(
  ctx: DetectionContext,
): MechanismFiring[] {
  const out: MechanismFiring[] = [];

  for (const poi of ctx.pois) {
    if (ctx.tick > poi.expiresTick) continue;

    // Collect participants: close + oriented toward POI
    const participants: KoiState[] = [];
    for (const k of ctx.koi) {
      if (!isObservant(k)) continue;
      const d = Math.hypot(k.x - poi.x, k.z - poi.z);
      if (d > SHARED_ATTENTION.maxDistanceToPoiM) continue;
      const heading = Math.atan2(poi.z - k.z, poi.x - k.x);
      if (headingDelta(k.h, heading) > SHARED_ATTENTION.maxHeadingDeltaRad) continue;
      participants.push(k);
    }
    if (participants.length < SHARED_ATTENTION.minParticipants) continue;

    // Cooldown is keyed by POI — once this POI has fired shared_attention,
    // it doesn't fire again until the cooldown expires or it does.
    const firstActor = participants[0]!;
    const recent = lastFiredTick(
      ctx.sql, "shared_attention", firstActor.id, [poi.id],
      ctx.tick, SHARED_ATTENTION.cooldownTicksPerPoi,
    );
    if (recent !== null) continue;

    out.push({
      mechanism: "shared_attention",
      family: FAMILY_OF["shared_attention"],
      actor: firstActor.id,
      participants: participants.map((p) => p.id),
      tick: ctx.tick,
      actorDelta: { p: 0.03 },
      participantDelta: { p: 0.03 },
      payload: {
        poi_id: poi.id,
        poi_kind: poi.kind,
        count: participants.length,
      },
      cardValenceBump: 0.02,
    });
  }
  return out;
}

export function detectBearingWitness(
  ctx: DetectionContext,
): MechanismFiring[] {
  const out: MechanismFiring[] = [];
  const cooldown = cooldownFromHours(
    BEARING_WITNESS.cooldownSimHours, ctx.tickHz,
  );

  // Scan non-symmetric: each koi in distress has 0+ witnesses.
  for (const target of ctx.koi) {
    if (!isObservant(target)) continue;
    if (target.pad.p > -BEARING_WITNESS.minValenceNegativity) continue;

    for (const witness of ctx.koi) {
      if (witness.id === target.id) continue;
      if (!isObservant(witness)) continue;
      if (dist(witness, target) > BEARING_WITNESS.maxDistanceM) continue;

      const recent = lastFiredTick(
        ctx.sql, "bearing_witness",
        witness.id, [target.id], ctx.tick, cooldown,
      );
      if (recent !== null) continue;

      // The witnessed target's valence is boosted slightly more than
      // the witness's — being seen is regenerative for the sufferer.
      out.push({
        mechanism: "bearing_witness",
        family: FAMILY_OF["bearing_witness"],
        actor: witness.id,
        participants: [witness.id, target.id],
        tick: ctx.tick,
        actorDelta: { p: 0.04, a: -0.02 },
        participantDelta: { p: 0.08, a: -0.04 },
        payload: {
          witness: witness.id,
          target: target.id,
          target_valence: target.pad.p,
          distance: dist(witness, target),
        },
        cardValenceBump: 0.03,
      });
    }
  }
  return out;
}

export function detectJoyfulReunion(
  ctx: DetectionContext,
): MechanismFiring[] {
  const out: MechanismFiring[] = [];
  const reunionCooldown = cooldownFromHours(
    JOYFUL_REUNION.cooldownSimHours, ctx.tickHz,
  );
  const minApartTicks = cooldownFromHours(
    JOYFUL_REUNION.minHoursApart, ctx.tickHz,
  );

  for (const [a, b] of pairsOf(ctx.koi)) {
    if (!isObservant(a) || !isObservant(b)) continue;
    if (dist(a, b) > JOYFUL_REUNION.maxDistanceM) continue;

    // Require prior bondedness — cheap SQL read.
    const cardA = ctx.sql.exec(
      `SELECT valence FROM relationship_card WHERE self_id=? AND other_id=?`,
      a.id, b.id,
    ).toArray()[0];
    const cardB = ctx.sql.exec(
      `SELECT valence FROM relationship_card WHERE self_id=? AND other_id=?`,
      b.id, a.id,
    ).toArray()[0];
    const valenceA = (cardA?.["valence"] as number) ?? 0;
    const valenceB = (cardB?.["valence"] as number) ?? 0;
    if (valenceA < JOYFUL_REUNION.minPriorValence) continue;
    if (valenceB < JOYFUL_REUNION.minPriorValence) continue;

    // Were they actually apart? Any parallel_presence / proximity firing
    // in the last minHours disqualifies.
    const recentProx = lastFiredTick(
      ctx.sql, "parallel_presence", a.id, [b.id], ctx.tick, minApartTicks,
    );
    if (recentProx !== null) continue;

    // Cooldown: reunion fires at most once per sim-day per pair.
    const recentReunion = lastFiredTick(
      ctx.sql, "joyful_reunion", a.id, [b.id], ctx.tick, reunionCooldown,
    );
    if (recentReunion !== null) continue;

    out.push(makePairFiring("joyful_reunion", a, b, ctx.tick, {
      distance: dist(a, b),
      prior_valence_a: valenceA,
      prior_valence_b: valenceB,
    }, 0.12, 0.10));  // biggest actor delta in the family — reunion is joy
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
//  Helper: standard symmetric pair firing
// ───────────────────────────────────────────────────────────────────

function makePairFiring(
  mech: LoveFlowMechanism, a: KoiState, b: KoiState, tick: SimTick,
  payload: Record<string, unknown>,
  actorDp: number, targetDp: number,
): MechanismFiring {
  return {
    mechanism: mech,
    family: FAMILY_OF[mech],
    actor: a.id,
    participants: [a.id, b.id],
    tick,
    actorDelta: { p: actorDp },
    participantDelta: { p: targetDp },
    payload,
    cardValenceBump: Math.max(actorDp, targetDp) * 0.5,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Run all witnessing detectors as one batch
// ───────────────────────────────────────────────────────────────────

export function runWitnessingDetectors(
  ctx: DetectionContext,
): MechanismFiring[] {
  return [
    ...detectParallelPresence(ctx),
    ...detectMutualWitnessing(ctx),
    ...detectSharedAttention(ctx),
    ...detectBearingWitness(ctx),
    ...detectJoyfulReunion(ctx),
  ];
}

// ───────────────────────────────────────────────────────────────────
//  Tunable export — tests import these to check threshold behavior
// ───────────────────────────────────────────────────────────────────

export const WITNESSING_THRESHOLDS = {
  PARALLEL_PRESENCE,
  MUTUAL_WITNESSING,
  SHARED_ATTENTION,
  BEARING_WITNESS,
  JOYFUL_REUNION,
};

// Provide `id` types for callers using `KoiId`
export type { KoiId };
