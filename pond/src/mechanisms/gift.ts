// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Gift family (§ IX)
//  ─────────────────────────────────────────────────────────────────────────
//  Four mechanisms of circulation: gift, pass_it_forward, heirloom, offering.
//  (memory_gifting and shared_food deferred — the first overlaps Teaching,
//  the second requires food mechanics not yet implemented.)
//
//  Gift is the family where the agreeable-LLM problem is sharpest: nothing
//  in the training distribution would stop a language model from making
//  every koi give gifts to every other koi constantly, because giving
//  gifts is nice and niceness is rewarded. The manifesto responds with
//  hard scarcity rules that the simulation enforces regardless of LLM
//  output:
//
//    - One gift produced per koi per 7 sim-days
//    - Inventory capped at 3 items
//    - Found-material spawn rate bounded pond-wide
//    - Production requires an artifact the giver actually holds
//
//  Claim + state together: the LLM can EXPRESS intent to give (via
//  intent="approach" with target_koi set while holding an artifact, or
//  via mechanism="gift"), but the simulation controls whether a gift
//  actually fires based on proximity, inventory, and cooldown. The LLM's
//  desire is a biasing signal; it is not a license.
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiId, LoveFlowMechanism, SimTick } from "../types.js";
import {
  DetectionContext, MechanismFiring, FAMILY_OF, lastFiredTick,
} from "./types.js";
import {
  ARTIFACT_LIMITS, ArtifactRow, loadHeldArtifacts, countHeldBy, hasCapacity,
  lastGiftGivenTick, transferAsGift, offerAtShrine,
} from "../artifacts.js";
import { POND, SIM } from "../constants.js";

// ───────────────────────────────────────────────────────────────────
//  Tunable thresholds
// ───────────────────────────────────────────────────────────────────

const GIFT_THRESHOLDS = {
  /** Max proximity at which a gift can fire (the giver must be near
   *  the recipient). */
  maxGiftProximityM: 0.5,
  /** Minimum relationship valence toward the recipient to gift. A koi
   *  does not give to strangers — matches § IX: "gifts confirm bondedness,
   *  they do not build it." */
  minGiverValence: 0.15,
  /** Offering at shrine requires proximity to the shrine. */
  maxShrineProximityM: 0.8,
  /** Cooldown on shrine offerings by a single koi — looser than gifting. */
  offeringCooldownSimHours: 24,
  /** Cooldown between distinct gifting events for the same actor-recipient. */
  giftCooldownSimHours: 24,
} as const;

// ───────────────────────────────────────────────────────────────────
//  Gift detection — fires when the situation aligns with a koi's
//  recent cognition expressing care + their inventory has an item
// ───────────────────────────────────────────────────────────────────

/**
 * Detect gift firings. A gift fires when:
 *   1. The giver is alive, past juvenile, and holds ≥1 artifact
 *   2. The giver has not given a gift in the last 7 sim-days
 *   3. A target is nearby (< 0.5m) who is also past juvenile
 *   4. The giver has a relationship_card toward the target with
 *      valence ≥ 0.15 (bondedness precondition)
 *   5. No gift to this specific recipient in 24 sim-hours
 *
 * The detector does NOT consult the LLM. The LLM's expressed intent
 * to "approach" or "linger" toward the target is what creates the
 * kinematic proximity in the first place — that is how the LLM
 * "expresses" a gift intent without the simulation having to honor
 * a fragile textual claim.
 */
export function detectGift(
  ctx: DetectionContext,
): GiftDetection[] {
  const out: GiftDetection[] = [];

  for (const giver of ctx.koi) {
    if (giver.stage === "egg" || giver.stage === "fry" || giver.stage === "dying") continue;

    // Inventory precondition
    const held = loadHeldArtifacts(ctx.sql, giver.id);
    if (held.length === 0) continue;

    // Cooldown: one gift per 7 sim-days
    const cooldownTicks =
      ARTIFACT_LIMITS.giftCooldownSimDays * 24 * 3600 * ctx.tickHz;
    const lastGift = lastGiftGivenTick(ctx.sql, giver.id, ctx.tick);
    if (lastGift !== null && ctx.tick - lastGift < cooldownTicks) continue;

    // Find a nearby recipient
    for (const target of ctx.koi) {
      if (target.id === giver.id) continue;
      if (target.stage === "egg" || target.stage === "fry" || target.stage === "dying") continue;
      const d = Math.hypot(giver.x - target.x, giver.z - target.z);
      if (d > GIFT_THRESHOLDS.maxGiftProximityM) continue;

      // Bondedness precondition
      const cardRow = ctx.sql.exec(
        `SELECT valence FROM relationship_card
          WHERE self_id = ? AND other_id = ?`,
        giver.id, target.id,
      ).toArray()[0];
      const valence = (cardRow?.["valence"] as number | undefined) ?? 0;
      if (valence < GIFT_THRESHOLDS.minGiverValence) continue;

      // Recipient can accept?
      if (!hasCapacity(ctx.sql, target.id)) continue;

      // Pair-level cooldown
      const pairCooldown = Math.floor(
        GIFT_THRESHOLDS.giftCooldownSimHours * 3600 * ctx.tickHz,
      );
      const recentToThisRecipient = lastFiredTick(
        ctx.sql, "gift", giver.id, [target.id],
        ctx.tick, pairCooldown,
      );
      if (recentToThisRecipient !== null) continue;

      // Choose which artifact to give — the one with the lowest wear
      // (gives the nicest thing, as the manifesto suggests)
      const artifact = [...held].sort((a, b) => a.wear - b.wear)[0]!;

      // Determine whether this is pass_it_forward: the giver received
      // this artifact as a gift earlier in the chain
      const priorOwn = ctx.sql.exec(
        `SELECT COUNT(*) AS n FROM artifact_provenance
          WHERE artifact_id = ?
            AND mode = 'given'
            AND to_holder = ?`,
        artifact.id, giver.id,
      ).toArray()[0];
      const isPassItForward =
        ((priorOwn?.["n"] as number) ?? 0) > 0;

      out.push({
        mechanism: isPassItForward ? "pass_it_forward" : "gift",
        giver: giver.id,
        recipient: target.id,
        artifact,
        giverValence: valence,
        chainLengthSoFar: (priorOwn?.["n"] as number) ?? 0,
      });

      // Only one gift per giver per detection pass
      break;
    }
  }
  return out;
}

