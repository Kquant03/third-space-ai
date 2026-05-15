// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Memory (§ VI)
//  ─────────────────────────────────────────────────────────────────────────
//  Park et al. ("Generative Agents", 2023) with three refinements:
//
//    1. Social and emotional terms added to the scoring formula. Memories
//       involving a currently-visible fish get a social boost; memories
//       with strong valence get an emotional boost.
//
//    2. Bitemporality on beliefs (valid_to_tick), so superseded beliefs
//       remain queryable for research rather than being deleted.
//
//    3. Ebbinghaus reinforcement: every retrieval updates last_accessed
//       and access_count, so memories that get used stay salient while
//       memories that don't use fade.
//
//  Retrieval is a linear scan of one koi's rows — at most ~3000 rows per
//  elder, ~4.6 MB of embedding data, scoring in under 5 ms per query.
//  Vectorize adds network latency at this scale with no benefit.
//
//  The scoring formula:
//
//     score = 1.0·relevance + 0.8·importance + 0.5·recency
//           + 0.3·social   + 0.4·emotional
//
//  Diversity rerank on top-k selection enforces: at least one high-
//  emotion memory, at least two recent, at least three topically
//  relevant. This keeps the context from collapsing onto a single axis.
// ═══════════════════════════════════════════════════════════════════════════

import { MEMORY } from "./constants.js";
import { blobToEmbedding, embeddingToBlob } from "./embeddings.js";
import type { KoiId, LifeStage, MemoryKind, MemoryRow, SimTick } from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Row → in-memory shape
// ───────────────────────────────────────────────────────────────────

function rowToMemory(r: Record<string, unknown>): MemoryRow {
  const embeddingBlob = r["embedding"] as ArrayBuffer;
  return {
    id: r["id"] as number,
    koiId: r["koi_id"] as KoiId,
    kind: r["kind"] as MemoryKind,
    content: r["content"] as string,
    importance: r["importance"] as number,
    createdAtTick: r["created_at_tick"] as number,
    lastAccessedTick: r["last_accessed_tick"] as number,
    accessCount: r["access_count"] as number,
    emotionalValence: r["emotional_valence"] as number,
    participants: JSON.parse(r["participants_json"] as string) as KoiId[],
    embedding: embeddingBlob,
    validToTick: (r["valid_to_tick"] as number | null) ?? null,
    sourceMemoryIds: JSON.parse(r["source_memory_ids_json"] as string) as number[],
  };
}

// ───────────────────────────────────────────────────────────────────
//  Write
// ───────────────────────────────────────────────────────────────────

export interface MemoryWriteInit {
  koiId: KoiId;
  kind: MemoryKind;
  content: string;
  importance: number;
  createdAtTick: SimTick;
  emotionalValence: number;
  participants: KoiId[];
  embedding: Float32Array;
  sourceMemoryIds?: number[];
}

/** Insert one memory row. Returns the new row's id. */
export function writeMemoryRow(
  sql: SqlStorage,
  init: MemoryWriteInit,
): number {
  const blob = embeddingToBlob(init.embedding);
  const cursor = sql.exec(
    `INSERT INTO memory (
      koi_id, kind, content, importance, created_at_tick,
      last_accessed_tick, access_count, emotional_valence,
      participants_json, embedding, valid_to_tick, source_memory_ids_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    RETURNING id`,
    init.koiId, init.kind, init.content, init.importance, init.createdAtTick,
    init.createdAtTick, 0, init.emotionalValence,
    JSON.stringify(init.participants), blob,
    JSON.stringify(init.sourceMemoryIds ?? []),
  );
  const rows = cursor.toArray();
  const firstRow = rows[0];
  if (!firstRow) throw new Error("memory insert returned no id");
  return firstRow["id"] as number;
}

/** Supersede a belief — bitemporal close. Does not delete. */
export function closeBelief(
  sql: SqlStorage, memoryId: number, atTick: SimTick,
): void {
  sql.exec(
    `UPDATE memory SET valid_to_tick = ? WHERE id = ? AND valid_to_tick IS NULL`,
    atTick, memoryId,
  );
}

// ───────────────────────────────────────────────────────────────────
//  Load all of one koi's memories into RAM
//
//  Called once per cognition cycle. The row shape includes the BLOB
//  for embeddings so we can score without another round trip.
// ───────────────────────────────────────────────────────────────────

export function loadKoiMemories(
  sql: SqlStorage, koiId: KoiId,
): MemoryRow[] {
  const rows = sql.exec(
    `SELECT id, koi_id, kind, content, importance,
            created_at_tick, last_accessed_tick, access_count,
            emotional_valence, participants_json, embedding,
            valid_to_tick, source_memory_ids_json
       FROM memory WHERE koi_id = ?
       ORDER BY created_at_tick DESC`,
    koiId,
  ).toArray();
  return rows.map(rowToMemory);
}

