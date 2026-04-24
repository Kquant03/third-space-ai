// Limen Pond — Worker environment bindings
// ─────────────────────────────────────────────────────────────────────
// Mirrors wrangler.toml. Worker-only — Workers globals (DurableObjectNamespace,
// R2Bucket, Ai, AnalyticsEngineDataset) come from @cloudflare/workers-types,
// which the pond/tsconfig.json pulls in as an ambient type.
//
// This is deliberately separate from the shared pond-types.ts. The Next.js
// client never instantiates an Env, so it should never have to know about
// Workers globals.

export interface Env {
  POND: DurableObjectNamespace;
  ARCHIVE: R2Bucket;
  AI: Ai;
  EVENTS_AE: AnalyticsEngineDataset;
  OPENROUTER_API_KEY: string;
  AUTH_HMAC_SECRET: string;
  POND_VERSION: string;
  POND_NAME: string;
  TICK_INTERVAL_MS: string;
  INITIAL_KOI_COUNT: string;
  MAX_CONCURRENT_COGNITIONS: string;
  DEFAULT_COGNITION_INTERVAL_MS: string;
}
