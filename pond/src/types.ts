// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Domain Types
//  ─────────────────────────────────────────────────────────────────────────
//  The types a usePond.ts consumer sees (KoiFrame, snapshot/tick envelopes)
//  are a subset of these — the WS-visible subset is defined in protocol.ts.
//  Everything here is the simulator's internal shape: the full koi state,
//  the memory row, the event envelope, the relationship card.
//
//  Coordinates: pond is in meters. x, z span the pond plane; y is depth
//  (downward from the surface, so y ∈ [-3, 0]). Heading h is the angle of
//  the 2D projected swim direction in the xz-plane, measured from +x.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
//  Basic scalars
// ───────────────────────────────────────────────────────────────────

/** Koi ID — short, stable, used in event logs forever. */
export type KoiId = string;

/** A sim-tick integer. At 2 Hz, one sim-day ≈ 162,000 ticks. */
export type SimTick = number;

/** Life stage — advances monotonically. "dying" is the senescent
 *  end-of-life state; "dead" is the brief post-mortem stage during
 *  which the koi row still exists in the hot set so emitters can
 *  reference it before the cleanup pass removes it. */
export type LifeStage =
  | "egg"
  | "fry"
  | "juvenile"
  | "adolescent"
  | "adult"
  | "elder"
  | "dying"
  | "dead";

/** Season — compresses over the 30-day lifecycle. (§ XI) */
export type Season = "spring" | "summer" | "autumn" | "winter";

/** Weather state. Low-frequency Markov chain. (§ XI) */
export type Weather = "clear" | "breeze" | "rain" | "storm";

/** Koi color morph. Names from common koi varieties, purely for visual flavor. */
export type KoiColor =
  | "kohaku"       // white with red patches
  | "shusui"       // blue-grey scaleless
  | "ogon"         // solid gold
  | "asagi"        // blue net over red belly
  | "tancho"       // single red mark on head
  | "utsuri"       // black with white/red/yellow
  | "bekko";       // white/red/yellow with black spots

// ───────────────────────────────────────────────────────────────────
//  Affect — PAD (pleasure, arousal, dominance). (§ VIII)
// ───────────────────────────────────────────────────────────────────

export interface PAD {
  p: number;  // pleasure/valence ∈ [-1, 1]
  a: number;  // arousal          ∈ [ 0, 1]
  d: number;  // dominance        ∈ [-1, 1]
}

/** A mood delta proposed by the LLM, before blending with the deterministic. */
export interface MoodDelta {
  p?: number;
  a?: number;
  d?: number;
}

// ───────────────────────────────────────────────────────────────────
//  Koi — full internal state. Only a slice ships over the WebSocket.
// ───────────────────────────────────────────────────────────────────

export interface KoiState {
  id: KoiId;
  /** Game-given name from first-hour behavior. Never renamed. (§ XIV) */
  name: string;
  stage: LifeStage;

  /** Biological sex. Binary in this simulation — koi are gonochoristic
   *  in life, changing sex only rarely under extreme conditions we do
   *  not model. Assigned at egg creation from the genotypic coin-flip.
   *  Sex gates reproduction (one male + one female required for
   *  fertilization) but does not gate any other mechanism — same-sex
   *  bonds remain fully realized relationally. (§ X) */
  sex: "female" | "male";

  /** Ticks since hatch. Drives stage advancement. */
  ageTicks: SimTick;

  /** Tick at which this koi first hatched. Stable for life; used for
   *  lineage queries and for accurate persistence across rehydration. */
  hatchedAtTick: SimTick;

  /** Legendary koi get a larger model tier in adulthood; ~1 in 100. (§ VII) */
  legendary: boolean;

  /** Founder flag — true for koi created at pond instantiation rather
   *  than hatched from eggs. Founders (Shiki, Kokutou) anchor the pond
   *  across the simulation's lifespan and receive special handling:
   *  bypass natural-death probability, opt-out of cohort culls, get
   *  distinct visual treatment in the client. Absent / false on every
   *  naturally-hatched koi. */
  founder?: boolean;

  /** Parent koi ids. Set when the koi hatches from an egg —
   *  `[mother, father]` in canonical order. Absent on founders and
   *  on eggs themselves; eggs use this field to record their parents
   *  before hatch so the hatcher can credit lineage. */
  parents?: KoiId[];

  color: KoiColor;

