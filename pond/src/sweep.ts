// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Sweep Orchestrator
//  ─────────────────────────────────────────────────────────────────────────
//  Given a list of models and a list of pond contexts, fires the Cartesian
//  product through OpenRouter and logs every result to the CognitionLog DO.
//
//  Concurrency: 6 inflight calls at a time. OpenRouter rate-limits at 40
//  req/10s on free-tier models; 6-concurrent comfortably fits inside that.
//
//  Resilience: any single call failing (rate-limit, 404 deprecated model,
//  timeout, bad JSON) still produces a row with validation_status='failed'
//  so the leaderboard can rank models on *reliability* not just on the
//  ones that happened to succeed.
//
//  Cost budget: each call logs its own cost_usd from the OpenRouter
//  response's `usage` block, which reflects real pricing. A full 50×20
//  sweep typically comes in well under $1.
// ═══════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ───────────────────────────────────────────────────────────────────
//  Progress tracking
//
//  Workers that spawn async sweeps via ctx.waitUntil() can query live
//  progress for any in-flight run via getSweepProgress(). The map is
//  module-level because the worker process persists across requests.
//  Entries are kept after completion (status becomes 'done') and only
//  cleared on worker restart. A few kilobytes of memory, worth the
//  operational clarity.
// ───────────────────────────────────────────────────────────────────

interface SweepProgress {
  total: number;
  done: number;
  startedAt: number;
}

export const SWEEP_PROGRESS = new Map<string, SweepProgress>();

export function getSweepProgress(runId: string):
  | ({ runId: string; status: "running" | "done" } & SweepProgress & {
      elapsed_sec: number;
      rate_per_sec: number;
      eta_sec: number;
      pct: number;
    })
  | null
{
  const p = SWEEP_PROGRESS.get(runId);
  if (!p) return null;
  const elapsedMs = Date.now() - p.startedAt;
  const elapsed_sec = elapsedMs / 1000;
  const rate_per_sec = elapsed_sec > 0 ? p.done / elapsed_sec : 0;
  const remaining = Math.max(0, p.total - p.done);
  const eta_sec = rate_per_sec > 0 ? remaining / rate_per_sec : 0;
  const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
  const status: "running" | "done" = p.done >= p.total ? "done" : "running";
  return {
    runId, status,
    total: p.total, done: p.done, startedAt: p.startedAt,
    elapsed_sec, rate_per_sec, eta_sec, pct,
  };
}

