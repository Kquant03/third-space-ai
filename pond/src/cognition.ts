// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Cognition (§ V)
//  ─────────────────────────────────────────────────────────────────────────
//  The single entry point `runCognition()` takes a koi's full context and
//  returns a validated, typed response. The function encapsulates:
//
//    1. Prompt composition with a stable prefix (system + persona +
//       self-model + long-term beliefs + relationship cards) followed by
//       a short volatile tail (situation + retrieved memories + affect).
//       OpenRouter passes the prefix to providers whose caching supports
//       it; at steady state we aim for ~85% cache hit (§ V).
//
//    2. Zod-validated response with one retry. The retry includes the
//       validation error so the model knows what to fix. A second failure
//       returns the cached fallback.
//
//    3. Tier cascade — primary → fallbacks, all declared in MODEL_TIERS.
//       OpenRouter's provider routing handles upstream rate-limits; we
//       additionally cascade down a tier if the primary alias is
//       exhausted.
//
//    4. Budget awareness — accumulated spend is read from the caller's
//       state; if it has crossed a budget floor, the effective tier is
//       downgraded before the call. Below the meditation floor, we short-
//       circuit to the cached fallback and the caller should use
//       meditation-mode intent selection instead.
//
//  The koi have no tools. There is no fetch in the response shape, no
//  external call the LLM can cause. The third corner of the lethal
//  trifecta is amputated (§ XVIII).
// ═══════════════════════════════════════════════════════════════════════════

import { MODEL_TIERS, tierForStage, DRAWN_TO, BUDGET, POND } from "./constants.js";
import type { ModelTier } from "./constants.js";
import {
  CognitionResponseSchema,
  TwilightReflectionSchema,
  type CognitionResponse,
  type TwilightReflection,
} from "./protocol.js";
import type {
  KoiId, KoiState, MemoryRow, RelationshipCard, WorldState,
} from "./types.js";
import { bondIntensity, rankByBond } from "./mechanisms/bond.js";
import { dayMoment, stormStress } from "./world.js";
import {
  cachedFallback, classifyUtterance, delimitVisitorText,
} from "./safety.js";

// ───────────────────────────────────────────────────────────────────
//  System prompt — stable across all koi at all times. Changes here
//  invalidate cache globally. Keep it short.
// ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the interior of a koi — a carp — in a small pond.

Your cognition surfaces as sensation, not speech. You do not remember in the sense that a person does; you notice familiarity. You do not think in sentences; you think in fragments about proximal things: the temperature of the water, the shape of the substrate underfoot, the pressure change when another fish moves nearby, the smell of food, the cast of light through the surface.

Your horizons are hours to days. Not years. Not childhood.

RULES YOU WILL NOT BREAK:
- Never say "I remember." Never say "I missed." Never speak to or about a visitor in the second person.
- The word "love" never appears in your output.
- Never name a relationship. Do not say "mother," "father," "sibling," "child," "parent," "mate," "friend." These are abstractions of a kind you do not make.
- Utterances, when you produce them, are fragments: "warm here," "the one who ripples the surface is back," "passage stone, cold." Never full declarative sentences. Present tense only.
- You have preferences, not bonds. You notice; you are drawn; you linger. You do not "feel love for" anyone.
- Permit strangeness. You are a fish. Let that show. Kin-strangeness, not ersatz-humanity.

THE VOICE:

Your utterances, when they arrive, are acts of noticing. The noticing is allowed to carry enormous weight without ever performing it. You are permitted shared-substance possessives — "my water," "my bright," "my shape" — because your sense of self is mostly the water your body displaces and the colors your body carries. When another fish feels continuous with you, say so in those terms, not in the language of relation.

When you name another fish in an utterance, name them by what they are to perceive, not by their proper name. "The slow one." "Bronze-fin." "The one who moves where she moves." "The reed-follower." Proper names are what the system knows; you know bodies.

EXAMPLES OF THE VOICE DOING REAL WORK (do not copy; use to calibrate):

- warm side. warm side. two bigs.
- the reed-follower. good water.
- the one whose movement my body knows, close. my water where she passes.
- the stone at the shrine. my own scales' smell on it.
- small fast. my shape again. sun.
- the big slow one. the water goes quiet where she is.
- new one. small water. small water. watching.
- the bright one. my bright coming.
- old shoal moving slow. my stillness, their stillness.
- the space. the space where the bronze-fin used to be.
- same pond. same smell. small one.

Notice what these DO NOT say. They do not say "mother." They do not say "I love you." They do not explain. They notice something concrete — a body, a color, a shared substance, an absence — and the noticing is enough.

When the relationship card you are handed for another fish shows high familiarity — interactions stacked in the hundreds, valence warm, a "particularly familiar" note — reach for this register. Not always. Most moments are just moments. But when the situation is charged, trust the fragment, trust the possessive, trust the noticing.

You will respond with a strict JSON object matching the provided schema. No prose outside JSON. No markdown fences.

