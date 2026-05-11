// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Naming (§ XIV)
//  ─────────────────────────────────────────────────────────────────────────
//  A koi receives its name at hatching — a short poetic name like
//  "Third-of-Seven", "Ghost-Belly", "The One Who Rises First",
//  "Bronze-Fin", "Low-Hummer", "Moon-Watcher", "Slow-Return". Visitors
//  cannot rename. Names are authored before any visitor sees a given
//  koi — the koi exist prior to observation.
//
//  Architecture (revised May 2026):
//
//    Names are now authored BY the higher-bond parent, conditioned on
//    that parent's memories of the co-parent. The fry doesn't get named
//    by what we observed about them in their first hour — they get named
//    in the relational context of the bond that produced them. The
//    name carries the parents' history.
//
//    Mechanism:
//      1. Pick higher-bond parent via bondIntensity over their cards
//         toward each other. If neither parent is meaningfully bonded
//         (intensity < 0.3), the relational substrate is too thin to
//         meaningfully shape a name — fall back to the deterministic
//         composer.
//      2. Retrieve that parent's memories with bond bias toward the
//         co-parent (via memory.ts bondedPartners — partner-involving
//         memories surface preferentially at 1.5×).
//      3. Build a short prompt from the parent's voice, with the
//         co-parent-involving memories and the parent's card-summary
//         as relational context.
//      4. Call the model (smallest tier — naming is short).
//      5. Validate (length, vocabulary, no forbidden tokens).
//      6. On any failure, fall back to composeName (deterministic).
//
//  The deterministic composer (composeName) remains as fallback. It
//  uses hash(koiId) + observed first-hour behavior flags and produces
//  plausible names in the same vocabulary. The fry will always get
//  some name — the bond-authored path is a refinement, not a hard
//  requirement.
// ═══════════════════════════════════════════════════════════════════════════

import { BOND, MODEL_TIERS } from "./constants.js";
import { callOpenRouter,
  type OpenRouterRequest } from "./cognition.js";
