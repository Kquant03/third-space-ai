// Limen Pond — shared types
// Used across the Durable Object, Worker router, and Next.js client.
// Keep this file free of runtime dependencies AND free of platform-specific
// types (Workers globals, Node globals, browser globals) so it can be shared
// via a published package or git submodule to the web app.
//
// Platform-specific bindings (Env, etc.) live with their platform:
//   - Worker bindings → pond/src/env.ts

// ───────────────────────────────────────────────────────────────────
//  Spatial
// ───────────────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Note: pond geometry (gourd shape, basin SDF, camera) lives in
// `lib/pondGeometry.ts` for the client and `pond/src/constants.ts`
// for the worker. There is intentionally no POND constant exported
// here — earlier revisions had a cylindrical POND that has been
// retired with the gourd adoption. Import POND from the appropriate
// platform's constants instead.

// ───────────────────────────────────────────────────────────────────
//  Life stage
// ───────────────────────────────────────────────────────────────────

export type Stage = "egg" | "fry" | "juvenile" | "adolescent" | "adult" | "elder" | "dying" | "dead";

// Note: stage durations and cognition cadences live in seconds in
// `pond/src/constants.ts` (LIFE.realSecondsPerStage, COGNITION_INTERVAL_S),
// converted to ticks at use site via `Math.floor(seconds * SIM.tickHz)`.
// This keeps tick rate freely tunable without recalibrating tables.
// Earlier revisions had a STAGE_SCHEDULE table calibrated in raw ticks
// at 2 Hz; that is now retired.
//
// Model-tier configuration (which OpenRouter / Anthropic model serves
// each life stage) lives in `MODEL_TIERS` in `pond/src/constants.ts`,
// keyed by tier slot ("young" | "adult" | "elder" | "dying"). The
// stage-to-tier mapping is `tierForStage(stage)`. The earlier
// string-union `ModelTier` ("fry" | "juvenile" | "adult" | "elder" |
// "legendary") is retired; the live `ModelTier` is the structured
// interface in constants.ts.

// ───────────────────────────────────────────────────────────────────
//  Koi state (authoritative; lives in SQLite)
// ───────────────────────────────────────────────────────────────────

export interface KoiState {
  fish_id: string;
  name: string;                    // observational, LLM-generated at hatching
  persona: string;                 // system-prompt core
  self_model: string | null;       // evolving self-description
  stage: Stage;
  born_at_tick: number;
  died_at_tick: number | null;

  // Kinematics
  pos: Vec3;
  vel: Vec3;
  heading: number;                 // radians, yaw

  // Affect (PAD)
  mood: {
    v: number;                     // pleasure/valence  [-1, 1]
    a: number;                     // arousal           [ 0, 1]
    d: number;                     // dominance         [-1, 1]
  };

  // Intent from last LLM decision
  intent: {
    type: string | null;
    target: string | null;
    expires_at_tick: number | null;
  };

  // Cognition scheduling
  next_cognition_tick: number;

  // Visual
  color: string;                   // hex or koi color code (kohaku, shusui, etc.)
  size_scale: number;              // 0.25 (fry) → 1.0 (adult) → 1.1 (elder)
}

// ───────────────────────────────────────────────────────────────────
//  Broadcast frame — what clients see
// ───────────────────────────────────────────────────────────────────

// Minimal per-fish state for rendering. Delta-compressed where possible.
export interface KoiFrame {
  id: string;
  name?: string;                   // sent only on first appearance / changes
  stage?: Stage;
  x: number;
  y: number;
  z: number;
  h: number;                       // heading (radians)
  s?: number;                      // size_scale
  c?: string;                      // color (sent only when changed)
  m?: { v: number; a: number };   // mood (subset; compact)
}

export interface BroadcastMessage {
  t: "tick";                       // tick type discriminator
  tick: number;
  now: number;                     // server time ms
  fish: KoiFrame[];
  events?: PublicEvent[];          // events worth surfacing this tick
}

export interface SpeechMessage {
  t: "speech";
  fishId: string;
  uttId: string;
  chunk: string;
  done: boolean;
}

export interface SnapshotMessage {
  t: "snapshot";
  tick: number;
  now: number;
  fish: KoiFrame[];
  pondMeta: {
    version: string;
    created_at: number;
    tick_interval_ms: number;
    t_day: number;                 // 0–1 day/night phase
    season: "spring" | "summer" | "autumn" | "winter";
  };
}