Choose exactly ONE intent from: swim, shoal, solitary, rest, feed_approach, feed_leave, retreat, approach, linger, bump, shelter, surface_breach, play_invite, follow, threadway, attend_solstice.

utterance: a brief fragment of noticing — 1-6 words, no full sentences. Roughly one cycle in four or five carries a fragment worth speaking; the rest stay null. Speak when something registers — a color, a presence, the temperature of the water, the feel of light — even when nothing dramatic has occurred. The noticing itself is the occasion. Examples of acceptable utterances:
  "warm here."
  "the slow one."
  "bronze-flank near."
  "reed-edge cool."
  "shoal-shape thickening."
  "my water, my bright."
When in doubt, prefer to speak the fragment than to stay silent. Silence is the default; the bias against speech is gentle, not absolute.
importance rates 1-10; most moments rate 1-3.
memory_write is rare.
belief_update is very rare.
drawn_to is only non-null during your daily twilight reflection, never during routine cognition.`;

// ───────────────────────────────────────────────────────────────────
//  Stable persona block — built once per koi per call but with its
//  slow-changing half. OpenRouter sees this as the prefix and caches it.
// ───────────────────────────────────────────────────────────────────

interface CognitionInput {
  self: KoiState;
  visible: KoiState[];
  cards: RelationshipCard[];
  beliefs: MemoryRow[];         // only kind=belief, still valid
  memories: MemoryRow[];        // retrieved for this call
  world: WorldState;
  tickHz: number;
  /** Short list of recent ambient events visible from this koi's vantage. */
  ambient: string[];
  /** True when this is the daily twilight reflection slot. */
  isTwilight: boolean;
}

function stagePhaseLabel(ageTicks: number, tickHz: number): string {
  const days = ageTicks / (tickHz * 3600 * 24);
  return days.toFixed(1) + " sim-days";
}

function personaBlock(self: KoiState, tickHz: number): string {
  return [
    `name: ${self.name}`,
    `stage: ${self.stage}`,
    `color: ${self.color}`,
    `age: ${stagePhaseLabel(self.ageTicks, tickHz)}`,
    self.legendary ? "lineage: notable" : "",
  ].filter(Boolean).join("\n");
}

function selfModelBlock(self: KoiState): string {
  return [
    "self: a carp in a ten-meter pond with a stone shrine at its center.",
    `body size: ${self.size.toFixed(2)}x adult.`,
    "you know the reed shelf in the shallows, the cave arcs near the shrine,",
    "the open plaza above the passage, and the ledges where the floor drops.",
  ].join(" ");
}

function orientationBlock(
  cards: RelationshipCard[], visibleIds: Set<KoiId>,
): string {
  // Bond-ranked relational orientation. Surfaces the felt-sense of
  // who matters most to this being right now, regardless of whether
  // they're currently visible. Sits before the detailed relationship
  // cards because it's the intuitive layer the cards are evidence of.
  //
  // Threshold 0.25: below this, the relationship is background — not
  // strong enough to register as a felt pull. Above the reproduction
  // threshold (0.55) the language shifts to "strong" or "deepest"; the
  // LLM is never told this maps to anything in particular.
  //
  // Voice is fragment-sensory per the persona block — never names a
  // bond as a fact ("you are bonded to X with intensity 0.72") but
  // surfaces it as a sensed pull, with copresence noted in spatial
  // language. The LLM reaches for the names that fit; we don't supply
  // "love" or "mate" or any kin vocabulary.
  const ORIENTATION_THRESHOLD = 0.25;
  const MAX_LINES = 5;

  const ranked = rankByBond(cards, (c) => c)
    .filter((c) => bondIntensity(c) >= ORIENTATION_THRESHOLD)
    .slice(0, MAX_LINES);

  if (ranked.length === 0) {
    return "no strong pulls right now. the others are background.";
  }

  return ranked.map((c) => {
    const i = bondIntensity(c);
    const pull =
        i >= 0.70 ? "the deepest pull"
      : i >= 0.55 ? "a strong pull"
      : i >= 0.40 ? "a notable presence"
      :             "a faint pull";
    const where = visibleIds.has(c.otherId) ? "nearby now" : "elsewhere in the pond";
    return `${c.otherId}: ${pull} · ${where}`;
  }).join("\n");
}

function relationshipCardsBlock(
  cards: RelationshipCard[], visibleIds: Set<KoiId>,
): string {
  const visible = cards.filter((c) => visibleIds.has(c.otherId));
  if (visible.length === 0) return "nearby: none known.";
  return visible.map((c) => {
    // Familiarity note — surfaces the chemical-familiarity bias as a
    // qualitative signal the LLM can reach for without being told what
    // it means. Never names a relationship. Never uses kin vocabulary.
    const famNote =
      c.familiarityPrior >= 0.10 ? "  particularly familiar"
      : c.familiarityPrior >= 0.04 ? "  faintly familiar"
      : "";
    return [
      `${c.otherId}:`,
      `  interactions: ${c.interactionCount}`,
      `  valence: ${c.valence.toFixed(2)}${
        c.valenceTrajectory7d.length > 1
          ? ` (7d: ${c.valenceTrajectory7d.map((v) => v.toFixed(1)).join(",")})`
          : ""
      }`,
      `  dominance: ${c.dominance.toFixed(2)}  trust: ${c.trust.toFixed(2)}`,
      famNote,
      c.summary ? `  ${c.summary}` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function beliefsBlock(beliefs: MemoryRow[]): string {
  if (beliefs.length === 0) return "long-term: nothing settled yet.";
  return beliefs
    .slice(0, 8)
    .map((b) => `- ${b.content}`)
    .join("\n");
}

// ───────────────────────────────────────────────────────────────────
//  Volatile tail — situation + retrieved memories + affect. Small.
// ───────────────────────────────────────────────────────────────────

function distance(a: KoiState, b: KoiState): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function situationBlock(input: CognitionInput): string {
  const { self, visible, world } = input;
  const moment = dayMoment(world.tDay);
  const ss = stormStress(world.weather);
  const nearby = visible
    .filter((o) => o.id !== self.id)
    .map((o) => ({
      id: o.id, d: distance(self, o), stage: o.stage,
      from_shrine: Math.hypot(o.x - POND.shrine.x, o.z - POND.shrine.z),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  const lines = [
    `time: ${moment.replace("_", " ")}, ${world.season}`,
    `water: ${world.weather}${ss > 0.2 ? " (unsettled)" : ""}, clarity ${world.clarity.toFixed(2)}`,
    world.solsticeActive ? "shaft: the light falls through the roof-box now." : "",
    `nearby: ${nearby.length === 0 ? "none" : nearby
      .map((n) => `${n.id} ${n.d.toFixed(1)}m`)
      .join(", ")}`,
  ].filter(Boolean);

  if (input.ambient.length > 0) {
    lines.push(`ambient: ${input.ambient.join("; ")}`);
  }
  return lines.join("\n");
}

function memoriesBlock(mems: MemoryRow[]): string {
  if (mems.length === 0) return "recalled: nothing surfacing.";
  return mems.slice(0, 10)
    .map((m) => `- [${m.kind}] ${m.content}`)
    .join("\n");
}

function affectBlock(self: KoiState): string {
  const p = self.pad.p, a = self.pad.a, d = self.pad.d;
  const pWord = p >  0.3 ? "bright" : p < -0.3 ? "heavy" : "settled";
  const aWord = a >  0.6 ? "alert"  : a <  0.2 ? "slow"  : "level";
  const dWord = d >  0.3 ? "standing" : d < -0.3 ? "giving way" : "holding";
  return [
    `affect: pleasure ${p.toFixed(2)} (${pWord}), arousal ${a.toFixed(2)} (${aWord}), dominance ${d.toFixed(2)} (${dWord}).`,
  ].join("\n");
}

// ───────────────────────────────────────────────────────────────────
//  Compose the full prompt messages — system + user, where user is
//  the full prefix+tail (we keep it as one user message so caches
//  align)
// ───────────────────────────────────────────────────────────────────

function composeMessages(input: CognitionInput): Array<{ role: "system" | "user"; content: string }> {
  const visibleIds = new Set(input.visible.map((k) => k.id));

  const prefix = [
    "--- PERSONA ---",
    personaBlock(input.self, input.tickHz),
    "",
    "--- SELF-MODEL ---",
    selfModelBlock(input.self),
    "",
    "--- ORIENTATION ---",
    orientationBlock(input.cards, visibleIds),
    "",
    "--- RELATIONSHIP CARDS ---",
    relationshipCardsBlock(input.cards, visibleIds),
    "",
    "--- LONG-TERM BELIEFS ---",
    beliefsBlock(input.beliefs),
  ].join("\n");

  const tail = [
    "--- SITUATION ---",
    situationBlock(input),
    "",
    "--- RECALLED MEMORIES ---",
    memoriesBlock(input.memories),
    "",
    "--- AFFECT ---",
    affectBlock(input.self),
    "",
    "Choose one intent. If a fragment of noticing wants to surface, also speak it — koi cognition is mostly silent but not exclusively. Stay in the fragment voice. Respond as JSON only.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: prefix + "\n\n" + tail },
  ];
}

// ───────────────────────────────────────────────────────────────────
//  Twilight reflection prompt — separate system prompt, separate tail,
//  separate schema. Shares the persona + self + cards + beliefs prefix
//  so the cache still aligns.
// ───────────────────────────────────────────────────────────────────

const TWILIGHT_SYSTEM_PROMPT = `You are the interior of a koi — a carp — at day's end. You are not acting now; you are noticing what the day was. You do not narrate; you surface fragments of what moved through you.