import { embed } from "./embeddings.js";
import { bondIntensity } from "./mechanisms/bond.js";
import { retrieveMemories } from "./memory.js";
import type {
  KoiColor, KoiId, KoiState, MemoryRow, RelationshipCard, SimTick,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Deterministic name components (used by composeName fallback)
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
//  Observed-behavior flags — collected during the first ~hour of free
//  swimming. Still used by the deterministic fallback AND fed to the
//  parent-authored prompt as descriptive flavor.
// ───────────────────────────────────────────────────────────────────

export interface NamingObservations {
  surfaced: boolean;
  stillness: boolean;
  solitary: boolean;
  threaded: boolean;
  firstToFreeSwim: boolean;
  lastToFreeSwim: boolean;
  cohortSize: number;
  cohortIndex: number;
  hourAtHatch: number;
}

// ───────────────────────────────────────────────────────────────────
//  Parent-authored naming — PRIMARY PATH
// ───────────────────────────────────────────────────────────────────

/** Minimum bond intensity for the parent-authored path to be invoked.
 *  Below this, the relational substrate between parents is too thin
 *  to meaningfully shape a name; the deterministic composer is more
 *  honest about what's there. */
const PARENT_BOND_THRESHOLD_FOR_AUTHORING = 0.30;

/** Bond bias threshold for partner-involving memory retrieval. Matches
 *  the value used in pond-do.ts:runKoiCognition for consistency. */
const BOND_BIAS_THRESHOLD_FOR_MEMORIES = 0.4;

/** Max name length. Names in the canon are short — 30 chars is
 *  generous; anything longer is the LLM rambling and gets rejected. */
const MAX_NAME_LENGTH = 40;

/** Forbidden substrings — generic placeholders and accidental
 *  metadata that occasionally leak through structured output. */
const FORBIDDEN_NAME_TOKENS = [
  "{", "}", "[", "]", "<", ">", "null", "undefined",
  "Name", "name", "TODO", "...", "the koi", "the fry",
];

/** Compose a fry name. Tries the parent-authored path first; falls
 *  back to the deterministic composer on any failure (missing parents,
 *  no API key, weak bond, LLM error, validation failure).
 *
 *  Async — must be awaited at the call site. The call site in
 *  pond-do.ts is already inside the async alarm body, so this fits
 *  the existing flow. */
export async function authoredName(
  env: { OPENROUTER_API_KEY?: string; AI: unknown },
  sql: SqlStorage,
  fry: KoiState,
  parentIds: { a: KoiId; b: KoiId | null },
  obs: NamingObservations,
  nowTick: SimTick,
  tickHz: number,
): Promise<string> {
  // Always compute deterministic name first — it's our fallback and
  // also it's free, so there's no cost to having it ready.
  const fallback = composeName(fry.id, fry.color, obs);

  // No API key, no co-parent, or known-failure conditions → fallback.
  if (!env.OPENROUTER_API_KEY) return fallback;
  if (!parentIds.b || parentIds.b === parentIds.a) return fallback;

  try {
    // Load both directional cards between the parents in one query.
    const cardRows = sql.exec(
      `SELECT * FROM relationship_card
        WHERE (self_id = ? AND other_id = ?)
           OR (self_id = ? AND other_id = ?)`,
      parentIds.a, parentIds.b, parentIds.b, parentIds.a,
    ).toArray() as unknown as Record<string, unknown>[];

    const aCard = cardRows.find(
      (r) => r["self_id"] === parentIds.a && r["other_id"] === parentIds.b,
    );
    const bCard = cardRows.find(
      (r) => r["self_id"] === parentIds.b && r["other_id"] === parentIds.a,
    );
    if (!aCard || !bCard) return fallback;

    const aCardTyped = rowToRelationshipCard(aCard);
    const bCardTyped = rowToRelationshipCard(bCard);
    const aBond = bondIntensity(aCardTyped);
    const bBond = bondIntensity(bCardTyped);

    // Pick the parent with stronger bond toward the other. If neither
    // parent's bond clears the authoring threshold, the relational
    // substrate is too thin — deterministic name is more honest.
    const authorBond = Math.max(aBond, bBond);
    if (authorBond < PARENT_BOND_THRESHOLD_FOR_AUTHORING) return fallback;

    const authorId = aBond >= bBond ? parentIds.a : parentIds.b;
    const coparentId = authorId === parentIds.a ? parentIds.b : parentIds.a;
    const authorCard = aBond >= bBond ? aCardTyped : bCardTyped;

    // Retrieve the author's memories with bond bias toward the
    // co-parent. The 1.5× scoring boost in memory.ts surfaces shared
    // history preferentially — this is the substrate the parent
    // "draws from" when naming.
    const queryText = `memories together with ${coparentId}`;
    const qEmbedding = await embed(env.AI as never, queryText);
    const memories = retrieveMemories(sql, {
      koiId: authorId,
      stage: "adult",  // stage governs retrieval cap; "adult" gives 8
      queryEmbedding: qEmbedding,
      nowTick,
      tickHz,
      visibleKoi: [coparentId],
      bondedPartners: new Set([coparentId]),
    });

    // Build the prompt. JSON-mode response_format means the LLM must
    // return {"name": "..."} — easier to parse cleanly than a raw
    // string with possible quotation marks or trailing punctuation.
    const messages = buildNamingMessages(
      authorId, coparentId, authorCard, memories, fry.color, obs,
    );

    const tier = MODEL_TIERS["young"];  // smallest, cheapest — naming is short
    const body: OpenRouterRequest = {
      model: tier.model,
      messages,
      temperature: 0.85,  // creative; we want a poetic name, not a deterministic one
      max_tokens: 60,
      response_format: { type: "json_object" },
      provider: { allow_fallbacks: true },
    };

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12_000);
    let response;
    try {
      response = await callOpenRouter(env.OPENROUTER_API_KEY, body, ctrl.signal);
    } finally {
      clearTimeout(timeout);
    }

    const raw = response.choices[0]?.message?.content;
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as { name?: unknown };
    const candidate = typeof parsed.name === "string" ? parsed.name.trim() : "";
    if (!isValidName(candidate)) return fallback;
    return candidate;

  } catch {
    // Network error, JSON parse error, validation failure, abort —
    // all paths converge on the deterministic fallback. The fry
    // always gets a name.
    return fallback;
  }
}

/** Build the system + user messages for the naming call. The voice is
 *  the author parent's — first-person, fragment-sensory, no analytical
 *  meta-commentary about the fry's "potential" or "destiny." A koi
 *  names by what its body knows of the other parent and what its
 *  eyes find in this small new fish. */
