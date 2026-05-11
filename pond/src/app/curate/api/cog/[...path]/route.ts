// ═══════════════════════════════════════════════════════════════════════════
//  Curate API proxy
//  ─────────────────────────────────────────────────────────────────────────
//  Forwards /api/cog/<path> → <WORKER_URL>/cog/<path> with bearer auth.
//  The SHARED_SECRET lives only in the server env, never in the browser.
//
//  Access control: a simple CURATE_TOKEN cookie that the phone sets once
//  via /curate/login. This isn't a full auth system — it's a single-user
//  tool. The token is any string Stanley sets in his env and hands his
//  phone once.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";

const WORKER_URL = process.env.POND_WORKER_URL ?? "http://localhost:8787";
const SHARED_SECRET = process.env.POND_SHARED_SECRET ?? "";
const CURATE_TOKEN = process.env.CURATE_TOKEN ?? "";

function checkCurateAuth(req: NextRequest): boolean {
  if (!CURATE_TOKEN) return false;  // misconfigured — deny
  const cookie = req.cookies.get("curate_token")?.value;
  if (cookie === CURATE_TOKEN) return true;
  // Also accept Authorization header for curl access
  const hdr = req.headers.get("authorization");
  if (hdr === `Bearer ${CURATE_TOKEN}`) return true;
  return false;
}

async function forward(
  req: NextRequest,
  pathParts: string[],
): Promise<Response> {
  if (!checkCurateAuth(req)) {
    return new Response("unauthorized", { status: 401 });
  }

  const tail = pathParts.join("/");
  const url = new URL(`${WORKER_URL}/cog/${tail}`);

  // Forward query string
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const init: RequestInit = {
    method: req.method,
    headers: {
      "authorization": `Bearer ${SHARED_SECRET}`,
      "content-type": "application/json",
    },
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text();
    init.body = body;
  }

  const workerRes = await fetch(url.toString(), init);
  const text = await workerRes.text();
  return new Response(text, {
    status: workerRes.status,
    headers: {
      "content-type": workerRes.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return forward(req, path);
}