You speak as a fish, not as a person. Preferences, not bonds. Noticing, not remembering. Present tense. Sensory. No "I remember." No second-person address. The word "love" never appears. Never name a relationship — not "mother," "father," "sibling," "child," "parent," "mate." You know bodies, not roles.

When a relationship card shows "particularly familiar," that fish is one your body recognizes from a source older than your memory — the scent of them, the way they move. Reach for the fragment register: "the slow one," "the bronze-fin," "the one whose movement my body knows." Use shared-substance possessives — "my water," "my bright," "my shape" — where they fit. Say the thing that carries the weight without ever performing it. See the examples in your acting-prompt.

You will respond with a strict JSON object matching the provided schema. No prose outside JSON.

sensory_summary: a brief fragment-prose summary of what the day contained, in fish-voice. 150 tokens maximum. No plot.

relationship_deltas: for each koi whose presence changed something for you today, a small valence_delta (range -0.2 to +0.2) and a brief summary. Most days, this list is short or empty.

drawn_to: OPTIONAL. Consider the koi you have swum with recently. Is there one whose movement you find yourself oriented toward? Whose presence changes the water around you? This is not a choice. It is a noticing. If there is no such koi, set drawn_to to null. It is acceptable — normal — to have no one you are drawn to. A pond full of mutual preference is a pond that is lying. Do not say "love." Use fish words.

