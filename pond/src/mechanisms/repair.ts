// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Repair family (§ IX)
//  ─────────────────────────────────────────────────────────────────────────
//  Six mechanisms of rupture-and-return. Repair is where the paper's
//  central claim actually bites: *rupture is generative when repaired*.
//  A pair that has demonstrated to itself that rupture-repair is
//  available carries a structurally different trust than an untested pair.
//
//  Two of these (apology, forgiveness) are CLAIM-BASED: the LLM returns
//  a response with `mechanism: "apology"` and the simulation decides
//  whether to honor the claim (a prior rupture exists in the pair's
//  14-day window) or downgrade it to research data (no rupture → the
//  claim becomes a "would_have_apologized" record). This is the
//  § IX guard against the LLM's tendency toward agreeableness — it
//  prevents fish from apologizing their way into constant intimacy.
//
//  The other four (cognitive_repair, emotional_attunement,
//  farewell_ritual, grief_companionship) are scaffolded here with
//  their detection rules stubbed for future wiring. The shape is
//  ready; filling them in is a later pass.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  KoiId, KoiState, LoveFlowMechanism, SimTick,
} from "../types.js";
import type { EventEnvelope } from "../types.js";
import {
  DetectionContext, MechanismFiring, RuptureRecord, ValidationOutcome,
  FAMILY_OF,
} from "./types.js";
import { emit } from "../events.js";

// ───────────────────────────────────────────────────────────────────
//  Thresholds (§ IX)
// ───────────────────────────────────────────────────────────────────

export const REPAIR_THRESHOLDS = {
  /** Window for considering a rupture "recent" for apology validation. */
  apologyLookbackSimDays: 14,
  /** Minimum valence drop for an event to count as a rupture. (§ IX) */
  ruptureMinValenceDrop: 0.3,
  /** Forgiveness requires a matching prior apology within this window. */
  forgivenessLookbackSimDays: 14,
} as const;

// ───────────────────────────────────────────────────────────────────
//  Rupture logging
//
//  The simulation can call this anywhere a koi's valence is cut hard
//  enough by another koi's action. Typical triggers:
//    - bump_by_dominant   (kinematic collision where A > B in dominance)
//    - food_denied        (A arrives at food A wanted, another koi holds it)
//    - threat_display     (aggressive posture from a higher-ranking fish)
//
//  Stored as an event of type "rupture" with the pair identifiers in
//  `targets_json` and the valence_drop magnitude in payload. No new
//  table — the event log is the system of record. (§ XV.)
// ───────────────────────────────────────────────────────────────────

export async function logRupture(
  sql: SqlStorage,
  ae: AnalyticsEngineDataset | undefined,
  context: { pondId: string; configHash: string },
  rupture: RuptureRecord,
): Promise<EventEnvelope> {
  return emit(sql, ae, context, {
    tick: rupture.tick,
    actor: `koi:${rupture.actor}`,
    type: "rupture",
    targets: [rupture.target],
    payload: {
      cause: rupture.cause,
      valence_drop: rupture.valenceDrop,
    },
  });
}

/**
 * Find the most recent rupture event for this directed pair
 * (actor → target) within the lookback window. Returns the tick if
 * found, else null. Used by apology validation.
 *
 * The query is directed: an apology by A to B requires that A
 * ruptured B, not the other way around. Koi apologize for what they
 * did, not for what was done to them.
 */
export function findRecentRupture(
  sql: SqlStorage,
  actor: KoiId, target: KoiId,
  nowTick: SimTick, tickHz: number,
): { tick: SimTick; valenceDrop: number } | null {
  const lower = nowTick -
    REPAIR_THRESHOLDS.apologyLookbackSimDays * 24 * 3600 * tickHz;
  const row = sql.exec(
    `SELECT tick, payload_json
       FROM event
      WHERE type = 'rupture'
        AND actor = ?
        AND targets_json LIKE ?
        AND tick > ?
      ORDER BY tick DESC LIMIT 1`,
    `koi:${actor}`, `%"${target}"%`, lower,
  ).toArray()[0];
  if (!row) return null;
  const payload = JSON.parse(row["payload_json"] as string) as {
    valence_drop?: number;
  };
  const drop = payload.valence_drop ?? 0;
  if (drop < REPAIR_THRESHOLDS.ruptureMinValenceDrop) return null;
  return {
    tick: row["tick"] as number,
    valenceDrop: drop,
  };
}

/** Find a prior honored apology for this pair (actor → target), within
 *  the forgiveness lookback window. Forgiveness requires one to exist. */
export function findRecentApology(
  sql: SqlStorage,
  actor: KoiId, target: KoiId,
  nowTick: SimTick, tickHz: number,
): { tick: SimTick } | null {
  const lower = nowTick -
    REPAIR_THRESHOLDS.forgivenessLookbackSimDays * 24 * 3600 * tickHz;
  const row = sql.exec(
    `SELECT tick FROM event
      WHERE type = 'apology'
        AND actor = ?
        AND targets_json LIKE ?
        AND tick > ?
      ORDER BY tick DESC LIMIT 1`,
    `koi:${actor}`, `%"${target}"%`, lower,
  ).toArray()[0];
  if (!row) return null;
  return { tick: row["tick"] as number };
}