  /** Position in pond meters. y is depth (negative = below surface). */
  x: number;
  y: number;
  z: number;

  /** Velocity vector in the pond plane, m/s. */
  vx: number;
  vz: number;

  /** Heading — angle of swim direction in xz, radians. */
  h: number;

  /** Scale (0.35 for fry, 1.05 for elder). Drives render size. (§ VII) */
  size: number;

  /** Current affect vector. */
  pad: PAD;

  /** Hunger — interoceptive sense of emptiness in the belly.
   *  0 = sated, 1 = starving. Rises linearly with sim-time at a
   *  stage-dependent rate (fry rise fastest, elders slower, eggs not
   *  at all). Eating food reduces it. Above ~0.9, starvation adds a
   *  small term to per-tick death probability. (§ I: "gather food
   *  when hungry." § XIII: satiation is a Burghardt play precondition
   *  — the Play family cannot fire unless hunger is low.) */
  hunger: number;

  /** Current intent, set by cognition, executed by kinematics. */
  intent: Intent;

  /** Tick at which this koi's next cognition call should fire. */
  nextCognitionTick: SimTick;

  /** Tick of this koi's last twilight reflection. */
  lastTwilightTick: SimTick;

  /** Tick of last weekly deep-sleep reflection. */
  lastDeepSleepTick: SimTick;

  /** Cumulative importance since last micro-reflection. */
  microImportanceAccum: number;

  /** Latest drawn_to target and its count in the rolling window. */
  drawnTo: { targetId: KoiId; noticing: string; atTick: SimTick } | null;

  /** Most recent utterance, for WS streaming. Usually null. */
  lastUtterance: string | null;
  lastUtteranceTick: SimTick;

  /** Tick of this koi's most recent spawning event, for reproduction
   *  cooldown (§ X). 0 if never spawned. */
  lastSpawningTick: SimTick;

  /** Ring buffer of the last ≤30 heading samples — populated by the
   *  kinematics tick via pushHeading(). Read by the play family's
   *  dance and synchronized_swim detectors, which need heading-series
   *  over a window to distinguish responsive movement from parallel
   *  movement. Also read by the play_invitation detector for spike
   *  detection. See mechanisms/play.ts. */
  recentHeadings: number[];

  /** Chain state for the tag mechanism. Null when this koi is not
   *  currently "it" and not mid-chain. When non-null, this koi is the
   *  current it-holder; the chain continues until timeout. Owned and
   *  mutated by mechanisms/play.ts via applyTagEvent(). */
  tagState: {
    isIt: boolean;
    taggerId: KoiId;
    chainStartedTick: SimTick;
    lastContactTick: SimTick;
  } | null;
}

/**
 * Intent — 16 kinematic intentions. The LLM picks one; kinematics executes.
 * Mirrors § V: "LLM is never given free execution; output is a typed intent
 * that the simulation executes kinematically."
 */
export type IntentKind =
  | "swim"                 // default wander
  | "shoal"                // seek the shoal
  | "solitary"             // drift apart
  | "rest"                 // slow near a preferred rest spot
  | "feed_approach"        // go toward food
  | "feed_leave"           // leave a feeding site
  | "retreat"              // flee a threat
  | "approach"             // move toward target_koi
  | "linger"               // hold near target_koi without contact
  | "bump"                 // dominance bump at a feeding position
  | "shelter"              // go to a cave for shelter
  | "surface_breach"       // surface visit
  | "play_invite"          // initiate play at target_koi
  | "follow"               // pace with target_koi
  | "threadway"            // swim through a named architectural passage
  | "attend_solstice"      // the weekly shaft ritual
  | "tend_eggs";           // parent checking on their developing eggs

export interface Intent {
  kind: IntentKind;
  /** Optional target koi (for approach/follow/etc.). */
  targetId?: KoiId;
  /** Optional point-of-interest for location-based intents (shelter, solstice). */
  target?: { x: number; y: number; z: number };
  /** Tick at which this intent was set. */
  atTick: SimTick;
  /** Mechanism this intent instantiates, if any. (§ IX) */
  mechanism?: LoveFlowMechanism;
}

// ───────────────────────────────────────────────────────────────────
//  Love-flow (§ IX)
//
//  A subset of the 35-mechanism catalogue. Not all are wired at Stage 0;
//  the type lists all so detection rules can be added without schema
//  changes as mechanisms come online.
// ───────────────────────────────────────────────────────────────────