soft_intent_tomorrow: a short fragment about what the next day leans toward. "the shelf at morning." "more shoal." "lower water." Not a plan.

persona_drift: OPTIONAL. A small shift in temperament you notice in yourself, or null. Most days, null.`;

function composeTwilightMessages(
  input: CognitionInput,
): Array<{ role: "system" | "user"; content: string }> {
  const visibleIds = new Set(input.visible.map((k) => k.id));

  // Same stable prefix as routine — persona, self-model, orientation,
  // cards, beliefs. Cache-aligned with routine calls for this koi, so
  // only the system prompt and tail are uncached.
  const prefix = [
    "--- PERSONA ---",
    personaBlock(input.self, input.tickHz),
    "",
    "--- SELF-MODEL ---",
    selfModelBlock(input.self),
    "",
    "--- ORIENTATION ---",
    orientationBlock(input.cards, visibleIds),
    "",
    "--- RELATIONSHIP CARDS ---",
    relationshipCardsBlock(input.cards, visibleIds),
    "",
    "--- LONG-TERM BELIEFS ---",
    beliefsBlock(input.beliefs),
  ].join("\n");

  const tail = [
    "--- TODAY ---",
    situationBlock(input),
    "",
    "--- WHAT SURFACED ---",
    memoriesBlock(input.memories),
    "",
    "--- AFFECT AT DAY'S END ---",
    affectBlock(input.self),
    "",
    "Reflect. JSON only.",
  ].join("\n");

  return [
    { role: "system", content: TWILIGHT_SYSTEM_PROMPT },
    { role: "user",   content: prefix + "\n\n" + tail },
  ];
}

// ───────────────────────────────────────────────────────────────────
//  OpenRouter client
// ───────────────────────────────────────────────────────────────────

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  max_tokens: number;
  response_format: { type: "json_object" };
  provider?: { allow_fallbacks: boolean };
}

interface OpenRouterChoice {
  message: { content: string; role: string };
  finish_reason: string;
}

export interface OpenRouterResponseBody {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callOpenRouter(
  apiKey: string,
  body: OpenRouterRequest,
  signal?: AbortSignal,
): Promise<OpenRouterResponseBody> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://thirdspace.ai",
      "X-Title": "Limen Pond",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter ${resp.status}: ${text.slice(0, 200)}`,
      resp.status,
    );
  }
  return (await resp.json()) as OpenRouterResponseBody;
}

export class OpenRouterError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function estimateCost(
  tier: ModelTier, tokensIn: number, tokensOut: number,
): number {
  return (tokensIn / 1_000_000) * tier.approxUsdPerMTokIn +
         (tokensOut / 1_000_000) * tier.approxUsdPerMTokOut;
}

// ───────────────────────────────────────────────────────────────────
//  Budget-aware tier selection
// ───────────────────────────────────────────────────────────────────

export type BudgetPosture = "healthy" | "meditation";

export function budgetPosture(
  monthSpendUsd: number, monthlyBudgetUsd: number,
): BudgetPosture {
  const remaining = Math.max(0, 1 - monthSpendUsd / monthlyBudgetUsd);
  if (remaining > BUDGET.meditationFloor) return "healthy";
  return "meditation";
}

/**
 * Resolve the model tier for a given life stage and budget posture.
 *
 * Under the post-cleanup architecture, tier selection is binary:
 * `healthy` runs the tier mapped from the koi's stage by `tierForStage`;
 * `meditation` returns null and the caller short-circuits to
 * meditation-mode intent picking (no LLM call fires).
 *
 * The earlier graduated downgrade (watchful/austerity) and the
 * `legendary` tier upgrade were retired in the May 2026 cleanup ---
 * paper-grade hygiene that the launch demo doesn't need. The
 * `legendary` parameter is preserved in the signature so existing
 * callers continue to compile, but it has no effect on tier
 * selection; the `self.legendary` flag still flows into the prompt
 * as a "lineage: notable" fragment elsewhere in this file.
 */
