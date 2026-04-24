// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · kernel + species
//  ─────────────────────────────────────────────────────────────────────────
//  All the field-setup utilities shared with the base Lenia module, plus
//  `placeSeed` — the channel-aware seed placement used by buildEcosystem.
//
//  We could reuse the base Lenia's kernel.ts directly here, but Lenia
//  Expanded needs multi-peak kernels (for the predator's ring structure
//  and the morphogen's wide diffusion profile) and its placeSeed takes a
//  channel argument instead of writing into channels 0 and 1. Keeping
//  these local avoids leaking an expanded API into the simpler module.
// ═══════════════════════════════════════════════════════════════════════════

import { N, KS, KC } from "./shaders";

// ─── Kernel core ─────────────────────────────────────────────────────────
export function kernelCore(r: number): number {
  if (r <= 0 || r >= 1) return 0;
  return Math.exp(4 - 4 / (4 * r * (1 - r)));
}

/**
 * Build the RGBA32F kernel texture for a multi-ring kernel. `peaks` is
 * the β vector: each entry is a ring amplitude. Prey uses [1], predator
 * uses [1/3, 2/3, 1] (ignis-like multi-peak), morphogen uses [1, 0.5, 0.1]
 * (wide-diffuse profile).
 */
export function buildKernel(R: number, peaks: number[]): Float32Array {
  const data = new Float32Array(KS * KS * 4);
  const B = peaks.length;
  let sum = 0;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const r = Math.sqrt(dx * dx + dy * dy) / R;
      if (r >= 1 || r <= 0) continue;
      const ri = Math.min(Math.floor(r * B), B - 1);
      const k = peaks[ri] * kernelCore(r * B - ri);
      data[((KC + dy) * KS + (KC + dx)) * 4] = k;
      sum += k;
    }
  }
  if (sum > 0) {
    for (let i = 0; i < KS * KS; i++) data[i * 4] /= sum;
  }
  return data;
}

// ─── RLE decoder ─────────────────────────────────────────────────────────

export function decodeRLE(str: string): number[][] {
  const rows = str.replace(/!$/, "").split("$");
  const grid: number[][] = [];
  let maxVal = 0;
  let maxW = 0;
  for (const row of rows) {
    const cells: number[] = [];
    let i = 0;
    while (i < row.length) {
      let count = 0;
      while (i < row.length && row[i] >= "0" && row[i] <= "9") {
        count = count * 10 + row.charCodeAt(i) - 48;
        i++;
      }
      if (!count) count = 1;
      if (i >= row.length) break;
      let val = 0;
      if (row[i] === ".") {
        i++;
      } else if (row[i] >= "p" && row[i] <= "y") {
        val = (row.charCodeAt(i) - 111) * 26;
        i++;
        if (i < row.length && row[i] >= "A" && row[i] <= "Z") {
          val += row.charCodeAt(i) - 64;
          i++;
        }
      } else if (row[i] >= "A" && row[i] <= "Z") {
        val = row.charCodeAt(i) - 64;
        i++;
      } else {
        i++;
        continue;
      }
      for (let j = 0; j < count; j++) cells.push(val);
      if (val > maxVal) maxVal = val;
    }
    grid.push(cells);
    if (cells.length > maxW) maxW = cells.length;
  }
  for (const r of grid) while (r.length < maxW) r.push(0);
  if (maxVal > 0) {
    for (const r of grid) for (let j = 0; j < r.length; j++) r[j] /= maxVal;
  }
  return grid;
}

// ─── Species seeds ────────────────────────────────────────────────────────