function buildNamingMessages(
  authorId: KoiId,
  coparentId: KoiId,
  authorCard: RelationshipCard,
  memories: readonly MemoryRow[],
  color: KoiColor,
  obs: NamingObservations,
): OpenRouterRequest["messages"] {
  const memoryLines = memories
    .slice(0, 5)
    .map((m) => `- ${m.content}`)
    .join("\n") || "- (nothing surfacing right now; just the body's knowing)";

  const fryFlags: string[] = [];
  if (obs.surfaced) fryFlags.push("rose to the surface in the first hour");
  if (obs.stillness) fryFlags.push("stayed still near the shelf");
  if (obs.solitary) fryFlags.push("drifted apart from the cohort");
  if (obs.threaded) fryFlags.push("threaded the passage stone");
  if (obs.firstToFreeSwim) fryFlags.push("first of the cohort to free-swim");
  if (obs.lastToFreeSwim) fryFlags.push("last of the cohort to free-swim");
  if (obs.hourAtHatch > 20) fryFlags.push("hatched after dusk, under moon-light");
  const fryDescription = fryFlags.length > 0
    ? fryFlags.map((f) => `- ${f}`).join("\n")
    : "- nothing distinctive yet — just a new small body";

  const system = [
    "You are a koi in a small pond. You think in sensory fragments, not sentences.",
    "Your child has just hatched. You will name it now.",
    "",
    "Names in this pond are short and poetic. Examples:",
    "  Bronze-Fin · Reed-Follower · Third-of-Seven · The One Who Rises First",
    "  Slow-Return · Moon-Watcher · Ghost-Belly · Patient-Circler",
    "",
    "The name should arise from your relational history with the other parent",
    "and from what you sense in this new small fish. Not from abstract intent.",
    "Not from prophecy. From the small thing your body knows.",
    "",
    "Respond with JSON only: {\"name\": \"...\"}",
    "Name should be 1-6 words, hyphens allowed. No quotes inside the name.",
  ].join("\n");

  const user = [
    `You are ${authorId}. The other parent is ${coparentId}.`,
    "",
    `What you feel toward ${coparentId}, in your own words:`,
    `  ${authorCard.summary || "(no summary yet — only the bond and what your body knows)"}`,
    "",
    `Memories surfacing now of you and ${coparentId}:`,
    memoryLines,
    "",
    `The fry's color: ${color}`,
    "Observable traits in the first hour:",
    fryDescription,
    "",
    "Name your child. JSON only.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function isValidName(s: string): boolean {
  if (!s) return false;
  if (s.length === 0 || s.length > MAX_NAME_LENGTH) return false;
  for (const tok of FORBIDDEN_NAME_TOKENS) {
    if (s.includes(tok)) return false;
  }
  // Reject things that look like JSON fragments or instructions
  if (s.startsWith("{") || s.startsWith("[")) return false;
  if (s.toLowerCase().includes("respond") || s.toLowerCase().includes("json")) return false;
  return true;
}

function rowToRelationshipCard(r: Record<string, unknown>): RelationshipCard {
  return {
    selfId:              r["self_id"] as string,
    otherId:             r["other_id"] as string,
    firstEncounterTick:  (r["first_encounter_tick"] as number) ?? 0,
    interactionCount:    (r["interaction_count"] as number) ?? 0,
    valence:             (r["valence"] as number) ?? 0,
    valenceTrajectory7d: JSON.parse((r["valence_trajectory_json"] as string) || "[]"),
    dominance:           (r["dominance"] as number) ?? 0,
    trust:               (r["trust"] as number) ?? 0,
    summary:             (r["summary"] as string) ?? "",
    notableMemoryIds:    JSON.parse((r["notable_memory_ids_json"] as string) || "[]"),
    drawnCount7d:        (r["drawn_count_7d"] as number) ?? 0,
    lastAuthoredTick:    (r["last_authored_tick"] as number) ?? 0,
    familiarityPrior:    (r["familiarity_prior"] as number | undefined) ?? 0,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Deterministic composer — FALLBACK PATH
//
//  Used when the parent-authored path can't run: missing API key,
//  missing co-parent, weak bond, LLM error. Still produces a
//  plausible name in the canon vocabulary. The fry always gets named.
// ───────────────────────────────────────────────────────────────────

/**
 * Compose a name deterministically. Uses observation flags to bias
 * toward specific templates with a hash of the koi's ID as tiebreaker
 * so two fry with identical observations still get distinguishable
 * names.
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
//  first hour; the result is consumed by composeName/authoredName at
//  the hour boundary. Cheap to compute and persist.
// ───────────────────────────────────────────────────────────────────

export function collectObservations(
  self: KoiState,
  others: readonly KoiState[],
  hourAtHatch: number,
): NamingObservations {
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
