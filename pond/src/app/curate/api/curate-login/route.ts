import { NextRequest, NextResponse } from "next/server";

const CURATE_TOKEN = process.env.CURATE_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token: string };
  if (!CURATE_TOKEN || token !== CURATE_TOKEN) {
    return new Response("unauthorized", { status: 401 });
  }
  const res = new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  res.cookies.set("curate_token", CURATE_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,  // 30 days
    path: "/",
  });
  return res;
}