export const ORBIUM_RLE =
  "7.MD6.qL$6.pKqEqFURpApBRAqQ$5.VqTrSsBrOpXpWpTpWpUpCrQ$4.CQrQsTsWsApITNPpGqGvL$3.IpIpWrOsGsBqXpJ4.LsFrL$A.DpKpSpJpDqOqUqSqE5.ExD$qL.pBpTT2.qCrGrVrWqM5.sTpP$.pGpWpD3.qUsMtItQtJ6.tL$.uFqGH3.pXtOuR2vFsK5.sM$.tUqL4.GuNwAwVxBwNpC4.qXpA$2.uH5.vBxGyEyMyHtW4.qIpL$2.wV5.tIyG3yOxQqW2.FqHpJ$2.tUS4.rM2yOyJyOyHtVpPMpFqNV$2.HsR4.pUxAyOxLxDxEuVrMqBqGqKJ$3.sLpE3.pEuNxHwRwGvUuLsHrCqTpR$3.TrMS2.pFsLvDvPvEuPtNsGrGqIP$4.pRqRpNpFpTrNtGtVtStGsMrNqNpF$5.pMqKqLqRrIsCsLsIrTrFqJpHE$6.RpSqJqPqVqWqRqKpRXE$8.OpBpIpJpFTK!";

export const IGNIS_RLE =
  "10.IPQMF$8.pKpRpSpTpWpUpQpBM$6.XqGV2DSpSqNqQqKpPSB$5.qBpX5.pOrHrSrMqSpTS$4.qCpQ6.rAtAtDsPrSqTpRP$4.rD6.pUuDuQtWtLsPrNqMpHA$3.uG7.uGwQvCuFuAtFrSqQpTN$2.vAL6.rKyFxLvIvBuTsXqWqFqAU$.tXqB7.wGyOyLxHwVuPqWpEpCpTpA$rDMpO6.sOxFyL2yOwDqR2.EpJpD$.WpH5.pIvNwSxQxXvEpD4.pFW$.pApM5.tUvCvUwEsI6.pOM$.TpPU3.sHtOuJuQqC7.qH$.HpJpPXIrKsFsStBpV7.pApH$2.MpGpMsStHsSrXqU8.rP$3.GrJtPuHtHrD8.sH$3.GrOsXtLsSU7.sC$4.pPrQrJpHpOQ5.qXT$5.pK.JpHpOWOQpMqHqG$8.KpEpMpQpLVqU$13.qD$12.pB!";

// ─── Seed scaling ─────────────────────────────────────────────────────────

export function scaleSeed(
  cells: number[][],
  fromR: number,
  toR: number,
): number[][] {
  if (fromR === toR) return cells;
  const sc = toR / fromR;
  const oh = cells.length;
  const ow = cells[0].length;
  const nh = Math.round(oh * sc);
  const nw = Math.round(ow * sc);
  const out: number[][] = [];
  for (let y = 0; y < nh; y++) {
    const row: number[] = [];
    for (let x = 0; x < nw; x++) {
      const sy = y / sc;
      const sx = x / sc;
      const y0 = Math.floor(sy);
      const x0 = Math.floor(sx);
      const y1 = Math.min(y0 + 1, oh - 1);
      const x1 = Math.min(x0 + 1, ow - 1);
      const fy = sy - y0;
      const fx = sx - x0;
      row.push(
        cells[y0][x0] * (1 - fx) * (1 - fy) +
          cells[y0][x1] * fx * (1 - fy) +
          cells[y1][x0] * (1 - fx) * fy +
          cells[y1][x1] * fx * fy,
      );
    }
    out.push(row);
  }
  return out;
}

// ─── Channel-aware seed placement ─────────────────────────────────────────
/**
 * Place a seed grid at (cx, cy) on the N×N torus into a specific channel
 * of the RGBA32F state buffer. Channel 0 = prey, 1 = predator, 2 =
 * morphogen, 3 = 4D. Uses `Math.max` merge so overlapping placements
 * respect whatever was already there.
 */
export function placeSeed(
  data: Float32Array,
  seed: number[][],
  cx: number,
  cy: number,
  channel: 0 | 1 | 2 | 3,
): void {
  const h = seed.length;
  const w = seed[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (((cx - Math.floor(w / 2) + x) % N) + N) % N;
      const gy = (((cy - Math.floor(h / 2) + y) % N) + N) % N;
      const idx = (gy * N + gx) * 4 + channel;
      data[idx] = Math.max(data[idx], seed[y][x]);
    }
  }
}