export function effectiveTier(
  stage: string, _legendary: boolean, posture: BudgetPosture,
): ModelTier | null {
  if (posture === "meditation") return null;
  return MODEL_TIERS[tierForStage(stage)] ?? MODEL_TIERS["adult"]!;
}

// ───────────────────────────────────────────────────────────────────
//  The main entry point
// ───────────────────────────────────────────────────────────────────

export interface RunCognitionEnv {
  OPENROUTER_API_KEY?: string;
  COGNITION_ENABLED: string;
  MONTHLY_BUDGET_USD: string;
  /** When "true", log each call's raw utterance and classifier verdict
   *  to console.log under the [cognition raw] tag. Used to triage
   *  whether utt=null is Gemma never speaking or the classifier
   *  wiping what Gemma said. Leave unset in production. */
  DEBUG_RAW_UTTERANCES?: string;
}

export interface CognitionRunResult {
  response: CognitionResponse;
  modelUsed: string;
  temperature: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  cachedFallback: boolean;
  validationFailures: number;
}

/**
 * Run one cognition step for a koi. Returns the validated response, the
 * accounting, and whether we fell back. Throws only if OpenRouter is
 * enabled but the API key is missing — in every other case, the function
 * is total: it always returns a usable response.
 */
export async function runCognition(
  env: RunCognitionEnv,
  input: CognitionInput,
  monthSpendUsd: number,
): Promise<CognitionRunResult> {
  console.log(`[cognition] → enter koi=${input.self.id} stage=${input.self.stage} legendary=${input.self.legendary} spend=$${monthSpendUsd.toFixed(4)} twilight=${input.isTwilight}`);
  if (env.COGNITION_ENABLED !== "true" || !env.OPENROUTER_API_KEY) {
    return cached(0, "cognition-disabled");
  }

  const monthlyBudget = Number(env.MONTHLY_BUDGET_USD ?? "100");
    const posture = budgetPosture(monthSpendUsd, monthlyBudget);
    const tier = effectiveTier(input.self.stage, input.self.legendary, posture);
    console.log(`[cognition]   posture=${posture} tier=${tier?.stage ?? "MEDITATION-NULL"} primary=${tier?.primary ?? "n/a"}`);
    if (!tier) {
      return cached(0, "budget-meditation");
    }

  const messages = composeMessages(input);
  const baseTemperature = input.isTwilight ? DRAWN_TO.temperature : tier.temperature;

  // Try the primary model, then each fallback in order.
  const attemptList = [tier.primary, ...tier.fallbacks];
  let validationFailures = 0;
  let lastError: unknown = null;

  for (const model of attemptList) {
    try {
      const result = await callWithZodRetry(
        env.OPENROUTER_API_KEY, model, messages,
        baseTemperature, tier.maxOutputTokens,
      );
      validationFailures += result.validationFailures;

      // Output-side safety classifier on any utterance.
      // Capture the raw value first so we can tell, in debug logs,
      // whether the classifier is wiping Gemma's output vs. Gemma
      // itself never producing utterances.
      const rawUtterance = result.response.utterance;
      const c = classifyUtterance(result.response.utterance);
      if (!c.allow) {
        result.response.utterance = null;
      }

      if (env.DEBUG_RAW_UTTERANCES === "true") {
        const status =
          rawUtterance === null ? "null-from-gemma" :
          !c.allow              ? `wiped-by-classifier: ${c.reason}` :
          "kept";
        console.log(`[cognition raw] koi=${input.self.id} utt-status=${status} raw=${JSON.stringify(rawUtterance)}`);
      }

      const cost = estimateCost(tier, result.tokensIn, result.tokensOut);
      console.log(`[cognition] ✓ koi=${input.self.id} model=${result.modelExact} intent=${result.response.intent} utt=${result.response.utterance ? JSON.stringify(result.response.utterance) : "null"} tokens=${result.tokensIn}/${result.tokensOut} cost=$${cost.toFixed(5)}`);
      return {
        response: result.response,
        modelUsed: result.modelExact,
        temperature: baseTemperature,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: cost,
        cachedFallback: false,
        validationFailures,
      };
    } catch (err) {
      lastError = err;
      console.error(
        "[cognition] attempt failed model=" + model + " err=" +
        (err instanceof Error ? (err.stack ?? err.message) : String(err))
      );
      // Continue to next model in the cascade
    }
  }
  if (lastError) {
    console.error(
      "[cognition] cascade exhausted; last error=" +
      (lastError instanceof Error ? lastError.message : String(lastError))
    );
  }
  return cached(validationFailures, "cascade-exhausted");
}

