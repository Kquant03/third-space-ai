import { describe, it, expect } from "vitest";
import {
  scoreMemories, diversifyTopK,
} from "../src/memory.js";
import {
  embeddingToBlob, blobToEmbedding, cosine,
} from "../src/embeddings.js";
import type { MemoryRow } from "../src/types.js";

// Helper — build a plausible memory row for testing.
function mkMem(
  id: number, content: string,
  opts: Partial<{
    koiId: string; importance: number; tick: number;
    valence: number; participants: string[];
    embedding: Float32Array;
  }> = {},
): MemoryRow {
  const emb = opts.embedding ?? new Float32Array(384).fill(0.1);
  return {
    id,
    koiId: opts.koiId ?? "self",
    kind: "observation",
    content,
    importance: opts.importance ?? 3,
    createdAtTick: opts.tick ?? 0,
    lastAccessedTick: opts.tick ?? 0,
    accessCount: 0,
    emotionalValence: opts.valence ?? 0,
    participants: opts.participants ?? [],
    embedding: emb.buffer.slice(0) as ArrayBuffer,
    validToTick: null,
    sourceMemoryIds: [],
  };
}

function unitVector(seed: number): Float32Array {
  const v = new Float32Array(384);
  // Simple deterministic generator — not cryptographic, just varied.
  let s = seed;
  for (let i = 0; i < 384; i++) {
    s = (s * 1664525 + 1013904223) | 0;
    v[i] = ((s >>> 8) / 0x1000000) * 2 - 1;
  }
  let n = 0;
  for (let i = 0; i < 384; i++) n += v[i]! * v[i]!;
  const m = Math.sqrt(n);
  for (let i = 0; i < 384; i++) v[i] = v[i]! / m;
  return v;
}

describe("embeddings — BLOB round-trip", () => {
  it("round-trips a 384-dim vector without loss", () => {
    const original = unitVector(42);
    const blob = embeddingToBlob(original);
    const restored = blobToEmbedding(blob);
    expect(restored.length).toBe(384);
    for (let i = 0; i < 384; i++) {
      expect(restored[i]).toBeCloseTo(original[i]!, 6);
    }
  });

  it("cosine of a vector with itself is 1", () => {
    const v = unitVector(7);
    expect(cosine(v, v)).toBeCloseTo(1, 6);
  });

  it("cosine of orthogonal vectors is 0", () => {
    const a = new Float32Array(384); a[0] = 1;
    const b = new Float32Array(384); b[1] = 1;
    expect(cosine(a, b)).toBeCloseTo(0);
  });

  it("rejects size mismatches", () => {
    expect(() => embeddingToBlob(new Float32Array(100))).toThrow();
    expect(() => blobToEmbedding(new ArrayBuffer(100))).toThrow();
  });
});

describe("memory — scoring", () => {
  it("Park formula — high relevance + high importance outranks others", () => {
    const q = unitVector(1);
    const similar = unitVector(1);       // cosine ≈ 1
    const orthogonalish = unitVector(99);
    const rows: MemoryRow[] = [
      mkMem(1, "highly relevant + low importance",
        { importance: 2, embedding: similar, tick: 0 }),
      mkMem(2, "less relevant + high importance",
        { importance: 10, embedding: orthogonalish, tick: 0 }),
      mkMem(3, "highly relevant + high importance",
        { importance: 9, embedding: similar, tick: 0 }),
    ];
    const scored = scoreMemories(rows, {
      queryEmbedding: q, nowTick: 0, tickHz: 2, visibleKoi: [],
    });
    // Row 3 should dominate
    const byScore = [...scored].sort((a, b) => b.totalScore - a.totalScore);
    expect(byScore[0]!.row.id).toBe(3);
  });

  it("social weight boosts memories involving visible koi", () => {
    const q = unitVector(2);
    const v = unitVector(2);
    const base: MemoryRow[] = [
      mkMem(10, "without participants",
        { embedding: v, tick: 0 }),
      mkMem(11, "with koi_42",
        { embedding: v, tick: 0, participants: ["koi_42"] }),
    ];
    const scored = scoreMemories(base, {
      queryEmbedding: q, nowTick: 0, tickHz: 2,
      visibleKoi: ["koi_42"],
    });
    const m10 = scored.find((s) => s.row.id === 10)!;
    const m11 = scored.find((s) => s.row.id === 11)!;
    expect(m11.totalScore).toBeGreaterThan(m10.totalScore);
  });

  it("recency decays with the 72h half-life", () => {
    const q = unitVector(3);
    const e = unitVector(3);
    const TICKS_PER_HOUR = 2 * 3600;
    // Three memories at 0h, 72h, 144h ago — nowTick is 144h.
    const now = 144 * TICKS_PER_HOUR;
    const rows: MemoryRow[] = [
      mkMem(100, "now", { embedding: e, tick: now }),
      mkMem(200, "72h ago",  { embedding: e, tick: now - 72  * TICKS_PER_HOUR }),
      mkMem(300, "144h ago", { embedding: e, tick: 0 }),
    ];
    const scored = scoreMemories(rows, {
      queryEmbedding: q, nowTick: now, tickHz: 2, visibleKoi: [],
    });
    const r100 = scored.find((s) => s.row.id === 100)!;
    const r200 = scored.find((s) => s.row.id === 200)!;
    const r300 = scored.find((s) => s.row.id === 300)!;
    expect(r100.recency).toBeCloseTo(1.0, 2);
    expect(r200.recency).toBeCloseTo(0.5, 2);
    expect(r300.recency).toBeCloseTo(0.25, 2);
  });
});

describe("memory — diversity rerank", () => {
  it("includes at least one high-emotion memory when available", () => {
    const q = unitVector(5);
    const e = unitVector(5);
    // 10 lukewarm topical rows + 1 strongly-emotional off-topic row
    const rows: MemoryRow[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(mkMem(i, `topical ${i}`,
        { embedding: e, importance: 3, valence: 0.1, tick: 0 }));
    }
    rows.push(mkMem(999, "storm — low valence",
      { embedding: unitVector(999), importance: 3, valence: -0.9, tick: 0 }));

    const scored = scoreMemories(rows, {
      queryEmbedding: q, nowTick: 0, tickHz: 2, visibleKoi: [],
    });
    const chosen = diversifyTopK(scored, 5, 0, 2);
    const ids = chosen.map((m) => m.id);
    expect(ids).toContain(999);
  });
});