// ───────────────────────────────────────────────────────────────────
//  Apology validation (§ IX — the rupture-first guard)
//
//  Called when an LLM cognition response returns `mechanism: "apology"`
//  with a non-null `target_koi`. The validator looks at the event log
//  and either honors the claim (returns a firing that the caller
//  applies) or downgrades it (returns a downgrade record for the
//  research log; no state effect).
// ───────────────────────────────────────────────────────────────────

export function validateApology(
  sql: SqlStorage,
  actor: KoiId, target: KoiId,
  nowTick: SimTick, tickHz: number,
): ValidationOutcome {
  const rupture = findRecentRupture(sql, actor, target, nowTick, tickHz);
  if (!rupture) {
    return {
      kind: "downgraded",
      reason: "no_rupture_within_window",
      firingAttempt: { mechanism: "apology", actor, target },
    };
  }

  return {
    kind: "honored",
    firing: {
      mechanism: "apology",
      family: FAMILY_OF["apology"],
      actor,
      participants: [actor, target],
      tick: nowTick,
      // Actor feels relief; target receives repair — § VIII values
      actorDelta: { p: 0.10, a: -0.02 },
      participantDelta: { p: 0.20, a: -0.05, d: 0.02 },
      payload: {
        ref_rupture_tick: rupture.tick,
        rupture_drop: rupture.valenceDrop,
      },
      cardValenceBump: 0.08,  // repair moves the card more than witnessing
    },
  };
}

// ───────────────────────────────────────────────────────────────────
//  Forgiveness validation
//
//  Requires a prior honored apology by the actor (who was ruptured
//  and is now forgiving) to the target (the original rupturer).
//  NOTE the direction is flipped from apology: A ruptures B → B's
//  apology to A → A's forgiveness of B.
// ───────────────────────────────────────────────────────────────────

export function validateForgiveness(
  sql: SqlStorage,
  actor: KoiId, target: KoiId,
  nowTick: SimTick, tickHz: number,
): ValidationOutcome {
  // A's forgiveness of B requires B's apology to A.
  const apology = findRecentApology(sql, target, actor, nowTick, tickHz);
  if (!apology) {
    return {
      kind: "downgraded",
      reason: "no_prior_apology_within_window",
      firingAttempt: { mechanism: "forgiveness", actor, target },
    };
  }
  return {
    kind: "honored",
    firing: {
      mechanism: "forgiveness",
      family: FAMILY_OF["forgiveness"],
      actor,
      participants: [actor, target],
      tick: nowTick,
      actorDelta: { p: 0.15, a: -0.05 },
      participantDelta: { p: 0.22, a: -0.08 },
      payload: {
        ref_apology_tick: apology.tick,
      },
      cardValenceBump: 0.10,
    },
  };
}

// ───────────────────────────────────────────────────────────────────
//  Downgrade logger — emits the "would_have_apologized" research datum
// ───────────────────────────────────────────────────────────────────

export async function logDowngrade(
  sql: SqlStorage,
  ae: AnalyticsEngineDataset | undefined,
  context: { pondId: string; configHash: string },
  outcome: Extract<ValidationOutcome, { kind: "downgraded" }>,
  tick: SimTick,
): Promise<EventEnvelope> {
  return emit(sql, ae, context, {
    tick,
    actor: `koi:${outcome.firingAttempt.actor}`,
    type: "interaction",    // "interaction" is our generic event type
    targets: [outcome.firingAttempt.target],
    mechanism: outcome.firingAttempt.mechanism,
    payload: {
      downgraded: true,
      reason: outcome.reason,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
//  Scaffolded — wired when event tracking for their preconditions
//  comes online. Documented so the signatures are stable.
// ───────────────────────────────────────────────────────────────────

/**
 * grief_companionship — when a koi lingers near another whose bonded
 * partner just died. Requires the death event log + bonded relation
 * query. Scaffold for future wiring.
 */
export function detectGriefCompanionship(
  _ctx: DetectionContext,
): MechanismFiring[] {
  return [];  // not yet wired
}

/**
 * farewell_ritual — when a koi approaches a dying-stage koi and
 * lingers. Requires the stage check + proximity history.
 */
export function detectFarewellRitual(
  _ctx: DetectionContext,
): MechanismFiring[] {
  return [];  // not yet wired
}

/** emotional_attunement — longer-timescale mood-tracking between pairs. */
export function detectEmotionalAttunement(
  _ctx: DetectionContext,
): MechanismFiring[] {
  return [];  // not yet wired
}

/** cognitive_repair — belief update referencing a prior contradicted belief. */
export function detectCognitiveRepair(
  _ctx: DetectionContext,
): MechanismFiring[] {
  return [];  // not yet wired
}

// ───────────────────────────────────────────────────────────────────
//  Run all scaffolded repair detectors
// ───────────────────────────────────────────────────────────────────

export function runRepairDetectors(
  ctx: DetectionContext,
): MechanismFiring[] {
  return [
    ...detectGriefCompanionship(ctx),
    ...detectFarewellRitual(ctx),
    ...detectEmotionalAttunement(ctx),
    ...detectCognitiveRepair(ctx),
  ];
}

/** Returns true if the given LLM-claimed mechanism is one the repair
 *  family validates (rather than detects from state). Used by the
 *  orchestration layer to route claims to the right validator. */
export function isClaimValidated(m: LoveFlowMechanism): boolean {
  return m === "apology" || m === "forgiveness";
}

export type { KoiId, KoiState, SimTick };