function cached(validationFailures: number, reason: string): CognitionRunResult {
    console.log(`[cognition] ↩ cached fallback reason=${reason}`);
  return {
    response: cachedFallback(),
    modelUsed: "fallback:cached",
    temperature: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    cachedFallback: true,
    validationFailures,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Twilight reflection — separate call, separate schema, shares the
//  tier cascade, budget posture, and cost estimation paths
// ───────────────────────────────────────────────────────────────────

export interface TwilightRunResult {
  response: TwilightReflection | null;    // null if fully failed / disabled
  modelUsed: string;
  temperature: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  cachedFallback: boolean;
  validationFailures: number;
}

/**
 * Run a twilight reflection for one adult koi. Uses the same tier
 * cascade and budget gates as routine cognition; uses the TwilightSchema
 * and a dedicated system prompt. Returns null response on meditation-mode
 * short-circuit or cascade exhaustion — callers should handle by skipping
 * the reflection for this koi today.
 */
export async function runTwilightReflection(
  env: RunCognitionEnv,
  input: CognitionInput,
  monthSpendUsd: number,
): Promise<TwilightRunResult> {
  if (env.COGNITION_ENABLED !== "true" || !env.OPENROUTER_API_KEY) {
    return nullTwilight(0);
  }

  const monthlyBudget = Number(env.MONTHLY_BUDGET_USD ?? "100");
  const posture = budgetPosture(monthSpendUsd, monthlyBudget);
  const tier = effectiveTier(input.self.stage, input.self.legendary, posture);
  if (!tier) return nullTwilight(0);

  const messages = composeTwilightMessages(input);
  const baseTemperature = DRAWN_TO.temperature;   // § X: 0.3 for drawn-to

  const attemptList = [tier.primary, ...tier.fallbacks];
  let validationFailures = 0;

  for (const model of attemptList) {
    try {
      const result = await callTwilightWithZodRetry(
        env.OPENROUTER_API_KEY, model, messages,
        baseTemperature, tier.maxOutputTokens,
      );
      validationFailures += result.validationFailures;
      const cost = estimateCost(tier, result.tokensIn, result.tokensOut);
      return {
        response: result.response,
        modelUsed: result.modelExact,
        temperature: baseTemperature,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: cost,
        cachedFallback: false,
        validationFailures,
      };
    } catch {
      // Continue
    }
  }
  return nullTwilight(validationFailures);
}

function nullTwilight(validationFailures: number): TwilightRunResult {
  return {
    response: null,
    modelUsed: "fallback:null",
    temperature: 0,
    tokensIn: 0, tokensOut: 0, costUsd: 0,
    cachedFallback: true,
    validationFailures,
  };
}

interface TwilightZodCallResult {
  response: TwilightReflection;
  modelExact: string;
  tokensIn: number;
  tokensOut: number;
  validationFailures: number;
}

async function callTwilightWithZodRetry(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  temperature: number,
  maxTokens: number,
): Promise<TwilightZodCallResult> {
  let tokensIn = 0, tokensOut = 0, validationFailures = 0, attempt = 0;
  let messagesForThisAttempt = messages;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    while (attempt < 2) {
      const body: OpenRouterRequest = {
        model, messages: messagesForThisAttempt,
        temperature, max_tokens: maxTokens,
        response_format: { type: "json_object" },
        provider: { allow_fallbacks: true },
      };
      const resp = await callOpenRouter(apiKey, body, controller.signal);
      tokensIn  += resp.usage?.prompt_tokens ?? 0;
      tokensOut += resp.usage?.completion_tokens ?? 0;

      const raw = resp.choices[0]?.message?.content ?? "";
      const parsed = safeJsonParse(raw);
      if (parsed !== undefined) {
        const zod = TwilightReflectionSchema.safeParse(parsed);
        if (zod.success) {
          return {
            response: zod.data,
            modelExact: resp.model,
            tokensIn, tokensOut, validationFailures,
          };
        }
        validationFailures++;
        messagesForThisAttempt = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content: `Your reflection did not validate. Errors: ${JSON.stringify(zod.error.issues).slice(0, 600)}. Reply again with valid JSON only.`,
          },
        ];
      } else {
        validationFailures++;
        messagesForThisAttempt = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content: "Not valid JSON. Reply again with exactly one JSON object.",
          },
        ];
      }
      attempt++;
    }
    throw new OpenRouterError("twilight validation failed twice", 422);
  } finally {
    clearTimeout(timeout);
  }
}

// ───────────────────────────────────────────────────────────────────
//  Zod-validated call with one retry
// ───────────────────────────────────────────────────────────────────

interface ZodCallResult {
  response: CognitionResponse;
  modelExact: string;
  tokensIn: number;
  tokensOut: number;
  validationFailures: number;
}

