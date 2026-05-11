// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Bond intensity (§ X)
//  ─────────────────────────────────────────────────────────────────────────
//  Replaces the 3-of-7 mutual drawn-to scan that gated reproduction in
//  earlier revisions (DRAWN_TO in constants.ts, marked deprecated). Bond
//  intensity is a scalar ∈ [0, 1] derived from the relationship card
//  row; it accumulates through proximity, witnessing, and survived
//  events together rather than through a drawn-to lexical claim.
//
//  Per Final Vision:
//
//      intensity = clamp(
//          0.5 * valence
//        + 0.2 * tanh(interactionCount / 30)
//        + 0.2 * witnessingDensity7d
//        + 0.1 * familiarityPrior
//        , 0, 1)
//
//  Components, with the reasoning behind each weight:
//
//    valence (0.5)   — the strongest single signal. The card's running
//                       average of pad-delta from interactions with this
//                       other; -1..+1, but bond intensity treats only
//                       positive valence as bond-building. Negative
//                       valence drops bond to 0 (a ruptured pair is in
//                       repair territory, not a bond).
//
//    interactionCount via tanh (0.2)
//                    — saturates around count = 30. The first thirty
//                       interactions matter a lot; the next thirty less
//                       so. Bond doesn't grow indefinitely just by
//                       proximity.
//
//    witnessingDensity7d (0.2)
//                    — fraction of recent witnessing events that
//                       included this pair, normalized to [0, 1].
//                       Witnessing is the load-bearing mechanism of the
//                       bond architecture — pairs that witness each
//                       other regularly bond faster than pairs that
//                       just co-exist. Currently passed as a parameter
//                       (default 0); a future twilight-reflection pass
//                       should compute and store this on the card
//                       alongside drawnCount7d.
//
//    familiarityPrior (0.1)
//                    — small bonus for shared lineage / shared early
//                       life / shared crisis-survival. Founders Shiki
//                       and Kokutou are seeded above the reproduction
//                       threshold via valence (BOND.founderSeedValence
//                       = 0.6); subsequent generations inherit a small
//                       prior here from their parents' relationships.
//
//  Used by:
//    - reproduction.ts — eligibility gate (BOND.reproductionThreshold)
//    - play.ts         — pair-cooldown reduction for bonded pairs
//                        (BOND.bondedCourtshipCooldownFactor)
//    - cognition.ts    — orientation block, ranking partners by bond
//                        intensity in the prompt
//    - memory.ts       — 1.5× retrieval bias on partner-involving
//                        memories where the partner is bonded
// ═══════════════════════════════════════════════════════════════════════════

import { BOND } from "../constants.js";
import type { RelationshipCard } from "../types.js";

/**
 * Compute bond intensity ∈ [0, 1] from a relationship card.
 *
 * Negative valence is clamped at 0 — bonds don't go negative; a ruptured
 * pair has intensity 0 and rebuilds through repair, not through
 * anti-bonding.
 *
 * @param card  The relationship card from `self → other`.
 * @param witnessingDensity7d  Optional witnessing-density component
 *   ∈ [0, 1]. Pass 0 (or omit) until the twilight-reflection pass
 *   that computes and stores this exists; bond intensity will then
 *   accrue purely from valence + interaction count + familiarity.
 *   When the card is extended with `witnessingDensity7d`, prefer
 *   passing `card.witnessingDensity7d` here.
 */
export function bondIntensity(
  card: RelationshipCard,
  witnessingDensity7d: number = 0,
): number {
  // Negative or zero valence: bond is 0 (relationship is in repair
  // territory, not a bond at all).
  if (card.valence <= 0) return 0;

  const valenceTerm     = 0.5 * card.valence;
  const interactionTerm = 0.2 * Math.tanh(card.interactionCount / 30);
  const witnessingTerm  = 0.2 * Math.max(0, Math.min(1, witnessingDensity7d));
  const familiarityTerm = 0.1 * Math.max(0, Math.min(1, card.familiarityPrior));

  const sum = valenceTerm + interactionTerm + witnessingTerm + familiarityTerm;
  return Math.max(0, Math.min(1, sum));
}

/**
 * Boolean gate: is this card's bond intensity above the reproduction
 * threshold? Per BOND.reproductionThreshold (currently 0.55).
 *
 * Bond is mutual by construction — a unilateral attachment doesn't
 * qualify for reproduction. Use `isMutuallyBonded` when checking a
 * pair, not this function on a single card.
 */
export function isBonded(
  card: RelationshipCard,
  witnessingDensity7d: number = 0,
): boolean {
  return bondIntensity(card, witnessingDensity7d) >= BOND.reproductionThreshold;
}

/**
 * Symmetric check: are TWO cards (a→b and b→a) both above threshold?
 *
 * Bond is mutual by construction; reproduction.ts and the
 * orientation-block ranking should both use this rather than checking
 * one card alone. Witnessing density is taken per-direction since
 * witnessing density is asymmetric in principle (a may have witnessed
 * b more than b witnessed a, e.g., during illness or grief).
 */
export function isMutuallyBonded(
  cardAtoB: RelationshipCard,
  cardBtoA: RelationshipCard,
  densityAtoB: number = 0,
  densityBtoA: number = 0,
): boolean {
  return isBonded(cardAtoB, densityAtoB) && isBonded(cardBtoA, densityBtoA);
}

/**
 * Sort items by bond intensity, descending. Used by cognition.ts
 * orientation block — "your closest others" goes first; by memory.ts
 * scoring; anywhere a stable ranking by bond is needed.
 *
 * Items are arbitrary objects that carry a card; the caller can also
 * pass per-item witnessing densities via the optional density getter.
 */
export function rankByBond<T>(
  items: T[],
  cardOf: (item: T) => RelationshipCard,
  densityOf?: (item: T) => number,
): T[] {
  const intensityOf = (item: T): number =>
    bondIntensity(cardOf(item), densityOf ? densityOf(item) : 0);
  return [...items].sort((a, b) => intensityOf(b) - intensityOf(a));
}

/**
 * The "drawn-to" sense — historical, not architectural. Returns true
 * when the older `drawnCount7d ≥ 4-of-7` signal would have fired.
 *
 * Provided for back-compat with code paths that read the older
 * reproduction signal directly. **Do not use for reproduction
 * eligibility** — `isMutuallyBonded` is the canonical gate. This
 * helper exists so reproduction.ts can be rewritten incrementally:
 * old call sites can shim through here while the architecture moves
 * to bond intensity.
 */
export function drawnToSignal(card: RelationshipCard): boolean {
  return card.drawnCount7d >= 4;
}
