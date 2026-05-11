// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Mechanism orchestration (§ IX)
//  ─────────────────────────────────────────────────────────────────────────
//  Two entry points for the DO alarm loop:
//
//    runStateDetectors(ctx) — called every N ticks. Returns all firings
//                             the simulation detected. Caller applies.
//
//    validateClaim(...)     — called from applyCognitionResponse when
//                             the LLM claims a mechanism. Returns a
//                             honored firing OR a downgrade record.
//
//  Both paths produce MechanismFiring values that the caller is expected
//  to: emit as events, apply PAD deltas, bump relationship cards.
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiId, LoveFlowMechanism, SimTick } from "../types.js";
import {
  DetectionContext, MechanismFiring, ValidationOutcome,
} from "./types.js";
import { runWitnessingDetectors } from "./witnessing.js";
import {
  validateApology, validateForgiveness,
  isClaimValidated, logRupture,
} from "./repair.js";
import { runGiftFamily } from "./gift.js";
import { runPlayFamily } from "./play.js";

/** How often the DO should call runStateDetectors, in ticks. */
export const DETECTOR_INTERVAL_TICKS = 30;  // 15 sim-seconds at 2 Hz

/** Runs every state-based detector across all families. The returned
 *  firings must be applied (PAD + cards + event) by the caller.
 *
 *  Repair has no state-based detectors at the moment — both wired
 *  repair mechanisms (apology, forgiveness) are claim-based and route
 *  through validateClaim() instead. The teaching family is post-launch
 *  work and is intentionally absent from the runtime. */
export function runStateDetectors(
  ctx: DetectionContext,
): MechanismFiring[] {
  return [
    ...runWitnessingDetectors(ctx),
    ...runGiftFamily(ctx),
    ...runPlayFamily(ctx),
  ];
}

/** Validate an LLM-claimed mechanism against pond state. */
export function validateClaim(
  sql: SqlStorage,
  mechanism: LoveFlowMechanism,
  actor: KoiId, target: KoiId,
  nowTick: SimTick, tickHz: number,
): ValidationOutcome | null {
  // Only claim-validated mechanisms route through this function.
  // Any other claim is silently accepted by the caller (state-based
  // mechanisms don't use claims).
  if (!isClaimValidated(mechanism)) return null;
  switch (mechanism) {
    case "apology":
      return validateApology(sql, actor, target, nowTick, tickHz);
    case "forgiveness":
      return validateForgiveness(sql, actor, target, nowTick, tickHz);
    default:
      return null;
  }
}

// Re-export for DO consumption
export { logRupture };
export type { MechanismFiring, ValidationOutcome, DetectionContext };