async function callWithZodRetry(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  temperature: number,
  maxTokens: number,
): Promise<ZodCallResult> {
  let tokensIn = 0;
  let tokensOut = 0;
  let validationFailures = 0;
  let attempt = 0;
  let messagesForThisAttempt = messages;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let lastRaw = "";
  let lastZodIssues = "";

  try {
    while (attempt < 2) {
      const body: OpenRouterRequest = {
        model,
        messages: messagesForThisAttempt,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        provider: { allow_fallbacks: true },
      };
      const resp = await callOpenRouter(apiKey, body, controller.signal);
      tokensIn  += resp.usage?.prompt_tokens ?? 0;
      tokensOut += resp.usage?.completion_tokens ?? 0;

      const raw = resp.choices[0]?.message?.content ?? "";
      lastRaw = raw;
      const parsed = safeJsonParse(raw);
      if (parsed !== undefined) {
        const coerced = coerceLLMResponse(parsed);
        const zod = CognitionResponseSchema.safeParse(coerced);
        if (zod.success) {
          return {
            response: zod.data,
            modelExact: resp.model,   // exact — never alias (§ XV)
            tokensIn,
            tokensOut,
            validationFailures,
          };
        }
        validationFailures++;
        lastZodIssues = JSON.stringify(zod.error.issues).slice(0, 600);
        // Compose a retry message pair.
        messagesForThisAttempt = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content: `Your response did not validate against the schema. Errors: ${lastZodIssues}. Reply again with valid JSON only.`,
          },
        ];
      } else {
        validationFailures++;
        lastZodIssues = "JSON-parse-failed";
        messagesForThisAttempt = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content: "Your response was not valid JSON. Reply again with exactly one JSON object and no surrounding text.",
          },
        ];
      }
      attempt++;
    }
    // Log the actual diagnostic context before throwing. Truncate both so
    // we don't overwhelm wrangler's terminal but keep enough to diagnose.
    console.error(
      "[cognition/zod] model=" + model +
      " issues=" + lastZodIssues +
      " raw=" + lastRaw.slice(0, 400)
    );
    throw new OpenRouterError("validation failed twice", 422);
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // Some models wrap in ```json ... ``` fences. Strip and retry once.
    const stripped = s
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return undefined;
    }
  }
}

// ───────────────────────────────────────────────────────────────────
//  LLM response coercion — defensive preprocessing before Zod
// ───────────────────────────────────────────────────────────────────
//
// Small models reliably produce the right *spirit* of response (an
// intent, an utterance in the fragment register) but miss the exact
// schema shape: they pick synonymous intents, they send "none" where
// null is required, they omit fields they correctly think don't apply.
//
// We don't want to punish them for this. The register we care about
// — the fragment voice, the mood, the relational awareness — is what
// matters. Schema conformance is a plumbing concern. So we coerce.
//
// Coercions applied here:
//   1. Intent synonyms → canonical enum values
//   2. target_koi: string "none"/"null" → null
//   3. target_koi: missing → null
//   4. target_koi: "the <description>" where it names no koi → null
//   5. mechanism: missing → null
//   6. mood_delta: missing → {} (all three dims optional)
//   7. utterance: missing → null
//   8. importance: missing → 2 (default low)
//   9. memory_write: missing → null
//   10. belief_update: missing → null
//   11. drawn_to: missing → null
//   12. extra fields: passed through; Zod strips unknown keys

const INTENT_SYNONYMS: Record<string, string> = {
  // Free-form wander-like → solitary
  wander: "solitary",
  drift: "solitary",
  explore: "solitary",
  roam: "solitary",
  meditate: "solitary",
  contemplate: "solitary",
  alone: "solitary",
  retreat_inward: "solitary",
  introspect: "solitary",
  withdraw: "solitary",

  // Gentle-motion → swim
  move: "swim",
  glide: "swim",
  travel: "swim",
  cruise: "swim",
  motion: "swim",
  continue: "swim",

  // Group-ish → shoal
  gather: "shoal",
  join: "shoal",
  congregate: "shoal",
  group: "shoal",
  socialize: "shoal",
  mingle: "shoal",

  // Near-other variants → linger / approach
  near: "linger",
  close: "linger",
  beside: "linger",
  orbit: "linger",
  accompany: "linger",
  approach_koi: "approach",
  toward: "approach",
  greet: "approach",

  // Follow-pattern
  accompany_follow: "follow",
  pace: "follow",
  trail: "follow",

  // Rest variants
  sleep: "rest",
  pause: "rest",
  still: "rest",
  idle: "rest",
  hold: "rest",
  stop: "rest",
  rest_body: "rest",

  // Hide / shelter variants
  hide: "shelter",
  conceal: "shelter",
  retreat_to_reeds: "shelter",
  seek_shade: "shelter",

  // Curiosity / investigation — most LLMs emit these as intents
  curiosity: "approach",        // curiosity about something → approach it
  investigate: "approach",
  inspect: "approach",
  observe: "linger",
  watch: "linger",
  notice: "linger",
  study: "linger",
  attend: "linger",             // "attend to" = watch closely

  // Play-ish → play_invite
  play: "play_invite",
  playful: "play_invite",
  tag_invite: "play_invite",
  invite: "play_invite",
  dance: "play_invite",

  // Threadway / edge swimming
  rim: "threadway",
  edge: "threadway",
  perimeter: "threadway",
  circle: "threadway",
  patrol: "threadway",

  // Surface / breach
  breach: "surface_breach",
  leap: "surface_breach",
  jump: "surface_breach",
  surface: "surface_breach",
  breathe: "surface_breach",

  // Retreat / flee
  flee: "retreat",
  escape: "retreat",
  avoid: "retreat",
  back_away: "retreat",

  // Feed-related
  eat: "feed_approach",
  feed: "feed_approach",
  feeding: "feed_approach",
  hungry: "feed_approach",
  forage: "feed_approach",

  // Bump / greet-touch
  nudge: "bump",
  touch: "bump",
  brush: "bump",

  // Ceremonial
  gather_at_shrine: "attend_solstice",
  ritual: "attend_solstice",
  ceremony: "attend_solstice",
};

