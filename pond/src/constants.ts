// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Constants
//  ─────────────────────────────────────────────────────────────────────────
//  Every tuning parameter named in LIMEN_POND_MANIFESTO.md lives here.
//  Changes to this file are behavioral changes — treat it as part of the
//  config surface. When a constant is set for a non-obvious reason, the
//  comment explains why; when the manifesto specifies it, the § reference
//  is cited inline.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────
//  Pond geometry (§ III, § XI)
//
//  The canonical SDF and helpers live in ./pondGeometry.ts (worker
//  side, sibling to this file). The Next.js client has a mirror at
//  lib/pondGeometry.ts that adds CAM re-exports from pondCamera and
//  emits the GLSL strings the WebGL shader inlines. The two SDF
//  implementations are kept byte-identical until the monorepo grows
//  a shared package reachable from both sides.
//
//  Background on why this matters: the kinematic boundary the server
//  steers fish inside must match the painted boundary the client
//  shader renders. When they drifted out of sync, fish appeared to
//  swim through walls. One source of truth per side, kept in lockstep.
// ───────────────────────────────────────────────────────────────────────

export {
  POND, GOURD,
  pondSDF, pondSDFGradient,
  isInsidePond, onShelf, clampToPond, waterDepthAt,
  samplePointInPond, samplePointOnShelf,
} from "./pondGeometry.js";

// ───────────────────────────────────────────────────────────────────────
//  Simulation tick (§ V, § XVII)
//
//  Tempo per Final Vision (May 2026): a sim-day stretches 6–8 real
//  hours so a founder pair's first reproduction lands at real-day 5–7.
//  Founders live longer than later generations; subsequent generations
//  live longer per individual and reproduce less. The pond is paced
//  for contemplation, not for performance.
// ───────────────────────────────────────────────────────────────────────

