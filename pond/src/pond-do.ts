// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Durable Object
//  ─────────────────────────────────────────────────────────────────────────
//  One DO is one pond. It owns:
//
//    - SQLite storage (koi, memory, events, relationships, ...)
//    - An alarm schedule that fires at 2 Hz
//    - A hibernatable WebSocket session set
//
//  The DO persists its hot state (world + koi) to SQLite every tick. The
//  alarm handler is the simulation loop: advance world, step koi kine-
//  matics, detect stage transitions and deaths, broadcast the frame to
//  connected clients, schedule the next alarm.
//
//  Wake-on-visitor (§ XVII): when no sessions are connected, cognition
//  is paused but physics still ticks. The DO stays "awake" because the
//  alarm self-reschedules; when sessions re-attach, cognition resumes.
//
//  WebSocket Hibernation API:
//    - state.acceptWebSocket(ws) makes the WS hibernatable
//    - getWebSockets() returns the active set after wake from hibernation
//    - webSocketMessage / webSocketClose are the lifecycle handlers
//
//  This is Stage 0. LLM cognition is not wired here; the fish use the
//  meditation-mode intent picker. The architecture is sized for Stage 1-3
//  to be dropped in place without structural change.
// ═══════════════════════════════════════════════════════════════════════════

import { DurableObject } from "cloudflare:workers";

