// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Embeddings (§ VI)
//  ─────────────────────────────────────────────────────────────────────────
//  Every memory row carries a 384-dim embedding from Cloudflare Workers AI's
//  `@cf/baai/bge-small-en-v1.5` model. At scale (a full elder, ~3000 rows),
//  the whole embedding set weighs 4.6 MB — fits comfortably in RAM for the
//  in-DO cosine scan. No Vectorize.
//
//  BGE is a symmetric model (same encoder for queries and documents), so
//  we do not prepend the "Represent this document for retrieval:" prefix
//  that older models required.
//
//  Pricing at the free tier: 10,000 calls/day. At steady-state five adults
//  writing ~40 memories/day each (observations + reflections), we stay
//  under 200 calls/day and well inside the ceiling. This is not something
//  to worry about.
// ═══════════════════════════════════════════════════════════════════════════

import { MEMORY } from "./constants.js";

const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5" as const;

// Workers AI binding shape — the upstream types live in cloudflare's
// auto-generated types. Keep this interface minimal and local so the
// module is self-contained for unit tests that mock it.
interface AiLike {
  run(model: string, input: { text: string | string[] }): Promise<{
    shape?: number[];
    data: number[][] | Float32Array[];
  }>;
}

// ───────────────────────────────────────────────────────────────────
//  Embedding → BLOB and back
// ───────────────────────────────────────────────────────────────────

/** Convert a Float32Array of exactly 384 dims into a persistable BLOB. */
export function embeddingToBlob(vec: Float32Array | number[]): ArrayBuffer {
  if (vec.length !== MEMORY.embeddingDim) {
    throw new Error(
      `Embedding dim mismatch: expected ${MEMORY.embeddingDim}, got ${vec.length}`,
    );
  }
  const f32 = vec instanceof Float32Array ? vec : Float32Array.from(vec);
  // Slice so we return a tight-fitting buffer, not one with stride padding.
  // Cast away SharedArrayBuffer — Workers AI returns owned ArrayBuffers.
  return f32.buffer.slice(
    f32.byteOffset, f32.byteOffset + f32.byteLength,
  ) as ArrayBuffer;
}

/** Read a SQLite BLOB back into a Float32Array view. */
export function blobToEmbedding(blob: ArrayBuffer): Float32Array {
  if (blob.byteLength !== MEMORY.embeddingDim * 4) {
    throw new Error(
      `Embedding blob size mismatch: expected ${MEMORY.embeddingDim * 4} bytes, got ${blob.byteLength}`,
    );
  }
  return new Float32Array(blob);
}

// ───────────────────────────────────────────────────────────────────
//  Embed
// ───────────────────────────────────────────────────────────────────

/**
 * Produce a 384-dim embedding for a single text input. Returns a
 * Float32Array you can pass to embeddingToBlob for storage, or to
 * `cosine()` for retrieval scoring.
 */
export async function embed(
  ai: AiLike, text: string,
): Promise<Float32Array> {
  const truncated = text.slice(0, 2000); // guard against pathological inputs
  const result = await ai.run(EMBED_MODEL, { text: truncated });
  const raw = result.data[0];
  if (!raw) throw new Error("Workers AI returned no embedding data");

  // The binding has returned plain number[] historically; Float32Array
  // more recently. Normalize to Float32Array.
  const vec = raw instanceof Float32Array ? raw : Float32Array.from(raw);
  if (vec.length !== MEMORY.embeddingDim) {
    throw new Error(
      `Unexpected embedding shape: ${vec.length} dims (model reconfigured?)`,
    );
  }
  return vec;
}

/** Batch embed — a single API call for multiple texts. */
export async function embedBatch(
  ai: AiLike, texts: string[],
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const result = await ai.run(EMBED_MODEL, {
    text: texts.map((t) => t.slice(0, 2000)),
  });
  return result.data.map((raw) =>
    raw instanceof Float32Array ? raw : Float32Array.from(raw as number[]),
  );
}

// ───────────────────────────────────────────────────────────────────
//  Cosine similarity
//
//  BGE embeddings are L2-normalized on output, so dot product equals
//  cosine similarity. We still divide by norms defensively — cheap.
// ───────────────────────────────────────────────────────────────────

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!, bi = b[i]!;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}
