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
//  The pond is a gourd-shaped basin: two joined rounded lobes connected
//  by a narrowed waist. This shape is CANONICAL and must match the
//  client shader's pondSDF exactly — the client and server geometry
//  are co-authoritative, and any drift between them produces fish-on-
//  land glitches.
//
//  Canonical form (in pond-meters, centered near origin):
//    Large basin:  center (-1.0, 0.0),  radius 3.5
//    Small basin:  center (+1.8, 0.4),  radius 2.2
//    Smooth union: k = 0.9 (controls waist softness)
//
//  Max extent: approximately x ∈ [-4.5, +4.0], z ∈ [-3.5, +3.5].
//  Bounding circle: radius ≈ 5.0 (preserved for back-compat).
// ───────────────────────────────────────────────────────────────────────

export const POND = {
  /** Bounding radius in meters. The gourd fits comfortably inside a
   *  circle of this radius. Retained for back-compat with any code
   *  that wants a coarse pond-scale number. Prefer pondSDF() for any
   *  actual containment check. (§ III) */
  radius: 5.0,

  /** Maximum depth at the deep centroid of the larger basin. (§ III) */
  maxDepth: 3.0,

  /** Shelf band — the shallow perimeter where eggs are laid. In the
   *  gourd, "shelf" is the annular region just inside the rim:
   *     pondSDF(x,z) ∈ [shelfSdfMin, shelfSdfMax]
   *  This replaces the old radius-based shelfRadiusMin/Max. The values
   *  reproduce the same 0.2–1.8m-wide annulus as before, but now
   *  respect the gourd's asymmetry. */
  shelfSdfMin: -1.8,   // inner edge — 1.8m in from wall
  shelfSdfMax: -0.2,   // outer edge — 0.2m in from wall (just submerged)

  /** Legacy radial shelf bounds. Kept so old callers don't break, but
   *  containment should use shelfSdfMin/Max via onShelf(). */
  shelfRadiusMin: 3.2,
  shelfRadiusMax: 4.8,

  /** Typical swim depth for adults; they rarely hug the surface or
   *  the floor. */
  adultSwimDepth: -1.2,

  /** Shrine center. In gourd coordinates this sits at the waist,
   *  near the junction of the two basins. Matches shader's
   *  shrineCenter = (0.2, -0.2) in top-down pondXZ. (§ XI) */
  shrine: { x: 0.2, y: -2.4, z: -0.2 },

  /** Gourd geometry — exposed so callers can do their own SDF math
   *  without going through the helpers. Do not modify at runtime. */
  gourd: {
    basinA: { cx: -1.0, cz: 0.0, r: 3.5 },
    basinB: { cx:  1.8, cz: 0.4, r: 2.2 },
    k: 0.9,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Pond geometry helpers
//
//  THE SINGLE SOURCE OF TRUTH for "is this point inside the pond?"
//  Must match the shader's pondSDF exactly. Any geometry change here
//  requires a matching change in LivingSubstrate.tsx's pondSDF.
// ───────────────────────────────────────────────────────────────────────

/** Signed distance to the pond boundary in top-down pond-XZ meters.
 *  Negative inside, positive outside. Zero at the rim. */
export function pondSDF(x: number, z: number): number {
  const a = POND.gourd.basinA;
  const b = POND.gourd.basinB;
  const k = POND.gourd.k;
  const dA = Math.hypot(x - a.cx, z - a.cz) - a.r;
  const dB = Math.hypot(x - b.cx, z - b.cz) - b.r;
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (dB - dA) / k));
  return dA * (1 - h) + dB * h - k * h * (1 - h);
}

/** Numerical gradient of pondSDF (outward normal, un-normalized). */
export function pondSDFGradient(
  x: number,
  z: number,
  eps = 0.05,
): { gx: number; gz: number } {
  const gx = (pondSDF(x + eps, z) - pondSDF(x - eps, z)) / (2 * eps);
  const gz = (pondSDF(x, z + eps) - pondSDF(x, z - eps)) / (2 * eps);
  return { gx, gz };
}

/** True if (x, z) is strictly inside the pond, with a small margin.
 *  Margin defaults to 0.12m — the same value the client uses for its
 *  nose-point contact physics, so server and client agree on "inside". */
export function isInsidePond(x: number, z: number, margin = 0.12): boolean {
  return pondSDF(x, z) < -margin;
}

/** True if (x, z) is on the egg-laying shelf annulus. */
export function onShelf(x: number, z: number): boolean {
  const s = pondSDF(x, z);
  return s >= POND.shelfSdfMin && s <= POND.shelfSdfMax;
}

/** Project a point to the nearest interior point at least `margin`
 *  meters from the pond rim. If already inside at that margin,
 *  returns the point unchanged. Uses the SDF gradient as the
 *  outward normal. */