import { SIM, LIFE, POND, HUNGER, FOOD } from "./constants.js";
import { applySchema } from "./schema.js";
import { Rng } from "./rng.js";
import type {
  KoiState, WorldState, PondHotState, EventType,
  SimTick, LifeStage, FoodItem,
} from "./types.js";
import {
  SnapshotMessageSchema, TickMessageSchema,
  AmbientEventMessageSchema, ClientToServerSchema,
} from "./protocol.js";
import {
  advanceStage, createKoi, createEgg, currentStage, drawLifespan,
  deathProbabilityPerTick, seedInitialCohort, stepHunger, toFrame, isUnnamed,
} from "./koi.js";
import {
  stepNutrition, nearestFood, makeVisitorPellet,
  type FoodConsumption,
} from "./nutrition.js";
import { composeName, collectObservations } from "./naming.js";
import {
  detectMutualPairs, filterEligible, grantPermission,
  loadActivePermissions, consumePermission, isCoPresentForSpawning,
  pickEggCount, placeEggs, findWitnesses,
} from "./reproduction.js";
import {
  runStateDetectors, validateClaim, DETECTOR_INTERVAL_TICKS,
  type MechanismFiring, type DetectionContext,
} from "./mechanisms/index.js";
import { FAMILY_OF } from "./mechanisms/types.js";
import { pushHeading, applyTagEvent } from "./mechanisms/play.js";
import {
  ARTIFACT_LIMITS, createFoundMaterial, createNameTile,
  loadNearbyLooseArtifacts, pickUp, hasCapacity,
  loadHeldArtifacts, markDiedWith, transferAsHeirloom,
  chooseHeir,
} from "./artifacts.js";
import { stepKoi, SIZE_BY_STAGE } from "./kinematics.js";
import {
  advanceWorld, initialWorld, stormStress,
} from "./world.js";
import { decayPad, applyDelta, appraise } from "./affect.js";
import { emit, computeConfigHash } from "./events.js";
import {
  computeGenerationFromParents, writeLineageRow, buildLineagePayload,
} from "./genealogy.js";
import {
  archetypeToGenetics, combineGenetics, geneticsToJSON, geneticsFromJSON,
  archetypeNameFor, type KoiGenetics,
} from "./genetics.js";
import { pickMeditationIntent } from "./meditation.js";
import { COGNITION_INTERVAL_S } from "./constants.js";
import { runCognition } from "./cognition.js";
import type { CognitionResponse } from "./protocol.js";
import { embed } from "./embeddings.js";
import { retrieveMemories, writeMemoryRow, pruneIfNeeded } from "./memory.js";
import { fallbackUtterance } from "./safety.js";
import type {
  RelationshipCard, MemoryRow, LoveFlowMechanism,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Env binding — matches wrangler.toml
// ───────────────────────────────────────────────────────────────────

export interface Env {
  POND: DurableObjectNamespace;
  AI: Ai;
  ARCHIVE?: R2Bucket;
  AE_EVENTS?: AnalyticsEngineDataset;
  POND_ID: string;
  POND_VERSION: string;
  TICK_HZ: string;
  COGNITION_ENABLED: string;
  MONTHLY_BUDGET_USD: string;
  OPENROUTER_API_KEY?: string;
  SHARED_SECRET: string;
}

// ───────────────────────────────────────────────────────────────────
//  Per-session metadata attached via ws.serializeAttachment()
// ───────────────────────────────────────────────────────────────────

interface SessionAttachment {
  visitorHash: string;
  connectedAtMs: number;
}

// ───────────────────────────────────────────────────────────────────
//  Pond DO
// ───────────────────────────────────────────────────────────────────

export class Pond extends DurableObject<Env> {
  private sql: SqlStorage;
  private initialized = false;

  // Hot in-memory mirror of DO state, re-hydrated on wake.
  private hot!: PondHotState;
  private pondId: string;
  private pondVersion: string;
  private configHash: string = "";
  private lifespanByKoi = new Map<string, { lifespanDays: number; scaleDays: number }>();
  // Tracks the last broadcast tick so we skip broadcasts when nothing changes.
  private lastBroadcastTick = -1;

  /** Per-visitor sliding-window timestamps for food-drop rate limiting.
   *  In-memory only — resets on DO wake, which is acceptable because
   *  the rate limit is anti-spam, not anti-abuse. Persistent abuse
   *  protection lives at the Cloudflare edge (Turnstile, per-IP limits,
   *  § XVIII). */
  private visitorFoodTimestamps = new Map<string, number[]>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.pondId = env.POND_ID ?? "primary";
    this.pondVersion = env.POND_VERSION ?? "0.1.0";
  }

  // ─────────────────────────────────────────────────────────────────
  //  Lazy initialization — called at the top of every entry point so
  //  we don't duplicate setup logic across fetch / alarm / ws handlers
  // ─────────────────────────────────────────────────────────────────

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;

    applySchema(this.sql);
    this.configHash = await computeConfigHash({
      pondVersion: this.pondVersion,
      ablatedMechanisms: [],
      cognitionEnabled: this.env.COGNITION_ENABLED === "true",
      tickHz: SIM.tickHz,
    });

    const meta = this.loadMeta();
    if (!meta) {
      // Fresh pond — create metadata and seed the initial cohort.
      await this.bootstrapFreshPond();
    } else {
      // Existing pond — rehydrate hot state.
      this.hot = this.rehydrateHotState();
      this.loadLifespans();
    }

    // Force-reschedule the alarm on every init. setAlarm overwrites
    // any existing alarm, which is exactly what we want — stale alarms
    // from a prior (crashed) wrangler process may be persisted but
    // won't actually fire until we overwrite them with a fresh future
    // timestamp. Miniflare 3.x has been observed to stick here.
    const existingAlarm = await this.ctx.storage.getAlarm();
    const when = Date.now() + SIM.tickIntervalMs;
    await this.ctx.storage.setAlarm(when);
    const verified = await this.ctx.storage.getAlarm();
    console.log(
      "[pond init] alarm: existing=" + (existingAlarm ?? "null") +
      " scheduled=" + when + " verified=" + (verified ?? "null"),
    );

    this.initialized = true;
    console.log("[pond init] ready tick=" + this.hot.tick);
  }

  private loadMeta(): { pond_id: string; version: string; created_at_tick: number; created_at_ms: number; tick_hz: number } | null {
    const rows = this.sql.exec(
      `SELECT pond_id, version, created_at_tick, created_at_ms, tick_hz
         FROM pond_meta WHERE id = 'self'`
    ).toArray();
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      pond_id: r["pond_id"] as string,
      version: r["version"] as string,
      created_at_tick: r["created_at_tick"] as number,
      created_at_ms: r["created_at_ms"] as number,
      tick_hz: r["tick_hz"] as number,
    };
  }

  private async bootstrapFreshPond(): Promise<void> {
    const nowMs = Date.now();
    const birthTick = 0;
    console.log("[bootstrap] starting");

    this.sql.exec(
      `INSERT INTO pond_meta (id, pond_id, version, config_hash,
        created_at_tick, created_at_ms, tick_hz)
       VALUES ('self', ?, ?, ?, ?, ?, ?)`,
      this.pondId, this.pondVersion, this.configHash,
      birthTick, nowMs, SIM.tickHz,
    );
    console.log("[bootstrap] pond_meta written");

    const world = initialWorld(birthTick);
    const rng = new Rng(0xc01dc0de);
    const initialCohort = seedInitialCohort(birthTick, rng);
    console.log("[bootstrap] seed cohort generated: " + initialCohort.length + " koi");

    this.hot = {
      tick: birthTick,
      world,
      koi: initialCohort,
      food: [],
      tierLevel: 0,
      monthSpendUsd: 0,
      rngState: rng.snapshot(),
    };

    // Persist world and koi rows.
    this.persistWorld();
    console.log("[bootstrap] world row written");

    for (const k of initialCohort) {
      console.log("[bootstrap] beginning koi " + k.id + " (" + k.name + ", " + k.stage + ", " + k.sex + ")");
      try {
        this.insertKoiRow(k);
        console.log("[bootstrap]   insertKoiRow ok");
      } catch (e) {
        console.error("[bootstrap]   insertKoiRow FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }

      try {
        this.sql.exec(
          `UPDATE koi SET genetics_json = ? WHERE id = ?`,
          geneticsToJSON(archetypeToGenetics(k.color)), k.id,
        );
        console.log("[bootstrap]   genetics_json updated");
      } catch (e) {
        console.error("[bootstrap]   genetics UPDATE FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }

      this.lifespanByKoi.set(k.id, drawLifespan(new Rng(hashCode(k.id))));

      try {
        writeLineageRow(this.sql, k.id, null, null, birthTick, 0);
        console.log("[bootstrap]   lineage written");
      } catch (e) {
        console.error("[bootstrap]   writeLineageRow FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }

      try {
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: birthTick,
            actor: `koi:${k.id}`,
            type: "koi_hatched",
            payload: { name: k.name, stage: k.stage, color: k.color, seeded: true },
          },
        );
        console.log("[bootstrap]   koi_hatched event emitted");
      } catch (e) {
        console.error("[bootstrap]   emit FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }
    }
    console.log("[bootstrap] complete, " + initialCohort.length + " koi seeded");
  }

  private rehydrateHotState(): PondHotState {
    const wRow = this.sql.exec(
      `SELECT * FROM world WHERE id = 'self'`
    ).toArray()[0];
    if (!wRow) throw new Error("world row missing");

    const koi = this.sql.exec(
      `SELECT * FROM koi WHERE is_alive = 1`
    ).toArray().map(rowToKoi);

    // Food survives DO cold-starts. Expired entries are pruned by
    // the nutrition step on the next tick so no filtering here.
    const food: FoodItem[] = this.sql.exec(
      `SELECT * FROM food`
    ).toArray().map((r) => ({
      id: r["id"] as string,
      kind: r["kind"] as FoodItem["kind"],
      x: r["x"] as number,
      y: r["y"] as number,
      z: r["z"] as number,
      vx: (r["vx"] as number | null) ?? undefined,
      vz: (r["vz"] as number | null) ?? undefined,
      spawnedAtTick: r["spawned_at_tick"] as number,
      decayAtTick: r["decay_at_tick"] as number,
      nutrition: r["nutrition"] as number,
    }));

    return {
      tick: wRow["tick"] as number,
      world: {
        tDay: wRow["t_day"] as number,
        simDay: wRow["sim_day"] as number,
        season: wRow["season"] as WorldState["season"],
        weather: wRow["weather"] as WorldState["weather"],
        clarity: wRow["clarity"] as number,
        temperature: wRow["temperature"] as number,
        solsticeActive: (wRow["solstice_active"] as number) === 1,
        nextSolsticeTick: wRow["next_solstice_tick"] as number,
      },
      koi,
      food,
      tierLevel: wRow["tier_level"] as 0 | 1 | 2 | 3,
      monthSpendUsd: wRow["month_spend_usd"] as number,
      rngState: wRow["rng_state"] as number,
    };
  }

  private loadLifespans(): void {
    for (const k of this.hot.koi) {
      if (!this.lifespanByKoi.has(k.id)) {
        this.lifespanByKoi.set(k.id, drawLifespan(new Rng(hashCode(k.id))));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  Fetch — WebSocket upgrade entry point
  // ─────────────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    await this.ensureInit();

    const url = new URL(request.url);
    if (url.pathname === "/ws" && request.headers.get("upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    // Simple diagnostic endpoint — lets Stanley hit /pond/status and see
    // the pond's heart beat without opening a WebSocket.
    if (url.pathname === "/status") {
      return Response.json({
        pond_id: this.pondId,
        version: this.pondVersion,
        tick: this.hot.tick,
        sim_day: this.hot.world.simDay,
        t_day: this.hot.world.tDay,
        season: this.hot.world.season,
        weather: this.hot.world.weather,
        solstice_active: this.hot.world.solsticeActive,
        alive_koi: this.hot.koi.length,
        tier_level: this.hot.tierLevel,
        sessions: this.ctx.getWebSockets().length,
      });
    }

    // Research surface — every koi (living or deceased) with parents,
    // generation, and children. This is the data source § XV's
    // multi-generation figures are drawn from. Public because the pond
    // is a research instrument; no visitor-identifying data is exposed.
    if (url.pathname === "/lineage") {
      const payload = buildLineagePayload(this.sql);
      return Response.json(payload, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Diagnostic — mechanism-firing histogram since a given tick (or
    // all-time if no since= specified). Auth-gated. Used to sanity-
    // check whether newly wired mechanism families are firing at all.
    //
    // Optional params:
    //   since=<tick>           only count events at tick >= since
    //   since_sim_hours=<n>    only count last N sim-hours
    //   family=<name>          filter to one love-flow family
    if (url.pathname === "/events/by-mechanism") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.SHARED_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      return this.handleEventsByMechanism(url);
    }

    // Diagnostic — overall event-table health. Returns total row count,
    // counts by type, and min/max tick. If this returns zero rows at
    // all, events are not being written; if it returns rows but
    // /events/by-mechanism shows zero, the writes have mechanism=null
    // (non-firing events like storm_began, koi_hatched).
    if (url.pathname === "/events/summary") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.SHARED_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      return this.handleEventsSummary();
    }

    // Diagnostic — direct read of the koi table, regardless of what's
    // currently loaded in this.hot.koi. Separates "cohort not seeded"
    // from "cohort seeded but not loaded into hot state" failures.
    if (url.pathname === "/events/koi") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.SHARED_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      // Use PRAGMA to see what columns actually exist — don't assume a
      // schema that may not have migrated.
      const cols = this.sql.exec(`PRAGMA table_info(koi)`).toArray();
      const colNames = cols.map((c) => c["name"] as string);
      const safeCols = ["id", "name", "stage", "sex", "is_alive", "hatched_at_tick",
                        "age_ticks", "died_at_tick", "x", "z",
                        "last_utterance", "last_utterance_tick", "intent_kind",
                        "intent_target_id", "intent_mechanism",
                        "pad_p", "pad_a", "pad_d"]
        .filter((c) => colNames.includes(c));
      const total = this.sql.exec(`SELECT COUNT(*) AS n FROM koi`).toArray()[0];
      const alive = colNames.includes("is_alive")
        ? this.sql.exec(`SELECT COUNT(*) AS n FROM koi WHERE is_alive = 1`).toArray()[0]
        : { n: null };
      const rows = safeCols.length > 0
        ? this.sql.exec(
            `SELECT ${safeCols.join(", ")} FROM koi LIMIT 20`,
          ).toArray()
        : [];
      return Response.json({
        table_rows: total?.["n"] ?? 0,
        alive_in_table: alive?.["n"] ?? null,
        hot_koi_length: this.hot.koi.length,
        current_tick: this.hot.tick,
        actual_columns: colNames,
        rows,
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  /** Overall event-table health. */
  private handleEventsSummary(): Response {
    const total = this.sql.exec(
      `SELECT COUNT(*) AS n FROM event`,
    ).toArray()[0];
    const byType = this.sql.exec(
      `SELECT type, COUNT(*) AS n FROM event GROUP BY type ORDER BY n DESC`,
    ).toArray();
    const extrema = this.sql.exec(
      `SELECT MIN(tick) AS min_tick, MAX(tick) AS max_tick FROM event`,
    ).toArray()[0];
    const withMech = this.sql.exec(
      `SELECT COUNT(*) AS n FROM event WHERE mechanism IS NOT NULL`,
    ).toArray()[0];

    return Response.json({
      total_events: total?.["n"] ?? 0,
      events_with_mechanism: withMech?.["n"] ?? 0,
      events_without_mechanism:
        ((total?.["n"] as number) ?? 0) - ((withMech?.["n"] as number) ?? 0),
      tick_range: {
        min: extrema?.["min_tick"] ?? null,
        max: extrema?.["max_tick"] ?? null,
      },
      current_tick: this.hot.tick,
      alive_koi: this.hot.koi.length,
      by_type: byType.map((r) => ({ type: r["type"], count: r["n"] })),
    });
  }

  /** Histogram of mechanism firings for diagnostic observation. */
  private handleEventsByMechanism(url: URL): Response {
    const params = url.searchParams;

    // Compute `since` tick
    let sinceTick = 0;
    const sinceRaw = params.get("since");
    if (sinceRaw) sinceTick = Number(sinceRaw) || 0;
    const sinceHours = Number(params.get("since_sim_hours"));
    if (Number.isFinite(sinceHours) && sinceHours > 0) {
      const ticks = Math.floor(sinceHours * 3600 * SIM.tickHz);
      sinceTick = Math.max(sinceTick, this.hot.tick - ticks);
    }
    const family = params.get("family");

    // Count by mechanism
    const rows = this.sql.exec(
      `SELECT mechanism, COUNT(*) AS n
         FROM event
        WHERE tick >= ?
          AND mechanism IS NOT NULL
        GROUP BY mechanism
        ORDER BY n DESC`,
      sinceTick,
    ).toArray();

    // Optional family filter (post-hoc since FAMILY_OF is code-side)
    const filtered = family
      ? rows.filter(
          (r) => FAMILY_OF[r["mechanism"] as keyof typeof FAMILY_OF] === family,
        )
      : rows;

    const total = filtered.reduce((s, r) => s + (r["n"] as number), 0);

    return Response.json({
      since_tick: sinceTick,
      current_tick: this.hot.tick,
      sim_day: this.hot.world.simDay,
      total_firings: total,
      by_mechanism: filtered.map((r) => ({
        mechanism: r["mechanism"],
        family: FAMILY_OF[r["mechanism"] as keyof typeof FAMILY_OF],
        count: r["n"],
      })),
    });
  }

  private handleWebSocketUpgrade(request: Request): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    // Derive a stable-ish visitor hash from CF headers. Real visitor
    // cookies would come from the Next.js app; for now we derive from IP.
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const visitorHash = simpleHash(ip);

    this.ctx.acceptWebSocket(server);
    const attachment: SessionAttachment = {
      visitorHash,
      connectedAtMs: Date.now(),
    };
    server.serializeAttachment(attachment);

    // Send snapshot immediately so the client has something to render.
    this.sendSnapshot(server);

    // Record visitor session
    this.sql.exec(
      `INSERT INTO visitor_session (hash, first_seen_ms, last_seen_ms)
       VALUES (?, ?, ?)
       ON CONFLICT(hash) DO UPDATE SET last_seen_ms = excluded.last_seen_ms`,
      visitorHash, attachment.connectedAtMs, attachment.connectedAtMs,
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  // ─────────────────────────────────────────────────────────────────
  //  WebSocket Hibernation handlers
  // ─────────────────────────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    await this.ensureInit();
    if (typeof data !== "string") return;

    let msg: unknown;
    try { msg = JSON.parse(data); } catch { return; }

    const parsed = ClientToServerSchema.safeParse(msg);
    if (!parsed.success) return;

    const attachment = ws.deserializeAttachment() as SessionAttachment | null;
    const visitorHash = attachment?.visitorHash ?? "unknown";

    // Stage 10 will wire these to actual world effects. For Stage 0,
    // we log them as events so the research instrument sees them.
    switch (parsed.data.t) {
      case "pebble":
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: this.hot.tick,
            actor: `visitor:${visitorHash}`,
            type: "visitor_pebble_placed",
            payload: {
              x: parsed.data.x, z: parsed.data.z,
              inscription: parsed.data.inscription ?? null,
            },
          },
        );
        // Nearby koi receive the arousal appraisal from § VIII.
        this.applyAmbientToNearby(parsed.data.x, parsed.data.z, {
          kind: "visitor_pebble_placed",
        });
        break;

      case "food": {
        // Rate limit: 3 pellets per minute per visitor hash (§ XIV).
        // Cheap in-memory sliding window — tracks the most recent
        // 3 drop timestamps per visitor. On the 4th drop within the
        // last 60 real-seconds, we silently discard. (Silent rather
        // than erroring because a casual clicker shouldn't get an
        // error modal; they just see no pellet appear.)
        const now = Date.now();
        const window = 60_000;   // 60 sec
        const maxPerWindow = 3;
        const recent = (this.visitorFoodTimestamps.get(visitorHash) ?? [])
          .filter((t) => now - t < window);
        if (recent.length >= maxPerWindow) break;
        recent.push(now);
        this.visitorFoodTimestamps.set(visitorHash, recent);

        // Create the pellet and push it into the hot food list.
        // Will be persisted on next tick by persistFood() and
        // broadcast to clients by broadcastTick().
        const pellet = makeVisitorPellet(
          parsed.data.x, parsed.data.z, this.hot.tick,
        );
        this.hot.food.push(pellet);

        // Update visitor_session counter for research analytics.
        this.sql.exec(
          `UPDATE visitor_session SET food_count = food_count + 1,
             last_seen_ms = ? WHERE hash = ?`,
          now, visitorHash,
        );

        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: this.hot.tick,
            actor: `visitor:${visitorHash}`,
            type: "visitor_fed",
            payload: {
              x: pellet.x, z: pellet.z,
              food_id: pellet.id,
            },
          },
        );
        this.applyAmbientToNearby(pellet.x, pellet.z, {
          kind: "visitor_fed",
        });
        break;
      }

      case "nickname":
        this.sql.exec(
          `INSERT INTO visitor_nickname (visitor_hash, koi_id, nickname, set_at_ms)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(visitor_hash, koi_id)
             DO UPDATE SET nickname = excluded.nickname, set_at_ms = excluded.set_at_ms`,
          visitorHash, parsed.data.koiId, parsed.data.nickname, Date.now(),
        );
        break;
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    void ws;
    // Nothing special. The alarm keeps ticking.
  }

  async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
    // Swallow — the close handler will run next.
  }

  // ─────────────────────────────────────────────────────────────────
  //  Alarm — the simulation loop
  // ─────────────────────────────────────────────────────────────────

  async alarm(): Promise<void> {
    const nowMs = Date.now();
    console.log("[pond alarm] fired at ms=" + nowMs);
    try {
      await this.alarmBody(nowMs);
    } catch (err) {
      // Anything thrown in the simulation loop (schema migration,
      // world advancement, mechanism detection, cognition dispatch,
      // persistence) must not stop the pond. Log and fall through to
      // the finally, which reschedules.
      console.error(
        "[pond alarm] error in tick " + (this.hot?.tick ?? "?") + ": " +
        (err instanceof Error ? err.stack ?? err.message : String(err))
      );
    } finally {
      // Always reschedule. If this throws too (storage dead), we truly
      // cannot recover — but that's catastrophic and not our job to
      // paper over.
      try {
        await this.ctx.storage.setAlarm(nowMs + SIM.tickIntervalMs);
      } catch (rescheduleErr) {
        console.error(
          "[pond alarm] FATAL: could not reschedule: " +
          (rescheduleErr instanceof Error ? rescheduleErr.message : String(rescheduleErr))
        );
      }
    }
  }

  private async alarmBody(nowMs: number): Promise<void> {
    await this.ensureInit();

    const newTick = this.hot.tick + 1;
    const rng = new Rng(this.hot.rngState);
    const dt = SIM.tickIntervalMs / 1000;

    // 1. Advance world
    const { world: newWorld, transitions } = advanceWorld(
      this.hot.world, newTick, rng,
    );
    this.hot.world = newWorld;

    // 2. Decay affect on every living koi
    for (const k of this.hot.koi) {
      k.pad = decayPad(k.pad, k.stage, dt);
    }

    // 2.5. Rise hunger. Fish get hungrier over time until they eat.
    //      Without ambient food wired yet (commit 3), fish will reach
    //      starvation threshold in ~4 sim-hours. This commit is the
    //      baseline to observe rise dynamics before food exists.
    //      dt is in real seconds; one real second at 2 Hz is 0.5 sim-sec,
    //      but hunger is calibrated against sim-seconds (SIM.tickIntervalMs
    //      / 1000 = 0.5 real-sec per tick → 0.5 sim-sec per tick, so
    //      dt ≈ dtSimSec at tick scale).
    for (const k of this.hot.koi) {
      stepHunger(k, dt);
    }

    // Sim-hour boundary hunger log — observability without client plumbing.
    // Fires once per sim-hour (roughly one real minute) so wrangler logs
    // stay readable.
    const prevSimHour = Math.floor(this.hot.world.tDay * 24);
    const newSimHour = Math.floor(newWorld.tDay * 24);
    if (newSimHour !== prevSimHour) {
      const lines = this.hot.koi
        .filter((k) => k.stage !== "egg")
        .map((k) => `${k.name.slice(0, 12).padEnd(12)} stage=${k.stage.padEnd(10)} hunger=${k.hunger.toFixed(3)}`);
      if (lines.length) {
        console.log(`[hunger] sim-day ${this.hot.world.simDay} hour ${newSimHour}:\n  ` + lines.join("\n  "));
      }
    }

    // 3. Step kinematics
    const simTime = newTick / SIM.tickHz;
    for (const k of this.hot.koi) {
      stepKoi(k, this.hot.koi, simTime, dt);
      // Maintain the heading ring buffer for the play family's dance
      // and synchronized_swim detectors. Done here so every tick
      // (cognition or not) contributes to the sliding window.
      pushHeading(k, k.h);
    }

    // 3.5. Nutrition — expire old food, drift surface food, spawn new
    //      ambient food, check consumption. Returns any consumption
    //      events so we can emit them through the event stream.
    const consumptions = stepNutrition(this.hot, newTick, rng, dt);
    for (const c of consumptions) {
      await emit(this.sql, this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick, actor: `koi:${c.koiId}`,
          type: "interaction",
          payload: {
            subtype: "food_eaten",
            koi_name: c.koiName,
            food_kind: c.foodKind,
            food_id: c.foodId,
            nutrition: c.nutrition,
            loc: { x: c.x, z: c.z },
          },
        },
      );
    }

    // 4. Intent renewal — fish whose cognition clock has expired get
    //    a new intent. When cognition is enabled, the LLM picks; else
    //    meditation-mode does. On any cognition failure the fish falls
    //    through to meditation so kinematics never stall. (§ XVII)
    const cognitionOn =
      this.env.COGNITION_ENABLED === "true" &&
      !!this.env.OPENROUTER_API_KEY;

    // Load active permissions once per tick; a small table, fast read.
    // Used both by intent renewal (meditation bias) and by co-presence
    // check below. The LLM is never told about permission (§ X).
    const permissions = loadActivePermissions(this.sql, newTick);
    const permittedMateByKoi = new Map<string, string>();
    for (const p of permissions) {
      permittedMateByKoi.set(p.aId, p.bId);
      permittedMateByKoi.set(p.bId, p.aId);
    }

    for (const k of this.hot.koi) {
      if (newTick >= k.nextCognitionTick) {
        let used = "meditation";
        if (cognitionOn) {
          try {
            await this.runKoiCognition(k, newTick);
            used = "llm";
          } catch (err) {
            await this.logCognitionFailure(k, newTick, err);
            k.intent = pickMeditationIntent(
              k, this.hot.koi, this.hot.world, newTick, rng,
              permittedMateByKoi.get(k.id),
            );
          }
        } else {
          k.intent = pickMeditationIntent(
            k, this.hot.koi, this.hot.world, newTick, rng,
            permittedMateByKoi.get(k.id),
          );
        }

        // Hunger override — if the fish is preoccupied with hunger and
        // there's nearby food, redirect intent to feed_approach with
        // that food as target. This overrides both meditation-mode
        // picks and LLM picks: a starving fish cannot be distracted by
        // shoaling or play. The intent.target carries the food position
        // so kinematics steers toward it. Cognition's other outputs
        // (utterance, mechanism) are preserved if present — a hungry
        // fish can still speak about what it sees.
        if (k.hunger > HUNGER.preoccupationThreshold &&
            k.stage !== "egg" && k.stage !== "dying") {
          const food = nearestFood(k, this.hot.food, 6.0);
          if (food) {
            k.intent = {
              ...k.intent,
              kind: "feed_approach",
              target: { x: food.x, y: food.y, z: food.z },
              targetId: undefined,   // target is a position, not a koi
              atTick: newTick,
            };
          }
        }

        void used;
        const intervalS = COGNITION_INTERVAL_S[k.stage] ?? 120;
        k.nextCognitionTick = newTick + Math.floor(intervalS * SIM.tickHz);
      }
    }

    // 5a. Reproduction detection (§ X) — runs once per sim-day at
    //     its morning boundary. Scans drawn_to_log for mutual pairs
    //     with ≥3 of the last 7 sim-days, filters by eligibility,
    //     grants permissions valid 2 sim-days.
    const crossedIntoNewDay = transitions.some(
      (t) => (t as { kind?: string }).kind === "day_advanced",
    );
    if (crossedIntoNewDay && this.hot.world.season === "spring") {
      const detected = detectMutualPairs(this.sql, this.hot.world.simDay);
      const eligible = filterEligible(
        this.sql, detected, this.hot.world, this.hot.koi, newTick,
      );
      for (const pair of eligible) {
        grantPermission(this.sql, pair, newTick);
        // Mutual drawn-to appraisal on both fish (§ VIII)
        for (const id of [pair.aId, pair.bId]) {
          const k = this.hot.koi.find((x) => x.id === id);
          if (k) k.pad = applyDelta(k.pad, appraise({ kind: "mutual_drawn_to" }, "self"));
        }
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick, actor: "system",
            type: "bond_consolidated",
            targets: [pair.aId, pair.bId],
            mechanism: "parallel_presence",
            payload: {
              pair_key: pair.pairKey,
              mutual_days: pair.mutualDays,
              season: this.hot.world.season,
            },
          },
        );
      }
    }

    // 5b. Co-presence check — every tick scan active permissions and
    //     fire spawning when the pair is simultaneously at the shelf.
    //     "The condition enforces only permission, not act." (§ X)
    for (const perm of permissions) {
      const a = this.hot.koi.find((k) => k.id === perm.aId);
      const b = this.hot.koi.find((k) => k.id === perm.bId);
      if (!a || !b) continue;
      if (!isCoPresentForSpawning(a, b)) continue;

      // Both converged at the shelf — spawning fires.
      await this.fireSpawning(perm.pairKey, a, b, newTick, rng);
    }

    // 5b-extension. Love-flow state-based detectors (§ IX — Witnessing
    // + scaffolded Repair families). Runs every DETECTOR_INTERVAL_TICKS
    // rather than every tick to keep SQL load bounded. Firings are
    // applied in-place: PAD deltas, card bumps, event emission.
    if (newTick % DETECTOR_INTERVAL_TICKS === 0) {
      const detCtx: DetectionContext = {
        tick: newTick,
        tickHz: SIM.tickHz,
        simDay: this.hot.world.simDay,
        tDay: this.hot.world.tDay,
        koi: this.hot.koi,
        pois: [],  // Stage 10 will populate; for now no visitor POIs
        sql: this.sql,
      };
      const firings = runStateDetectors(detCtx);
      for (const f of firings) {
        await this.applyMechanismFiring(f);
      }

      // Pickup check — any koi swimming close to a loose material
      // picks it up if they have inventory capacity. This is the
      // "found" mode of provenance; drives the whole gift family.
      await this.maybePickUpNearbyMaterials(newTick);
    }

    // 5b-extension-2. Found-material spawn (§ IX scarcity discipline).
    //  Runs once per sim-day at its morning boundary. Pond-wide rate:
    //  0.5 items/day on average, so one item every other day.
    if (crossedIntoNewDay) {
      if (rng.chance(ARTIFACT_LIMITS.foundMaterialSpawnRatePerDay)) {
        const art = createFoundMaterial(this.sql, { atTick: newTick, rng });
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick, actor: "system",
            type: "interaction",
            mechanism: null,
            payload: {
              subtype: "material_spawned",
              artifact_id: art.id, artifact_type: art.type,
              loc: art.loc,
            },
          },
        );
      }
    }
    // 5c. Stage advancement + death. Egg → Fry is a birth: we compose
    //     the real name from first-moment observations, emit fry_hatched,
    //     and apply the pond-wide Δp +0.1 appraisal (§ VIII).
    const stageEvents: { koi: KoiState; to: LifeStage }[] = [];
    const fryHatches: KoiState[] = [];
    const deaths: KoiState[] = [];
    for (const k of this.hot.koi) {
      const prevStage = k.stage;
      const newStage = advanceStage(k);
      if (newStage) {
        stageEvents.push({ koi: k, to: newStage });
        if (prevStage === "egg" && newStage === "fry" && isUnnamed(k.name)) {
          fryHatches.push(k);
        }
      }

      const lifespan = this.lifespanByKoi.get(k.id);
      if (lifespan) {
        const pDeath = deathProbabilityPerTick(
          k, lifespan, stormStress(this.hot.world.weather),
        );
        if (pDeath > 0 && rng.chance(pDeath)) {
          deaths.push(k);
        }
      }
    }

    for (const f of fryHatches) {
      const hourAtHatch = this.hot.world.tDay * 24;
      const obs = collectObservations(f, this.hot.koi, hourAtHatch);
      f.name = composeName(f.id, f.color, obs);
      if (!this.lifespanByKoi.has(f.id)) {
        this.lifespanByKoi.set(f.id, drawLifespan(new Rng(hashCode(f.id))));
      }

      // Kin imprinting (§ IV, Stage 9.5). The fry carries a chemical-
      // familiarity bias toward each parent from the moment it emerges
      // from its egg. Not a memory. Not a named relationship. A sensory
      // fact — this fish's scent is the water I grew inside of.
      //
      // Expressed as a seeded relationship_card row per parent with
      // familiarity_prior = 0.12 and a small positive valence. When the
      // LLM later composes this fry's cognition, the card shows
      // "particularly familiar" and the fragment register becomes
      // available. The fry doesn't know these are its parents; it just
      // finds some fish more known than others without knowing why.
      // That is what koi biology does.
      const lineageRow = this.sql.exec(
        `SELECT parent_a_id, parent_b_id FROM koi_lineage WHERE koi_id = ?`,
        f.id,
      ).toArray()[0];
      if (lineageRow) {
        const parentIds: string[] = [];
        const pa = lineageRow["parent_a_id"] as string | null;
        const pb = lineageRow["parent_b_id"] as string | null;
        if (pa) parentIds.push(pa);
        if (pb && pb !== pa) parentIds.push(pb);

        for (const parentId of parentIds) {
          // Only seed if the parent is still in the pond — if both
          // parents died before this egg hatched, the fry is born an
          // orphan, familiarity with no referent. Which is also honest.
          const parentAlive = this.hot.koi.some(
            (k) => k.id === parentId && k.stage !== "egg",
          );
          if (!parentAlive) continue;

          this.sql.exec(
            `INSERT INTO relationship_card (
               self_id, other_id, first_encounter_tick, interaction_count,
               valence, valence_trajectory_json, dominance, trust, summary,
               notable_memory_ids_json, drawn_count_7d, last_authored_tick,
               familiarity_prior
             ) VALUES (?, ?, ?, 0, 0.06, '[0.06]', -0.1, 0.5, '', '[]', 0, ?, 0.12)
             ON CONFLICT(self_id, other_id) DO UPDATE SET
               familiarity_prior = MAX(relationship_card.familiarity_prior, 0.12)`,
            f.id, parentId, newTick, newTick,
          );
          // And the reverse direction: the parent's card toward the fry
          // also gets a familiarity bias — parents recognize their
          // offspring's scent as continuous with theirs.
          this.sql.exec(
            `INSERT INTO relationship_card (
               self_id, other_id, first_encounter_tick, interaction_count,
               valence, valence_trajectory_json, dominance, trust, summary,
               notable_memory_ids_json, drawn_count_7d, last_authored_tick,
               familiarity_prior
             ) VALUES (?, ?, ?, 0, 0.08, '[0.08]', 0.2, 0.6, '', '[]', 0, ?, 0.15)
             ON CONFLICT(self_id, other_id) DO UPDATE SET
               familiarity_prior = MAX(relationship_card.familiarity_prior, 0.15)`,
            parentId, f.id, newTick, newTick,
          );
        }
      }

      await emit(this.sql, this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick, actor: `koi:${f.id}`,
          type: "fry_hatched",
          payload: { name: f.name, color: f.color, legendary: f.legendary },
        },
      );
      this.broadcastAmbient({
        t: "ambient", kind: "hatched", tick: newTick, now: nowMs,
        details: { name: f.name },
      });
      // Pond-wide Δp +0.1 (§ VIII).
      const delta = appraise({ kind: "fry_hatched_in_pond" }, "pond_witness");
      for (const other of this.hot.koi) {
        if (other.id === f.id) continue;
        other.pad = applyDelta(other.pad, delta);
      }
    }

    // 6. Emit transition events
    for (const t of transitions) {
      await this.emitWorldTransition(newTick, t);
    }
    for (const s of stageEvents) {
      await emit(this.sql, this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick, actor: `koi:${s.koi.id}`,
          type: "koi_stage_advanced",
          payload: { to: s.to, name: s.koi.name },
        },
      );
    }

    // 7. Handle deaths — remove from hot, update SQLite, emit events,
    //    apply grief appraisal to survivors. (§ VIII, § XIX)
    for (const d of deaths) {
      this.hot.koi = this.hot.koi.filter((x) => x.id !== d.id);
      this.sql.exec(
        `UPDATE koi SET is_alive = 0, died_at_tick = ? WHERE id = ?`,
        newTick, d.id,
      );
      for (const survivor of this.hot.koi) {
        const role: "bonded_witness" | "pond_witness" =
          // bonded = has a relationship_card row with positive valence
          // (cheap check via the sql)
          this.bondedWithDeceased(survivor.id, d.id) ? "bonded_witness" : "pond_witness";
        const delta = appraise({
          kind: d.stage === "elder" ? "elder_died" : "peer_died",
        }, role);
        survivor.pad = applyDelta(survivor.pad, delta);
      }
      await emit(this.sql, this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick, actor: `koi:${d.id}`,
          type: "koi_died",
          payload: { name: d.name, stage: d.stage, age_ticks: d.ageTicks },
        },
      );

      // Death ritual: name-tile at shrine + heirloom transfer to the
      // highest-valence survivor. Runs after grief appraisal so the
      // heir's PAD reflects the grief first, then the ritual
      // afterward — this is the sequence a human wake follows too.
      // (§ IX heirloom, § XII name-tile, Stage 9.)
      await this.handleDeathArtifacts(d, newTick, rng);

      this.broadcastAmbient({
        t: "ambient", kind: "died", tick: newTick, now: nowMs,
        details: { name: d.name },
      });
    }

    // 8. Persist hot state back to SQLite
    this.hot.tick = newTick;
    this.hot.rngState = rng.snapshot();
    this.persistWorld();
    for (const k of this.hot.koi) this.updateKoiRow(k);
    this.persistFood();

    // 9. Broadcast tick frame to WS clients
    this.broadcastTick(newTick, nowMs);

    // 10. Reschedule handled by the outer alarm() wrapper in its finally
    //     block — guarantees physics keeps running even if any step
    //     above throws. (§ XVII)
  }

  // ─────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────

  private bondedWithDeceased(selfId: string, otherId: string): boolean {
    const rows = this.sql.exec(
      `SELECT valence FROM relationship_card WHERE self_id = ? AND other_id = ?`,
      selfId, otherId,
    ).toArray();
    if (rows.length === 0) return false;
    return (rows[0]!["valence"] as number) > 0.25;
  }

  private applyAmbientToNearby(
    x: number, z: number,
    event: { kind: "visitor_pebble_placed" | "visitor_fed" },
  ): void {
    const R = 1.5;
    for (const k of this.hot.koi) {
      const dx = k.x - x, dz = k.z - z;
      if (dx * dx + dz * dz > R * R) continue;
      const delta = appraise(event as { kind: "visitor_pebble_placed" | "visitor_fed" }, "self");
      k.pad = applyDelta(k.pad, delta);
    }
  }

  private async emitWorldTransition(tick: SimTick, t: unknown): Promise<void> {
    // Narrow by discriminator without pulling the types up again.
    const trans = t as { kind: string } & Record<string, unknown>;
    const typeMap: Record<string, EventType> = {
      day_advanced: "day_advanced",
      season_changed: "season_changed",
      weather_changed: "weather_changed",
      solstice_began: "solstice_attended",
      solstice_ended: "ritual_performed",
    };
    const type = typeMap[trans.kind] ?? "ritual_performed";
    await emit(this.sql, this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick, actor: "system", type,
        payload: { ...trans },
      },
    );

    // Also broadcast ambient for visitor-visible transitions
    const ambientKind =
      trans.kind === "solstice_began" ? "solstice_began" :
      trans.kind === "solstice_ended" ? "solstice_ended" :
      trans.kind === "season_changed" ? "season_changed" :
      trans.kind === "weather_changed" && trans["to"] === "storm" ? "storm_began" :
      trans.kind === "weather_changed" && trans["from"] === "storm" ? "storm_ended" :
      null;
    if (ambientKind) {
      this.broadcastAmbient({
        t: "ambient", kind: ambientKind as never,
        tick, now: Date.now(), details: trans as Record<string, unknown>,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  Cognition (§ V) — only called when COGNITION_ENABLED=true and
  //  OPENROUTER_API_KEY is set. Any throw falls through to meditation.
  // ─────────────────────────────────────────────────────────────────

  private async runKoiCognition(k: KoiState, newTick: SimTick): Promise<void> {
    // 1. Build a short situation string and embed it as the query.
    const visible = this.hot.koi.filter((o) =>
      o.id !== k.id && distance2d(o, k) < 2.5,
    );
    const situation = [
      `time: ${this.hot.world.season}, tDay ${this.hot.world.tDay.toFixed(2)}`,
      `weather: ${this.hot.world.weather}`,
      `nearby: ${visible.map((o) => o.id).join(",") || "none"}`,
      `self: ${k.stage}, p=${k.pad.p.toFixed(2)} a=${k.pad.a.toFixed(2)}`,
    ].join(" · ");

    const qEmbedding = await embed(this.env.AI as never, situation);

    // 2. Retrieve memories via Park-style scoring.
    const memories: MemoryRow[] = retrieveMemories(this.sql, {
      koiId: k.id,
      stage: k.stage,
      queryEmbedding: qEmbedding,
      nowTick: newTick,
      tickHz: SIM.tickHz,
      visibleKoi: visible.map((o) => o.id),
    });

    // 3. Load relationship cards for visible others.
    const cards: RelationshipCard[] = this.loadCards(k.id, visible.map((o) => o.id));

    // 4. Load currently-valid beliefs.
    const beliefs: MemoryRow[] = this.loadValidBeliefs(k.id);

    // 5. Determine whether this is the twilight reflection slot.
    const tDay = this.hot.world.tDay;
    const isTwilight =
      tDay > 0.86 && tDay < 0.92 &&
      newTick - k.lastTwilightTick > Math.floor(SIM.tickHz * 3600 * 12);

    // 6. Call cognition.
    const result = await runCognition(this.env, {
      self: k,
      visible,
      cards,
      beliefs,
      memories,
      world: this.hot.world,
      tickHz: SIM.tickHz,
      ambient: [],
      isTwilight,
    }, this.hot.monthSpendUsd);

    // 7. Apply response.
    const resp = result.response;
    await this.applyCognitionResponse(k, newTick, resp, isTwilight, visible);

    // 8. Update budget.
    this.hot.monthSpendUsd += result.costUsd;

    // 9. Emit llm_called event (§ XV research hygiene — exact model id).
    //    Now includes the utterance, target_koi, and mood_delta so the
    //    research log is complete from the event table alone without
    //    having to reconstruct from koi state mutations.
    await emit(this.sql, this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: newTick, actor: `koi:${k.id}`,
        type: result.cachedFallback ? "llm_failed" : "llm_called",
        mechanism: (resp.mechanism as LoveFlowMechanism | null) ?? null,
        llm: {
          model: result.modelUsed,
          temperature: result.temperature,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
        },
        payload: {
          intent: resp.intent,
          target_koi: resp.target_koi ?? null,
          utterance: resp.utterance ?? null,
          mood_delta: resp.mood_delta,
          importance: resp.importance,
          twilight: isTwilight,
          validation_failures: result.validationFailures,
        },
      },
    );
  }

  private async applyCognitionResponse(
    k: KoiState, newTick: SimTick, resp: CognitionResponse, isTwilight: boolean,
    visible: KoiState[] = [],
  ): Promise<void> {
    // Claim-based mechanism validation (§ IX agreeable-LLM guards).
    // If the LLM claims apology or forgiveness, the simulation decides
    // whether the claim is earned (a rupture/apology exists in the
    // pair's history) and either honors or downgrades. An honored
    // firing applies PAD + card bumps on top of the response's own
    // mood_delta. A downgrade emits a research datum and lets the
    // intent-level response proceed without the mechanism bonus.
    if (resp.mechanism && resp.target_koi) {
      const outcome = validateClaim(
        this.sql, resp.mechanism, k.id, resp.target_koi,
        newTick, SIM.tickHz,
      );
      if (outcome) {
        if (outcome.kind === "honored") {
          await this.applyMechanismFiring(outcome.firing);
        } else {
          // Log the downgrade for research — § IX says the would-be
          // apology "becomes a 'would-have-apologized' record in the
          // research log." That record is an event with a downgraded
          // flag in its payload.
          await emit(this.sql, this.env.AE_EVENTS,
            { pondId: this.pondId, configHash: this.configHash },
            {
              tick: newTick,
              actor: `koi:${k.id}`,
              type: "interaction",
              targets: [resp.target_koi],
              mechanism: resp.mechanism,
              payload: {
                downgraded: true,
                reason: outcome.reason,
              },
            },
          );
        }
      }
    }
    // Intent
    const target = resp.target_koi ?? undefined;
    k.intent = {
      kind: resp.intent,
      atTick: newTick,
      ...(target !== undefined ? { targetId: target } : {}),
      ...(resp.mechanism ? { mechanism: resp.mechanism as LoveFlowMechanism } : {}),
    };

    // Mood delta — LLM-share only for now (0.3 of blended formula).
    // Richer blending with an accumulated deterministic delta is a
    // Stage 3 polish item; see TODO in affect.ts.
    if (resp.mood_delta) {
      const shared = {
        p: (resp.mood_delta.p ?? 0) * 0.3,
        a: (resp.mood_delta.a ?? 0) * 0.3,
        d: (resp.mood_delta.d ?? 0) * 0.3,
      };
      k.pad = applyDelta(k.pad, shared);
    }

    // Utterance — broadcast as a speech stream chunk.
    if (resp.utterance) {
      const uttId = crypto.randomUUID();
      const msg = {
        t: "speech" as const,
        fishId: k.id, uttId,
        chunk: resp.utterance,
        done: true,
      };
      const payload = JSON.stringify(msg);
      for (const ws of this.ctx.getWebSockets()) {
        try { ws.send(payload); } catch { /* closed */ }
      }
      k.lastUtterance = resp.utterance;
      k.lastUtteranceTick = newTick;
    }

    // Memory write — rare. Embedding is one AI call, cheap.
    if (resp.memory_write) {
      const mw = resp.memory_write;
      try {
        const emb = await embed(this.env.AI as never, mw.content);
        writeMemoryRow(this.sql, {
          koiId: k.id,
          kind: mw.kind,
          content: mw.content,
          importance: resp.importance,
          createdAtTick: newTick,
          emotionalValence: mw.emotional_valence,
          participants: mw.participants,
          embedding: emb,
        });
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick, actor: `koi:${k.id}`,
            type: "memory_written",
            payload: { kind: mw.kind, importance: resp.importance },
          },
        );
      } catch {
        // Embedding failure is not fatal — cognition proceeds.
      }
    }

    // Belief update — supersede prior belief, insert new one.
    if (resp.belief_update) {
      try {
        const bu = resp.belief_update;
        if (bu.supersedes_belief_id) {
          this.sql.exec(
            `UPDATE memory SET valid_to_tick = ? WHERE id = ? AND koi_id = ?`,
            newTick, bu.supersedes_belief_id, k.id,
          );
        }
        const emb = await embed(this.env.AI as never, bu.content);
        writeMemoryRow(this.sql, {
          koiId: k.id, kind: "belief", content: bu.content,
          importance: 6, createdAtTick: newTick,
          emotionalValence: 0, participants: [], embedding: emb,
          sourceMemoryIds: bu.supersedes_belief_id ? [bu.supersedes_belief_id] : [],
        });
      } catch {
        // Fall through.
      }
    }

    // Drawn-to (twilight only) + relationship card authoring.
    if (isTwilight) {
      // Author cards first so drawn_to's extra bump lands on top of the
      // daily baseline increment.
      this.authorRelationshipCards(
        k.id, visible, newTick, this.hot.world.simDay,
      );

      if (resp.drawn_to) {
        k.drawnTo = {
          targetId: resp.drawn_to.koi_id,
          noticing: resp.drawn_to.noticing,
          atTick: newTick,
        };
        this.sql.exec(
          `INSERT INTO drawn_to_log (actor_id, target_id, noticing, tick, sim_day)
           VALUES (?, ?, ?, ?, ?)`,
          k.id, resp.drawn_to.koi_id, resp.drawn_to.noticing,
          newTick, this.hot.world.simDay,
        );
        // Apply a meaningful valence bump to the drawn-to target's card.
        // This is the one place where a specific card shifts faster than
        // the daily-witnessing baseline.
        this.bumpCardValence(k.id, resp.drawn_to.koi_id, 0.04, newTick);
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick, actor: `koi:${k.id}`,
            type: "drawn_to_reflected",
            targets: [resp.drawn_to.koi_id],
            payload: { noticing: resp.drawn_to.noticing },
          },
        );
      }
      k.lastTwilightTick = newTick;
    }

    // Micro-reflection threshold tracking (§ VI).
    k.microImportanceAccum += resp.importance;

    // Occasional pruning — once per sim-day, per koi.
    if (newTick % Math.floor(SIM.tickHz * 3600 * 24) === 0) {
      pruneIfNeeded(this.sql, k.id, newTick, SIM.tickHz);
    }
  }

  private async logCognitionFailure(
    k: KoiState, newTick: SimTick, err: unknown,
  ): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    await emit(this.sql, this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: newTick, actor: `koi:${k.id}`,
        type: "llm_failed",
        payload: { error: message.slice(0, 200) },
      },
    );
    // Use a fallback utterance sometimes so the pond's narrative
    // coherence is preserved even when the LLM failed.
    void fallbackUtterance;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Relationship card authoring (§ VI, Stage 1 polish)
  //
  //  Called once per koi per twilight. For each currently-visible other
  //  fish, upsert the directed (self → other) card with:
  //    - interaction_count bumped by 1 (we co-existed today)
  //    - a small witnessing-baseline valence increment (+0.01) — Witnessing
  //      family from § IX: sustained parallel presence is regenerative
  //    - drawn_count_7d recomputed from the drawn_to_log within the window
  //    - today's valence appended to the 7-day trajectory
  //
  //  The drawn-to target gets an ADDITIONAL bump on top of this via
  //  bumpCardValence(), applied immediately after by the caller.
  // ─────────────────────────────────────────────────────────────────

  private authorRelationshipCards(
    selfId: string,
    visible: readonly KoiState[],
    newTick: SimTick,
    simDay: number,
  ): void {
    const windowLower = simDay - 7;
    const BASELINE_BUMP = 0.01;

    for (const o of visible) {
      if (o.id === selfId) continue;
      if (o.stage === "egg") continue;

      // Read existing card for trajectory + prior valence (we need the
      // prior valence to compute today's increment).
      const existing = this.sql.exec(
        `SELECT valence, valence_trajectory_json, first_encounter_tick
           FROM relationship_card WHERE self_id = ? AND other_id = ?`,
        selfId, o.id,
      ).toArray()[0];

      const priorValence = (existing?.["valence"] as number | undefined) ?? 0;
      const priorTrajectory: number[] = existing
        ? JSON.parse(existing["valence_trajectory_json"] as string)
        : [];
      const firstEncounterTick = existing
        ? (existing["first_encounter_tick"] as number)
        : newTick;

      const newValence = clampToPlausible(priorValence + BASELINE_BUMP);
      const trajectory = [...priorTrajectory, newValence].slice(-7);

      // Recompute drawn_count_7d for this directed pair.
      const drawnCountRow = this.sql.exec(
        `SELECT COUNT(DISTINCT sim_day) AS n FROM drawn_to_log
          WHERE actor_id = ? AND target_id = ?
            AND sim_day > ? AND sim_day <= ?`,
        selfId, o.id, windowLower, simDay,
      ).toArray()[0];
      const drawnCount7d = (drawnCountRow?.["n"] as number | undefined) ?? 0;

      this.sql.exec(
        `INSERT INTO relationship_card (
           self_id, other_id, first_encounter_tick, interaction_count,
           valence, valence_trajectory_json, dominance, trust, summary,
           notable_memory_ids_json, drawn_count_7d, last_authored_tick
         ) VALUES (?, ?, ?, 1, ?, ?, 0, 0.3, '', '[]', ?, ?)
         ON CONFLICT(self_id, other_id) DO UPDATE SET
           interaction_count = interaction_count + 1,
           valence = excluded.valence,
           valence_trajectory_json = excluded.valence_trajectory_json,
           drawn_count_7d = excluded.drawn_count_7d,
           last_authored_tick = excluded.last_authored_tick`,
        selfId, o.id, firstEncounterTick,
        newValence, JSON.stringify(trajectory),
        drawnCount7d, newTick,
      );
    }
  }

  /** Apply a valence delta to a single directed card. Used when the
   *  twilight reflection flags a specific other koi as drawn-to. */
  private bumpCardValence(
    selfId: string, otherId: string, delta: number, nowTick: SimTick,
  ): void {
    // Read current card — must exist because authorRelationshipCards
    // ran first in the same twilight.
    const row = this.sql.exec(
      `SELECT valence, valence_trajectory_json FROM relationship_card
        WHERE self_id = ? AND other_id = ?`,
      selfId, otherId,
    ).toArray()[0];
    if (!row) return;

    const current = row["valence"] as number;
    const bumped = clampToPlausible(current + delta);
    const trajectory: number[] = JSON.parse(
      row["valence_trajectory_json"] as string,
    );
    // Replace today's trajectory entry (the one authorRelationshipCards
    // just appended) with the bumped value, so the 7-day series stays
    // internally consistent.
    if (trajectory.length > 0) trajectory[trajectory.length - 1] = bumped;

    this.sql.exec(
      `UPDATE relationship_card
          SET valence = ?, valence_trajectory_json = ?, last_authored_tick = ?
        WHERE self_id = ? AND other_id = ?`,
      bumped, JSON.stringify(trajectory), nowTick, selfId, otherId,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  //  Mechanism firing — common applier for state-based + claim-based
  //
  //  Takes a MechanismFiring (from a detector or a honored claim),
  //  applies its PAD deltas to actor + each participant, applies its
  //  card valence bumps between the actor and each participant, and
  //  emits the event. Idempotent per (mechanism, actor, participants,
  //  tick) because the caller is responsible for cooldown gating.
  // ─────────────────────────────────────────────────────────────────

  private async applyMechanismFiring(f: MechanismFiring): Promise<void> {
    // Tag-specific state propagation: the tagger hands off it-ness to
    // the tagged. Other mechanisms don't mutate tagState. We reconstruct
    // a TagEvent from the firing payload — play.ts writes chain_length
    // and chain_started_tick into the payload, so the event is
    // recoverable without a dedicated channel.
    if (f.mechanism === "tag") {
      const tagger = this.hot.koi.find((k) => k.id === f.actor);
      const tagged = this.hot.koi.find(
        (k) => k.id !== f.actor && f.participants.includes(k.id),
      );
      if (tagger && tagged) {
        const chainStartedTick =
          (f.payload["chain_started_tick"] as number | undefined) ?? f.tick;
        applyTagEvent(
          {
            tagger: f.actor,
            tagged: tagged.id,
            chainLength: (f.payload["chain_length"] as number | undefined) ?? 1,
            chainStartedTick,
          },
          tagger, tagged, f.tick,
        );
      }
    }

    // PAD deltas
    const actor = this.hot.koi.find((k) => k.id === f.actor);
    if (actor) actor.pad = applyDelta(actor.pad, f.actorDelta);
    for (const pid of f.participants) {
      if (pid === f.actor) continue;
      const p = this.hot.koi.find((k) => k.id === pid);
      if (p) p.pad = applyDelta(p.pad, f.participantDelta);
    }

    // Card valence bumps — bidirectional, soft
    if (f.cardValenceBump > 0) {
      for (const pid of f.participants) {
        if (pid === f.actor) continue;
        this.softBumpCard(f.actor, pid, f.cardValenceBump, f.tick);
        this.softBumpCard(pid, f.actor, f.cardValenceBump, f.tick);
      }
    }

    // Emit event — use "interaction" as the generic envelope type with
    // the specific mechanism in the mechanism field, unless the
    // mechanism has a dedicated event type (apology, forgiveness).
    const type = f.mechanism === "apology" ? "apology"
               : f.mechanism === "forgiveness" ? "forgiveness"
               : "interaction";
    await emit(this.sql, this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: f.tick,
        actor: `koi:${f.actor}`,
        type,
        targets: f.participants.filter((p) => p !== f.actor),
        mechanism: f.mechanism,
        affectDelta: f.actorDelta,
        payload: { family: f.family, ...f.payload },
      },
    );

    // Broadcast to connected clients. Mechanism firings are the signal
    // the frontend uses to trigger mechanism-specific choreography —
    // dance rhythm, tag contact flash, surface-breach splash, gift
    // orientation. Sent after the event row is written so any client
    // asking "did this happen" via the events endpoint will find it
    // consistent with what they just received over the WS.
    const mechMsg = {
      t: "mechanism" as const,
      tick: f.tick,
      now: Date.now(),
      mechanism: f.mechanism,
      family: f.family,
      actor: f.actor,
      participants: f.participants,
      payload: f.payload,
    };
    const mechPayload = JSON.stringify(mechMsg);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(mechPayload); } catch { /* closed */ }
    }
  }

  /** Scan nearby loose artifacts for each koi and pick up if capacity. */
  private async maybePickUpNearbyMaterials(newTick: SimTick): Promise<void> {
    const PICKUP_RADIUS_M = 0.3;
    for (const k of this.hot.koi) {
      if (k.stage === "egg" || k.stage === "dying") continue;
      if (!hasCapacity(this.sql, k.id)) continue;
      const nearby = loadNearbyLooseArtifacts(
        this.sql, { x: k.x, z: k.z }, PICKUP_RADIUS_M,
      );
      for (const art of nearby) {
        if (!hasCapacity(this.sql, k.id)) break;
        // Don't pick up sacred artifacts (name-tiles) or offerings
        if (art.sacred) continue;
        if (art.state === "offered") continue;
        pickUp(this.sql, art, k.id, newTick);
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick, actor: `koi:${k.id}`,
            type: "interaction",
            payload: {
              subtype: "artifact_found",
              artifact_id: art.id, artifact_type: art.type,
            },
          },
        );
      }
    }
  }

  /** Death-ritual artifact handling (§ IX heirloom + Stage 9 name-tile).
   *  Called once per death by the death loop. */
  private async handleDeathArtifacts(
    deceased: KoiState, newTick: SimTick, rng: Rng,
  ): Promise<void> {
    const heir = chooseHeir(this.sql, deceased.id, this.hot.koi);
    const held = loadHeldArtifacts(this.sql, deceased.id);

    if (heir) {
      // Name-tile created by the heir, placed at the shrine.
      const shrineLoc = {
        x: POND.shrine.x, y: -POND.maxDepth + 0.05, z: POND.shrine.z,
      };
      const tile = createNameTile(this.sql, {
        atTick: newTick,
        deceasedName: deceased.name,
        deceasedId: deceased.id,
        placedByKoiId: heir.koiId,
        shrineLoc,
        rng,
      });
      await emit(this.sql, this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick, actor: `koi:${heir.koiId}`,
          type: "interaction",
          targets: [deceased.id],
          mechanism: "farewell",
          payload: {
            subtype: "name_tile_placed",
            artifact_id: tile.id,
            for_koi: deceased.id, for_name: deceased.name,
            heir_valence: heir.valence,
          },
        },
      );

      // Transfer held artifacts as heirlooms.
      for (const art of held) {
        transferAsHeirloom(this.sql, art, deceased.id, heir.koiId, newTick);
        await emit(this.sql, this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick, actor: `koi:${heir.koiId}`,
            type: "interaction",
            targets: [deceased.id],
            mechanism: "heirloom",
            payload: {
              artifact_id: art.id, artifact_type: art.type,
              from: deceased.id, to: heir.koiId,
            },
          },
        );
      }

      // Broadcast as ambient so visitors see it
      this.broadcastAmbient({
        t: "ambient", kind: "elder_named", tick: newTick, now: Date.now(),
        details: { name: deceased.name, heir: heir.koiId },
      });
    } else {
      // No heir qualified. Held artifacts die with the fish —
      // become loose at the death location, rediscoverable.
      const loc = { x: deceased.x, y: deceased.y, z: deceased.z };
      for (const art of held) {
        markDiedWith(this.sql, art, deceased.id, loc, newTick);
      }
    }
  }

  /** Like bumpCardValence but tolerates the absence of an existing card
   *  by creating one with minimum fields. Used for mechanism firings
   *  that might precede a twilight reflection. */
  private softBumpCard(
    selfId: string, otherId: string, delta: number, nowTick: SimTick,
  ): void {
    const existing = this.sql.exec(
      `SELECT valence, valence_trajectory_json FROM relationship_card
        WHERE self_id = ? AND other_id = ?`,
      selfId, otherId,
    ).toArray()[0];

    if (!existing) {
      this.sql.exec(
        `INSERT INTO relationship_card (
           self_id, other_id, first_encounter_tick, interaction_count,
           valence, valence_trajectory_json, dominance, trust, summary,
           notable_memory_ids_json, drawn_count_7d, last_authored_tick
         ) VALUES (?, ?, ?, 0, ?, ?, 0, 0.3, '', '[]', 0, ?)`,
        selfId, otherId, nowTick, clampToPlausibleV(delta),
        JSON.stringify([clampToPlausibleV(delta)]), nowTick,
      );
      return;
    }
    const current = existing["valence"] as number;
    const bumped = clampToPlausibleV(current + delta);
    const traj: number[] = JSON.parse(existing["valence_trajectory_json"] as string);
    // Don't append per-firing; keep trajectory a daily series.
    this.sql.exec(
      `UPDATE relationship_card
          SET valence = ?, last_authored_tick = ?
        WHERE self_id = ? AND other_id = ?`,
      bumped, nowTick, selfId, otherId,
    );
    void traj;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Spawning (§ X)
  //
  //  Called when a permitted pair has just co-presenced at the shelf.
  //  Consumes the permission, lays a clutch of eggs in the shelf band,
  //  marks parent cooldowns, writes lineage rows, and emits the event
  //  with witness list. Additional adults within WITNESS_PROXIMITY_M
  //  are logged as co-present but are NOT parents — only the drawn-to
  //  pair gets lineage credit.
  // ─────────────────────────────────────────────────────────────────

  private async fireSpawning(
    pairKey: string,
    a: KoiState, b: KoiState,
    newTick: SimTick,
    rng: Rng,
  ): Promise<void> {
    // Consume the permission first — prevents a second fire on the next
    // tick if the pair is still co-present.
    consumePermission(this.sql, pairKey, newTick);

    const eggCount = pickEggCount(rng);
    const placements = placeEggs(a, b, eggCount, newTick, rng);
    const witnesses = findWitnesses(this.hot.koi, a.id, b.id);

    // Compute child genetics ONCE per spawning event — every egg in
    // this clutch shares the same genetic draw from the parents, with
    // per-egg variance added inside combineGenetics. Load parent
    // genetics from their stored rows; fall back to archetype lookup
    // if they don't yet have genetics_json (seed cohort before
    // migration, or older rows).
    const parentAGenetics = this.loadKoiGenetics(a);
    const parentBGenetics = this.loadKoiGenetics(b);

    // Create each egg as a real KoiState row. Eggs do not yet move
    // (kinematics short-circuits on stage === "egg") and never cognize
    // (nextCognitionTick = MAX_SAFE_INTEGER).
    const newEggs: KoiState[] = [];
    for (const p of placements) {
      // Generate this egg's unique genetics: parent blend + per-egg noise.
      // Legendary flag in placement adds metallic +0.1.
      const eggGenetics = combineGenetics(
        parentAGenetics, parentBGenetics, rng, p.legendary,
      );
      // Update the color label to match the new phenotype's closest
      // archetype — keeps legacy code that reads `color` working, even
      // though rendering will eventually use genetics directly.
      const eggColor = archetypeNameFor(eggGenetics) as KoiState["color"];

      // Sex: 50/50 coin-flip per egg. Koi are gonochoristic — sex is
      // set at fertilization and stable for life. We use an independent
      // rng draw per egg so a single spawning produces a naturally
      // mixed clutch, which is what real reproduction produces.
      const eggSex: "female" | "male" = rng.float() < 0.5 ? "female" : "male";

      const egg = createEgg({
        id: p.eggId,
        parentAId: p.parentAId,
        parentBId: p.parentBId,
        x: p.x, y: p.y, z: p.z,
        legendary: p.legendary,
        color: eggColor,
        atTick: newTick,
        sex: eggSex,
      }, rng);
      newEggs.push(egg);
      this.insertKoiRow(egg);
      // Persist genetics — separate write since createEgg doesn't know
      // about the genetics field
      this.sql.exec(
        `UPDATE koi SET genetics_json = ? WHERE id = ?`,
        geneticsToJSON(eggGenetics), egg.id,
      );

      // Genealogy: compute generation = max(parent.generation) + 1 and
      // write the lineage row with the generation column populated.
      const generation = computeGenerationFromParents(this.sql, a.id, b.id);
      writeLineageRow(this.sql, egg.id, a.id, b.id, newTick, generation);
    }

    // Add eggs to the hot set so they show up on the next broadcast.
    this.hot.koi.push(...newEggs);

    // Mark parent cooldowns.
    a.lastSpawningTick = newTick;
    b.lastSpawningTick = newTick;

    // Emit the spawning event with full provenance. This is a
    // research-grade record: parents, witnesses, egg count, legendary
    // flags, and the canonical pair key all land in one payload.
    await emit(this.sql, this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: newTick,
        actor: "system",
        type: "spawning",
        targets: [a.id, b.id],
        mechanism: "parallel_presence",
        payload: {
          pair_key: pairKey,
          parent_a: a.id,
          parent_b: b.id,
          egg_count: eggCount,
          egg_ids: newEggs.map((e) => e.id),
          legendary_count: newEggs.filter((e) => e.legendary).length,
          witnesses: witnesses.map((w) => w.id),
          location: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          season: this.hot.world.season,
        },
      },
    );

    // Per-egg birth event — makes individual fry queryable in the log.
    for (const egg of newEggs) {
      await emit(this.sql, this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${egg.id}`,
          type: "egg_laid",
          targets: [a.id, b.id],
          payload: {
            parent_a: a.id, parent_b: b.id,
            color: egg.color, legendary: egg.legendary,
          },
        },
      );
    }
  }

  private loadCards(selfId: string, otherIds: string[]): RelationshipCard[] {
    if (otherIds.length === 0) return [];
    const placeholders = otherIds.map(() => "?").join(",");
    const rows = this.sql.exec(
      `SELECT * FROM relationship_card
        WHERE self_id = ? AND other_id IN (${placeholders})`,
      selfId, ...otherIds,
    ).toArray();
    return rows.map((r) => ({
      selfId: r["self_id"] as string,
      otherId: r["other_id"] as string,
      firstEncounterTick: r["first_encounter_tick"] as number,
      interactionCount: r["interaction_count"] as number,
      valence: r["valence"] as number,
      valenceTrajectory7d: JSON.parse(r["valence_trajectory_json"] as string),
      dominance: r["dominance"] as number,
      trust: r["trust"] as number,
      summary: r["summary"] as string,
      notableMemoryIds: JSON.parse(r["notable_memory_ids_json"] as string),
      drawnCount7d: r["drawn_count_7d"] as number,
      lastAuthoredTick: r["last_authored_tick"] as number,
      familiarityPrior: (r["familiarity_prior"] as number | undefined) ?? 0,
    }));
  }

  /** Load a koi's stored genetics from the koi row. Falls back to the
   *  archetype lookup (by `color` field) when genetics_json is empty —
   *  this covers the seed cohort, pre-migration rows, and any koi created
   *  before the genetics field was wired. */
  private loadKoiGenetics(k: KoiState): KoiGenetics {
    const row = this.sql.exec(
      `SELECT genetics_json FROM koi WHERE id = ?`, k.id,
    ).toArray()[0];
    const raw = row?.["genetics_json"] as string | undefined;
    if (raw && raw !== "{}" && raw !== "") {
      try {
        return geneticsFromJSON(raw);
      } catch {
        // fall through to archetype
      }
    }
    return archetypeToGenetics(k.color);
  }

  private loadValidBeliefs(selfId: string): MemoryRow[] {
    const rows = this.sql.exec(
      `SELECT id, koi_id, kind, content, importance,
              created_at_tick, last_accessed_tick, access_count,
              emotional_valence, participants_json, embedding,
              valid_to_tick, source_memory_ids_json
         FROM memory
        WHERE koi_id = ? AND kind = 'belief' AND valid_to_tick IS NULL
        ORDER BY importance DESC, created_at_tick DESC
        LIMIT 12`,
      selfId,
    ).toArray();
    return rows.map((r) => ({
      id: r["id"] as number,
      koiId: r["koi_id"] as string,
      kind: "belief" as const,
      content: r["content"] as string,
      importance: r["importance"] as number,
      createdAtTick: r["created_at_tick"] as number,
      lastAccessedTick: r["last_accessed_tick"] as number,
      accessCount: r["access_count"] as number,
      emotionalValence: r["emotional_valence"] as number,
      participants: JSON.parse(r["participants_json"] as string),
      embedding: r["embedding"] as ArrayBuffer,
      validToTick: (r["valid_to_tick"] as number | null) ?? null,
      sourceMemoryIds: JSON.parse(r["source_memory_ids_json"] as string),
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  //  SQLite row writers
  // ─────────────────────────────────────────────────────────────────

  private persistWorld(): void {
    const w = this.hot.world;
    this.sql.exec(
      `INSERT INTO world (id, tick, t_day, sim_day, season, weather,
        clarity, temperature, solstice_active, next_solstice_tick,
        tier_level, month_spend_usd, rng_state)
       VALUES ('self', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         tick = excluded.tick,
         t_day = excluded.t_day,
         sim_day = excluded.sim_day,
         season = excluded.season,
         weather = excluded.weather,
         clarity = excluded.clarity,
         temperature = excluded.temperature,
         solstice_active = excluded.solstice_active,
         next_solstice_tick = excluded.next_solstice_tick,
         tier_level = excluded.tier_level,
         month_spend_usd = excluded.month_spend_usd,
         rng_state = excluded.rng_state`,
      this.hot.tick, w.tDay, w.simDay, w.season, w.weather,
      w.clarity, w.temperature, w.solsticeActive ? 1 : 0, w.nextSolsticeTick,
      this.hot.tierLevel, this.hot.monthSpendUsd, this.hot.rngState,
    );
  }

  private insertKoiRow(k: KoiState): void {
    this.sql.exec(
      `INSERT INTO koi (id, name, stage, sex, age_ticks, hatched_at_tick,
        legendary, color, x, y, z, vx, vz, h, size,
        pad_p, pad_a, pad_d, hunger,
        intent_kind, intent_target_id, intent_target_x, intent_target_y, intent_target_z,
        intent_at_tick, intent_mechanism, next_cognition_tick,
        last_twilight_tick, last_deep_sleep_tick, micro_importance_accum,
        drawn_target_id, drawn_noticing, drawn_at_tick,
        last_utterance, last_utterance_tick, last_spawning_tick,
        is_alive, died_at_tick)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      k.id, k.name, k.stage, k.sex, k.ageTicks, k.hatchedAtTick,
      k.legendary ? 1 : 0, k.color,
      k.x, k.y, k.z, k.vx, k.vz, k.h, k.size,
      k.pad.p, k.pad.a, k.pad.d, k.hunger,
      k.intent.kind,
      k.intent.targetId ?? null,
      k.intent.target?.x ?? null, k.intent.target?.y ?? null, k.intent.target?.z ?? null,
      k.intent.atTick, k.intent.mechanism ?? null,
      k.nextCognitionTick, k.lastTwilightTick, k.lastDeepSleepTick, k.microImportanceAccum,
      k.drawnTo?.targetId ?? null, k.drawnTo?.noticing ?? null, k.drawnTo?.atTick ?? null,
      k.lastUtterance, k.lastUtteranceTick, k.lastSpawningTick,
      1, null,
    );
  }

  private updateKoiRow(k: KoiState): void {
    this.sql.exec(
      `UPDATE koi SET
        stage = ?, age_ticks = ?, size = ?,
        x = ?, y = ?, z = ?, vx = ?, vz = ?, h = ?,
        pad_p = ?, pad_a = ?, pad_d = ?, hunger = ?,
        intent_kind = ?, intent_target_id = ?,
        intent_target_x = ?, intent_target_y = ?, intent_target_z = ?,
        intent_at_tick = ?, intent_mechanism = ?,
        next_cognition_tick = ?,
        last_twilight_tick = ?, last_deep_sleep_tick = ?,
        micro_importance_accum = ?,
        drawn_target_id = ?, drawn_noticing = ?, drawn_at_tick = ?,
        last_utterance = ?, last_utterance_tick = ?,
        last_spawning_tick = ?,
        name = ?
       WHERE id = ?`,
      k.stage, k.ageTicks, k.size,
      k.x, k.y, k.z, k.vx, k.vz, k.h,
      k.pad.p, k.pad.a, k.pad.d, k.hunger,
      k.intent.kind, k.intent.targetId ?? null,
      k.intent.target?.x ?? null, k.intent.target?.y ?? null, k.intent.target?.z ?? null,
      k.intent.atTick, k.intent.mechanism ?? null,
      k.nextCognitionTick,
      k.lastTwilightTick, k.lastDeepSleepTick, k.microImportanceAccum,
      k.drawnTo?.targetId ?? null, k.drawnTo?.noticing ?? null, k.drawnTo?.atTick ?? null,
      k.lastUtterance, k.lastUtteranceTick,
      k.lastSpawningTick,
      k.name,
      k.id,
    );
  }

  /** Persist the current food list to SQL. Because food is a small
   *  table (≤30 items) and changes aren't frequent (spawn/decay events
   *  per tick), we use the simple "delete all + re-insert" pattern
   *  rather than diffing. Called from the alarm after the tick step. */
  private persistFood(): void {
    this.sql.exec(`DELETE FROM food`);
    for (const f of this.hot.food) {
      this.sql.exec(
        `INSERT INTO food (id, kind, x, y, z, vx, vz,
          spawned_at_tick, decay_at_tick, nutrition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        f.id, f.kind, f.x, f.y, f.z,
        f.vx ?? null, f.vz ?? null,
        f.spawnedAtTick, f.decayAtTick, f.nutrition,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  Broadcast
  // ─────────────────────────────────────────────────────────────────

  private broadcastTick(tick: number, nowMs: number): void {
    if (tick === this.lastBroadcastTick) return;
    this.lastBroadcastTick = tick;

    const fish = this.hot.koi.map(toFrame);
    const food = this.hot.food.map(toFoodFrame);
    const msg = TickMessageSchema.parse({
      t: "tick", tick, now: nowMs, fish, food,
    });
    const payload = JSON.stringify(msg);

    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* closed */ }
    }
  }

  private sendSnapshot(ws: WebSocket): void {
    const fish = this.hot.koi.map(toFrame);
    const food = this.hot.food.map(toFoodFrame);
    const msg = SnapshotMessageSchema.parse({
      t: "snapshot",
      tick: this.hot.tick,
      now: Date.now(),
      fish,
      food,
      pondMeta: {
        version: this.pondVersion,
        created_at: Date.now(),            // approximate; real value in pond_meta
        tick_interval_ms: SIM.tickIntervalMs,
        t_day: this.hot.world.tDay,
        season: this.hot.world.season,
      },
    });
    try { ws.send(JSON.stringify(msg)); } catch { /* closed */ }
  }

  private broadcastAmbient(msg: unknown): void {
    const parsed = AmbientEventMessageSchema.safeParse(msg);
    if (!parsed.success) return;
    const payload = JSON.stringify(parsed.data);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* closed */ }
    }
  }
}

void LIFE;
void currentStage;
void createKoi;

// ───────────────────────────────────────────────────────────────────
//  Row → KoiState helper
// ───────────────────────────────────────────────────────────────────

/** Strip hot-state fields for wire transmission. Clients only need
 *  id, kind, and position to render food; decay/nutrition/drift are
 *  server-authoritative. */
function toFoodFrame(f: FoodItem) {
  return { id: f.id, kind: f.kind, x: f.x, y: f.y, z: f.z };
}

function rowToKoi(r: Record<string, unknown>): KoiState {
  return {
    id: r["id"] as string,
    name: r["name"] as string,
    stage: r["stage"] as KoiState["stage"],
    sex: ((r["sex"] as string) === "male" ? "male" : "female"),
    ageTicks: r["age_ticks"] as number,
    hatchedAtTick: r["hatched_at_tick"] as number,
    legendary: (r["legendary"] as number) === 1,
    color: r["color"] as KoiState["color"],
    x: r["x"] as number, y: r["y"] as number, z: r["z"] as number,
    vx: r["vx"] as number, vz: r["vz"] as number,
    h: r["h"] as number,
    size: (r["size"] as number) || SIZE_BY_STAGE[r["stage"] as KoiState["stage"]],
    pad: {
      p: r["pad_p"] as number,
      a: r["pad_a"] as number,
      d: r["pad_d"] as number,
    },
    // Hunger is not yet persisted (commit 2 keeps it in-memory to avoid
    // a schema migration; see commit 3). On rehydrate, fall back to the
    // initial baseline. Since DO warm cycles are infrequent, a fish that
    // gets reset from 0.8 back to 0.2 on wake is acceptable for the
    // duration of this commit — our purpose here is to observe rise
    // dynamics between persists, not to simulate multi-day starvation.
    hunger: (r["hunger"] as number | undefined) ?? HUNGER.initial,
    intent: {
      kind: r["intent_kind"] as KoiState["intent"]["kind"],
      targetId: (r["intent_target_id"] as string | null) ?? undefined,
      target: r["intent_target_x"] != null ? {
        x: r["intent_target_x"] as number,
        y: r["intent_target_y"] as number,
        z: r["intent_target_z"] as number,
      } : undefined,
      atTick: r["intent_at_tick"] as number,
      mechanism: (r["intent_mechanism"] as KoiState["intent"]["mechanism"]) ?? undefined,
    },
    nextCognitionTick: r["next_cognition_tick"] as number,
    lastTwilightTick: r["last_twilight_tick"] as number,
    lastDeepSleepTick: r["last_deep_sleep_tick"] as number,
    microImportanceAccum: r["micro_importance_accum"] as number,
    drawnTo: r["drawn_target_id"] != null ? {
      targetId: r["drawn_target_id"] as string,
      noticing: r["drawn_noticing"] as string,
      atTick: r["drawn_at_tick"] as number,
    } : null,
    lastUtterance: (r["last_utterance"] as string | null) ?? null,
    lastUtteranceTick: r["last_utterance_tick"] as number,
    lastSpawningTick: (r["last_spawning_tick"] as number) ?? 0,
    // Runtime-only play-family state. Not persisted: the tag-chain
    // timeout is short (30 sim-seconds) so any chain will have ended
    // by the time we rehydrate; recentHeadings rebuilds on the next
    // kinematics ticks. Revisit if we ever want cross-restart dance
    // detection.
    recentHeadings: [],
    tagState: null,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Tiny utilities
// ───────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h || 1;
}

function distance2d(a: KoiState, b: KoiState): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Clamp a valence value to the plausible [-1, 1] range. Valence drifts
 *  small amounts per twilight; over many days it can approach ±1 but
 *  should never exceed. */
function clampToPlausible(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

/** Same as clampToPlausible but named for use by softBumpCard at class
 *  scope — a second function-valued alias so we can refer to it from
 *  the class method where `this.` binding doesn't apply to module-level
 *  functions. (Avoids the "class members can't shadow module functions"
 *  naming confusion.) */
function clampToPlausibleV(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function simpleHash(s: string): string {
  // Not cryptographic — cheap visitor correlation only.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h.toString(16).padStart(8, "0");
}
