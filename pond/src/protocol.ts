// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Wire protocol
//  ─────────────────────────────────────────────────────────────────────────
//  Two separate schemas live here, both authored in Zod so the DO and its
//  clients agree on shape by construction:
//
//  1. WebSocket envelopes — what the pond broadcasts to usePond.ts.
//     The existing client in usePond.ts already expects:
//
//       { t: "snapshot", tick, now, fish, pondMeta? }
//       { t: "tick",     tick, now, fish }
//
//     This file is the authoritative schema for those messages. The
//     KoiFrame shape exactly matches usePond.ts's interface so that the
//     client can parse without conversion.
//
//  2. LLM response schema — what a cognition call must return. Every
//     response is validated through this; a failure triggers one retry
//     with the Zod error appended, then a cached stock fallback. The
//     LLM is never given free execution (§ V).
// ═══════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ───────────────────────────────────────────────────────────────────
//  Shared primitives
// ───────────────────────────────────────────────────────────────────

export const KoiIdSchema = z.string().min(1).max(64);

export const SeasonSchema = z.enum(["spring", "summer", "autumn", "winter"]);
export const WeatherSchema = z.enum(["clear", "breeze", "rain", "storm"]);

export const LifeStageSchema = z.enum([
  "egg", "fry", "juvenile", "adolescent", "adult", "elder", "dying", "dead",
]);

// ───────────────────────────────────────────────────────────────────
//  1. WebSocket envelopes
//
//     This shape MUST match usePond.ts's KoiFrame interface. When
//     fields are renamed here, rename them there in the same commit.
// ───────────────────────────────────────────────────────────────────

export const KoiFrameSchema = z.object({
  id: KoiIdSchema,
  name: z.string().optional(),
  stage: LifeStageSchema.optional(),

  // Pond-meters coordinates. The client converts to shader viewport
  // units via SHADER_SCALE in usePond.ts.
  x: z.number(),
  y: z.number(),
  z: z.number(),

  // Heading, radians.
  h: z.number(),

  // Optional size scale (0.35 = fry, 1.05 = elder).
  s: z.number().optional(),

  // Optional color morph.
  c: z.string().optional(),

  // Optional mood compact: {v: valence, a: arousal} — used by the client
  // to optionally modulate swim speed and shoal-distance.
  m: z.object({ v: z.number(), a: z.number() }).optional(),

  // Optional hunger (0 = sated, 1 = starving). Used by the client
  // diagnostic and, eventually, by a subtle visual cue (color desaturation
  // or fin-droop) as the fish's body state becomes visible in its motion.
  hu: z.number().min(0).max(1).optional(),

  // Founder flag — true for koi created at pond instantiation rather
  // than hatched. Present only on Shiki and Kokutou (or any future
  // founders); absent on all naturally-hatched koi. The renderer
  // reads this to apply distinct treatment to the anchor presences.
  founder: z.boolean().optional(),

  // Current kinematic intent — what the koi is doing right now. Shipped
  // every tick so the frontend can animate intent-specific behavior
  // (linger orbits, shoal formation, approach curves, surface breaches).
  // Matches IntentKindSchema in the cognition response, but ships here
  // without the full intent object because the frontend doesn't need
  // atTick or mechanism (mechanism rides separately via `mech` when
  // active).
  i: z.enum([
    "swim", "shoal", "solitary", "rest",
    "feed_approach", "feed_leave", "retreat",
    "approach", "linger", "bump",
    "shelter", "surface_breach", "play_invite",
    "follow", "threadway", "attend_solstice",
    "tend_eggs",
  ]).optional(),

  // Target koi id — for intents that orient toward another koi
  // (approach, linger, follow, play_invite, bump). The frontend uses
  // this to draw attention thread / intent-animation between the two
  // fish. Null when the intent has no target.
  t: KoiIdSchema.nullable().optional(),

  // Mechanism currently instantiating — when a koi's intent is part of
  // an active love-flow mechanism (e.g. gift, play_invitation), this
  // field identifies it. Most ticks this is absent.
  mech: z.string().optional(),
});