export const SIM = {
  /** Tick rate in Hz. Kinematics run every tick; cognition is sparser
   *  and runs in seconds-based cadence (see COGNITION_INTERVAL_S),
   *  converted to ticks at use site via `Math.floor(intervalS * tickHz)`.
   *  Bumped from 2 Hz to 30 Hz May 2026 — at dt=33ms the kinematic
   *  integrator takes small enough steps that motion looks continuous
   *  without client-side interpolation. Pair with the async-cognition
   *  refactor in pond-do.ts so a 1-3s LLM call no longer freezes the
   *  tick loop. */
  tickHz: 30,
  /** Derived: ms between ticks. Keep in sync with tickHz (1000/tickHz,
   *  rounded down — 33ms gives 30.3 Hz actual, ~1% drift, acceptable). */
  tickIntervalMs: 33,
  /** WebSocket snapshot/tick broadcast rate. **Decoupled from tickHz**:
   *  the server runs physics at 30 Hz internally for smooth integration,
   *  but broadcasts are gated to 5 Hz at the alarmBody → broadcastTick
   *  call site (every (tickHz / broadcastHz) ticks). The client's
   *  critically-damped spring integrator in `usePond.ts::stepKinematics`
   *  smooths between broadcasts at render rate (60fps) — 5 Hz broadcasts
   *  with local interpolation gives visually-continuous motion without
   *  saturating the client's JS main thread on JSON.parse and React
   *  reconciliation.
   *
   *  Earlier set to 30 (coupled to tickHz). Caused client CPU to pin at
   *  100% on the visuals, frame rate dropped, fish appeared stationary
   *  and small. May 2026 fix: drop to 5 with broadcast-tick modulo gate. */
  broadcastHz: 5,
  /** A simulated day stretches 6 real hours. Tunable upward to 8 if the
   *  pace feels too quick. (§ VII / Final Vision) */
  realSecondsPerSimDay: 6 * 3600,
  /** Founders live ~30 sim-days. At 6h per sim-day this is ~7.5 real
   *  days of pond life. Subsequent generations are tuned longer per
   *  individual; lifespanByKoi distribution handles the variance. */
  realSecondsPerLife: 30 * 6 * 3600,
  /** Seasons cycle every 7 sim-days; one real cycle is ~42 real hours. */
  realSecondsPerSeason: 7 * 6 * 3600,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Lifecycle (§ VII / Final Vision)
// ───────────────────────────────────────────────────────────────────────

export const LIFE = {
  /** Stage boundaries in sim-days. */
  stages: {
    egg:         { min: 0,  max: 1 },
    fry:         { min: 1,  max: 2 },
    juvenile:    { min: 2,  max: 5 },
    adolescent:  { min: 5,  max: 10 },
    adult:       { min: 10, max: 22 },
    elder:       { min: 22, max: 28 },
    dying:       { min: 28, max: 30 },
  },
  /** Ordered list for advancement checks. */
  order: ["egg", "fry", "juvenile", "adolescent", "adult", "elder", "dying"] as const,
  /** Legendary tier was retired in May 2026 cleanup; the rate is kept
   *  at 0 so any code still reading it produces non-legendary fish. */
  legendaryRate: 0.0,
  /** Lifespan variance. Founders live longer than later generations
   *  per Final Vision; that's handled in lifespanByKoi assignment, not
   *  by a global tweak here. This std-dev sets the colony-wide spread. */
  longTailDeathStdDevDays: 2.4,
  /** Target steady-state birth rate at density-gate population. Tuned
   *  toward "5–6 children across founders' lives, then later
   *  generations less frequent." */
  targetBirthsPerSimWeek: 0.5,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Cognition cadence by stage (§ V)
// ───────────────────────────────────────────────────────────────────────

/**
 * How often a koi's LLM is asked to update its intent, in sim-seconds.
 * Fry decide fast (every 30 s), adults every 2 min, elders every 5 min —
 * this is the economic lever that keeps the LLM budget tractable at
 * $100/month total.
 */
export const COGNITION_INTERVAL_S: Record<string, number> = {
  egg: Number.POSITIVE_INFINITY, // eggs do not think
  fry: 30,
  juvenile: 60,
  adolescent: 90,
  adult: 120,
  elder: 300,
  dying: 600,
};

/**
 * Daily twilight reflection runs once per sim-day for adults and up.
 * Weekly deep sleep runs every 7 sim-days and consolidates memory.
 */
export const REFLECTION = {
  twilightStageMin: "adolescent", // only adolescents and up reflect
  dailyAtTDay: 0.88,              // ~twilight
  weeklyAtSimDayMod7: 6,
  /** Micro-reflections fire when cumulative importance crosses this. */
  microImportanceThreshold: 15,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Model tier cascade (§ V, § XVII)
//
//  Cognition is tiered by life stage. Per the architecture document
//  (third-space.ai/limen-pond): Gemma 4 26B A4B is the workhorse for
//  young and adult cognition — its small active footprint (4B per
//  token in a 26B-class MoE) makes the open-weights commitment
//  operationally tractable on operator hardware. Haiku 4.5 takes
//  elder cognition, where context spans the full 6k window and the
//  register is wider but cheaper than Sonnet's. Sonnet 4.5 is reserved
//  for dying — the hardest register, where reduced temperature (0.4)
//  preserves voice stability through the final reflection.
//
//  The pond-specific Gemma 4 E4B fine-tune trained on Apocrypha,
//  Sandevistan, and the pond's accumulated event logs is the
//  immediate next move; it will replace 26B A4B in the young and
//  adult slots, collapsing the inference profile further once the
//  mechanism schema is internalized as learned prior rather than
//  runtime structured-output overhead.
//
//  Fallbacks are graceful-degradation routes, not equivalents:
//  if Gemma is unavailable Haiku takes the load, with the operator
//  paying per-token instead of per-watt. The cascade falls through
//  in order; if all routes exhaust, the cognition cycle is dropped
//  rather than completed unsafely.
//
//  Exact model IDs (never aliases) are logged into every event
//  envelope per § XV research hygiene.
// ───────────────────────────────────────────────────────────────────────

export interface ModelTier {
  stage: string;
  primary: string;
  fallbacks: string[];
  temperature: number;
  contextTokens: number;
  maxOutputTokens: number;
  approxUsdPerMTokIn: number;
  approxUsdPerMTokOut: number;
}

export const MODEL_TIERS: Record<string, ModelTier> = {
  // Young beings — fry, juvenile, adolescent. Pre-verbal-ish; low
  // utterance density and a subset of the intent vocabulary. Gemma 4
  // 26B A4B at modest context, modest temperature; Haiku 4.5 catches
  // the cascade if Gemma is unavailable.
  young: {
    stage: "young",
    primary: "google/gemma-4-26b-a4b-it",
    fallbacks: [
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-3-5-haiku-latest",
    ],
    temperature: 0.7,
    contextTokens: 2000,
    maxOutputTokens: 200,
    approxUsdPerMTokIn: 0.10,
    approxUsdPerMTokOut: 0.30,
  },

  // Adult — the workhorse. Most cognition cycles run here. Gemma 4
  // 26B A4B at full context, slightly warmer temperature for the
  // wider behavioral vocabulary adults exercise. The eventual
  // pond-specific E4B fine-tune lands in this slot.
  adult: {
    stage: "adult",
    primary: "google/gemma-4-26b-a4b-it",
    fallbacks: [
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-3-5-haiku-latest",
    ],
    temperature: 0.75,
    contextTokens: 4000,
    maxOutputTokens: 220,
    approxUsdPerMTokIn: 0.10,
    approxUsdPerMTokOut: 0.30,
  },

  // Elder — context spans the relational history. Haiku 4.5 primary
  // (the wider context costs less than Sonnet and the register is
  // not yet at its hardest); Gemma 4 31B Dense as fallback for
  // situational reach when an elder's relational context spans the
  // full 6k-token window.
  elder: {
    stage: "elder",
    primary: "anthropic/claude-haiku-4.5",
    fallbacks: [
      "google/gemma-4-31b-it",
      "anthropic/claude-3-5-haiku-latest",
    ],
    temperature: 0.5,
    contextTokens: 6000,
    maxOutputTokens: 280,
    approxUsdPerMTokIn: 1.00,
    approxUsdPerMTokOut: 5.00,
  },

  // Dying — the hardest register. Sonnet 4.5 at reduced temperature
  // (0.4) per the voice-stability constraint so a dying being's
  // final utterances do not drift under register stress. Haiku as
  // fallback preserves warmth if Sonnet is unavailable, but the
  // budget is set assuming Sonnet runs.
  dying: {
    stage: "dying",
    primary: "anthropic/claude-sonnet-4-5",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.4,
    contextTokens: 6000,
    maxOutputTokens: 280,
    approxUsdPerMTokIn: 3.00,
    approxUsdPerMTokOut: 15.00,
  },
};

/** Map a being's life-stage to the tier slot that serves it. */
export function tierForStage(stage: string): string {
  if (stage === "dying") return "dying";
  if (stage === "elder") return "elder";
  if (stage === "egg" || stage === "fry" ||
      stage === "juvenile" || stage === "adolescent") return "young";
  return "adult";
}

// ───────────────────────────────────────────────────────────────────────
//  Affect — PAD decay half-lives in hours (§ VIII)
// ───────────────────────────────────────────────────────────────────────

export const AFFECT = {
  halfLifeHours: {
    pleasure: 6,
    arousal: 2,
    dominance: 24,
  },
  /** Deterministic appraisal : LLM mood delta blend ratio. */
  blendDeterministic: 0.7,
  blendLlm: 0.3,
  /** Clamps. */
  pleasureMin: -1,
  pleasureMax: 1,
  arousalMin: 0,
  arousalMax: 1,
  dominanceMin: -1,
  dominanceMax: 1,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Hunger (§ I, § XIII)
//
//  Koi have an interoceptive sense of belly-emptiness. Hunger rises
//  linearly with sim-time at a stage-dependent rate and falls when
//  food is eaten. Calibrated so an adult goes from 0 to 0.5 over
//  approximately 3 sim-hours — about 135 real seconds at 2 Hz. This
//  is slow enough that a fish can cruise, shoal, and rest through a
//  full diurnal cycle without starving, but fast enough that the
//  urge to feed is a real and visible part of life.
//
//  Fry burn faster (small bodies, fast growth). Elders slower.
//  Eggs do not rise at all. Dying fish do not rise (they are past
//  hunger; hunger is the drive of ongoing life).
//
//  Starvation: at hunger ≥ 0.90, a small per-tick death probability
//  is added to any non-dying fish. This permits actual starvation
//  in a food-scarce pond (Stage 24 canonical crisis event, § XX)
//  but is gentle enough that a fish near one ambient food source
//  will always find food before starving under normal conditions.
// ───────────────────────────────────────────────────────────────────────

export const HUNGER = {
  /** Initial hunger on hatch — a freshly-hatched fry is already
   *  looking for its yolk. */
  initial: 0.20,

  /** Per-second rise rate, per stage. Units: hunger-per-real-second.
   *  (In this sim, 1 real-sec = 1 sim-sec; a sim-day = 45 real-min.)
   *  Calibrated so an adult without food goes from the initial 0.2
   *  to starvation at 0.9 over one full sim-day (2700 real-sec).
   *  Fry rise faster (small, growing), elders slower (slow metabolism). */
  risePerSimSec: {
    egg:        0.0,        // eggs do not eat
    fry:        0.00045,    // ~0.5 day to starve from initial
    juvenile:   0.00035,
    adolescent: 0.00028,
    adult:      0.00025,    // ~1 sim-day to starve
    elder:      0.00018,    // ~1.5 sim-days to starve
    dying:      0.0,        // past hunger
  } as Record<string, number>,

  /** Threshold above which starvation begins contributing to death
   *  probability. 0.9 is near-max; a fish has about one sim-hour
   *  of starvation survival after crossing this line. */
  starvationThreshold: 0.90,

  /** Per-tick death probability contributed by starvation, scaled by
   *  how far past the threshold the fish is. Maxes around 1-in-3600
   *  ticks at full starvation (hunger=1.0) — about 30 real minutes
   *  of maximum starvation to die, at 2 Hz. Gentle enough to give
   *  a visible decline but not an abrupt die-off. */
  starvationMaxPDeathPerTick: 1 / 3600,

  /** Threshold below which the Play family (§ XIII) is permitted
   *  by the Burghardt satiation criterion. A koi must be both
   *  satiated (hunger < this) and low-arousal to play. */
  playSatiationThreshold: 0.40,

  /** Threshold above which the LLM's cognition prompt should emphasize
   *  food-seeking language ("a pull toward food-smells"). Below this,
   *  hunger is a background sensation; above, it becomes a primary
   *  driver of intent choice. */
  preoccupationThreshold: 0.55,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Food (§ I, § XIII)
//
//  The pond produces its own food. Three ambient kinds rotate through
//  seasons and times of day:
//
//    - Pollen: spring only, drifts on the surface, clustered, low nutrition.
//    - Algae: all seasons, patches in the shelf annulus, moderate nutrition.
//    - Insects: summer/autumn only, dawn and dusk, high nutrition, short decay.
//
//  Visitor pellets (commit 4) are a separate kind with higher nutrition
//  and shorter decay, rate-limited per visitor.
//
//  Balancing logic: at 5 koi, pond hunger rises at roughly:
//    5 adults × 0.00025/sec = 0.00125 total/sec = 4.5 per real-hour
//  Ambient food supply needs to match this. Nutritional value 0.25 per
//  item × 20 items per real-hour = 5.0/hour supplied. Comfortable margin.
// ───────────────────────────────────────────────────────────────────────

export const FOOD = {
  /** Radius in meters within which a koi consumes a food item. */
  consumptionRadius: 0.20,

  /** Maximum concurrent food items — caps runaway growth if the pond
   *  goes quiet (no fish eating for a long time). */
  maxConcurrent: 30,

  pollen: {
    /** Spawns only when season === "spring". Target: ~6 items/real-hour
     *  over 5 koi. Per tick (2Hz): 6 / 3600 / 2 = ~0.00083 per tick. */
    pPerTick: 0.00083,
    nutrition: 0.20,
    /** Real seconds until decay. Pollen lasts a good while. */
    decaySec: 600,
    /** Drifts with the surface — small random velocity each tick. */
    drifts: true,
    /** y-coordinate at spawn (surface). */
    y: 0,
  },

  algae: {
    /** All seasons. Slower spawn because patches are persistent. */
    pPerTick: 0.00055,
    nutrition: 0.30,
    /** Long-lived — real koi algae patches persist for days. */
    decaySec: 900,
    drifts: false,
    /** On the pond floor at shelf depth. */
    y: -0.5,
  },

  insect: {
    /** Summer/autumn only, dawn (t_day 0.10-0.22) and dusk (0.80-0.92). */
    pPerTick: 0.00140,
    nutrition: 0.40,
    /** Short decay — insects skitter off if uneaten. */
    decaySec: 180,
    drifts: true,
    y: 0,
  },

  pellet: {
    /** Visitor-dropped. Not spawned by ambient logic; created by WS. */
    pPerTick: 0,
    nutrition: 0.60,
    /** Short decay so visitor feeding feels urgent-ish. */
    decaySec: 120,
    drifts: false,
    y: 0,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Memory retrieval scoring (§ VI)
//
//  Park et al. extended with social and emotional weights.
// ───────────────────────────────────────────────────────────────────────

export const MEMORY = {
  weights: {
    relevance: 1.0,
    importance: 0.8,
    recency: 0.5,
    social: 0.3,
    emotional: 0.4,
  },
  /** exp(-Δh / 72h) — 72-hour half-life on recency. */
  recencyHalfLifeHours: 72,
  /** Embedding dimension (BGE-small-en-v1.5). */
  embeddingDim: 384,
  /** Upper bound on retrieved memories per prompt composition. */
  maxRetrievedPerTier: {
    fry: 4,
    juvenile: 6,
    adolescent: 8,
    adult: 10,
    elder: 14,
    dying: 10,
  } as Record<string, number>,
  /** Cap on total memory rows per koi before archive pruning. */
  maxRowsPerKoi: 3000,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Bond intensity — the new reproduction trigger (Final Vision)
//
//  Replaces the 3-of-7 mutual drawn-to scan. Bond intensity is a
//  scalar in [0, 1] derived from the relationship_card row:
//
//    intensity = clamp(
//        0.5 * valence
//      + 0.2 * tanh(interaction_count / 30)
//      + 0.2 * recent_witnessing_density
//      + 0.1 * familiarity_prior
//      , 0, 1)
//
//  Founders are seeded above threshold (0.6); later generations
//  accumulate intensity through proximity, witnessing, and survived
//  events together. Reproduction-eligible pair: both adult-stage,
//  density below gate, intensity ≥ threshold, neither in cooldown.
//
//  See bondIntensity() in mechanisms/bond.ts for the canonical
//  computation. Constants here only set the numeric thresholds.
// ───────────────────────────────────────────────────────────────────────

export const BOND = {
  /** Reproduction-eligible threshold. Founders seed at 0.60; tuning
   *  this upward makes later generations work harder to bond. */
  reproductionThreshold: 0.55,
  /** Bonded pair cooldown reduction factor on play_invitation, dance,
   *  synchronized_swim. Bonded pairs run courtship more readily. */
  bondedCourtshipCooldownFactor: 0.5,
  /** Cooldown after a spawning before either parent can be in another
   *  reproduction-eligible pair. Sim-days. */
  postSpawningCooldownDays: 14,
  /** Density gate. Reproduction halts when alive being count meets
   *  this. (Final Vision: ~12.) */
  populationGate: 12,
  /** Founder bond seed value, applied symmetrically at world start
   *  to Shiki's card-toward-Kokutou and vice versa. */
  founderSeedValence: 0.6,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Drawn-to reproduction condition (§ X) — DEPRECATED
//
//  Kept here for compile-stability while reproduction.ts is rewritten
//  against BOND above. After the rewrite this block goes.
// ───────────────────────────────────────────────────────────────────────

export const DRAWN_TO = {
  /** @deprecated use BOND.reproductionThreshold */
  minDaysOfMutualInLast7: 4,
  /** @deprecated */
  windowDays: 7,
  /** @deprecated use BOND.postSpawningCooldownDays */
  cooldownDays: 14,
  /** @deprecated */
  temperature: 0.3,
  /** @deprecated */
  solitudeAuditPairThreshold: 0.5,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Kinematics — boid flocking + flow field (§ XI)
// ───────────────────────────────────────────────────────────────────────

export const KINEMATICS = {
  /** Top swim speed in m/s for an adult at arousal=0.5. */
  baseSpeed: 0.18,
  /** Max allowed turn rate, rad/s. Keeps swimming visibly calm. */
  maxTurnRate: 1.4,
  /** Boid weights, tuned so the shoal is present at dawn/dusk but loose at noon. */
  flocking: {
    separationRadius: 0.45,
    cohesionRadius: 1.6,
    alignmentRadius: 1.2,
    separationStrength: 1.2,
    cohesionStrength: 0.25,
    alignmentStrength: 0.35,
  },
  /** Weight on curl-noise flow field as a soft push. */
  flowStrength: 0.12,
  /** Boundary pushback when a fish drifts near the pond edge (meters).
   *  This is a "soft band" that discourages approach, not a hard wall.
   *  Hard containment is enforced by clampToPond() post-integration. */
  boundaryBuffer: 0.4,
  boundaryStrength: 0.9,
  /** Soft vertical band — fish prefer their swim depth. */
  depthRestore: 0.4,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  WebSocket protocol & broadcast cadence
// ───────────────────────────────────────────────────────────────────────

export const WS = {
  /** Snapshot sent on initial connection. */
  snapshotOnOpen: true,
  /** Subsequent broadcasts match the sim tick rate. */
  broadcastHz: 2,
  /** Maximum number of connected clients tracked per DO. */
  maxClients: 1000,
  /** If no clients for this long, sim goes to kinematic-only-no-cognition mode. */
  idleBeforeQuietMs: 60_000,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Budget posture (§ XVII)
//
//  Simplified from the four-band cascade in earlier iterations. The
//  vision sets monthly cost ceiling at $100 across the full tier
//  ladder. Below the meditation floor (no key, exhausted budget, or
//  upstream LLM outage), cognition short-circuits to the cached
//  fallback and meditation-mode intent picker — physics keeps
//  ticking, beings keep swimming, no LLM calls fire.
//
//  The earlier graduated degradation (healthy/watchful/austerity) was
//  paper-grade hygiene that the launch demo doesn't need; it can come
//  back as separate, well-tested code if the cap actually starts
//  getting tight in practice.
// ───────────────────────────────────────────────────────────────────────

export const BUDGET = {
  monthlyUsd: 100,
  /** Below 0% remaining → meditation mode. */
  meditationFloor: 0.00,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Safety thresholds
// ───────────────────────────────────────────────────────────────────────

export const SAFETY = {
  /** Per-IP rate-limit on visitor actions, actions/minute. */
  visitorActionsPerMinute: 6,
  /** Max pebble inscription length. */
  maxPebbleInscriptionLen: 80,
  /** Max food drops per minute per visitor. */
  foodPerMinute: 3,
} as const;
