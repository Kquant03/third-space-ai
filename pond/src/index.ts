// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Worker entry (multi-DO)
//  ─────────────────────────────────────────────────────────────────────────
//  Routes WebSocket traffic + pond status to the Pond DO, cognition-log
//  traffic + sweep orchestration to the CognitionLog DO.
// ═══════════════════════════════════════════════════════════════════════════

import { Pond } from "./pond-do.js";
import { CognitionLog } from "./cognition-log.js";
import { runSweep, getSweepProgress, listSweepProgress } from "./sweep.js";
import { CANONICAL_CONTEXTS } from "./sweep-contexts.js";
import { generateSyntheticContexts } from "./sweep-contexts-synthetic.js";

export { Pond, CognitionLog };

interface Env {
  POND: DurableObjectNamespace;
  COGNITION_LOG: DurableObjectNamespace;
  OPENROUTER_API_KEY: string;
  SHARED_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (
      url.pathname === "/ws" ||
      url.pathname === "/status" ||
      url.pathname === "/lineage" ||
      url.pathname.startsWith("/events/")
    ) {
      const id = env.POND.idFromName("primary");
      return env.POND.get(id).fetch(request);
    }

    if (url.pathname.startsWith("/cog/") || url.pathname === "/cog") {
      if (url.pathname === "/cog/sweep/run" && request.method === "POST") {
        return handleSweepRun(request, env, ctx);
      }
      if (url.pathname === "/cog/sweep/progress" && request.method === "GET") {
        return handleSweepProgress(request, env, url);
      }
      const forwardUrl = new URL(request.url);
      forwardUrl.pathname = url.pathname.replace(/^\/cog/, "");
      const forwarded = new Request(forwardUrl.toString(), request);
      const id = env.COGNITION_LOG.idFromName("primary");
      return env.COGNITION_LOG.get(id).fetch(forwarded);
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function handleSweepRun(
  request: Request, env: Env, ctx: ExecutionContext,
): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.SHARED_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const body = await request.json() as {
    models: string[];
    contexts: unknown[] | string | null;
    run_id?: string;
    seed?: number;
    concurrency?: number;
  };
  const runId = body.run_id ?? `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Resolve contexts:
  //   - string "synthetic"    → 500 synthetic contexts
  //   - string "synthetic:N"  → N synthetic contexts (e.g. "synthetic:50")
  //   - array                 → use as-is
  //   - null/missing          → canonical 20
  let contexts: Parameters<typeof runSweep>[0]["contexts"];
  if (typeof body.contexts === "string") {
    const match = body.contexts.match(/^synthetic(?::(\d+))?$/);
    if (match) {
      const n = match[1] ? parseInt(match[1], 10) : 500;
      contexts = generateSyntheticContexts({ count: n, seed: body.seed });
    } else {
      return new Response(`unknown contexts preset: ${body.contexts}`, { status: 400 });
    }
  } else if (Array.isArray(body.contexts)) {
    contexts = body.contexts as Parameters<typeof runSweep>[0]["contexts"];
  } else {
    contexts = CANONICAL_CONTEXTS;
  }

  ctx.waitUntil(runSweep({
    runId,
    models: body.models,
    contexts,
    apiKey: env.OPENROUTER_API_KEY,
    sharedSecret: env.SHARED_SECRET,
    logDO: env.COGNITION_LOG,
    concurrency: body.concurrency,
  }));

  return new Response(JSON.stringify({ run_id: runId, status: "started" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// ───────────────────────────────────────────────────────────────────
//  /cog/sweep/progress
//  ─────────────────────────────────────────────────────────────────
//  Returns live progress for one or all in-flight sweeps.
//    ?run_id=...         → just that run
//    (no query)          → all tracked runs (most recent first)
//  Always 200 with JSON, even if nothing's running (empty list).
// ───────────────────────────────────────────────────────────────────

function handleSweepProgress(request: Request, env: Env, url: URL): Response {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.SHARED_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const runId = url.searchParams.get("run_id");
  if (runId) {
    const p = getSweepProgress(runId);
    return jsonResp(p ? { run: p } : { run: null });
  }
  const all = listSweepProgress()
    .map((id) => getSweepProgress(id))
    .filter((p) => p !== null)
    .sort((a, b) => (b!.startedAt - a!.startedAt));
  return jsonResp({ runs: all });
}

function jsonResp(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