export function clampToPond(
  x: number,
  z: number,
  margin = 0.12,
): { x: number; z: number } {
  const s = pondSDF(x, z);
  if (s < -margin) return { x, z };
  const { gx, gz } = pondSDFGradient(x, z);
  const gmag = Math.hypot(gx, gz) + 1e-6;
  const nx = gx / gmag;
  const nz = gz / gmag;
  // Push inward by exactly the penetration depth plus margin
  const pushIn = s + margin;
  return { x: x - nx * pushIn, z: z - nz * pushIn };
}

/** Water depth at (x, z). Max at the deep centroid, 0.2 at the rim. */
export function waterDepthAt(x: number, z: number): number {
  const s = pondSDF(x, z);
  if (s >= 0) return 0;
  // Map sdf in [-3.5, 0] → depth in [3.0, 0.2]
  const t = Math.max(0, Math.min(1, -s / 3.5));
  return 0.2 + t * (3.0 - 0.2);
}

/** Sample a uniformly-distributed random point inside the pond.
 *  Rejection sampling on the gourd bounding box. Converges fast
 *  (gourd fills ~70% of its bounding box). */
export function samplePointInPond(
  rand: () => number,
  margin = 0.15,
): { x: number; z: number } {
  // Bounding box of the gourd, with the basins' extents
  const bbMinX = -4.6, bbMaxX = 4.1;
  const bbMinZ = -3.6, bbMaxZ = 3.6;
  for (let i = 0; i < 64; i++) {
    const x = bbMinX + rand() * (bbMaxX - bbMinX);
    const z = bbMinZ + rand() * (bbMaxZ - bbMinZ);
    if (pondSDF(x, z) < -margin) return { x, z };
  }
  // Fallback — center of larger basin, always inside.
  return { x: POND.gourd.basinA.cx, z: POND.gourd.basinA.cz };
}

/** Sample a random point on the egg-laying shelf. */
export function samplePointOnShelf(
  rand: () => number,
): { x: number; z: number } {
  const bbMinX = -4.6, bbMaxX = 4.1;
  const bbMinZ = -3.6, bbMaxZ = 3.6;
  for (let i = 0; i < 128; i++) {
    const x = bbMinX + rand() * (bbMaxX - bbMinX);
    const z = bbMinZ + rand() * (bbMaxZ - bbMinZ);
    if (onShelf(x, z)) return { x, z };
  }
  // Fallback — just inside shelf outer edge in the larger basin.
  return { x: POND.gourd.basinA.cx - 3.0, z: POND.gourd.basinA.cz };
}

// ───────────────────────────────────────────────────────────────────────
//  Simulation tick (§ V, § XVII)
// ───────────────────────────────────────────────────────────────────────

export const SIM = {
  /** Tick rate in Hz. Kinematics run every tick; cognition is sparser. */
  tickHz: 2,
  /** Derived: ms between ticks. */
  tickIntervalMs: 500,
  /** WebSocket snapshot/tick broadcast rate. */
  broadcastHz: 2,
  /** A simulated day compresses ~45 real minutes; a life is 30 sim-days. (§ VII) */
  realSecondsPerSimDay: 45 * 60,
  /** A full life at the compressed rate: ~22.5 real hours. */
  realSecondsPerLife: 30 * 45 * 60,
  /** Seasons cycle every 7 sim-days; one real cycle is ~5.25 real hours. */
  realSecondsPerSeason: 7 * 45 * 60,
} as const;

