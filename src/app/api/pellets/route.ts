// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/pellets/checkout
//  ─────────────────────────────────────────────────────────────────────────
//  Creates a Stripe Checkout Session for a pellet drop. Called by the
//  frontend when a visitor in `feed` mode taps a tier button after
//  clicking a position in the pond.
//
//  Input:   { tier: "small"|"medium"|"large", drop_x, drop_z, visitor_handle }
//  Returns: { url, session_id }
//
//  The url is the hosted Stripe Checkout page; the frontend redirects
//  there. After payment Stripe redirects to /pond/gift-success?
//  session_id=..., which verifies the session is paid and then signs
//  & POSTs to the Cloudflare worker's /visitor/drop-pellet endpoint
//  to actually spawn the pellets.
//
//  Pellet counts and price IDs are server-controlled — the client
//  passes only a tier name. This prevents tampering ("give me 200
//  pellets for $0.99").
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("[pellets/checkout] STRIPE_SECRET_KEY not set in env");
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

interface TierConfig {
  priceId: string;
  pelletCount: number;
  amountUsd: number;
}

// Server-controlled tier table. Pellet counts scale 3×; top tier
// includes a small value bonus (18 instead of 15) so the steep tier
// reads as generous, not just expensive.
const TIERS: Record<string, TierConfig> = {
  small: {
    priceId: "price_1TY8YvPeRtQlouEhbS1R6dmB",
    pelletCount: 3,
    amountUsd: 0.99,
  },
  medium: {
    priceId: "price_1TY8jgPeRtQlouEhAQrD1T75",
    pelletCount: 9,
    amountUsd: 2.99,
  },
  large: {
    priceId: "price_1TY8jvPeRtQlouEho96s6beB",
    pelletCount: 18,
    amountUsd: 4.99,
  },
};

interface CheckoutRequestBody {
  tier?: string;
  drop_x?: number;
  drop_z?: number;
  visitor_handle?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe not configured" },
      { status: 500 },
    );
  }

  let body: CheckoutRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Tier lookup — controls priceId, pellet count, and amount.
  const tier = body.tier ? TIERS[body.tier] : undefined;
  if (!tier) {
    return NextResponse.json(
      { error: "unknown tier", valid: Object.keys(TIERS) },
      { status: 400 },
    );
  }

  // Drop coordinates and handle: shape validation only. Range
  // validation happens on the worker side (which knows the pond
  // bounds) and via clampToPond inside makeVisitorPellet.
  if (
    typeof body.drop_x !== "number" || !Number.isFinite(body.drop_x) ||
    typeof body.drop_z !== "number" || !Number.isFinite(body.drop_z) ||
    typeof body.visitor_handle !== "string" ||
    body.visitor_handle.length === 0 ||
    body.visitor_handle.length > 64
  ) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  // Origin for redirect URLs. In production set by browser request
  // headers; in dev fallback to localhost:3000.
  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: tier.priceId, quantity: 1 }],
      success_url:
        `${origin}/limen-pond/gift-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/limen-pond`,
      // Metadata travels with the session and is retrievable on the
      // success-page verification side. We embed the drop coords,
      // handle, server-determined pellet count, and amount so the
      // worker /visitor/drop-pellet handler has everything it needs
      // without trusting the client.
      metadata: {
        drop_x: body.drop_x.toString(),
        drop_z: body.drop_z.toString(),
        visitor_handle: body.visitor_handle,
        pellet_count: tier.pelletCount.toString(),
        amount_usd: tier.amountUsd.toString(),
        tier_name: body.tier as string,
      },
      // Allow promotion codes for future "first donation free" or
      // partnership flows. Doesn't cost anything to enable.
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "stripe did not return checkout url" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    console.error("[pellets/checkout] stripe error:", err);
    return NextResponse.json(
      { error: "stripe checkout creation failed" },
      { status: 502 },
    );
  }
}