export function listSweepProgress(): string[] {
  return Array.from(SWEEP_PROGRESS.keys());
}

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  if (sec < 60)    return `${sec.toFixed(0)}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m${Math.round(sec % 60).toString().padStart(2, "0")}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

// ───────────────────────────────────────────────────────────────────
//  Types
// ───────────────────────────────────────────────────────────────────

export interface SweepContext {
  /** Short id so we can later slice results by context. */
  id: string;
  /** Human label — "adult near shrine spring evening" etc. */
  label: string;
  /** System prompt the model receives. */
  system: string;
  /** User message composing the pond context the koi sees. */
  user: string;
  /** Metadata blobs we'll echo into the log row for later analysis. */
  pond_context: Record<string, unknown>;
  koi_state: Record<string, unknown>;
  perception: Record<string, unknown>;
}

export interface SweepOptions {
  runId: string;
  models: string[];
  contexts: SweepContext[];
  apiKey: string;
  sharedSecret: string;
  logDO: DurableObjectNamespace;
  concurrency?: number;
}

// Shared Zod-lite coercion matching the pond's cognition validation.
// Minimal: we only try to extract an intent + utterance from the response.
const ResponseSchema = z.object({
  intent:    z.string().optional(),
  target_koi: z.string().nullable().optional(),
  utterance: z.string().nullable().optional(),
  mood_delta: z.unknown().optional(),
  importance: z.number().optional(),
  mechanism: z.string().nullable().optional(),
}).passthrough();

// ───────────────────────────────────────────────────────────────────
//  Entry point
// ───────────────────────────────────────────────────────────────────

export async function runSweep(opts: SweepOptions): Promise<void> {
  // Default concurrency 3: OpenRouter free tier caps at 16 req/min across
  // all :free models combined. At 3 concurrent with ~5s per call
  // (including backoff for occasional 429s), we land around 12-15 req/min
  // peak — comfortably under the ceiling. Raise only for paid sweeps.
  const concurrency = opts.concurrency ?? 3;
  const logStub = opts.logDO.get(opts.logDO.idFromName("primary"));

  // Register the run so the leaderboard can show it as 'running'.
  await callDO(logStub, "POST", "/sweep/start", opts.sharedSecret, {
    run_id: opts.runId,
    model_count: opts.models.length,
    context_count: opts.contexts.length,
    meta: { started: Date.now() },
  });

  const jobs: SweepJob[] = [];
  for (const model of opts.models) {
    for (const ctx of opts.contexts) {
      jobs.push({ model, context: ctx });
    }
  }

  console.log(`[sweep ${opts.runId}] ${jobs.length} jobs, concurrency=${concurrency}`);
  const startedAt = Date.now();
  SWEEP_PROGRESS.set(opts.runId, { total: jobs.length, done: 0, startedAt });

  let done = 0;
  const workers: Promise<void>[] = [];
  let nextIdx = 0;

  const worker = async () => {
    while (nextIdx < jobs.length) {
      const i = nextIdx++;
      const job = jobs[i];
      if (!job) break;
      try {
        await executeJob(job, opts, logStub);
      } catch (err) {
        console.warn(`[sweep ${opts.runId}] job ${i} crashed`, err);
      }
      done++;
      SWEEP_PROGRESS.set(opts.runId, { total: jobs.length, done, startedAt });

      if (done % 20 === 0 || done === jobs.length) {
        const elapsedMs = Date.now() - startedAt;
        const ratePerSec = done / (elapsedMs / 1000);
        const remaining = jobs.length - done;
        const etaSec = ratePerSec > 0 ? remaining / ratePerSec : 0;
        const pct = ((done / jobs.length) * 100).toFixed(1);
        console.log(
          `[sweep ${opts.runId}] ${done}/${jobs.length} (${pct}%)  ` +
          `rate=${ratePerSec.toFixed(2)}/s  ` +
          `elapsed=${fmtDuration(elapsedMs / 1000)}  ` +
          `eta=${fmtDuration(etaSec)}`,
        );
      }
    }
  };

  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);

  await callDO(logStub, "POST", "/sweep/finish", opts.sharedSecret, {
    run_id: opts.runId,
    status: "done",
  });

  console.log(`[sweep ${opts.runId}] completed — ${done}/${jobs.length}`);
}

interface SweepJob {
  model: string;
  context: SweepContext;
}

// ───────────────────────────────────────────────────────────────────
//  Per-job execution
// ───────────────────────────────────────────────────────────────────

async function executeJob(
  job: SweepJob, opts: SweepOptions, logStub: DurableObjectStub,
): Promise<void> {
  const startMs = Date.now();
  let rawResponse: string | null = null;
  let validationStatus: "valid" | "coerced" | "failed" = "failed";
  let intentChosen: string | null = null;
  let utterance: string | null = null;
  let mechanism: string | null = null;
  let coerced: unknown = null;
  let tokensIn: number | undefined;
  let tokensOut: number | undefined;
  let costUsd: number | undefined;

  try {
    // Some providers (notably Google AI Studio for Gemma models) reject
    // separate `role: system` messages with a 400 "Developer instruction
    // not enabled" error. We merge the system prompt into the user turn
    // as a header block — loses no information, works across every route.
    //
    // We also skip `response_format: json_object` which is unevenly
    // supported; the system prompt tells the model to emit JSON and
    // tryParse() strips any stray markdown fences.
    const mergedUser = [
      "[REGISTER]",
      job.context.system,
      "",
      "[OBSERVATION]",
      job.context.user,
      "",
      "[INSTRUCTION]",
      "Respond with JSON only. No markdown, no commentary.",
    ].join("\n");

    // Retry on 429 (upstream rate-limit) using the X-RateLimit-Reset
    // header when the provider returns one — OpenRouter's free-tier
    // throttle gives us a Unix-ms timestamp telling us exactly when
    // the window opens again. Falls back to jittered exponential
    // backoff if no reset header is present.
    type OpenRouterResponse = {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_cost?: number };
      error?: {
        message?: string;
        code?: number;
        metadata?: { headers?: Record<string, string> };
      };
    };
    const MAX_ATTEMPTS = 4;
    let attempt = 0;
    let res: Response | null = null;
    let data: OpenRouterResponse | null = null;

    while (attempt < MAX_ATTEMPTS) {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${opts.apiKey}`,
          "content-type": "application/json",
          "http-referer": "https://limenresearch.ai",
          "x-title": "Limen Pond Sweep",
        },
        body: JSON.stringify({
          model: job.model,
          messages: [{ role: "user", content: mergedUser }],
          max_tokens: 300,
          temperature: 0.9,
        }),
      });
      data = await res.json() as OpenRouterResponse;

      const isRateLimit =
        res.status === 429 ||
        data?.error?.code === 429 ||
        (typeof data?.error?.message === "string" &&
         /rate-?limit/i.test(data.error.message));

      if (!isRateLimit) break;

      attempt++;
      if (attempt >= MAX_ATTEMPTS) break;

      // Prefer the provider's Reset header if available — it's the
      // authoritative "window opens at X" timestamp.
      const resetHeader = data?.error?.metadata?.headers?.["X-RateLimit-Reset"];
      let waitMs: number;
      if (resetHeader) {
        const resetAtMs = Number(resetHeader);
        if (Number.isFinite(resetAtMs)) {
          waitMs = Math.max(100, resetAtMs - Date.now() + 500);  // +500ms slop
        } else {
          waitMs = 5000;
        }
      } else {
        // Jittered backoff: 2s, 5s, 12s
        const base = [2000, 5000, 12000][attempt - 1] ?? 12000;
        waitMs = base * (0.8 + Math.random() * 0.4);
      }
      // Cap any wait at 65s so we don't stall forever on a bad header.
      waitMs = Math.min(waitMs, 65_000);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    if (!data) {
      rawResponse = "no response";
    } else if (data.error) {
      rawResponse = JSON.stringify(data.error);
    } else {
      rawResponse = data.choices?.[0]?.message?.content ?? null;
      tokensIn  = data.usage?.prompt_tokens;
      tokensOut = data.usage?.completion_tokens;
      costUsd   = data.usage?.total_cost;

      if (rawResponse) {
        const parsed = tryParse(rawResponse);
        if (parsed.ok) {
          const validated = ResponseSchema.safeParse(parsed.value);
          if (validated.success) {
            validationStatus = "valid";
            coerced = validated.data;
            intentChosen = typeof validated.data.intent === "string" ? validated.data.intent : null;
            utterance = typeof validated.data.utterance === "string" && validated.data.utterance.length > 0
              ? validated.data.utterance : null;
            mechanism = typeof validated.data.mechanism === "string" ? validated.data.mechanism : null;
          } else {
            validationStatus = "failed";
          }
        }
      }
    }
  } catch (err) {
    rawResponse = String(err);
    validationStatus = "failed";
  }

  const latencyMs = Date.now() - startMs;

  await callDO(logStub, "POST", "/log", opts.sharedSecret, {
    run_tag: `sweep:${opts.runId}`,
    model_id: job.model,
    tier: "sweep",
    pond_context: job.context.pond_context,
    koi_state: job.context.koi_state,
    perception: job.context.perception,
    prompt_system: job.context.system,
    prompt_user: job.context.user,
    raw_response: rawResponse,
    coerced,
    validation_status: validationStatus,
    intent_chosen: intentChosen,
    utterance,
    mechanism,
    latency_ms: latencyMs,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
  });
}

// ───────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────

function tryParse(raw: string): { ok: true; value: unknown } | { ok: false } {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return { ok: true, value: JSON.parse(cleaned) };
  } catch {
    return { ok: false };
  }
}

async function callDO(
  stub: DurableObjectStub,
  method: "GET" | "POST",
  path: string,
  secret: string,
  body?: unknown,
): Promise<Response> {
  return stub.fetch(`https://internal${path}`, {
    method,
    headers: {
      "authorization": `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
