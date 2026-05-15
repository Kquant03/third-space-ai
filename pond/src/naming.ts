// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Naming (§ XIV)
//  ─────────────────────────────────────────────────────────────────────────
//  A koi receives its name at hatching — a short poetic name that observes
//  the fry's first-day behavior. *"Third-of-Seven." "Ghost-Belly." "The One
//  Who Rises First." "Bronze-Fin." "Low-Hummer." "Moon-Watcher." "Slow-
//  Return."* Visitors cannot rename. Names are authored before any visitor
//  sees a given koi — the koi exist prior to observation.
//
//  Stage 0: deterministic name composer using hashed seed + observed
//  behavior flags. This works with no LLM and produces plausible names
//  matching the examples. When cognition comes online (Stage 3), an
//  LLM call refines the name by examining actual first-hour memories.
// ═══════════════════════════════════════════════════════════════════════════

import type { KoiColor, KoiState } from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Deterministic name components
// ───────────────────────────────────────────────────────────────────

const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh",
  "Eighth", "Ninth",
];

const OF_COUNTS = [
  "Three", "Four", "Five", "Six", "Seven", "Nine",
];

const BODY_MODS = [
  "Bronze-Fin", "Pale-Belly", "Ghost-Belly", "Red-Whisker", "Dark-Flank",
  "Gold-Eye", "Moon-Scale", "Soft-Jaw", "Long-Tail", "Torn-Fin",
  "Still-Back", "Copper-Edge", "Dust-Speckle", "Cloud-Throat",
];

const ACTION_NAMES = [
  "The One Who Rises First", "The One Who Waits", "The Watcher at the Edge",
  "Slow-Return", "Shadow-Drifter", "Low-Hummer", "Moon-Watcher",
  "Reed-Follower", "The One Who Turns Away", "The One Who Threads the Arch",
  "First-to-Settle", "Last-to-Leave", "Deep-Rester", "Patient-Circler",
  "The Pale One Under the Shrine", "The One Who Finds the Caustic",
];

const COLOR_NAMES: Record<KoiColor, string[]> = {
  kohaku:  ["Red-Over-White", "Crown-Mark", "Snow-Fin"],
  shusui:  ["Blue-Spine", "River-Blue", "Rain-Scale"],
  ogon:    ["Gold-One", "Bright-Back", "Sun-Flank"],
  asagi:   ["Net-Blue", "Old-Net", "Belly-Flame"],
  tancho:  ["One-Red-Mark", "Crown-Dot", "Signal-Head"],
  utsuri:  ["Black-Through-White", "Ink-Flank", "Shadow-Scale"],
  bekko:   ["Spotted-Light", "Dapple-Back", "Bright-With-Ink"],
};

// ───────────────────────────────────────────────────────────────────
//  Observed-behavior flags — collected during the first ~hour of
//  free swimming (after the yolk sac is absorbed). Used by the name
//  composer to tilt toward a name that matches what the koi is.
// ───────────────────────────────────────────────────────────────────

export interface NamingObservations {
  /** Rose to the surface in the first hour. */
  surfaced: boolean;
  /** Stayed still near the shelf most of the first hour. */
  stillness: boolean;
  /** Drifted apart from the other fry. */
  solitary: boolean;
  /** Threaded the passage stone at least once. */
  threaded: boolean;
  /** Was the first of its cohort to free-swim. */
  firstToFreeSwim: boolean;
  /** Was the last of its cohort to free-swim. */
  lastToFreeSwim: boolean;
  /** Hatched in a cohort of this many. */
  cohortSize: number;
  /** Index within the cohort (0-based) — which fry hatched first. */
  cohortIndex: number;
  /** Hour of day (0..24) at hatching — moon-names favored after dusk. */
  hourAtHatch: number;
}

/**
 * Compose a name. Uses observation flags to bias toward specific templates,
 * with a hash of the koi's ID as a tiebreaker so two fry with identical
 * observations still get distinguishable names.
 *
 * The algorithm:
 *   1. If cohort is small (2-3), "Nth of Cohort-Size" is strongly available
 *      — half the time for these cohorts.
 *   2. Behavior flags map to action-names in a priority order.
 *   3. Falls back to body-mod + color, or color alone.
 */