// ───────────────────────────────────────────────────────────────────────
//  Lifecycle (§ VII)
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
  /** ~1-in-100 fry are rolled legendary. (§ VII) */
  legendaryRate: 0.01,
  /** Variance on lifespan: a fish may die earlier from stress or live past 30.
   *  Widened from 1.8 to 2.4 sim-days (April 2026 tuning) so the pond
   *  has a healthier spread of natural death ages — some fish make it to
   *  34-36, which stabilizes the running population. (§ VII: "A fish that
   *  lives for thirty-eight days is genuinely rare.") */
  longTailDeathStdDevDays: 2.4,
  /** Sparse-is-sacred: target birth rate at 5-6 koi steady state. Lowered
   *  from 1.0 to 0.5 births per sim-week (April 2026 tuning) to match the
   *  tightened mutual-drawn-to gate. One birth per ~10-14 sim-days is
   *  still inside the manifesto envelope of "roughly one birth per 7-10
   *  sim-days" (§ X) and errs toward sparser — births matter more when
   *  rarer. */
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
//  Primary → fallbacks. OpenRouter will route to the next alias when the
//  primary rate-limits or errors. Exact model IDs (never aliases) are
//  logged into the event envelope — § XV research hygiene.
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
  // Fry and juvenile are pre-verbal — they cognize, but their utterances
  // should be minimal and their intent vocabulary a subset. Small Gemma
  // is the target here. For now, use gemma-3-4b-it which is cheap,
  // produces clean fragment register, and will eventually be replaced
  // with the fine-tuned Gemma-4-E2B student trained on pond data.
  fry: {
    stage: "fry",
    primary: "google/gemma-3-4b-it",
    fallbacks: ["google/gemma-3n-e4b-it"],
    temperature: 0.7,
    contextTokens: 500,
    maxOutputTokens: 120,
    approxUsdPerMTokIn: 0.02,
    approxUsdPerMTokOut: 0.04,
  },
  juvenile: {
    stage: "juvenile",
    primary: "google/gemma-3-4b-it",
    fallbacks: ["google/gemma-3n-e4b-it"],
    temperature: 0.7,
    contextTokens: 1500,
    maxOutputTokens: 160,
    approxUsdPerMTokIn: 0.02,
    approxUsdPerMTokOut: 0.04,
  },
  // Adolescent and adult run the workhorse. Gemma-4-26B-A4B proved 100%
  // register compliance across 10k synthetic contexts in the April 2026
  // sweep. This is the slot the fine-tuned Gemma-4-E4B will eventually
  // occupy. Haiku fallback catches the rare outright model outage.
  adolescent: {
    stage: "adolescent",
    primary: "google/gemma-4-26b-a4b-it",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.75,
    contextTokens: 2000,
    maxOutputTokens: 180,
    approxUsdPerMTokIn: 0.10,
    approxUsdPerMTokOut: 0.40,
  },
  adult: {
    stage: "adult",
    primary: "google/gemma-4-26b-a4b-it",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.75,
    contextTokens: 3000,
    maxOutputTokens: 220,
    approxUsdPerMTokIn: 0.10,
    approxUsdPerMTokOut: 0.40,
  },
  // Elders deserve more depth — more context, richer relational memory,
  // more careful utterance. Haiku is primary; dense Gemma-4-31B as
  // fallback for situational reach when the elder's context is complex.
  elder: {
    stage: "elder",
    primary: "anthropic/claude-haiku-4.5",
    fallbacks: ["google/gemma-4-31b-it"],
    temperature: 0.7,
    contextTokens: 6000,
    maxOutputTokens: 280,
    approxUsdPerMTokIn: 1.00,
    approxUsdPerMTokOut: 5.00,
  },
  // Dying koi get Sonnet. This is the register's hardest moment — a
  // fish whose entire relational graph is about to be mourned. Reduced
  // temperature per § VII so the voice doesn't drift under stress.
  // Haiku as fallback preserves warmth if Sonnet is unavailable.
  dying: {
    stage: "dying",
    primary: "anthropic/claude-sonnet-4.5",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.4,
    contextTokens: 6000,
    maxOutputTokens: 200,
    approxUsdPerMTokIn: 3.00,
    approxUsdPerMTokOut: 15.00,
  },
  // Legendary — 1 in 100 koi. Haiku is genuinely enough; the sweep
  // showed it hits full register with situational reach ("shelf holds
  // us both", "warm days past. moving away now."). Opus reserved for
  // later edge-case carve-outs (e.g. a dying legendary elder's twilight
  // reflection on a 500-interaction bond). We can add a "canon" tier
  // when we want it; for now Haiku.
  legendary: {
    stage: "legendary",
    primary: "anthropic/claude-haiku-4.5",
    fallbacks: ["anthropic/claude-3.5-haiku"],
    temperature: 0.75,
    contextTokens: 8000,
    maxOutputTokens: 320,
    approxUsdPerMTokIn: 1.00,
    approxUsdPerMTokOut: 5.00,
  },
};

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
//  Drawn-to reproduction condition (§ X)
// ───────────────────────────────────────────────────────────────────────

export const DRAWN_TO = {
  /** Reproduction fires when both fish have drawn_to → each other on
   * at least this many of the last 7 sim-days. Raised from 3 to 4
   * (April 2026 tuning) so pairs have to sustain mutual preference
   * more consistently before reproduction permission fires. */
  minDaysOfMutualInLast7: 4,
  windowDays: 7,
  /** Cooldown in sim-days after a spawning for either participant.
   * Doubled from 7 to 14 sim-days (April 2026 tuning) so the same
   * pair can't spawn again within half a lifetime. Combined with the
   * tighter minDaysOfMutualInLast7 and the reduced egg count weights,
   * the steady-state birth rate lands near one per 10-14 sim-days. */
  cooldownDays: 14,
  /** Reflection prompt runs at lower temperature than routine cognition. */
  temperature: 0.3,
  /** The weekly solitude-bias audit triggers if more than this fraction of
   * adult-adult pairs show mutual drawn_to reflections in a week. */
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
//  Budget tiers (§ XVII)
//
//  Graceful degradation bands. Each percentage is "budget remaining as
//  fraction of the monthly allotment." Tier transitions are themselves
//  logged as in-world events, so the site's narrative coherence persists.
// ───────────────────────────────────────────────────────────────────────

export const BUDGET = {
  monthlyUsd: 100,
  /** Above 60%: normal operation. */
  healthyFloor: 0.60,
  /** 30-60%: reflection frequency halved, adults may drop a tier. */
  watchfulFloor: 0.30,
  /** 10-30%: all on cheapest viable; reflections every 3 days; no legendary. */
  austerityFloor: 0.10,
  /** Below 10%: meditation mode. 90% cached utterances. */
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
