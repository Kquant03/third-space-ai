// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — CognitionLog Durable Object
//  ─────────────────────────────────────────────────────────────────────────
//  A single DO holding the full research record of every cognition call,
//  plus all curator ratings. No sync problem because there is no second
//  copy: the pond writes here, your phone writes here, your laptop reads
//  here. One source of truth.
//
//  Schema: one row per cognition call. Covers:
//    - model provenance (model_id, tier, api call cost)
//    - pond context at call time (serialized JSON blob)
//    - the koi's internal state at call time
//    - the verbatim prompt sent to the model (system + user)
//    - the raw response bytes, the coerced-valid response, validation verdict
//    - the eventual behavioral consequence once the tick finished processing
//    - three user-rating slots (tag, stars, rewrite) populated via the
//      phone curation UI
//
//  Endpoints:
//    POST /log          — pond writes a new row
//    POST /fire         — pond fires an update to an existing row when the
//                         behavioral consequence is known (fired_mechanism)
//    GET  /next         — phone asks for the next unrated card
//    POST /rate         — phone submits a rating for a row
//    GET  /sweep/list   — leaderboard: per-model aggregates
//    GET  /sweep/rows   — all sweep rows for a given run_id
//    POST /sweep/start  — pond / worker kicks off a sweep
//    GET  /export       — stream the whole thing as jsonl (for training)
//
//  Auth: simple bearer token shared across pond, phone, export. The token
//  lives in wrangler.toml as SHARED_SECRET; never hardcoded.
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
  run_tag             TEXT NOT NULL,          -- 'live' or 'sweep:<run_id>'
  pond_tick           INTEGER,
  model_id            TEXT NOT NULL,
  tier                TEXT NOT NULL,          -- micro|daily|twilight|deep|sweep

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
  fired_mechanism     TEXT,

  -- Curator ratings
  rating_stars        INTEGER,                -- 1..5, null until rated
  rating_tag          TEXT,                   -- 'gold'|'keep'|'reject'|null
  rating_rewrite      TEXT,
  rated_at            INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cogn_created
  ON cognition_log(created_at);
CREATE INDEX IF NOT EXISTS idx_cogn_unrated
  ON cognition_log(rating_tag, utterance, created_at);
CREATE INDEX IF NOT EXISTS idx_cogn_model_run
  ON cognition_log(model_id, run_tag);
CREATE INDEX IF NOT EXISTS idx_cogn_run_tag
  ON cognition_log(run_tag);

