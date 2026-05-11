// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — CognitionLog Durable Object
//  ─────────────────────────────────────────────────────────────────────────
//  The auditability spine. Per Final Vision: "Every utterance, every
//  mechanism call, every memory commit is logged with full input
//  context. The beings are auditable in a way that production LLMs
//  are not."
//
//  Schema: one row per cognition call, holding the model provenance,
//  the pond context, the koi's internal state, the verbatim prompt,
//  the raw + coerced response, the validation verdict, and the
//  eventual fired mechanism once the tick processed.
//
//  Endpoints:
//    POST /log     — pond writes a new row
//    POST /fire    — pond updates fired_mechanism after the tick
//    GET  /export  — stream as ndjson, optionally filtered by run_tag /
//                    model_id / non_empty
//
//  Phone curator UI (/next, /rate, /batch) and the model-sweep paths
//  (/sweep/*, /export/unsloth) are deferred to post-launch — they're
//  for the eventual Gemma-4-E4B fine-tune training pipeline, not for
//  the May 2026 launch demo. They are intentionally not exposed here;
//  re-add them when the fine-tune phase begins.
//
//  Auth: bearer token shared across pond and exporter, lives in
//  wrangler.toml as SHARED_SECRET; never hardcoded.
// ═══════════════════════════════════════════════════════════════════════════

export interface CognitionLogEnv {
  SHARED_SECRET: string;
}

// ───────────────────────────────────────────────────────────────────
//  Schema
// ───────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cognition_log (
  id                  TEXT PRIMARY KEY,
  created_at          INTEGER NOT NULL,

  -- Provenance
  run_tag             TEXT NOT NULL,          -- 'live' typically; reserved for future tags
  pond_tick           INTEGER,
  model_id            TEXT NOT NULL,
  tier                TEXT NOT NULL,          -- micro|daily|twilight|deep

  -- Context (all serialized JSON blobs)
  pond_context_json   TEXT NOT NULL,          -- {season, weather, t_day, tick, copresent_ids}
  koi_id              TEXT,
  koi_state_json      TEXT NOT NULL,          -- {stage, sex, pad, recent_drawn_to, card_snippets}
  perception_json     TEXT NOT NULL,          -- visible-other descriptions in prompt

  -- Prompt
  prompt_system       TEXT NOT NULL,
  prompt_user         TEXT NOT NULL,

  -- Response
  raw_response        TEXT,                   -- unparsed model output
  coerced_json        TEXT,                   -- post-Zod-coerce, if valid
  validation_status   TEXT NOT NULL,          -- 'valid' | 'coerced' | 'failed'
  intent_chosen       TEXT,
  utterance           TEXT,                   -- null if empty/missing
  mechanism           TEXT,

  -- Economics
  latency_ms          INTEGER,
  tokens_in           INTEGER,
  tokens_out          INTEGER,
  cost_usd            REAL,

  -- Downstream consequence (filled after the behavioral tick)
  fired_mechanism     TEXT
);

CREATE INDEX IF NOT EXISTS idx_cogn_created
  ON cognition_log(created_at);
CREATE INDEX IF NOT EXISTS idx_cogn_model_run
  ON cognition_log(model_id, run_tag);
CREATE INDEX IF NOT EXISTS idx_cogn_run_tag
  ON cognition_log(run_tag);