export type KoiFrame = z.infer<typeof KoiFrameSchema>;

/** A food item broadcast to clients for rendering. Food positions are
 *  in pond meters like koi positions. The client projects them through
 *  SHADER_SCALE in the same way. */
export const FoodFrameSchema = z.object({
  id: z.string(),
  kind: z.enum(["pollen", "algae", "insect", "pellet"]),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type FoodFrame = z.infer<typeof FoodFrameSchema>;

export const PondMetaSchema = z.object({
  version: z.string(),
  created_at: z.number(),          // unix ms
  tick_interval_ms: z.number(),
  t_day: z.number(),               // [0, 1)
  season: SeasonSchema,
});

export type PondMetaWire = z.infer<typeof PondMetaSchema>;

/** Full initial state — sent on WebSocket open. */
export const SnapshotMessageSchema = z.object({
  t: z.literal("snapshot"),
  tick: z.number().int().nonnegative(),
  now: z.number(),                 // unix ms, for client-side clock skew
  fish: z.array(KoiFrameSchema),
  food: z.array(FoodFrameSchema).optional(),
  pondMeta: PondMetaSchema,
  /** Chat surface payload — present when the visitor session has a
   *  handle and the worker is on the chat-deployed code path. Each
   *  field is independently optional so pre-chat-deploy clients and
   *  worker rollbacks degrade gracefully (the client treats absent
   *  fields as "chat unavailable for this session"). */
  chat: z.array(z.object({
    id: z.string(),
    handle: z.string(),
    text: z.string(),
    at: z.number(),
    kind: z.enum(["visitor", "pond"]).optional(),
  })).optional(),
  yourHandle: z.string().optional(),
  chatTotal: z.number().optional(),
});

/** Incremental frame — broadcast at `broadcastHz`. */
export const TickMessageSchema = z.object({
  t: z.literal("tick"),
  tick: z.number().int().nonnegative(),
  now: z.number(),
  fish: z.array(KoiFrameSchema),
  food: z.array(FoodFrameSchema).optional(),
});

/** Rare — when a koi speaks. Streamed as typed chunks. (§ XIII) */
export const SpeechMessageSchema = z.object({
  t: z.literal("speech"),
  fishId: KoiIdSchema,
  uttId: z.string(),
  chunk: z.string(),
  done: z.boolean(),
});

/** Emitted when a pond-wide event happens visitors should know about. */
export const AmbientEventMessageSchema = z.object({
  t: z.literal("ambient"),
  kind: z.enum([
    "hatched", "died", "storm_began", "storm_ended",
    "solstice_began", "solstice_ended", "season_changed",
    "meditation_entered", "meditation_exited",
  ]),
  tick: z.number().int().nonnegative(),
  now: z.number(),
  details: z.record(z.unknown()).optional(),
});

/** Emitted when a love-flow mechanism fires between koi.
 *
 *  Broadcast from applyMechanismFiring, separately from tick so the
 *  frontend can trigger specific animations (dance, tag contact, surface
 *  breach splash, shared-curiosity convergence) at the moment of
 *  firing, rather than having to infer them from frame-by-frame
 *  intent deltas.
 *
 *  The `payload` field carries mechanism-specific data — chain length
 *  for tag, correlation value for dance, etc. Frontend clients should
 *  treat unknown fields permissively. */
export const MechanismMessageSchema = z.object({
  t: z.literal("mechanism"),
  tick: z.number().int().nonnegative(),
  now: z.number(),
  mechanism: z.string(),
  family: z.string(),
  actor: KoiIdSchema,
  participants: z.array(KoiIdSchema),
  payload: z.record(z.unknown()).optional(),
});

// ───────────────────────────────────────────────────────────────────
//  Chat surface — visitor-to-visitor, classifier-gated, (§ XIV)
// ───────────────────────────────────────────────────────────────────

/** Internal chat-message representation, used by the worker before
 *  the message is wrapped into a broadcast envelope. The runtime
 *  ChatMessage type the pond holds in its ring buffer. */
export const ChatMessageSchema = z.object({
  id: z.string(),
  handle: z.string(),
  text: z.string().min(1).max(200),
  at: z.number(),
  kind: z.enum(["visitor", "pond"]).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** Broadcast envelope — sent to every connected session when a chat
 *  message is accepted by the classifier and added to the ring. */
export const ChatMessageBroadcastSchema = z.object({
  t: z.literal("chat_message"),
  id: z.string(),
  handle: z.string(),
  text: z.string(),
  at: z.number(),
  chatTotal: z.number(),
  kind: z.enum(["visitor", "pond"]),
});

/** Rejection envelope — sent back to just the submitting socket when
 *  the classifier (or a rate limiter) refuses the message. Carries
 *  the original text so the client can show "this wasn't sent: <text>"
 *  and offer a single rewrite. */
export const ChatRejectedSchema = z.object({
  t: z.literal("chat_rejected"),
  text: z.string(),
  reason: z.string(),
  at: z.number(),
});

export const ServerToClientSchema = z.discriminatedUnion("t", [
  SnapshotMessageSchema,
  TickMessageSchema,
  SpeechMessageSchema,
  AmbientEventMessageSchema,
  MechanismMessageSchema,
  ChatMessageBroadcastSchema,
  ChatRejectedSchema,
]);

export type ServerToClient = z.infer<typeof ServerToClientSchema>;

// Client-to-server — small, tightly rate-limited, validated before it
// becomes ambient perception for any koi. (§ XIV, § XVIII)

export const PebbleMessageSchema = z.object({
  t: z.literal("pebble"),
  x: z.number(),
  z: z.number(),
  inscription: z.string().max(80).optional(),
});

export const FoodMessageSchema = z.object({
  t: z.literal("food"),
  x: z.number(),
  z: z.number(),
  /** Optional dev key — when present and matching env.DEV_FEED_KEY,
   *  the food drop bypasses visitor rate limiting. Used during
   *  development to keep founder koi alive without per-message wait.
   *  Validated server-side; ignored if env.DEV_FEED_KEY is unset. */
  devKey: z.string().optional(),
});

export const NicknameMessageSchema = z.object({
  t: z.literal("nickname"),
  koiId: KoiIdSchema,
  nickname: z.string().min(1).max(40),
});

/** Visitor chat send. Single sentence, hard-capped at 200 chars; the
 *  worker classifies via Workers AI and either broadcasts or rejects.
 *  Rate-limited per session — see CHAT_RATE_LIMIT_MS in pond-do.ts. */
export const ChatClientMessageSchema = z.object({
  t: z.literal("chat"),
  text: z.string().min(1).max(200),
});

/** Dev-only: drop one pellet at every alive koi's current position.
 *  Auth gate is the dev key; any mismatch silently drops the message.
 *  Used to revive a starving pond during development. */
export const DevFeedAllMessageSchema = z.object({
  t: z.literal("dev_feed_all"),
  devKey: z.string(),
});

export const ClientToServerSchema = z.discriminatedUnion("t", [
  PebbleMessageSchema,
  FoodMessageSchema,
  NicknameMessageSchema,
  ChatClientMessageSchema,
  DevFeedAllMessageSchema,
]);

export type ClientToServer = z.infer<typeof ClientToServerSchema>;

// ───────────────────────────────────────────────────────────────────
//  2. LLM response schema (§ V)
//
//     The schema is enforced strictly. The LLM's options are exactly
//     these fields — nothing else. Validation failure → one retry with
//     the Zod error → stock fallback. See cognition.ts.
// ───────────────────────────────────────────────────────────────────

export const IntentKindSchema = z.enum([
  "swim",
  "shoal",
  "solitary",
  "rest",
  "feed_approach",
  "feed_leave",
  "retreat",
  "approach",
  "linger",
  "bump",
  "shelter",
  "surface_breach",
  "play_invite",
  "follow",
  "threadway",
  "attend_solstice",
  "tend_eggs",
]);

export const LoveFlowMechanismSchema = z.enum([
  "witnessing", "parallel_presence", "shared_attention", "bearing_witness", "joyful_reunion",
  "apology", "forgiveness", "cognitive_repair", "emotional_attunement", "farewell_ritual", "grief_companionship",
  "play_invitation", "tag", "dance", "synchronized_swim", "shared_curiosity",
  "mentorship", "mentor_mentee_inversion", "imitation_learning", "skill_transfer", "story_propagation", "vocabulary_drift",
  "gift", "pass_it_forward", "heirloom", "offering", "shared_food", "memory_gifting",
  "greeting", "farewell", "solstice_attendance", "seasonal_rite", "birth_witnessing", "elder_naming",
]);

export const CognitionResponseSchema = z.object({
  /** Intent — mandatory. */
  intent: IntentKindSchema,
  /** Koi this intent is directed at, if any. */
  target_koi: KoiIdSchema.nullable(),
  /** The love-flow mechanism this intent instantiates, if any.
   *  May be downgraded by the simulation's detection rules (§ IX). */
  mechanism: LoveFlowMechanismSchema.nullable(),
  /** Mood delta — blended 0.7 deterministic / 0.3 LLM. */
  mood_delta: z.object({
    p: z.number().min(-0.3).max(0.3).optional(),
    a: z.number().min(-0.3).max(0.3).optional(),
    d: z.number().min(-0.3).max(0.3).optional(),
  }),
  /** Short sensory fragment. Almost always null. Never a full sentence. (§ IV)
   *  Must be translated from a non-linguistic interior — "warm here" not
   *  "I feel warm." The LLM is instructed about this; we also truncate
   *  and filter here. */
  utterance: z.string().max(120).nullable(),
  /** Importance for memory scoring. 1-10. Most moments rate 1-3. */
  importance: z.number().int().min(1).max(10),
  /** Rare — only written when something genuinely noteworthy happened. */
  memory_write: z.object({
    kind: z.enum(["observation", "reflection", "notable_episode"]),
    content: z.string().max(240),
    emotional_valence: z.number().min(-1).max(1),
    participants: z.array(KoiIdSchema).max(6),
  }).nullable(),
  /** Very rare — semantic beliefs about the world or others. */
  belief_update: z.object({
    content: z.string().max(240),
    supersedes_belief_id: z.number().int().positive().nullable(),
  }).nullable(),
  /** Populated ONLY during the daily twilight reflection (§ X).
   *  Routine cognition calls must return null. The prompt makes this
   *  clear; the schema just permits it to travel on the same wire. */
  drawn_to: z.object({
    koi_id: KoiIdSchema,
    noticing: z.string().max(200),
  }).nullable(),
});

export type CognitionResponse = z.infer<typeof CognitionResponseSchema>;

// The twilight reflection *could* also carry relationship_deltas and
// soft_intent_tomorrow via a richer TwilightReflectionSchema below —
// used when we do a dedicated twilight call at a higher spend tier.
// For now runCognition uses CognitionResponseSchema for both paths and
// lets `drawn_to` be the only twilight-specific field.

export const TwilightReflectionSchema = z.object({
  sensory_summary: z.string().max(200),
  /** For each koi currently known, optional valence delta. */
  relationship_deltas: z.array(z.object({
    koi_id: KoiIdSchema,
    valence_delta: z.number().min(-0.2).max(0.2),
    summary: z.string().max(120),
  })).max(8),
  /** May be null; "it is acceptable — normal — to have no one you are drawn to." */
  drawn_to: z.object({
    koi_id: KoiIdSchema,
    noticing: z.string().max(200),
  }).nullable(),
  /** The fish's soft intent for tomorrow — narrative guidance, not binding. */
  soft_intent_tomorrow: z.string().max(120),
  /** A tiny persona drift. Optional; most days don't shift persona. */
  persona_drift: z.string().max(200).nullable(),
});

export type TwilightReflection = z.infer<typeof TwilightReflectionSchema>;