CREATE TABLE IF NOT EXISTS sweep_run (
  run_id        TEXT PRIMARY KEY,
  started_at    INTEGER NOT NULL,
  finished_at   INTEGER,
  status        TEXT NOT NULL,                -- 'running' | 'done' | 'failed'
  model_count   INTEGER NOT NULL,
  context_count INTEGER NOT NULL,
  meta_json     TEXT NOT NULL
);
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
    // Execute each statement separately (some SQLite bindings dislike multi-stmt strings)
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

    // All endpoints require bearer auth.
    if (!this.authOK(req)) {
      return new Response("unauthorized", { status: 401 });
    }

    try {
      switch (`${req.method} ${url.pathname}`) {
        case "POST /log":          return await this.handleLog(req);
        case "POST /fire":         return await this.handleFire(req);
        case "GET /next":          return await this.handleNext(url);
        case "GET /batch":         return await this.handleBatch(url);
        case "POST /rate":         return await this.handleRate(req);
        case "POST /rate/batch":   return await this.handleRateBatch(req);
        case "GET /sweep/list":    return await this.handleSweepList();
        case "GET /sweep/rows":    return await this.handleSweepRows(url);
        case "POST /sweep/start":  return await this.handleSweepStart(req);
        case "POST /sweep/finish": return await this.handleSweepFinish(req);
        case "GET /export":        return await this.handleExport(url);
        case "GET /export/unsloth":    return await this.handleExportUnsloth(url);
        case "GET /stats":         return await this.handleStats();
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
         fired_mechanism,
         rating_stars, rating_tag, rating_rewrite, rated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      null, // fired_mechanism filled post-hoc
      null, null, null, null, // ratings filled later
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

  // ─── /next ───────────────────────────────────────────────────────
  //
  // Phone fetches the next card to rate.
  // Query: ?filter=live|sweep  optional run_id for sweep
  // Returns the oldest unrated non-empty-utterance row.

  private async handleNext(url: URL): Promise<Response> {
    const filter = url.searchParams.get("filter") ?? "any";
    const runId = url.searchParams.get("run_id");

    let where = `rating_tag IS NULL AND utterance IS NOT NULL AND utterance != ''`;
    const args: string[] = [];
    if (filter === "live") {
      where += ` AND run_tag = 'live'`;
    } else if (filter === "sweep" && runId) {
      where += ` AND run_tag = ?`;
      args.push(`sweep:${runId}`);
    }

    const rows = this.sql.exec(
      `SELECT id, created_at, run_tag, model_id, tier, pond_context_json,
              koi_state_json, perception_json, utterance, intent_chosen,
              mechanism, fired_mechanism, latency_ms, cost_usd
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC
        LIMIT 1`,
      ...args,
    ).toArray();

    if (rows.length === 0) return jsonResp({ row: null });
    const r = rows[0] as Record<string, unknown>;

    return jsonResp({
      row: {
        id:               r["id"],
        created_at:       r["created_at"],
        run_tag:          r["run_tag"],
        model_id:         r["model_id"],
        tier:             r["tier"],
        pond_context:     JSON.parse(r["pond_context_json"] as string),
        koi_state:        JSON.parse(r["koi_state_json"] as string),
        perception:       JSON.parse(r["perception_json"] as string),
        utterance:        r["utterance"],
        intent_chosen:    r["intent_chosen"],
        mechanism:        r["mechanism"],
        fired_mechanism:  r["fired_mechanism"],
        latency_ms:       r["latency_ms"],
        cost_usd:         r["cost_usd"],
      },
    });
  }

  // ─── /rate ───────────────────────────────────────────────────────
  //
  // Body: { id, tag, stars?, rewrite? }

  private async handleRate(req: Request): Promise<Response> {
    const body = await req.json() as {
      id: string; tag: "gold" | "keep" | "reject";
      stars?: number; rewrite?: string;
    };
    this.sql.exec(
      `UPDATE cognition_log SET
         rating_tag = ?,
         rating_stars = ?,
         rating_rewrite = ?,
         rated_at = ?
       WHERE id = ?`,
      body.tag,
      body.stars ?? null,
      body.rewrite && body.rewrite.length > 0 ? body.rewrite : null,
      Date.now(),
      body.id,
    );
    return jsonResp({ ok: true });
  }

  // ─── /batch ──────────────────────────────────────────────────────
  //
  // Returns a page of unrated utterances for skim-mode curation.
  // Query params:
  //   size=N          page size, default 50, max 200
  //   offset=M        skip first M (for paging), default 0
  //   filter=live|sweep|any    run-tag filter (default any)
  //   run_id=...      only this run (used with filter=sweep)
  //
  // Returns minimal data: just id, utterance, intent, model. Enough to
  // decide reject/keep on sight without loading full context blobs.

  private async handleBatch(url: URL): Promise<Response> {
    const size = Math.min(200, Math.max(1, Number(url.searchParams.get("size")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const filter = url.searchParams.get("filter") ?? "any";
    const runId = url.searchParams.get("run_id");

    let where = `rating_tag IS NULL AND utterance IS NOT NULL AND utterance != ''`;
    const args: string[] = [];
    if (filter === "live") {
      where += ` AND run_tag = 'live'`;
    } else if (filter === "sweep" && runId) {
      where += ` AND run_tag = ?`;
      args.push(`sweep:${runId}`);
    }

    const rows = this.sql.exec(
      `SELECT id, utterance, intent_chosen, model_id, run_tag
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC
        LIMIT ${size} OFFSET ${offset}`,
      ...args,
    ).toArray();

    // Also return total unrated count for progress display
    const countRow = this.sql.exec(
      `SELECT COUNT(*) AS n FROM cognition_log WHERE ${where}`,
      ...args,
    ).toArray()[0];

    return jsonResp({
      rows,
      total_unrated: countRow ? countRow["n"] : 0,
      size, offset,
    });
  }

  // ─── /rate/batch ─────────────────────────────────────────────────
  //
  // Body: { ratings: [{ id, tag }, ...] }
  //   - applied in a single transaction
  //   - tag values: "gold" | "keep" | "reject"
  //   - no stars or rewrites in batch mode (that's for single-card)
  // Returns: { updated: N }

  private async handleRateBatch(req: Request): Promise<Response> {
    const body = await req.json() as {
      ratings: Array<{ id: string; tag: "gold" | "keep" | "reject" }>;
    };
    if (!Array.isArray(body.ratings) || body.ratings.length === 0) {
      return jsonResp({ updated: 0 });
    }
    const now = Date.now();
    let updated = 0;
    for (const r of body.ratings) {
      this.sql.exec(
        `UPDATE cognition_log SET rating_tag = ?, rated_at = ? WHERE id = ?`,
        r.tag, now, r.id,
      );
      updated++;
    }
    return jsonResp({ updated });
  }

  // ─── /sweep/list ─────────────────────────────────────────────────
  //
  // Returns per-model aggregates across all sweep rows. One row per
  // (model_id, run_id) combo with counts + rates.

  private async handleSweepList(): Promise<Response> {
    const runs = this.sql.exec(
      `SELECT run_id, started_at, finished_at, status, model_count, context_count
         FROM sweep_run
        ORDER BY started_at DESC`,
    ).toArray();

    const perModel = this.sql.exec(
      `SELECT run_tag, model_id,
              COUNT(*) AS total,
              SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) AS valid_count,
              SUM(CASE WHEN utterance IS NOT NULL AND utterance != '' THEN 1 ELSE 0 END) AS utter_count,
              AVG(latency_ms) AS avg_latency_ms,
              SUM(cost_usd) AS total_cost_usd,
              AVG(tokens_out) AS avg_tokens_out
         FROM cognition_log
        WHERE run_tag LIKE 'sweep:%'
        GROUP BY run_tag, model_id
        ORDER BY run_tag, total_cost_usd`,
    ).toArray();

    return jsonResp({ runs, models: perModel });
  }

  // ─── /sweep/rows ─────────────────────────────────────────────────

  private async handleSweepRows(url: URL): Promise<Response> {
    const runId = url.searchParams.get("run_id");
    const model = url.searchParams.get("model");
    if (!runId) return new Response("missing run_id", { status: 400 });

    // Configurable limit — default 2000 (safe for most uses), max 20000
    // (enough to page through a full 5k-context sweep × 4 models).
    const rawLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 20000)
      : 2000;

    let where = `run_tag = ?`;
    const args: (string | number)[] = [`sweep:${runId}`];
    if (model) { where += ` AND model_id = ?`; args.push(model); }

    const rows = this.sql.exec(
      `SELECT id, model_id, utterance, intent_chosen, validation_status,
              latency_ms, cost_usd, tokens_out, raw_response
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC
        LIMIT ${limit}`,
      ...args,
    ).toArray();

    return jsonResp({ rows });
  }

  // ─── /sweep/start ────────────────────────────────────────────────
  //
  // Body: { run_id, model_count, context_count, meta }
  // Registers a new sweep run. Actual per-call rows get inserted via /log
  // with run_tag = `sweep:<run_id>` later by the orchestrator.

  private async handleSweepStart(req: Request): Promise<Response> {
    const body = await req.json() as {
      run_id: string; model_count: number;
      context_count: number; meta?: unknown;
    };
    this.sql.exec(
      `INSERT INTO sweep_run (run_id, started_at, status, model_count, context_count, meta_json)
       VALUES (?, ?, 'running', ?, ?, ?)`,
      body.run_id, Date.now(), body.model_count, body.context_count,
      JSON.stringify(body.meta ?? {}),
    );
    return jsonResp({ ok: true });
  }

  // ─── /sweep/finish ───────────────────────────────────────────────

  private async handleSweepFinish(req: Request): Promise<Response> {
    const body = await req.json() as { run_id: string; status: "done" | "failed" };
    this.sql.exec(
      `UPDATE sweep_run SET finished_at = ?, status = ? WHERE run_id = ?`,
      Date.now(), body.status, body.run_id,
    );
    return jsonResp({ ok: true });
  }

  // ─── /export ─────────────────────────────────────────────────────
  //
  // Streams the full log as one JSON blob per line. Optional query
  // filters: ?tag=gold&run_tag=live etc. Used to build training sets.

  private async handleExport(url: URL): Promise<Response> {
    const params = url.searchParams;
    let where = "1=1";
    const args: string[] = [];

    const tag = params.get("tag");
    if (tag) { where += ` AND rating_tag = ?`; args.push(tag); }
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
      headers: { "content-type": "application/x-ndjson" },
    });
  }

  // ─── /export/unsloth ─────────────────────────────────────────────
  //
  // Emits one JSON-per-line in Unsloth's chat-format for instruction
  // tuning. Each line is:
  //
  //   { "messages": [
  //       { "role": "user",      "content": "<composed pond context>" },
  //       { "role": "assistant", "content": "<JSON response>" }
  //     ]
  //   }
  //
  // The user turn is the exact prompt that was sent at inference time
  // (prompt_user), preserving the [REGISTER]/[OBSERVATION]/[INSTRUCTION]
  // structure. The assistant turn is a reconstructed JSON object whose
  // `utterance` is rating_rewrite when the curator provided one, else
  // the original model utterance; other fields are preserved from the
  // coerced response.
  //
  // Query params:
  //   tag=gold            required — only gold-tagged rows are exported
  //                       (set tag=keep or tag=any explicitly to widen)
  //   run_tag=...         optional filter
  //   model=...           optional filter
  //   min_stars=N         optional — only rows with rating_stars >= N
  //
  // Used by the hackathon fine-tune pipeline. Output is Unsloth-ready,
  // no post-processing needed on Stanley's side.

  private async handleExportUnsloth(url: URL): Promise<Response> {
    const params = url.searchParams;
    let where = `utterance IS NOT NULL AND utterance != ''`;
    const args: (string | number)[] = [];

    const tag = params.get("tag") ?? "gold";
    if (tag !== "any") { where += ` AND rating_tag = ?`; args.push(tag); }
    const runTag = params.get("run_tag");
    if (runTag) { where += ` AND run_tag = ?`; args.push(runTag); }
    const model = params.get("model");
    if (model) { where += ` AND model_id = ?`; args.push(model); }
    const minStars = Number(params.get("min_stars"));
    if (Number.isFinite(minStars) && minStars > 0) {
      where += ` AND rating_stars >= ?`;
      args.push(minStars);
    }

    const rows = this.sql.exec(
      `SELECT prompt_user, coerced_json, utterance, intent_chosen,
              mechanism, rating_rewrite
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC`,
      ...args,
    ).toArray();

    const lines: string[] = [];
    for (const r of rows) {
      const promptUser = r["prompt_user"] as string;
      const origUtterance = r["utterance"] as string;
      const rewrite = r["rating_rewrite"] as string | null;
      const finalUtterance = rewrite && rewrite.length > 0 ? rewrite : origUtterance;

      // Reconstruct the assistant JSON. Prefer the coerced response as
      // the base (it has the full structured shape the model produced)
      // and only override the utterance field with the curator rewrite
      // if present. If no coerced response exists (rare — non-standard
      // schema), synthesize a minimal assistant turn.
      let assistantObj: Record<string, unknown>;
      const coercedRaw = r["coerced_json"] as string | null;
      if (coercedRaw) {
        try {
          assistantObj = JSON.parse(coercedRaw);
          assistantObj["utterance"] = finalUtterance;
        } catch {
          assistantObj = {
            intent: r["intent_chosen"] ?? "solitary",
            target_koi: null,
            utterance: finalUtterance,
            mood_delta: {},
            importance: 0.5,
          };
        }
      } else {
        assistantObj = {
          intent: r["intent_chosen"] ?? "solitary",
          target_koi: null,
          utterance: finalUtterance,
          mood_delta: {},
          importance: 0.5,
        };
      }

      const entry = {
        messages: [
          { role: "user",      content: promptUser },
          { role: "assistant", content: JSON.stringify(assistantObj) },
        ],
      };
      lines.push(JSON.stringify(entry));
    }

    const body = lines.join("\n") + (lines.length > 0 ? "\n" : "");
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson",
        "content-disposition": "attachment; filename=\"limen-pond-unsloth.jsonl\"",
      },
    });
  }


  private async handleStats(): Promise<Response> {
    const summary = this.sql.exec(
      `SELECT
         COUNT(*)                                                   AS total,
         SUM(CASE WHEN rating_tag IS NOT NULL THEN 1 ELSE 0 END)     AS rated,
         SUM(CASE WHEN rating_tag = 'gold' THEN 1 ELSE 0 END)        AS gold,
         SUM(CASE WHEN rating_tag = 'keep' THEN 1 ELSE 0 END)        AS keep,
         SUM(CASE WHEN rating_tag = 'reject' THEN 1 ELSE 0 END)      AS reject,
         SUM(CASE WHEN utterance IS NOT NULL AND utterance != '' THEN 1 ELSE 0 END)
                                                                    AS non_empty,
         COUNT(DISTINCT model_id)                                    AS distinct_models
       FROM cognition_log`,
    ).toArray()[0];
    return jsonResp({ summary });
  }
}

// ───────────────────────────────────────────────────────────────────
//  Types
// ───────────────────────────────────────────────────────────────────

export interface LogRowInput {
  id?: string;
  created_at?: number;
  run_tag: string;                            // 'live' or 'sweep:<run_id>'
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
