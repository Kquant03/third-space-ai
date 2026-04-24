// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Events (§ XV)
//  ─────────────────────────────────────────────────────────────────────────
//  Park et al.'s deepest methodological contribution: *the event schema is
//  the paper*. Every insight is only legible through the event stream; if
//  events aren't captured at the right grain, the paper cannot be written
//  no matter how well the simulation runs.
//
//  Three tiers of storage:
//
//    Tier 1 (hot)  — Workers Analytics Engine, non-blocking writes
//    Tier 2 (warm) — SQLite, full row persisted in DO
//    Tier 3 (cold) — R2, keyed by payload_hash for large blobs
//
//  This module writes to Tier 1 and Tier 2. Large payloads (LLM
//  completions, long reflections) are SHA-256 hashed, stored separately
//  via the ARCHIVE R2 binding, and only the hash sits in the main row.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  EventEnvelope, EventType, LoveFlowMechanism, MoodDelta, SimTick,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────

/** UUID v4 using crypto.randomUUID() — available in Workers. */
export function newEventId(): string {
  return crypto.randomUUID();
}

/** SHA-256 hex digest of an arbitrary string. */
export async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Compute the config hash for the current pond config. This identifier
 * distinguishes ablation runs: a colony with mechanism family X removed
 * has a different config hash, and events from the two colonies remain
 * concatenable via schema_version.
 */
export async function computeConfigHash(input: {
  pondVersion: string;
  ablatedMechanisms: LoveFlowMechanism[];
  cognitionEnabled: boolean;
  tickHz: number;
}): Promise<string> {
  const canonical = JSON.stringify({
    v: input.pondVersion,
    ablated: [...input.ablatedMechanisms].sort(),
    cog: input.cognitionEnabled,
    hz: input.tickHz,
  });
  return (await sha256Hex(canonical)).slice(0, 16);
}

// ───────────────────────────────────────────────────────────────────
//  Envelope construction
// ───────────────────────────────────────────────────────────────────

export interface EventInit {
  tick: SimTick;
  actor: string;                   // koi:<id> | visitor:<hash> | system
  type: EventType;
  targets?: string[];
  mechanism?: LoveFlowMechanism | null;
  affectDelta?: MoodDelta | null;
  llm?: EventEnvelope["llm"];
  payload?: Record<string, unknown>;
}

export async function buildEnvelope(
  init: EventInit,
  context: { pondId: string; configHash: string },
): Promise<EventEnvelope> {
  const payload = init.payload ?? {};
  const payloadJson = JSON.stringify(payload);
  return {
    id: newEventId(),
    at: Date.now(),
    tick: init.tick,
    pondId: context.pondId,
    actor: init.actor,
    type: init.type,
    targets: init.targets ?? [],
    mechanism: init.mechanism ?? null,
    affectDelta: init.affectDelta ?? null,
    llm: init.llm ?? null,
    payload,
    payloadHash: await sha256Hex(payloadJson),
    schemaVersion: 1,
    configHash: context.configHash,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Writers
// ───────────────────────────────────────────────────────────────────

/**
 * Insert one event into SQLite. Fast path — prepared statement on the
 * caller's side would be better, but Cloudflare DO SQLite prepares
 * internally on the exec() call so the marginal cost is low.
 */
export function persistEvent(
  sql: SqlStorage,
  e: EventEnvelope,
): void {
  sql.exec(
    `INSERT INTO event (
      id, at_ms, tick, actor, type, targets_json, mechanism,
      affect_delta_json, llm_model, llm_temperature, llm_tokens_in,
      llm_tokens_out, llm_cost_usd, payload_json, payload_hash,
      schema_version, config_hash
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`,
    e.id,
    e.at,
    e.tick,
    e.actor,
    e.type,
    JSON.stringify(e.targets),
    e.mechanism,
    e.affectDelta ? JSON.stringify(e.affectDelta) : null,
    e.llm?.model ?? null,
    e.llm?.temperature ?? null,
    e.llm?.tokensIn ?? null,
    e.llm?.tokensOut ?? null,
    e.llm?.costUsd ?? null,
    JSON.stringify(e.payload),
    e.payloadHash,
    e.schemaVersion,
    e.configHash,
  );
}

/**
 * Forward to Workers Analytics Engine. AE writes are non-blocking and
 * best-effort; failures are swallowed by the runtime. Blob fields have
 * unlimited cardinality on the AE free tier.
 *
 *   blobs:   [actor, type, mechanism, llm_model, pond_id]
 *   doubles: [tokens_in, tokens_out, cost_usd, delta_p, delta_a, delta_d]
 *   indexes: [type]  (primary index, used for aggregation)
 */
export function sinkToAE(
  ae: AnalyticsEngineDataset | undefined,
  e: EventEnvelope,
): void {
  if (!ae) return;
  try {
    ae.writeDataPoint({
      blobs: [
        e.actor,
        e.type,
        e.mechanism ?? "",
        e.llm?.model ?? "",
        e.pondId,
      ],
      doubles: [
        e.llm?.tokensIn ?? 0,
        e.llm?.tokensOut ?? 0,
        e.llm?.costUsd ?? 0,
        e.affectDelta?.p ?? 0,
        e.affectDelta?.a ?? 0,
        e.affectDelta?.d ?? 0,
      ],
      indexes: [e.type],
    });
  } catch {
    // AE write failed; not fatal. The SQLite row is authoritative.
  }
}

/**
 * Archive a large payload blob to R2, keyed by payload_hash. Idempotent:
 * writes that already exist are a no-op (R2 PUT overwrites, which is
 * harmless given identical content → identical hash).
 */
export async function archivePayload(
  archive: R2Bucket | undefined,
  hash: string,
  blob: string,
): Promise<void> {
  if (!archive) return;
  await archive.put(`payloads/${hash.slice(0, 2)}/${hash}.json`, blob, {
    httpMetadata: { contentType: "application/json" },
  });
}

// ───────────────────────────────────────────────────────────────────
//  Convenience: emit one full event (envelope + SQLite + AE)
// ───────────────────────────────────────────────────────────────────

export async function emit(
  sql: SqlStorage,
  ae: AnalyticsEngineDataset | undefined,
  context: { pondId: string; configHash: string },
  init: EventInit,
): Promise<EventEnvelope> {
  const env = await buildEnvelope(init, context);
  persistEvent(sql, env);
  sinkToAE(ae, env);
  return env;
}