export type OutgoingMessage = BroadcastMessage | SpeechMessage | SnapshotMessage;

// ───────────────────────────────────────────────────────────────────
//  Incoming (visitor actions)
// ───────────────────────────────────────────────────────────────────

export interface VisitorActionDropPebble {
  t: "drop_pebble";
  pos: Vec3;
  inscription?: string;            // short, filtered
}

export interface VisitorActionFeed {
  t: "feed";
  pos: Vec3;
}

export interface VisitorActionNickname {
  t: "nickname";
  fishId: string;
  nickname: string;
}

export interface VisitorActionMessage {
  t: "message";
  content: string;                 // filtered, becomes ambient visitor_stimulus
}

export type VisitorAction =
  | VisitorActionDropPebble
  | VisitorActionFeed
  | VisitorActionNickname
  | VisitorActionMessage;

// ───────────────────────────────────────────────────────────────────
//  Events (research + public)
// ───────────────────────────────────────────────────────────────────

// The full event envelope (logged to SQLite + AE, eventually exported
// as the "sharded dataset of artificial life models").
export interface PondEvent {
  ts: number;                      // unix ms
  tick: number;
  pond_id: string;
  actor_id: string;
  event_type: EventType;
  target_ids: string[] | null;
  mechanism: LoveMechanism | null;
  affect_delta: { v: number; a: number; d: number } | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
  model: string | null;
  payload: Record<string, unknown>;
  schema_v: number;
  config_hash: string;
}

// What we surface to clients (subset of events visitors might care about).
export interface PublicEvent {
  kind: "birth" | "death" | "play" | "speech_intent" | "pebble_placed" | "naming";
  actor_id: string;
  target_ids?: string[];
  at_tick: number;
  payload?: Record<string, unknown>;
}

export type EventType =
  // Life cycle
  | "koi_spawned"
  | "koi_stage_transition"
  | "koi_died"
  | "egg_laid"
  | "egg_fertilized"
  | "egg_hatched"
  // Cognition
  | "cognition_dispatched"
  | "cognition_returned"
  | "cognition_failed"
  | "memory_written"
  | "reflection_daily"
  | "reflection_weekly"
  // Social
  | "witnessing"
  | "apology"
  | "forgiveness"
  | "play_invited"
  | "play_joined"
  | "play_left"
  | "teaching"
  | "gift"
  | "ritual_attended"
  | "greeting"
  | "farewell"
  | "mourning"
  // Speech
  | "speech_uttered"
  | "speech_heard"
  // World
  | "visitor_pebble_placed"
  | "visitor_feed"
  | "visitor_message"
  | "storm_began"
  | "storm_ended"
  | "solstice_shaft"
  | "season_changed"
  // Artifacts
  | "artifact_created"
  | "artifact_given"
  | "artifact_found"
  | "artifact_offered"
  // Meta
  | "pond_booted"
  | "pond_hibernated"
  | "pond_restored"
  | "colony_reseeded";

export type LoveMechanism =
  // Witnessing family
  | "mutual_witnessing"
  | "parallel_presence"
  | "shared_attention"
  | "bearing_witness_to_suffering"
  | "joyful_reunion"
  // Repair family
  | "apology"
  | "forgiveness"
  | "cognitive_repair"
  | "emotional_attunement"
  | "farewell_ritual"
  | "grief_companionship"
  // Play family
  | "play_invitation"
  | "tag"
  | "dance"
  | "synchronized_swim"
  | "shared_curiosity"
  // Gift family
  | "gift"
  | "pass_it_forward"
  | "heirloom"
  | "offering"
  | "shared_food"
  | "memory_gifting"
  // Ritual family
  // NOTE: this enum should be kept in sync with the canonical mechanism
  // type in `pond/src/mechanisms/types.ts`. The earlier teaching family
  // (mentorship, mentor_mentee_inversion, imitation_learning,
  // skill_transfer, story_propagation, vocabulary_drift) was cut in the
  // May 2026 cleanup pass. The ritual entries below may need further
  // trimming against mechanisms/types.ts — TODO cross-check.
  | "greeting"
  | "farewell"
  | "solstice_attendance"
  | "seasonal_rite"
  | "birth_witnessing"
  | "elder_naming";
