// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Worker entry
//  ─────────────────────────────────────────────────────────────────────────
//  Routes WebSocket traffic + pond status to the Pond DO. Routes the
//  auditability paths (cognition log, fire, export) to the CognitionLog DO.
//
//  The phone-curator and model-sweep paths from earlier iterations are
//  deferred to post-launch (they're for the eventual Gemma-4-E4B fine-
//  tune training pipeline, not for the launch demo). What stays is the
//  mechanistic-transparency promise from the Final Vision: every
//  utterance, every mechanism call, every memory commit is logged with
//  full input context and exportable as jsonl.
// ═══════════════════════════════════════════════════════════════════════════

import { Pond } from "./pond-do.js";
import { CognitionLog } from "./cognition-log.js";

export { Pond, CognitionLog };

interface Env {
  POND: DurableObjectNamespace;
  COGNITION_LOG: DurableObjectNamespace;
  OPENROUTER_API_KEY: string;
  SHARED_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
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

    // Pond DO — the live simulation, the visitor surface, the broadcast.
    if (
      url.pathname === "/ws" ||
      url.pathname === "/status" ||
      url.pathname === "/lineage" ||
      url.pathname.startsWith("/events/")
    ) {
      const id = env.POND.idFromName("primary");
      return env.POND.get(id).fetch(request);
    }

    // CognitionLog DO — auditability only. The pond writes through /log
    // and /fire; the public exports through /export. Curator UI paths
    // (/next, /rate) and model-sweep paths (/sweep/*) are deferred to
    // post-launch and not exposed here.
    if (
      url.pathname === "/cog/log" ||
      url.pathname === "/cog/fire" ||
      url.pathname === "/cog/export"
    ) {
      const forwardUrl = new URL(request.url);
      forwardUrl.pathname = url.pathname.replace(/^\/cog/, "");
      const forwarded = new Request(forwardUrl.toString(), request);
      const id = env.COGNITION_LOG.idFromName("primary");
      return env.COGNITION_LOG.get(id).fetch(forwarded);
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
