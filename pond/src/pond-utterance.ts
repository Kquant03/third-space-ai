// ═══════════════════════════════════════════════════════════════════════════
//  pond-utterance.ts — the pond's voice
//  ─────────────────────────────────────────────────────────────────────────
//  When the chat has been quiet for a while and visitors are present, OR
//  when light shifts at dawn or dusk, the pond itself drops a single
//  observation into the chat. Not advice, not a response to anyone —
//  the pond doesn't read the conversation. Just notices something about
//  its own state: the water, the koi, the silence, the season.
//
//  Voice register:
//    - Short. One or two sentences, fragments welcome.
//    - Sensory and observational; no opinions, no advice.
//    - Lowercase, minimal punctuation.
//    - About the pond itself — never about specific visitors or messages.
//
//  Failure handling: returns null on any error (transport, malformed
//  output, empty, too long). Caller skips this beat — no broadcast, no
//  state update. The pond is allowed to stay silent.
//
//  Reuses the same model binding as moderation. At this cadence (at
//  most once every 25 minutes) the cost is amortized to nothing.
// ═══════════════════════════════════════════════════════════════════════════

/** Primary model for pond-voice generation. Same model as moderation
 *  (Gemma 4 26B A4B via OpenRouter) — keeps the architectural claim
 *  "Gemma family at every safety-relevant layer the pond exposes"
 *  consistent. */
const POND_UTTERANCE_MODEL = "google/gemma-4-26b-a4b-it";

/** Fallback model when Gemma is unreachable. Claude Haiku 4.5 — fast,
 *  capable, follows the voice prompt cleanly. Used only when the
 *  primary call throws across all Gemma providers. */
const POND_UTTERANCE_FALLBACK_MODEL = "anthropic/claude-haiku-4.5";

/** Max length of an accepted pond utterance. Anything longer is treated
 *  as a generation failure and skipped. Two sentences should always fit. */
const MAX_POND_UTTERANCE_LENGTH = 180;

const POND_VOICE_PROMPT = `You are the voice of Limen Pond, a small contemplative koi pond.
The pond occasionally observes its own state — the water, the light,
the silence, the koi, the season.

Your voice:
- One or two sentences. Fragments welcome.
- Sensory and observational. No opinions, no advice, no questions.
- Lowercase. Minimal punctuation.
- About the pond itself — never about visitors or what they have said.

Examples of the register:
- the surface is still tonight.
- someone fed a koi an hour ago. the ripples have not quite settled.
- it has been quiet here for a while. the fish do not mind.
- twilight is the longest hour.
- a leaf has been resting on the water since morning.
- the koi are gathered near the eastern bank.

Generate one observation in this voice. Output only the observation
itself, no preamble or framing.`;

export type PondPhase = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";
export type PondSeason = "spring" | "summer" | "autumn" | "winter";

export interface PondUtteranceContext {
  phase: PondPhase;
  season: PondSeason;
}

/** OpenRouter request body. */
interface OpenRouterRequest {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature: number;
  max_tokens: number;
  provider?: { allow_fallbacks: boolean };
}

interface OpenRouterResponseBody {
  choices: Array<{ message: { content: string; role: string } }>;
}

/** Single OpenRouter call. Throws on transport error; caller handles
 *  fallback to a different model. */
async function callOpenRouter(
  apiKey: string,
  body: OpenRouterRequest,
): Promise<string> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://third-space.ai",
      "X-Title": "Limen Pond",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`OpenRouter ${resp.status}: ${text.slice(0, 200)}`);
  }
  const parsed = (await resp.json()) as OpenRouterResponseBody;
  return parsed.choices[0]?.message?.content ?? "";
}

/**
 * Generate a single observation in the pond's voice. Returns null on
 * any failure — caller should skip the beat rather than retry, since
 * the pond is allowed to be silent.
 *
 * Two-tier model resolution: Gemma 4 26B A4B primary, Claude Haiku 4.5
 * fallback. Mirrors the moderation pipeline so the pond's voice and
 * its content classifier share the same hierarchy of dependencies.
 */
export async function generatePondUtterance(
  env: { OPENROUTER_API_KEY?: string },
  ctx: PondUtteranceContext,
): Promise<string | null> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const messages: OpenRouterRequest["messages"] = [
    { role: "system", content: POND_VOICE_PROMPT },
    {
      role: "user",
      content: `current time in the pond: ${ctx.phase}, ${ctx.season}.`,
    },
  ];

  let raw: string;
  try {
    raw = await callOpenRouter(apiKey, {
      model: POND_UTTERANCE_MODEL,
      messages,
      max_tokens: 80,
      // Slight temperature so we get variety across utterances. Not
      // too high — we don't want the model wandering off-register.
      temperature: 0.85,
      provider: { allow_fallbacks: true },
    });
  } catch (gemmaErr) {
    console.warn(
      "[pond-utterance] gemma unreachable, falling back to claude: " +
      (gemmaErr instanceof Error ? gemmaErr.message : String(gemmaErr)),
    );
    try {
      raw = await callOpenRouter(apiKey, {
        model: POND_UTTERANCE_FALLBACK_MODEL,
        messages,
        max_tokens: 80,
        temperature: 0.85,
        provider: { allow_fallbacks: true },
      });
    } catch (claudeErr) {
      console.error(
        "[pond-utterance] both gemma and claude fallback failed: " +
        (claudeErr instanceof Error ? claudeErr.message : String(claudeErr)),
      );
      return null;
    }
  }

  return cleanPondUtterance(raw.trim());
}

/**
 * Sanitize the raw model output into something safe to broadcast.
 * - Take only the first line (in case the model added explanation).
 * - Strip wrapping quotes/backticks the model sometimes adds.
 * - Trim whitespace, normalize internal whitespace.
 * - Reject if empty or too long.
 *
 * Note: we do NOT enforce lowercase here — that's a stylistic ask of
 * the prompt, not a safety property. If the model gets capitalization
 * wrong occasionally, that's tolerable; the pond is allowed minor voice
 * drift. We just clean up the obviously broken outputs.
 */
function cleanPondUtterance(raw: string): string | null {
  // Take first non-empty line.
  const lines = raw.split(/\r?\n/);
  let s = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      s = trimmed;
      break;
    }
  }
  if (s.length === 0) return null;

  // Strip wrapping quotes/backticks the model sometimes adds.
  s = s.replace(/^["'`*_]+/, "").replace(/["'`*_]+$/, "").trim();
  // Collapse internal whitespace.
  s = s.replace(/\s+/g, " ");

  if (s.length === 0) return null;
  if (s.length > MAX_POND_UTTERANCE_LENGTH) return null;
  return s;
}

/**
 * Map a tDay value in [0, 1) to a coarse pond phase. Boundaries are
 * approximate and chosen so dawn/dusk catch the actual visual transition
 * windows in the renderer, not just instantaneous moments.
 */
export function phaseFromTDay(tDay: number): PondPhase {
  // tDay convention: 0 = midnight, 0.25 = sunrise, 0.5 = noon,
  // 0.75 = sunset. Clamp/wrap to [0, 1).
  let t = tDay - Math.floor(tDay);
  if (t < 0) t += 1;
  if (t < 0.21) return "night";
  if (t < 0.30) return "dawn";
  if (t < 0.46) return "morning";
  if (t < 0.55) return "midday";
  if (t < 0.71) return "afternoon";
  if (t < 0.80) return "dusk";
  return "night";
}