export interface GiftDetection {
  mechanism: "gift" | "pass_it_forward";
  giver: KoiId;
  recipient: KoiId;
  artifact: ArtifactRow;
  giverValence: number;
  /** Number of prior "given" provenance rows where this fish received
   *  the artifact. Drives pass_it_forward distinction. */
  chainLengthSoFar: number;
}

/** Convert a GiftDetection into a MechanismFiring. Called after the
 *  caller has performed the actual transferAsGift(). */
export function giftDetectionToFiring(
  d: GiftDetection, atTick: SimTick,
): MechanismFiring {
  const isForward = d.mechanism === "pass_it_forward";
  // Forward-passing has slightly less intensity than the original gift —
  // matches § IX: pass_it_forward is recognition, gift is generation.
  const actorDp = isForward ? 0.06 : 0.09;
  const recipientDp = isForward ? 0.08 : 0.14;
  return {
    mechanism: d.mechanism as LoveFlowMechanism,
    family: FAMILY_OF[d.mechanism as LoveFlowMechanism],
    actor: d.giver,
    participants: [d.giver, d.recipient],
    tick: atTick,
    actorDelta: { p: actorDp, d: 0.02 },
    participantDelta: { p: recipientDp, d: -0.01 },
    payload: {
      artifact_id: d.artifact.id,
      artifact_type: d.artifact.type,
      chain_length_so_far: d.chainLengthSoFar,
      giver_valence: d.giverValence,
    },
    cardValenceBump: isForward ? 0.05 : 0.08,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Offering at shrine — solitary, anonymous, no recipient
// ───────────────────────────────────────────────────────────────────

/**
 * Detect offerings. Fires when a koi carrying an artifact is at the
 * shrine and has not offered in the last 24 sim-hours. No recipient
 * required — this is a mechanism of care for the pond itself, not
 * for another specific koi.
 */
export function detectOffering(
  ctx: DetectionContext,
): MechanismFiring[] {
  const out: MechanismFiring[] = [];

  for (const k of ctx.koi) {
    if (k.stage === "egg" || k.stage === "fry" || k.stage === "dying") continue;

    // Inventory precondition
    const held = loadHeldArtifacts(ctx.sql, k.id);
    if (held.length === 0) continue;

    // Proximity to shrine
    const d = Math.hypot(k.x - POND.shrine.x, k.z - POND.shrine.z);
    if (d > GIFT_THRESHOLDS.maxShrineProximityM) continue;

    // Cooldown per koi
    const cooldown = Math.floor(
      GIFT_THRESHOLDS.offeringCooldownSimHours * 3600 * ctx.tickHz,
    );
    const recent = lastFiredTick(
      ctx.sql, "offering", k.id, [], ctx.tick, cooldown,
    );
    if (recent !== null) continue;

    // Use the most-worn artifact — letting go of what is ending.
    const artifact = [...held].sort((a, b) => b.wear - a.wear)[0]!;
    // Perform the offering
    offerAtShrine(ctx.sql, artifact, k.id, ctx.tick);

    out.push({
      mechanism: "offering",
      family: FAMILY_OF["offering"],
      actor: k.id,
      participants: [k.id],
      tick: ctx.tick,
      actorDelta: { p: 0.10, a: -0.04, d: 0.04 },
      participantDelta: { p: 0 },
      payload: {
        artifact_id: artifact.id,
        artifact_type: artifact.type,
        wear: artifact.wear,
      },
      cardValenceBump: 0,
    });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
//  Gift family runner — called from the mechanism orchestrator
//
//  Gifts have a side effect on the artifact table (transferAsGift) so
//  the detector performs the transfer and returns the firing. This
//  diverges from the witnessing pattern where detectors are pure.
//  It's acceptable because gifts are claim-adjacent: the mechanism
//  includes the state mutation as part of its definition.
// ───────────────────────────────────────────────────────────────────

export function runGiftFamily(
  ctx: DetectionContext,
): MechanismFiring[] {
  const firings: MechanismFiring[] = [];

  for (const d of detectGift(ctx)) {
    transferAsGift(ctx.sql, d.artifact, d.giver, d.recipient, ctx.tick);
    firings.push(giftDetectionToFiring(d, ctx.tick));
  }

  for (const f of detectOffering(ctx)) {
    firings.push(f);
  }

  return firings;
}

// Suppress unused-import warnings on types we export publicly but
// don't use internally — keeps the module's surface honest.
void SIM;
void countHeldBy;