export type LoveFlowMechanism =
  // Witnessing family
  | "witnessing" | "parallel_presence" | "shared_attention" | "bearing_witness" | "joyful_reunion"
  // Repair family
  | "apology" | "forgiveness" | "cognitive_repair" | "emotional_attunement" | "farewell_ritual" | "grief_companionship"
  // Play family
  | "play_invitation" | "tag" | "dance" | "synchronized_swim" | "shared_curiosity"
  // Teaching family
  | "mentorship" | "mentor_mentee_inversion" | "imitation_learning" | "skill_transfer" | "story_propagation" | "vocabulary_drift"
  // Gift family
  | "gift" | "pass_it_forward" | "heirloom" | "offering" | "shared_food" | "memory_gifting"
  // Ritual family
  | "greeting" | "farewell" | "solstice_attendance" | "seasonal_rite" | "birth_witnessing" | "elder_naming";

// ───────────────────────────────────────────────────────────────────
//  Memory stream (§ VI)
//
//  Unified table: observations, reflections, beliefs, plans, skills, daily
//  summaries all live as rows distinguished by `kind`. This is Park et al.
// ───────────────────────────────────────────────────────────────────

export type MemoryKind =
  | "observation"
  | "reflection"
  | "belief"
  | "plan"
  | "skill"
  | "daily_summary"
  | "notable_episode";

export interface MemoryRow {
  id: number;
  koiId: KoiId;
  kind: MemoryKind;
  content: string;
  importance: number;        // 1-10 LLM-assigned
  createdAtTick: SimTick;
  lastAccessedTick: SimTick;
  accessCount: number;
  emotionalValence: number;  // -1..1, signed. for memory scoring
  participants: KoiId[];     // koi named in this memory (for social weight)
  embedding: ArrayBuffer;    // Float32Array BLOB, 384 dims
  /** For beliefs: bitemporal valid_to_tick. Null = still valid. */
  validToTick: SimTick | null;
  /** Comma-separated list of memory IDs cited by this reflection. */
  sourceMemoryIds: number[];
}

// ───────────────────────────────────────────────────────────────────
//  Relationship cards (§ VI)
//
//  Authored once per day during twilight reflection. Never mid-turn
//  updated. Injected (~80 tokens) into each adult's prompt.
// ───────────────────────────────────────────────────────────────────

export interface RelationshipCard {
  selfId: KoiId;
  otherId: KoiId;
  firstEncounterTick: SimTick;
  interactionCount: number;
  valence: number;                // -1..1
  valenceTrajectory7d: number[];  // last 7 daily values
  dominance: number;              // -1..1
  trust: number;                  // 0..1
  summary: string;                // LLM-authored, one sentence
  notableMemoryIds: number[];
  /** 7-day rolling count of mutual drawn-to pointings. */
  drawnCount7d: number;
  lastAuthoredTick: SimTick;
  /** Chemical-familiarity bias (§ IV, Stage 9.5). Seeded at hatch for a
   *  fry's cards toward each parent. Read by the LLM as a sense ("this
   *  one is particularly familiar"), not as a fact ("she is my mother"). */
  familiarityPrior: number;
}

// ───────────────────────────────────────────────────────────────────
//  Event envelope (§ XV)
//
//  Every notable thing the pond does produces one of these. They are
//  (a) broadcast on the WS if lightweight, (b) forwarded to Workers AE
//  (Tier 1), and (c) persisted to SQLite for replay.
// ───────────────────────────────────────────────────────────────────

export type EventType =
  // lifecycle
  | "koi_hatched" | "koi_named" | "koi_stage_advanced" | "koi_died"
  // cognition
  | "llm_called" | "llm_failed" | "memory_written" | "reflection_produced"
  // social
  | "interaction" | "drawn_to_reflected" | "bond_consolidated" | "rupture" | "apology" | "forgiveness"
  // play & ritual
  | "play_event" | "solstice_attended" | "ritual_performed"
  // reproduction
  | "spawning" | "egg_laid" | "fry_hatched"
  // world
  | "day_advanced" | "season_changed" | "weather_changed" | "storm_began"
  // food & material
  | "food_eaten" | "material_spawned"
  // artifacts
  | "artifact_created" | "artifact_transferred" | "artifact_found" | "name_tile_placed" | "heirloom_passed"
  // visitor & chat
  | "visitor_connected" | "visitor_pebble_placed" | "visitor_fed" | "visitor_nicknamed"
  | "chat_classified" | "chat_message"
  // pond voice
  | "pond_utterance"
  // dev / operational
  | "dev_feed_all"
  | "tier_shifted" | "meditation_entered" | "meditation_exited" | "budget_alert"
  | "classifier_flagged" | "injection_attempt" | "provider_outage" | "recovery";