// ───────────────────────────────────────────────────────────────────
//  Scoring
// ───────────────────────────────────────────────────────────────────

function cosineOnBlob(a: ArrayBuffer, b: Float32Array): number {
  const av = blobToEmbedding(a);
  if (av.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < av.length; i++) {
    const ai = av[i]!, bi = b[i]!;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

function recencyScore(memTick: SimTick, nowTick: SimTick, tickHz: number): number {
  const dtHours = (nowTick - memTick) / (tickHz * 3600);
  // True half-life: 0.5^(Δh / 72) so at 72h the score is exactly 0.5,
  // at 144h it is 0.25, etc. Matches the name on the constant, and is
  // slightly less aggressive than Park et al.'s 0.99^Δh (half-life ~69h).
  return Math.pow(0.5, dtHours / MEMORY.recencyHalfLifeHours);
}

export interface ScoringContext {
  queryEmbedding: Float32Array;
  nowTick: SimTick;
  tickHz: number;
  /** Koi ids currently visible to the self. Used for the social boost. */
  visibleKoi: KoiId[];
}

interface ScoredMemory {
  row: MemoryRow;
  totalScore: number;
  relevance: number;
  importanceNorm: number;
  recency: number;
  social: number;
  emotional: number;
}

export function scoreMemories(
  memories: readonly MemoryRow[],
  ctx: ScoringContext,
): ScoredMemory[] {
  const visibleSet = new Set(ctx.visibleKoi);
  const out: ScoredMemory[] = [];
  for (const m of memories) {
    // Beliefs that have been superseded are not retrieved.
    if (m.kind === "belief" && m.validToTick !== null) continue;

    const relevance = cosineOnBlob(m.embedding, ctx.queryEmbedding);
    const importanceNorm = m.importance / 10;
    const recency = recencyScore(m.createdAtTick, ctx.nowTick, ctx.tickHz);

    const socialHit = m.participants.some((p) => visibleSet.has(p));
    const social = socialHit ? 1 : 0;

    const emotional = Math.abs(m.emotionalValence);

    const totalScore =
      MEMORY.weights.relevance  * relevance +
      MEMORY.weights.importance * importanceNorm +
      MEMORY.weights.recency    * recency +
      MEMORY.weights.social     * social +
      MEMORY.weights.emotional  * emotional;

    out.push({ row: m, totalScore, relevance, importanceNorm, recency, social, emotional });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
//  Diversity rerank — ensures the returned set is not flatly
//  top-relevance-dominated
// ───────────────────────────────────────────────────────────────────

const HIGH_EMOTION_THRESHOLD = 0.5;
const RECENT_HOURS = 12;

function isRecent(
  m: MemoryRow, nowTick: SimTick, tickHz: number,
): boolean {
  const dtHours = (nowTick - m.createdAtTick) / (tickHz * 3600);
  return dtHours < RECENT_HOURS;
}

/**
 * Select up to `k` memories from scored candidates, with diversity
 * guarantees (§ VI): ≥1 high-emotion, ≥2 recent, ≥3 topically relevant.
 * If the pool is too small to satisfy a quota, we take what's available.
 */
export function diversifyTopK(
  scored: ScoredMemory[],
  k: number,
  nowTick: SimTick,
  tickHz: number,
): MemoryRow[] {
  const byScore = [...scored].sort((a, b) => b.totalScore - a.totalScore);
  const chosen: ScoredMemory[] = [];
  const chosenIds = new Set<number>();

  const quotas = [
    // Order matters: narrowest quota first. With k=4 (fry) and 1+2+3=6
    // nominal quota positions, only the earliest quotas are guaranteed to
    // fire. Emotional memories are the narrowest pool and the most at
    // risk of being crowded out by topical matches, so they go first.
    { needed: 1, name: "emotional",
      pass: (s: ScoredMemory) => s.emotional > HIGH_EMOTION_THRESHOLD },
    { needed: 2, name: "recent",
      pass: (s: ScoredMemory) => isRecent(s.row, nowTick, tickHz) },
    { needed: 3, name: "topical",
      pass: (s: ScoredMemory) => s.relevance > 0.35 },
  ];

  // Fulfill quotas first
  for (const q of quotas) {
    let got = 0;
    for (const s of byScore) {
      if (got >= q.needed) break;
      if (chosen.length >= k) break;
      if (chosenIds.has(s.row.id)) continue;
      if (q.pass(s)) {
        chosen.push(s);
        chosenIds.add(s.row.id);
        got++;
      }
    }
  }

  // Fill remainder with top-score regardless
  for (const s of byScore) {
    if (chosen.length >= k) break;
    if (chosenIds.has(s.row.id)) continue;
    chosen.push(s);
    chosenIds.add(s.row.id);
  }

  return chosen.map((c) => c.row);
}

// ───────────────────────────────────────────────────────────────────
//  Reinforcement on retrieval (Ebbinghaus — § VI)
// ───────────────────────────────────────────────────────────────────

export function reinforce(
  sql: SqlStorage, ids: number[], nowTick: SimTick,
): void {
  if (ids.length === 0) return;
  // Single SQL call with an IN() clause, chunked conservatively.
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const placeholders = chunk.map(() => "?").join(",");
    sql.exec(
      `UPDATE memory
          SET last_accessed_tick = ?,
              access_count = access_count + 1
        WHERE id IN (${placeholders})`,
      nowTick, ...chunk,
    );
  }
}

// ───────────────────────────────────────────────────────────────────
//  Public entry point — compose the full retrieval pipeline
// ───────────────────────────────────────────────────────────────────

export interface RetrieveOptions {
  koiId: KoiId;
  /** Stage-specific upper bound on retrieved count. */
  stage: LifeStage;
  queryEmbedding: Float32Array;
  nowTick: SimTick;
  tickHz: number;
  visibleKoi: KoiId[];
  /** Optional set of koi ids the requester has a consolidated bond with.
   *  When present, the retrieval scorer biases recall toward memories
   *  referencing these partners — including bonded partners not
   *  currently in visibleKoi, so memory is not gated on co-presence.
   *  Built upstream from relationship_card rows whose bondIntensity
   *  clears BOND_BIAS_THRESHOLD (0.4 in pond-do.ts). Absent means
   *  "no bond bias applied" — the legacy behavior. */
  bondedPartners?: Set<KoiId>;
}

export function retrieveMemories(
  sql: SqlStorage, opts: RetrieveOptions,
): MemoryRow[] {
  const pool = loadKoiMemories(sql, opts.koiId);
  if (pool.length === 0) return [];

  const scored = scoreMemories(pool, {
    queryEmbedding: opts.queryEmbedding,
    nowTick: opts.nowTick,
    tickHz: opts.tickHz,
    visibleKoi: opts.visibleKoi,
  });

  const k = MEMORY.maxRetrievedPerTier[opts.stage] ?? 8;
  const chosen = diversifyTopK(scored, k, opts.nowTick, opts.tickHz);
  reinforce(sql, chosen.map((m) => m.id), opts.nowTick);
  return chosen;
}

// ───────────────────────────────────────────────────────────────────
//  Archive pruning (§ VI — "Cap on total memory rows per koi before
//  archive pruning")
//
//  When a koi has more than maxRowsPerKoi rows, we delete the lowest-
//  value rows — lowest importance × recency × access_count. Rows that
//  are cited as sources by other reflections are preserved.
// ───────────────────────────────────────────────────────────────────

export function pruneIfNeeded(
  sql: SqlStorage, koiId: KoiId, nowTick: SimTick, tickHz: number,
): number {
  const count = (sql.exec(
    `SELECT COUNT(*) AS n FROM memory WHERE koi_id = ?`, koiId,
  ).toArray()[0]?.["n"] as number) ?? 0;

  if (count <= MEMORY.maxRowsPerKoi) return 0;
  const over = count - MEMORY.maxRowsPerKoi;

  // Naive scoring. Could be refined; this is good enough for Stage 1.
  const rows = sql.exec(
    `SELECT id, importance, created_at_tick, access_count,
            source_memory_ids_json
       FROM memory
      WHERE koi_id = ?
        AND valid_to_tick IS NULL
        AND kind NOT IN ('belief', 'notable_episode')`,
    koiId,
  ).toArray();

  const cited = new Set<number>();
  for (const r of rows) {
    const ids = JSON.parse(r["source_memory_ids_json"] as string) as number[];
    for (const i of ids) cited.add(i);
  }

  const scored = rows
    .filter((r) => !cited.has(r["id"] as number))
    .map((r) => {
      const imp = (r["importance"] as number) / 10;
      const rec = recencyScore(r["created_at_tick"] as number, nowTick, tickHz);
      const acc = Math.log1p(r["access_count"] as number);
      return {
        id: r["id"] as number,
        score: imp * (1 + rec) * (1 + acc),
      };
    })
    .sort((a, b) => a.score - b.score);

  const toPrune = scored.slice(0, over).map((s) => s.id);
  if (toPrune.length > 0) {
    const placeholders = toPrune.map(() => "?").join(",");
    sql.exec(`DELETE FROM memory WHERE id IN (${placeholders})`, ...toPrune);
  }
  return toPrune.length;
}