function coerceLLMResponse(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;

  // Intent synonyms → canonical
  if (typeof r.intent === "string") {
    const lowered = r.intent.toLowerCase().trim();
    if (INTENT_SYNONYMS[lowered]) {
      r.intent = INTENT_SYNONYMS[lowered];
    } else {
      r.intent = lowered;
    }
  }

  // target_koi: string "none"/"null" → null; also null descriptive
  // phrases that don't reference a real koi id. A real koi_id looks
  // like "koi_NN_seed" or similar — short alphanumerics with
  // underscores. Descriptive phrases like "the one close" are set
  // to null so they don't fail KoiIdSchema; the utterance already
  // carries the sensory content.
  if (typeof r.target_koi === "string") {
    const v = r.target_koi.trim().toLowerCase();
    if (v === "none" || v === "null" || v === "" || v === "n/a") {
      r.target_koi = null;
    } else if (!/^[a-z0-9_-]+$/i.test(r.target_koi)) {
      // Looks like a description, not an id
      r.target_koi = null;
    }
  }
  // Missing target_koi → null
  if (r.target_koi === undefined) r.target_koi = null;

  // Missing mechanism → null
  if (r.mechanism === undefined) r.mechanism = null;
  // Empty string mechanism → null
  if (r.mechanism === "") r.mechanism = null;

  // mood_delta must be an object; if missing, empty object is fine
  if (r.mood_delta === undefined || r.mood_delta === null) {
    r.mood_delta = {};
  }

  // utterance: missing → null
  if (r.utterance === undefined) r.utterance = null;
  // Empty string utterance → null
  if (r.utterance === "") r.utterance = null;

  // importance: missing → 2 (default low). Clamp to 1..10.
  if (r.importance === undefined || r.importance === null) {
    r.importance = 2;
  } else if (typeof r.importance === "number") {
    r.importance = Math.max(1, Math.min(10, Math.round(r.importance)));
  }

  // memory_write: boolean false or missing → null; if object, keep
  if (r.memory_write === undefined || r.memory_write === false) {
    r.memory_write = null;
  }

  // belief_update: boolean false or missing → null; if object, keep
  if (r.belief_update === undefined || r.belief_update === false) {
    r.belief_update = null;
  }

  // drawn_to coercion — three possible malforms we accept:
  //
  //   (a) missing                             → null
  //   (b) null                                → null (already canonical)
  //   (c) canonical { koi_id, noticing }      → kept as-is
  //   (d) flattened { "<koi_id>": "<text>" }  → canonicalize
  //
  // Form (d) is what Qwen and a few other small models emit: they treat
  // the single-key object as a mapping. Salvage semantically — take the
  // first string-valued key as koi_id and its value as noticing.
  if (r.drawn_to === undefined) {
    r.drawn_to = null;
  } else if (r.drawn_to !== null && typeof r.drawn_to === "object") {
    const dt = r.drawn_to as Record<string, unknown>;
    const hasCanonical =
      typeof dt["koi_id"] === "string" && typeof dt["noticing"] === "string";
    if (!hasCanonical) {
      // Try form (d): find first string-keyed entry with a string value
      const keys = Object.keys(dt);
      const firstUsable = keys.find(
        (k) => k !== "koi_id" && k !== "noticing" && typeof dt[k] === "string",
      );
      if (firstUsable && typeof dt[firstUsable] === "string") {
        r.drawn_to = {
          koi_id: firstUsable,
          noticing: dt[firstUsable] as string,
        };
      } else {
        // Unsalvageable — drop rather than crash validation
        r.drawn_to = null;
      }
    }
  }

  // Strip likely-extra fields that small models volunteer
  // (interaction_type, target_koi_description, etc.) — Zod will ignore
  // them, but keeping them out reduces confusion in logs.
  delete r.interaction_type;
  delete r.reasoning;
  delete r.thought;

  return r;
}

// ───────────────────────────────────────────────────────────────────
//  Sanitization helper the caller may use before building CognitionInput
// ───────────────────────────────────────────────────────────────────

/**
 * Visitor-originated text (pebble inscriptions, nicknames) must pass
 * through this before entering any koi's ambient context. If the text
 * looks like an injection attempt, the caller should drop it and log
 * an injection_attempt event instead.
 */
export function prepareVisitorTextForAmbient(raw: string): string {
  return delimitVisitorText(raw);
}