`;

// ───────────────────────────────────────────────────────────────────
//  DO class
// ───────────────────────────────────────────────────────────────────

export class CognitionLog {
  private env: CognitionLogEnv;
  private sql: SqlStorage;
  private initialized = false;

  constructor(state: DurableObjectState, env: CognitionLogEnv) {
    this.env = env;
    this.sql = state.storage.sql;
  }

  private ensureInit(): void {
    if (this.initialized) return;
    const statements = SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean);
    for (const s of statements) this.sql.exec(s);
    this.initialized = true;
  }

  private authOK(req: Request): boolean {
    const header = req.headers.get("authorization");
    if (!header) return false;
    const expected = `Bearer ${this.env.SHARED_SECRET}`;
    return header === expected;
  }

  async fetch(req: Request): Promise<Response> {
    this.ensureInit();
    const url = new URL(req.url);

    if (!this.authOK(req)) {
      return new Response("unauthorized", { status: 401 });
    }

    try {
      switch (`${req.method} ${url.pathname}`) {
        case "POST /log":     return await this.handleLog(req);
        case "POST /fire":    return await this.handleFire(req);
        case "GET /export":   return await this.handleExport(url);
        default:
          return new Response("not found", { status: 404 });
      }
    } catch (err) {
      console.error("[cognition-log] handler error", err);
      return new Response(String(err), { status: 500 });
    }
  }

  // ─── /log ────────────────────────────────────────────────────────
  //
  // Body: the full LogRow shape. Returns { id } on success.

  private async handleLog(req: Request): Promise<Response> {
    const body = await req.json() as LogRowInput;
    const id = body.id ?? `cg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = body.created_at ?? Date.now();

    this.sql.exec(
      `INSERT INTO cognition_log
        (id, created_at, run_tag, pond_tick, model_id, tier,
         pond_context_json, koi_id, koi_state_json, perception_json,
         prompt_system, prompt_user,
         raw_response, coerced_json, validation_status,
         intent_chosen, utterance, mechanism,
         latency_ms, tokens_in, tokens_out, cost_usd,
         fired_mechanism)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, createdAt,
      body.run_tag, body.pond_tick ?? null,
      body.model_id, body.tier,
      JSON.stringify(body.pond_context ?? {}),
      body.koi_id ?? null,
      JSON.stringify(body.koi_state ?? {}),
      JSON.stringify(body.perception ?? {}),
      body.prompt_system, body.prompt_user,
      body.raw_response ?? null,
      body.coerced ? JSON.stringify(body.coerced) : null,
      body.validation_status,
      body.intent_chosen ?? null,
      body.utterance && body.utterance.length > 0 ? body.utterance : null,
      body.mechanism ?? null,
      body.latency_ms ?? null,
      body.tokens_in ?? null,
      body.tokens_out ?? null,
      body.cost_usd ?? null,
      null, // fired_mechanism filled post-hoc via /fire
    );

    return jsonResp({ id });
  }

  // ─── /fire ───────────────────────────────────────────────────────
  //
  // Called after a tick to mark which mechanism actually fired from this
  // cognition call. Body: { id, fired_mechanism }

  private async handleFire(req: Request): Promise<Response> {
    const body = await req.json() as { id: string; fired_mechanism: string | null };
    this.sql.exec(
      `UPDATE cognition_log SET fired_mechanism = ? WHERE id = ?`,
      body.fired_mechanism, body.id,
    );
    return jsonResp({ ok: true });
  }

  // ─── /export ─────────────────────────────────────────────────────
  //
  // Stream all rows (or a filtered subset) as ndjson. This is the
  // public auditability endpoint — anyone with the secret can see
  // exactly what context produced what utterance.
  //
  // Query params:
  //   run_tag=...    optional filter on run tag
  //   model=...      optional filter on model_id
  //   non_empty=1    default; pass 0 to include rows with no utterance

  private async handleExport(url: URL): Promise<Response> {
    const params = url.searchParams;
    let where = "1=1";
    const args: string[] = [];

    const runTag = params.get("run_tag");
    if (runTag) { where += ` AND run_tag = ?`; args.push(runTag); }
    const model = params.get("model");
    if (model) { where += ` AND model_id = ?`; args.push(model); }
    const nonEmpty = params.get("non_empty") !== "0";
    if (nonEmpty) where += ` AND utterance IS NOT NULL AND utterance != ''`;

    const rows = this.sql.exec(
      `SELECT * FROM cognition_log WHERE ${where} ORDER BY created_at ASC`,
      ...args,
    ).toArray();

    const lines = rows.map((r) => JSON.stringify(r)).join("\n");
    return new Response(lines, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson",
        "content-disposition": "attachment; filename=\"limen-pond-cognition.jsonl\"",
      },
    });
  }
}

// ───────────────────────────────────────────────────────────────────
//  Types
// ───────────────────────────────────────────────────────────────────

export interface LogRowInput {
  id?: string;
  created_at?: number;
  run_tag: string;                            // 'live' typically
  pond_tick?: number;
  model_id: string;
  tier: string;

  pond_context?: Record<string, unknown>;
  koi_id?: string;
  koi_state?: Record<string, unknown>;
  perception?: Record<string, unknown>;

  prompt_system: string;
  prompt_user: string;

  raw_response?: string | null;
  coerced?: unknown;
  validation_status: "valid" | "coerced" | "failed";
  intent_chosen?: string | null;
  utterance?: string | null;
  mechanism?: string | null;

  latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
}

function jsonResp(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
