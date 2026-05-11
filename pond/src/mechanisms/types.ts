// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Love-flow mechanism types (§ IX)
//  ─────────────────────────────────────────────────────────────────────────
//  Patterns by which care circulates through a colony rather than
//  accumulating in it. Organized into five families post-cleanup
//  (the teaching family was removed in May 2026 — none of its six
//  mechanisms had detectors and the family is post-launch work).
//  Each mechanism has three implementations:
//
//    - detection rule  — when does it fire?
//    - state effect    — what changes on firing?
//    - research metric — how is it measured in the event stream?
//
//  Two mechanism shapes:
//
//    STATE-BASED     The simulation observes pond state and decides
//    (witnessing,     whether the mechanism fired. The LLM's opinion is
//     play)           not consulted — you can't disagree that you and
//                     another being swam parallel for six minutes.
//
//    CLAIM-BASED     The LLM returns a response with `mechanism: "..."`.
//    (apology,        The simulation validates against event history
//     forgiveness,    (e.g., § IX rupture-first for apology) and either
//     gift)           honors the claim or downgrades it to a research
//                     datum ("would_have_apologized"). This is the
//                     agreeable-LLM guard.
//
//  The LLM can produce either shape; the simulation governs both.
//
//  NOTE: the top-level `LoveFlowMechanism` union literal (in
//  ../types.ts) and `LoveFlowMechanismSchema` in protocol.ts must be
//  trimmed to match this file's FAMILY_OF — same set of keys.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  KoiId, LoveFlowMechanism, MoodDelta, SimTick,
} from "../types.js";

// ───────────────────────────────────────────────────────────────────
//  Families — redundant with the union literal but named at runtime
//  so we can group metrics and events.
// ───────────────────────────────────────────────────────────────────

export type LoveFlowFamily =
  | "witnessing" | "repair" | "play" | "gift" | "ritual";

export const FAMILY_OF: Record<LoveFlowMechanism, LoveFlowFamily> = {
  // Witnessing
  witnessing: "witnessing",
  parallel_presence: "witnessing",
  shared_attention: "witnessing",
  bearing_witness: "witnessing",
  joyful_reunion: "witnessing",

  // Repair (apology + forgiveness wired; the four state-based
  // mechanisms are post-launch work)
  apology: "repair",
  forgiveness: "repair",

  // Play
  play_invitation: "play",
  tag: "play",
  dance: "play",
  synchronized_swim: "play",
  shared_curiosity: "play",

  // Gift
  gift: "gift",
  pass_it_forward: "gift",
  heirloom: "gift",
  offering: "gift",

  // Ritual
  greeting: "ritual",
  farewell: "ritual",
  solstice_attendance: "ritual",
  seasonal_rite: "ritual",
};

// ───────────────────────────────────────────────────────────────────
//  A firing — the common return shape of every detector
// ───────────────────────────────────────────────────────────────────

export interface MechanismFiring {
  mechanism: LoveFlowMechanism;
  family: LoveFlowFamily;
  /** The koi whose action or state initiated the firing. */
  actor: KoiId;
  /** Every koi affected, including the actor for symmetric mechanisms. */
  participants: KoiId[];
  tick: SimTick;
  /** PAD delta applied to the actor. */
  actorDelta: MoodDelta;
  /** PAD delta applied to each non-actor participant. */
  participantDelta: MoodDelta;
  /** Mechanism-specific payload written into the event envelope. */
  payload: Record<string, unknown>;
  /** Relationship card valence bump applied to self→other for each
   *  (self, other) pair in (actor, participants). Small; this is one
   *  of several mechanisms that moves cards over time. */
  cardValenceBump: number;
}

// ───────────────────────────────────────────────────────────────────
//  Cooldowns — per-pair, per-mechanism. Not a new table — queried from
//  the event log. The "fired more recently than this many ticks ago?"
//  pattern repeats across detectors so we centralize it.
// ───────────────────────────────────────────────────────────────────

export interface CooldownRow {
  actor: string;
  targetA: string | null;
  targetB: string | null;
  lastTick: SimTick;
}

/** Query: has this mechanism fired for this actor+target in the last
 *  `ticksWindow` ticks? Returns the most recent tick if yes.
 *
 *  Implemented as a single SQL over the `event` table. Cheap enough
 *  to call per detector per interval. */
export function lastFiredTick(
  sql: SqlStorage,
  mechanism: LoveFlowMechanism,
  actor: KoiId,
  targets: KoiId[],
  nowTick: SimTick,
  ticksWindow: number,
): SimTick | null {
  const lower = nowTick - ticksWindow;
  // targets_json is stored as a JSON array of strings; for small counts
  // (usually 1-2), we match via LIKE '%"<id>"%'. Adequate for Stage 5.
  const row = sql.exec(
    `SELECT MAX(tick) AS t FROM event
      WHERE tick > ?
        AND actor = ?
        AND mechanism = ?
        ${targets.length > 0
          ? targets.map(() => `AND targets_json LIKE ?`).join(" ")
          : ""}`,
    ...[
      lower,
      `koi:${actor}`,
      mechanism,
      ...targets.map((t) => `%"${t}"%`),
    ],
  ).toArray()[0];
  const t = row?.["t"] as number | null | undefined;
  return typeof t === "number" ? t : null;
}

// ───────────────────────────────────────────────────────────────────
//  Rupture — the prerequisite for apology
// ───────────────────────────────────────────────────────────────────

export interface RuptureRecord {
  actor: KoiId;        // whose action caused the rupture
  target: KoiId;       // whose valence dropped
  valenceDrop: number; // absolute magnitude, > 0
  cause: string;       // short tag: "bump_by_dominant", "food_denial", …
  tick: SimTick;
}

// ───────────────────────────────────────────────────────────────────
//  Context passed to detectors
// ───────────────────────────────────────────────────────────────────

export interface DetectionContext {
  tick: SimTick;
  tickHz: number;
  simDay: number;
  tDay: number;
  /** All living koi at this tick. */
  koi: ReadonlyArray<import("../types.js").KoiState>;
  /** Active points-of-interest: food drops, recent pebbles, solstice
   *  centerpoint when active. Used by shared_attention. */
  pois: POI[];
  sql: SqlStorage;
}

export interface POI {
  id: string;
  kind: "food" | "pebble" | "solstice";
  x: number; z: number;
  createdTick: SimTick;
  expiresTick: SimTick;
}

// ───────────────────────────────────────────────────────────────────
//  Validation shape for claim-based mechanisms
// ───────────────────────────────────────────────────────────────────

export type ValidationOutcome =
  | { kind: "honored"; firing: MechanismFiring }
  | { kind: "downgraded"; reason: string; firingAttempt: {
      mechanism: LoveFlowMechanism;
      actor: KoiId;
      target: KoiId;
    } };
