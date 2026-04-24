// ═══════════════════════════════════════════════════════════════════════════
//  /api/sweep-launch
//  ─────────────────────────────────────────────────────────────────────────
//  Body: { preset: "free" | "paid" | "all" }
//  Resolves the preset to a model list, loads the canonical contexts,
//  and POSTs to the worker's /cog/sweep/run to kick off the sweep.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";

const WORKER_URL = process.env.POND_WORKER_URL ?? "http://localhost:8787";
const SHARED_SECRET = process.env.POND_SHARED_SECRET ?? "";
const CURATE_TOKEN = process.env.CURATE_TOKEN ?? "";

// Model lists — must match pond/src/sweep-models.ts
// Mirrored here so the launcher doesn't need to import from the worker.
const MODELS_FREE = [
  "google/gemma-3-4b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3n:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "mistralai/devstral-2512:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "qwen/qwen3-coder:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-3-super:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "moonshotai/kimi-k2:free",
  "deepseek/deepseek-r1-distill-llama-8b:free",
];

const MODELS_PAID = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "x-ai/grok-3-mini",
  "x-ai/grok-4.1-fast",
  "mistralai/mistral-nemo",
  "mistralai/ministral-3b",
  "mistralai/ministral-8b",
  "qwen/qwen-2.5-14b-instruct",
  "qwen/qwen-2.5-32b-instruct",
  "qwen/qwen3-8b",
  "qwen/qwen3-14b",
  "meta-llama/llama-3.2-3b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "microsoft/phi-4",
  "microsoft/phi-4-mini",
  "cohere/command-r",
  "cohere/command-r-plus",
  "deepseek/deepseek-v3",
  "z-ai/glm-5",
  "nousresearch/hermes-4-8b",
  "nousresearch/hermes-3-llama-3.1-70b",
  "gryphe/mythomax-l2-13b",
  "openchat/openchat-7b",
  "qwen/qwen-2.5-1.5b-instruct",
  "google/gemma-2-2b-it",
  "mistralai/mixtral-8x7b-instruct",
  "01-ai/yi-34b-chat",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "minimax/minimax-m2.5",
  "moonshotai/kimi-k2-thinking",
];

function checkAuth(req: NextRequest): boolean {
  const cookie = req.cookies.get("curate_token")?.value;
  return cookie === CURATE_TOKEN && CURATE_TOKEN.length > 0;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return new Response("unauthorized", { status: 401 });
  }

  const { preset } = await req.json() as { preset: "free" | "paid" | "all" };
  const models =
    preset === "free" ? MODELS_FREE :
    preset === "paid" ? MODELS_PAID :
                        [...MODELS_FREE, ...MODELS_PAID];

  // Load canonical contexts by calling our own route — simpler than mirroring
  // the whole contexts file here. Alternatively we could have the worker
  // hold the canonical contexts too; for now we POST ids and let the worker
  // resolve. But since the worker also has them, we'll just reference by id.
  //
  // Simplest: let the worker use its built-in CANONICAL_CONTEXTS. We pass
  // contexts=null and the worker uses the defaults.
  const res = await fetch(`${WORKER_URL}/cog/sweep/run`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${SHARED_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ models, contexts: null }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(body, { status: res.status });
  }
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