export interface EventEnvelope {
  id: string;                  // UUID
  at: number;                  // Unix ms
  tick: SimTick;
  pondId: string;
  actor: string;               // koi:<id> | visitor:<hash> | system
  type: EventType;
  targets: string[];           // zero or more koi ids
  mechanism: LoveFlowMechanism | null;
  affectDelta: MoodDelta | null;
  llm: {
    model: string;             // exact model id — never an alias
    temperature: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  } | null;
  payload: Record<string, unknown>;
  payloadHash: string;         // SHA-256 hex
  schemaVersion: number;       // stable across versions for concatenation
  configHash: string;          // distinguishes ablation runs
}

// ───────────────────────────────────────────────────────────────────
//  World state
// ───────────────────────────────────────────────────────────────────

export interface WorldState {
  /** [0, 1) — position within the current sim-day. */
  tDay: number;
  /** How many sim-days have passed since the pond was instantiated. */
  simDay: number;
  season: Season;
  weather: Weather;
  /** Water clarity — darkens under storms, recovers under calm. (§ XI) */
  clarity: number;             // 0..1
  /** Temperature in arbitrary units; gates spawning. */
  temperature: number;         // 0..1
  /** True once per 7 sim-days at the solstice moment. */
  solsticeActive: boolean;
  /** Tick at which solstice is next active. */
  nextSolsticeTick: SimTick;
}

// ───────────────────────────────────────────────────────────────────
//  Food (§ I, § XIII)
// ───────────────────────────────────────────────────────────────────

/** A food item is a spatial presence in the pond with finite life.
 *  Ambient food spawns itself according to season + time-of-day
 *  (pollen in spring, algae on shelf, dawn/dusk insects). Visitor
 *  food (pellets — commit 4) enters through the WS message path.
 *
 *  A food item is consumed when a koi's body comes within
 *  FOOD.consumptionRadius of it. First fish to touch eats all of it
 *  — food is discrete, not a pool. */
export type FoodKind =
  | "pollen"      // spring, drifts on surface, low nutrition
  | "algae"       // all seasons, shelf floor, moderate nutrition
  | "insect"      // summer/autumn, dawn/dusk only, high nutrition, short decay
  | "pellet";     // visitor-fed, highest nutrition, rarest by nature

export interface FoodItem {
  id: string;
  kind: FoodKind;
  /** Position in pond meters. y is depth; surface foods at y ≈ 0. */
  x: number;
  y: number;
  z: number;
  /** Sim-tick when this food item appeared. */
  spawnedAtTick: SimTick;
  /** Sim-tick when this food item decays (unless eaten first). */
  decayAtTick: SimTick;
  /** How much hunger this food satisfies when eaten. 0-1. */
  nutrition: number;
  /** Optional horizontal drift velocity for food that moves with
   *  the current (pollen, insects). */
  vx?: number;
  vz?: number;
}

// ───────────────────────────────────────────────────────────────────
//  Pond — full DO-persisted state
// ───────────────────────────────────────────────────────────────────

export interface PondMeta {
  version: string;
  configHash: string;
  createdAtTick: SimTick;
  createdAtMs: number;
  /** Ticks per second; the client adapts its interpolation to this. */
  tickHz: number;
}

/** What the DO serializes into durable storage per tick. Hot path. */
export interface PondHotState {
  tick: SimTick;
  world: WorldState;
  koi: KoiState[];
  /** Food items currently present in the pond. Ambient spawn, decay,
   *  and consumption all mutate this list each tick. */
  food: FoodItem[];
  /** Current meditation tier. 0 = healthy, 3 = meditation. */
  tierLevel: 0 | 1 | 2 | 3;
  /** Approximate spend this month, in USD. */
  monthSpendUsd: number;
  /** Counter used to bias pseudo-random effects deterministically. */
  rngState: number;
}
