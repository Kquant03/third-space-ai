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

    // ── Admin routes ────────────────────────────────────────────────
    // Test-console entry points used by the dev tab in PondDiagnostic.
    // Gated by SHARED_SECRET; never callable without the right header.
    // All admin paths forward to the Pond DO, which performs the actual
    // simulation mutation under its own consistency boundary.
    if (url.pathname.startsWith("/admin/")) {
      const auth = request.headers.get("Authorization") ?? "";
      const expected = "Bearer " + env.SHARED_SECRET;
      if (!env.SHARED_SECRET || auth !== expected) {
        return new Response(
          JSON.stringify({ error: "unauthorized" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
      const id = env.POND.idFromName("primary_v3");
      const res = await env.POND.get(id).fetch(request);
      // Wrap with CORS headers so the dev console can read the response.
      const headers = new Headers(res.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    // Pond DO — the live simulation, the visitor surface, the broadcast.
    if (
      url.pathname === "/ws" ||
      url.pathname === "/status" ||
      url.pathname === "/lineage" ||
      url.pathname.startsWith("/events/")
    ) {
      const id = env.POND.idFromName("primary_v3");
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
