// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Play family (§ IX)
//  ─────────────────────────────────────────────────────────────────────────
//  Five mechanisms by which koi play with one another:
//
//    play_invitation   — one koi signals "let's play" via an out-of-pattern
//                        move (surface breach, sudden direction change)
//                        within sight of another.
//    tag               — after an invitation, it-ness passes between koi
//                        via proximity contact, chaining until the chain
//                        breaks.
//    dance             — two koi in sustained mutual RESPONSIVE movement.
//                        One leads, the other follows, and who-leads
//                        alternates. Not just parallel swimming.
//    synchronized_swim — two koi in sustained MATCHED movement. Tighter
//                        than dance, no leader.
//    shared_curiosity  — two or more koi converge on the same POI (food,
//                        pebble, solstice) within a short window.
//
//  Design choices worth naming:
//
//  (1) The LLM's `play_invite` intent does not directly fire any mechanism.
//      It influences kinematics — a play-intent-holding koi does a breach
//      or zigzag — and the state-based detector observes that pattern and
//      fires play_invitation. This is the agreeable-LLM guard: we trust
//      kinematic state, not verbal claims.
//
//  (2) Dance is the hardest detection rule in the family. The instinct
//      would be to approximate it with a parallel-movement check, but
//      that collapses dance and synchronized_swim into one mechanism and
//      loses the thing that makes dance real — mutual responsiveness,
//      with role alternation. We detect it properly: rolling correlation
//      between lagged heading-deltas, with a sign-flip requirement to
//      confirm role-switching. Expensive per pair, but pairs-within-1m
//      is a small set at any tick.
//
//  (3) Scarcity deferred. The cooldowns declared below are placeholders
//      set permissively. Once play + teaching + ritual are all wired and
//      the pond runs for real sim-days, the natural rate of each mechanism
//      will reveal itself, and we'll tighten cooldowns to match the
//      observed distribution of actually-meaningful firings. Right now,
//      over-firing is preferable to under-firing: we want to see what
//      the simulation produces before we prune.
//
//  (4) KoiState gained two load-bearing fields for this family:
//        - tagState           : the it-ness chain, nullable
//        - recentHeadings     : 30-tick ring buffer for correlation math
//      Both are populated at every cognition/kinematics tick by the
//      caller; this file reads them but does not write them (except
//      tagState, which this family owns).
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiId, KoiState, SimTick } from "../types.js";
import {
  DetectionContext, MechanismFiring, FAMILY_OF, lastFiredTick,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Tunable thresholds — permissive pending pond observation
// ───────────────────────────────────────────────────────────────────

const PLAY_THRESHOLDS = {
  // ── play_invitation ──
  invitationMaxProximityM: 2.5,
  invitationMinActorArousal: 0.6,
  invitationMinActorValence: 0.2,
  invitationMinTargetArousal: 0.3,
  invitationHeadingSpikeRad: Math.PI / 2,   // > 90° change in 2 ticks
  invitationVelocitySpikeRatio: 1.5,        // 1.5× actor's rolling mean
  invitationPairCooldownSimHours: 2,        // permissive; tighten later

  // ── tag ──
  tagInvitationWindowTicks: 30,             // 15 sim-sec to convert invitation → tag
  tagContactProximityM: 0.4,
  tagChainTimeoutTicks: 60,                 // 30 sim-sec of no contact = chain ends
  tagPairCooldownSimHours: 1,

  // ── dance ──
  danceMaxProximityM: 1.0,
  danceWindowTicks: 20,                     // 10 sim-sec window to test correlation
  danceMinStages: "adolescent",             // both must be adolescent+
  danceCorrelationThreshold: 0.25,          // loose; revise after observation
  danceMaxLagTicks: 3,                      // test δ ∈ {1, 2, 3}
  danceRequireSignFlip: true,               // role alternation required
  dancePairCooldownSimHours: 3,

  // ── synchronized_swim ──
  syncMaxProximityM: 0.6,
  syncMaxVelocityDeltaMps: 0.15,
  syncMaxHeadingDeltaRad: Math.PI / 8,
  syncRequiredSustainTicks: 40,             // 20 sim-sec continuous match
  syncExcludeIfThirdWithinM: 1.5,           // dyadic, not shoal
  syncPairCooldownSimHours: 2,

  // ── shared_curiosity ──
  curiosityMaxPoiProximityM: 1.0,
  curiosityArrivalWindowTicks: 20,          // 10 sim-sec — both arrived recently
  curiosityMinParticipantValence: 0.0,
  curiosityPerPoiCooldownTicks: 60,
} as const;

// Per-tick heading buffer size — enough to cover the dance window plus some.
export const RECENT_HEADINGS_BUFFER_SIZE = 30;

// ───────────────────────────────────────────────────────────────────
//  Ring-buffer helper for recentHeadings
//
//  Call from the kinematics tick. Maintains a sliding window of the
//  last RECENT_HEADINGS_BUFFER_SIZE heading values, newest last.
// ───────────────────────────────────────────────────────────────────

export function pushHeading(state: KoiState, h: number): void {
  state.recentHeadings.push(h);
  if (state.recentHeadings.length > RECENT_HEADINGS_BUFFER_SIZE) {
    state.recentHeadings.shift();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  play_invitation
// ═══════════════════════════════════════════════════════════════════

interface InvitationDetection {
  actor: KoiId;
  target: KoiId;
  pattern: "surface_breach" | "heading_spike" | "velocity_spike";
}

/**
 * A koi has just performed an out-of-pattern move near a viable target.
 * Fires at most once per actor per detection pass.
 *
 * The detector reads recent kinematic state: heading deltas over the
 * last 2 ticks, current velocity magnitude vs. the actor's recent mean.
 * If a spike is present AND a viable target is nearby, the invitation
 * fires.
 */
function detectPlayInvitation(ctx: DetectionContext): InvitationDetection[] {
  const out: InvitationDetection[] = [];

  for (const actor of ctx.koi) {
    if (!isPlayEligible(actor)) continue;
    if (actor.pad.a < PLAY_THRESHOLDS.invitationMinActorArousal) continue;
    if (actor.pad.p < PLAY_THRESHOLDS.invitationMinActorValence) continue;

    // Detect an out-of-pattern move. Three ways:
    //   a. Current intent is surface_breach (the clearest expression)
    //   b. Heading changed > π/2 over the last 2 ticks
    //   c. Velocity is > 1.5× the actor's rolling mean
    const pattern = detectKinematicSpike(actor);
    if (pattern === null) continue;

    // Find a viable target
    for (const target of ctx.koi) {
      if (target.id === actor.id) continue;
      if (!isPlayEligible(target)) continue;
      if (target.pad.a < PLAY_THRESHOLDS.invitationMinTargetArousal) continue;
      if (target.intent.kind === "retreat" || target.intent.kind === "shelter") continue;

      const d = Math.hypot(actor.x - target.x, actor.z - target.z);
      if (d > PLAY_THRESHOLDS.invitationMaxProximityM) continue;

      // Pair cooldown
      const cd = Math.floor(
        PLAY_THRESHOLDS.invitationPairCooldownSimHours * 3600 * ctx.tickHz,
      );
      const recent = lastFiredTick(
        ctx.sql, "play_invitation", actor.id, [target.id], ctx.tick, cd,
      );
      if (recent !== null) continue;

      out.push({ actor: actor.id, target: target.id, pattern });
      break;  // one invitation per actor per pass
    }
  }
  return out;
}

function detectKinematicSpike(
  k: KoiState,
): InvitationDetection["pattern"] | null {
  if (k.intent.kind === "surface_breach") return "surface_breach";

  // Heading spike — compare last two heading samples
  const hs = k.recentHeadings;
  if (hs.length >= 2) {
    const h0 = hs[hs.length - 2]!;
    const h1 = hs[hs.length - 1]!;
    const dh = Math.abs(normalizeAngle(h1 - h0));
    if (dh > PLAY_THRESHOLDS.invitationHeadingSpikeRad) {
      return "heading_spike";
    }
  }

  // Velocity spike — compare current speed to rolling mean
  // (We don't have a rolling velocity buffer; use a rough proxy: speed
  //  relative to a koi's stage-normal. Kinematics can later feed a real
  //  recentSpeeds buffer parallel to recentHeadings.)
  const speed = Math.hypot(k.vx, k.vz);
  const stageNormal = stageNormalSpeed(k.stage);
  if (stageNormal > 0 && speed / stageNormal > PLAY_THRESHOLDS.invitationVelocitySpikeRatio) {
    return "velocity_spike";
  }

  return null;
}

function invitationDetectionToFiring(
  d: InvitationDetection, atTick: SimTick,
): MechanismFiring {
  return {
    mechanism: "play_invitation",
    family: FAMILY_OF["play_invitation"],
    actor: d.actor,
    participants: [d.actor, d.target],
    tick: atTick,
    actorDelta: { p: 0.05, a: 0.10 },
    participantDelta: { p: 0.04, a: 0.15 },  // the invitation wakes the target
    payload: { pattern: d.pattern },
    cardValenceBump: 0.03,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  tag
//
//  Two-layer state machine:
//
//    Layer 1 (kinematic):  a koi with play_invitation recently made
//                          toward them makes contact with the inviter.
//                          it-ness flips.
//    Layer 2 (chain):      the new it-holder makes contact with a third
//                          koi (or back with the original). Chain
//                          continues. Timeout: 60 ticks of no contact.
//
//  KoiState.tagState carries the chain state.
// ═══════════════════════════════════════════════════════════════════

interface TagEvent {
  tagger: KoiId;
  tagged: KoiId;
  chainLength: number;
  chainStartedTick: SimTick;
}

function detectTag(ctx: DetectionContext): TagEvent[] {
  const out: TagEvent[] = [];

  for (const k of ctx.koi) {
    if (!isPlayEligible(k)) continue;

    // Case A: k has no tagState — check if they just got invited and
    // are now contacting their inviter.
    if (k.tagState === null) {
      const invitationTick = recentInvitationTowardMe(ctx, k.id);
      if (invitationTick === null) continue;

      // Did the invitation's actor get contacted by k?
      const inviter = recentInvitationActor(ctx, k.id);
      if (inviter === null) continue;
      const inviterState = ctx.koi.find((o) => o.id === inviter);
      if (!inviterState) continue;
      const d = Math.hypot(k.x - inviterState.x, k.z - inviterState.z);
      if (d > PLAY_THRESHOLDS.tagContactProximityM) continue;

      // Pair cooldown
      const cd = Math.floor(
        PLAY_THRESHOLDS.tagPairCooldownSimHours * 3600 * ctx.tickHz,
      );
      const recent = lastFiredTick(
        ctx.sql, "tag", k.id, [inviter], ctx.tick, cd,
      );
      if (recent !== null) continue;

      out.push({
        tagger: k.id,
        tagged: inviter,
        chainLength: 1,
        chainStartedTick: ctx.tick,
      });
      continue;
    }

    // Case B: k HAS tagState — if k is currently "it," they're looking
    // for someone to tag. If they make contact with another koi within
    // the chain timeout, the chain continues.
    if (k.tagState.isIt) {
      const chainAge = ctx.tick - k.tagState.lastContactTick;
      if (chainAge > PLAY_THRESHOLDS.tagChainTimeoutTicks) continue;

      for (const o of ctx.koi) {
        if (o.id === k.id) continue;
        if (o.id === k.tagState.taggerId) continue;  // can't re-tag who just tagged you
        if (!isPlayEligible(o)) continue;

        const d = Math.hypot(k.x - o.x, k.z - o.z);
        if (d > PLAY_THRESHOLDS.tagContactProximityM) continue;

        out.push({
          tagger: k.id,
          tagged: o.id,
          chainLength: chainLengthOf(ctx, k.tagState.chainStartedTick) + 1,
          chainStartedTick: k.tagState.chainStartedTick,
        });
        break;
      }
    }
  }
  return out;
}

function tagEventToFiring(t: TagEvent, atTick: SimTick): MechanismFiring {
  // Chain length shapes the intensity. First tag in a chain: modest.
  // Tag of four: euphoric.
  const intensity = Math.min(1.0, 0.3 + 0.1 * t.chainLength);
  return {
    mechanism: "tag",
    family: FAMILY_OF["tag"],
    actor: t.tagger,
    participants: [t.tagger, t.tagged],
    tick: atTick,
    actorDelta: { p: 0.05 * intensity, a: 0.08 * intensity },
    participantDelta: { p: 0.04 * intensity, a: 0.10 * intensity },
    payload: {
      chain_length: t.chainLength,
      chain_started_tick: t.chainStartedTick,
    },
    cardValenceBump: 0.02 * intensity,
  };
}

/**
 * Apply a tag event's state changes to the tagger/tagged koi's tagState
 * fields. Called by the caller after firing has been recorded.
 */
export function applyTagEvent(
  t: TagEvent, tagger: KoiState, tagged: KoiState, atTick: SimTick,
): void {
  // Tagger is no longer "it"; tagged is now.
  tagger.tagState = null;
  tagged.tagState = {
    isIt: true,
    taggerId: t.tagger,
    chainStartedTick: t.chainStartedTick,
    lastContactTick: atTick,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  dance — the hard one
//
//  Two koi in sustained mutual responsive movement. Detection over a
//  20-tick window of recentHeadings. For each δ ∈ {1,2,3}, compute the
//  correlation between Δh_A and Δh_B lagged by δ. Take the best-scoring
//  δ per direction (A leads, B leads). A valid dance has:
//
//    (a) best correlation across any lag exceeds threshold
//    (b) the "leader" alternates within the window — some ticks A's
//        delta explains B's next, others B's delta explains A's next
//
//  Without (b), we'd catch pure follow-the-leader behavior, which isn't
//  dance. Dance is conversation-in-movement.
// ═══════════════════════════════════════════════════════════════════

interface DanceDetection {
  koiA: KoiId;
  koiB: KoiId;
  correlation: number;
  dominantLag: number;
}

function detectDance(ctx: DetectionContext): DanceDetection[] {
  const out: DanceDetection[] = [];
  const seen = new Set<string>();

  for (const a of ctx.koi) {
    if (!isDanceEligible(a)) continue;
    if (a.recentHeadings.length < PLAY_THRESHOLDS.danceWindowTicks) continue;

    for (const b of ctx.koi) {
      if (b.id === a.id) continue;
      if (!isDanceEligible(b)) continue;
      if (b.recentHeadings.length < PLAY_THRESHOLDS.danceWindowTicks) continue;

      // Canonical pair ordering so we don't detect (A,B) and (B,A)
      const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d > PLAY_THRESHOLDS.danceMaxProximityM) continue;

      // Pair cooldown
      const cd = Math.floor(
        PLAY_THRESHOLDS.dancePairCooldownSimHours * 3600 * ctx.tickHz,
      );
      const recent = lastFiredTick(
        ctx.sql, "dance", a.id, [b.id], ctx.tick, cd,
      );
      if (recent !== null) continue;

      const result = computeDanceCorrelation(
        a.recentHeadings, b.recentHeadings,
        PLAY_THRESHOLDS.danceWindowTicks,
        PLAY_THRESHOLDS.danceMaxLagTicks,
      );

      if (result.bestCorrelation < PLAY_THRESHOLDS.danceCorrelationThreshold) continue;
      if (PLAY_THRESHOLDS.danceRequireSignFlip && !result.leaderAlternated) continue;

      out.push({
        koiA: a.id,
        koiB: b.id,
        correlation: result.bestCorrelation,
        dominantLag: result.bestLag,
      });
    }
  }
  return out;
}

/**
 * Compute the dance-correlation between two heading series over the
 * last `window` ticks, testing lags δ ∈ {1..maxLag} in both directions.
 *
 * Returns the best correlation magnitude and whether the best-scoring
 * direction alternates — i.e. some sub-windows A leads, others B leads.
 * The alternation check is a coarse proxy for "role switching": we
 * split the window in half and check that the sign of (best-δ when A
 * leads) and (best-δ when B leads) are not both strongly in one
 * direction across both halves.
 */
function computeDanceCorrelation(
  hA: number[], hB: number[],
  window: number, maxLag: number,
): { bestCorrelation: number; bestLag: number; leaderAlternated: boolean } {
  // Take the tail `window` samples from each series
  const sA = hA.slice(-window);
  const sB = hB.slice(-window);

  // Compute heading deltas
  const dA: number[] = [];
  const dB: number[] = [];
  for (let i = 1; i < sA.length; i++) {
    dA.push(normalizeAngle(sA[i]! - sA[i - 1]!));
    dB.push(normalizeAngle(sB[i]! - sB[i - 1]!));
  }

  // For each δ and each direction, compute correlation.
  let bestCorrelation = 0;
  let bestLag = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    // Direction 1: A at t correlates with B at t+lag (B follows A)
    const aLeadsB = correlate(
      dA.slice(0, dA.length - lag),
      dB.slice(lag),
    );
    // Direction 2: B at t correlates with A at t+lag (A follows B)
    const bLeadsA = correlate(
      dB.slice(0, dB.length - lag),
      dA.slice(lag),
    );
    const best = Math.max(Math.abs(aLeadsB), Math.abs(bLeadsA));
    if (best > bestCorrelation) {
      bestCorrelation = best;
      bestLag = lag;
    }
  }

  // Leader-alternation check: split window in half, redo the "who leads"
  // test per half, see if the winning direction flips.
  const mid = Math.floor(dA.length / 2);
  const firstHalfLeader = dominantLeader(
    dA.slice(0, mid), dB.slice(0, mid), maxLag,
  );
  const secondHalfLeader = dominantLeader(
    dA.slice(mid), dB.slice(mid), maxLag,
  );
  const leaderAlternated =
    firstHalfLeader !== "tied" &&
    secondHalfLeader !== "tied" &&
    firstHalfLeader !== secondHalfLeader;

  return { bestCorrelation, bestLag, leaderAlternated };
}

function dominantLeader(
  dA: number[], dB: number[], maxLag: number,
): "a" | "b" | "tied" {
  let bestA = 0, bestB = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    if (dA.length - lag < 3) continue;
    const aLeadsB = Math.abs(correlate(dA.slice(0, -lag), dB.slice(lag)));
    const bLeadsA = Math.abs(correlate(dB.slice(0, -lag), dA.slice(lag)));
    if (aLeadsB > bestA) bestA = aLeadsB;
    if (bLeadsA > bestB) bestB = bLeadsA;
  }
  if (Math.abs(bestA - bestB) < 0.1) return "tied";
  return bestA > bestB ? "a" : "b";
}

function correlate(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

function danceDetectionToFiring(d: DanceDetection, atTick: SimTick): MechanismFiring {
  return {
    mechanism: "dance",
    family: FAMILY_OF["dance"],
    actor: d.koiA,
    participants: [d.koiA, d.koiB],
    tick: atTick,
    actorDelta: { p: 0.08, a: 0.05 },
    participantDelta: { p: 0.08, a: 0.05 },
    payload: {
      correlation: d.correlation,
      dominant_lag: d.dominantLag,
    },
    cardValenceBump: 0.04,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  synchronized_swim
// ═══════════════════════════════════════════════════════════════════

interface SyncDetection {
  koiA: KoiId;
  koiB: KoiId;
  sustainedTicks: number;
}

/**
 * Detect dyadic synchronized swimming. Two koi close, matched velocity,
 * matched heading, sustained for ≥ N ticks. Excluded if a third koi is
 * also close AND matching — that's shoaling, not synchronized_swim.
 *
 * This detector doesn't have a direct notion of "sustained" — it just
 * checks that the PAIR has been matching consistently over a reasonable
 * window. We approximate with the recentHeadings buffer: if both koi's
 * recent heading series are tightly matched for the last required ticks,
 * we treat that as sustained.
 */
function detectSynchronizedSwim(ctx: DetectionContext): SyncDetection[] {
  const out: SyncDetection[] = [];
  const seen = new Set<string>();

  for (const a of ctx.koi) {
    if (!isDanceEligible(a)) continue;  // same eligibility gate as dance

    for (const b of ctx.koi) {
      if (b.id === a.id) continue;
      if (!isDanceEligible(b)) continue;
      const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d > PLAY_THRESHOLDS.syncMaxProximityM) continue;

      // Exclude shoal pattern: third koi close and matching
      const hasThird = ctx.koi.some((c) => {
        if (c.id === a.id || c.id === b.id) return false;
        const dc = Math.min(
          Math.hypot(c.x - a.x, c.z - a.z),
          Math.hypot(c.x - b.x, c.z - b.z),
        );
        return dc < PLAY_THRESHOLDS.syncExcludeIfThirdWithinM;
      });
      if (hasThird) continue;

      // Pair cooldown
      const cd = Math.floor(
        PLAY_THRESHOLDS.syncPairCooldownSimHours * 3600 * ctx.tickHz,
      );
      const recent = lastFiredTick(
        ctx.sql, "synchronized_swim", a.id, [b.id], ctx.tick, cd,
      );
      if (recent !== null) continue;

      // Velocity match at current tick
      const dv = Math.hypot(a.vx - b.vx, a.vz - b.vz);
      if (dv > PLAY_THRESHOLDS.syncMaxVelocityDeltaMps) continue;

      // Heading match sustained: how many of the last N headings match?
      const want = PLAY_THRESHOLDS.syncRequiredSustainTicks;
      const hA = a.recentHeadings.slice(-want);
      const hB = b.recentHeadings.slice(-want);
      if (hA.length < want || hB.length < want) continue;

      let matchingTicks = 0;
      for (let i = 0; i < want; i++) {
        const dh = Math.abs(normalizeAngle(hA[i]! - hB[i]!));
        if (dh <= PLAY_THRESHOLDS.syncMaxHeadingDeltaRad) matchingTicks++;
      }
      // Strict-ish: require >=90% of the window matched
      if (matchingTicks < want * 0.9) continue;

      out.push({ koiA: a.id, koiB: b.id, sustainedTicks: matchingTicks });
    }
  }
  return out;
}

function syncDetectionToFiring(s: SyncDetection, atTick: SimTick): MechanismFiring {
  return {
    mechanism: "synchronized_swim",
    family: FAMILY_OF["synchronized_swim"],
    actor: s.koiA,
    participants: [s.koiA, s.koiB],
    tick: atTick,
    actorDelta: { p: 0.06, a: -0.02 },        // calming, not activating
    participantDelta: { p: 0.06, a: -0.02 },
    payload: { sustained_ticks: s.sustainedTicks },
    cardValenceBump: 0.03,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  shared_curiosity
// ═══════════════════════════════════════════════════════════════════

interface CuriosityDetection {
  poiId: string;
  participants: KoiId[];
}

function detectSharedCuriosity(ctx: DetectionContext): CuriosityDetection[] {
  const out: CuriosityDetection[] = [];

  for (const poi of ctx.pois) {
    // Per-POI cooldown
    const recent = ctx.sql.exec(
      `SELECT MAX(tick) AS t FROM event
        WHERE tick > ?
          AND mechanism = 'shared_curiosity'
          AND payload_json LIKE ?`,
      ctx.tick - PLAY_THRESHOLDS.curiosityPerPoiCooldownTicks,
      `%"poi_id":"${poi.id}"%`,
    ).toArray()[0];
    if (recent && typeof recent["t"] === "number") continue;

    const nearbyKoi: KoiId[] = [];
    for (const k of ctx.koi) {
      if (!isPlayEligible(k)) continue;
      if (k.pad.p < PLAY_THRESHOLDS.curiosityMinParticipantValence) continue;

      const d = Math.hypot(k.x - poi.x, k.z - poi.z);
      if (d > PLAY_THRESHOLDS.curiosityMaxPoiProximityM) continue;

      // Arrived recently? Proxy: the koi's current intent is
      // feed_approach/approach/linger AND the POI is newer than the
      // arrival window. (Accurate arrival-tick would need per-koi POI
      // arrival tracking, which we'd add later.)
      const poiAgeInWindow =
        ctx.tick - poi.createdTick < PLAY_THRESHOLDS.curiosityArrivalWindowTicks * 3;
      const attending =
        k.intent.kind === "feed_approach" ||
        k.intent.kind === "approach" ||
        k.intent.kind === "linger";

      if (poiAgeInWindow || attending) nearbyKoi.push(k.id);
    }

    if (nearbyKoi.length >= 2) {
      out.push({ poiId: poi.id, participants: nearbyKoi });
    }
  }
  return out;
}

function curiosityDetectionToFiring(c: CuriosityDetection, atTick: SimTick): MechanismFiring {
  return {
    mechanism: "shared_curiosity",
    family: FAMILY_OF["shared_curiosity"],
    actor: c.participants[0]!,
    participants: c.participants,
    tick: atTick,
    actorDelta: { p: 0.05, a: 0.03 },
    participantDelta: { p: 0.05, a: 0.03 },
    payload: { poi_id: c.poiId, participant_count: c.participants.length },
    cardValenceBump: 0.02,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Family runner
// ═══════════════════════════════════════════════════════════════════

export function runPlayFamily(ctx: DetectionContext): MechanismFiring[] {
  const firings: MechanismFiring[] = [];

  for (const inv of detectPlayInvitation(ctx)) {
    firings.push(invitationDetectionToFiring(inv, ctx.tick));
  }

  // Tag fires do mutate KoiState (the tagState chain). The caller is
  // expected to map the firings back to koi objects and invoke
  // applyTagEvent(). We surface the TagEvent via the firing payload so
  // the caller can reconstruct it.
  for (const t of detectTag(ctx)) {
    firings.push(tagEventToFiring(t, ctx.tick));
  }

  for (const d of detectDance(ctx)) {
    firings.push(danceDetectionToFiring(d, ctx.tick));
  }

  for (const s of detectSynchronizedSwim(ctx)) {
    firings.push(syncDetectionToFiring(s, ctx.tick));
  }

  for (const c of detectSharedCuriosity(ctx)) {
    firings.push(curiosityDetectionToFiring(c, ctx.tick));
  }

  return firings;
}

// ═══════════════════════════════════════════════════════════════════
//  Shared helpers
// ═══════════════════════════════════════════════════════════════════

function isPlayEligible(k: KoiState): boolean {
  if (k.stage === "egg" || k.stage === "dying") return false;
  return true;
}

function isDanceEligible(k: KoiState): boolean {
  if (k.stage === "egg" || k.stage === "fry" || k.stage === "dying") return false;
  return true;
}

/** Normalize angle to [-π, π]. */
function normalizeAngle(a: number): number {
  let x = a % (2 * Math.PI);
  if (x > Math.PI) x -= 2 * Math.PI;
  if (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/**
 * Coarse per-stage baseline speed (m/s) — used for velocity spike
 * detection when a rolling mean isn't available. Adults swim faster
 * than juveniles; elders drift slower.
 */
function stageNormalSpeed(stage: KoiState["stage"]): number {
  switch (stage) {
    case "egg":        return 0;
    case "fry":        return 0.08;
    case "juvenile":   return 0.15;
    case "adolescent": return 0.22;
    case "adult":      return 0.28;
    case "elder":      return 0.18;
    case "dying":      return 0.05;
  }
}

/** Query the event log for the actor of a recent play_invitation toward koiId. */
function recentInvitationActor(
  ctx: DetectionContext, koiId: KoiId,
): KoiId | null {
  const row = ctx.sql.exec(
    `SELECT actor FROM event
      WHERE tick > ?
        AND mechanism = 'play_invitation'
        AND targets_json LIKE ?
      ORDER BY tick DESC
      LIMIT 1`,
    ctx.tick - PLAY_THRESHOLDS.tagInvitationWindowTicks,
    `%"${koiId}"%`,
  ).toArray()[0];
  if (!row) return null;
  const actor = row["actor"] as string | undefined;
  // actor format is "koi:<id>" — strip prefix
  return actor ? actor.replace(/^koi:/, "") : null;
}

function recentInvitationTowardMe(
  ctx: DetectionContext, koiId: KoiId,
): SimTick | null {
  const row = ctx.sql.exec(
    `SELECT MAX(tick) AS t FROM event
      WHERE tick > ?
        AND mechanism = 'play_invitation'
        AND targets_json LIKE ?`,
    ctx.tick - PLAY_THRESHOLDS.tagInvitationWindowTicks,
    `%"${koiId}"%`,
  ).toArray()[0];
  const t = row?.["t"] as number | null | undefined;
  return typeof t === "number" ? t : null;
}

function chainLengthOf(ctx: DetectionContext, chainStartedTick: SimTick): number {
  const row = ctx.sql.exec(
    `SELECT COUNT(*) AS n FROM event
      WHERE tick >= ?
        AND mechanism = 'tag'
        AND payload_json LIKE ?`,
    chainStartedTick,
    `%"chain_started_tick":${chainStartedTick}%`,
  ).toArray()[0];
  return ((row?.["n"] as number) ?? 0);
}