export function composeName(
  koiId: string,
  color: KoiColor,
  obs: NamingObservations,
): string {
  const seed = hashStr(koiId);
  const pick = <T>(arr: readonly T[], bump = 0): T =>
    arr[(seed + bump) % arr.length]!;

  // 1. Cohort-position names — strong for small cohorts
  if (obs.cohortSize >= 2 && obs.cohortSize <= 7 && (seed & 3) < 2) {
    const ord = ORDINALS[obs.cohortIndex] ?? "One";
    const count = OF_COUNTS[obs.cohortSize - 3] ?? String(obs.cohortSize);
    return `${ord}-of-${count}`;
  }

  // 2. Behavior-derived
  if (obs.firstToFreeSwim && (seed & 1)) return "The One Who Rises First";
  if (obs.lastToFreeSwim  && (seed & 2)) return "Slow-Return";
  if (obs.threaded) return pick(["The One Who Threads the Arch", "Reed-Follower", "Deep-Rester"]);
  if (obs.solitary) return pick(["The Watcher at the Edge", "The One Who Turns Away", "Shadow-Drifter"]);
  if (obs.stillness) return pick(["Still-Back", "Patient-Circler", "Deep-Rester"]);
  if (obs.surfaced && obs.hourAtHatch > 20) return pick(["Moon-Watcher", "Moon-Scale", "Cloud-Throat"]);
  if (obs.surfaced) return pick(["The One Who Rises First", "Low-Hummer"], 3);

  // 3. Body-mod
  if ((seed & 7) < 3) return pick(BODY_MODS);

  // 4. Action name
  if ((seed & 7) < 5) return pick(ACTION_NAMES, 7);

  // 5. Color-derived
  return pick(COLOR_NAMES[color]);
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ───────────────────────────────────────────────────────────────────
//  Observations collector — called once per tick during the fry's
//  first hour; the result is consumed by composeName() at the hour
//  boundary. Cheap to compute and persist.
// ───────────────────────────────────────────────────────────────────

export function collectObservations(
  self: KoiState,
  others: readonly KoiState[],
  hourAtHatch: number,
): NamingObservations {
  // Rough heuristics from the koi's current state. A richer version
  // (§ XIV) uses the memory stream directly once memory is wired.
  const nearbyFry = others.filter(
    (o) => o.stage === "fry" && o.id !== self.id,
  );
  const anyClose = nearbyFry.some((o) => {
    const dx = o.x - self.x, dz = o.z - self.z;
    return dx * dx + dz * dz < 0.5 * 0.5;
  });

  return {
    surfaced: self.y > -0.5,
    stillness: Math.hypot(self.vx, self.vz) < 0.015,
    solitary: nearbyFry.length > 0 && !anyClose,
    threaded: false,    // wired once the shrine passage geometry is added
    firstToFreeSwim: self.ageTicks < 240, // ~2 min after hatch at 2 Hz
    lastToFreeSwim: self.ageTicks > 3600, // well past yolk-sac
    cohortSize: nearbyFry.length + 1,
    cohortIndex: 0,
    hourAtHatch,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Parent-authored naming (§ XIV, revised)
//  ──────────────────────────────────────────────────────────────────
//  When an egg hatches, the higher-bond parent authors the name in an
//  LLM call conditioned on bond-biased memory retrieval of their
//  co-parent. The name carries the parent's perception of the
//  newborn's first-hour behavior alongside whatever the parent
//  remembers of the partnership that produced them.
//
//  Status: this is the stub. It delegates to composeName so the worker
//  builds and runs in production; the parent-authored LLM path is
//  pending implementation in a follow-up commit (see worker-tree
//  repair session, May 15 2026). composeName has been the production
//  namer all along, so this stub is behaviorally a no-op against the
//  current observable output of the system.
// ───────────────────────────────────────────────────────────────────

export async function authoredName(
  _env: unknown,
  _sql: unknown,
  fry: KoiState,
  _parents: { a: string; b: string | null },
  obs: NamingObservations,
  _nowTick: number,
  _tickHz: number,
): Promise<string> {
  // Stub: fall back to the deterministic composer. The parent-authored
  // path was specified but not yet implemented — this keeps the call
  // site honest (always returns a name, never throws) while we land
  // the rest of the worker-tree repair. When the real implementation
  // arrives, replace this body without touching the signature.
  return composeName(fry.id, fry.color, obs);
}
