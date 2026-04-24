// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · kernel + species
//  ─────────────────────────────────────────────────────────────────────────
//  All the field-setup logic that prepares GPU textures before simulation
//  begins: the Lenia convolution kernel, the RLE species library, the
//  seed-scaling interpolator, and the initial-state layout routine.
//
//  After: Chan (2018); Chan & Heiney "Lenia Expanded Universe" (2020).
//  Ghost Species seeds re-use the Ignis variant but in loosened σ — the
//  paper-load-bearing idea that a creature can remember a shape it can
//  never hold.
// ═══════════════════════════════════════════════════════════════════════════

import { N, KERNEL_TEX_SIZE, KERNEL_CENTER } from "./shaders";

// ─── Kernel builder ───────────────────────────────────────────────────────

/**
 * The core kernel shape. A bump function centered at r=0.5 that goes
 * smoothly to zero at r=0 and r=1. Normalised inside `buildKernelData`,
 * so the absolute scale here is irrelevant.
 */
export function kernelCore(r: number): number {
  if (r <= 0 || r >= 1) return 0;
  return Math.exp(4 - 4 / (4 * r * (1 - r)));
}

/**
 * Build the RGBA32F kernel texture data. `peaks` is an array of per-ring
 * amplitudes for multi-ring kernels; classic Orbium uses [1], expanded
 * universe variants may use multi-peak.
 */
export function buildKernelData(R: number, peaks: number[]): Float32Array {
  const S = KERNEL_TEX_SIZE;
  const C = KERNEL_CENTER;
  const B = peaks.length;
  const data = new Float32Array(S * S * 4);
  let sum = 0;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const r = Math.sqrt(dx * dx + dy * dy) / R;
      if (r >= 1 || r <= 0) continue;
      const ri = Math.min(Math.floor(r * B), B - 1);
      const lr = r * B - ri;
      const k = peaks[ri] * kernelCore(lr);
      data[((C + dy) * S + (C + dx)) * 4] = k;
      sum += k;
    }
  }
  if (sum > 0) {
    for (let i = 0; i < S * S; i++) data[i * 4] /= sum;
  }
  return data;
}

// ─── RLE decoder ──────────────────────────────────────────────────────────

/**
 * Decode an RLE-encoded Lenia species into a 2D array of floats in [0, 1].
 * Format: digits for run-length; letters for intensity (A=1..Z=26, then
 * p-y are base multipliers of 26 composed with A-Z); '.' zero; '$' row
 * separator; '!' string terminator.
 */
export function decodeRLE(str: string): number[][] {
  const rows = str.replace(/!$/, "").split("$");
  const grid: number[][] = [];
  let maxVal = 0;
  let maxWidth = 0;
  for (const row of rows) {
    const cells: number[] = [];
    let i = 0;
    while (i < row.length) {
      let count = 0;
      while (i < row.length && row[i] >= "0" && row[i] <= "9") {
        count = count * 10 + row.charCodeAt(i) - 48;
        i++;
      }
      if (count === 0) count = 1;
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
    if (cells.length > maxWidth) maxWidth = cells.length;
  }
  for (const row of grid) while (row.length < maxWidth) row.push(0);
  if (maxVal > 0) {
    for (const row of grid) {
      for (let j = 0; j < row.length; j++) row[j] /= maxVal;
    }
  }
  return grid;
}

// ─── Species library ──────────────────────────────────────────────────────

export type SpeciesKey =
  | "orbium"
  | "bicaudatus"
  | "ignis"
  | "bicaudatus_ignis";

export const SPECIES_RLE: Record<SpeciesKey, string> = {
  orbium:
    "7.MD6.qL$6.pKqEqFURpApBRAqQ$5.VqTrSsBrOpXpWpTpWpUpCrQ$4.CQrQsTsWsApITNPpGqGvL$3.IpIpWrOsGsBqXpJ4.LsFrL$A.DpKpSpJpDqOqUqSqE5.ExD$qL.pBpTT2.qCrGrVrWqM5.sTpP$.pGpWpD3.qUsMtItQtJ6.tL$.uFqGH3.pXtOuR2vFsK5.sM$.tUqL4.GuNwAwVxBwNpC4.qXpA$2.uH5.vBxGyEyMyHtW4.qIpL$2.wV5.tIyG3yOxQqW2.FqHpJ$2.tUS4.rM2yOyJyOyHtVpPMpFqNV$2.HsR4.pUxAyOxLxDxEuVrMqBqGqKJ$3.sLpE3.pEuNxHwRwGvUuLsHrCqTpR$3.TrMS2.pFsLvDvPvEuPtNsGrGqIP$4.pRqRpNpFpTrNtGtVtStGsMrNqNpF$5.pMqKqLqRrIsCsLsIrTrFqJpHE$6.RpSqJqPqVqWqRqKpRXE$8.OpBpIpJpFTK!",
  bicaudatus:
    "14.B$8.pKT$5.pIQJrIqT2pIVL.sC$5.qJrDpPqWrV3pPpUpPtG$4.pArAsHpPpIqTpK2.JpNrDrX$3.pApUpKqRpA.qHpX4.VxM$qM.QpUV.pPqCBqCrSL4.tLT$.OpPpF2.qErXqJrGtTtD4.EuA$.tJqEB2.pItJtBsC2vEpF4.tL$.wDpU4.uNvJtJvExEuP4.rNJ$.tGqC4.vMxHvMvRyOyIqM3.qOV$2.tV4.uFyIwVuFwQyOuKO.OqJQ$2.vM4.rXyOwVtBuCxUwIrApDpKqJG$2.sCpX3.qMyBxHuCtVwAvWsKqMqHpX$2.BrVJ2.pUvBwXvBuKuXuPsPrGqMT$3.qCqOVOpUsRvBuUuCtVtGsCqWpN$4.pXqOqEqMrStBtJtBsPrSqTpNG$5.pDqHqRrDrNrQrLqWqHpIG$6.EVpKpPpSpNpFOB$9.BEB!",
  ignis:
    "10.IPQMF$8.pKpRpSpTpWpUpQpBM$6.XqGV2DSpSqNqQqKpPSB$5.qBpX5.pOrHrSrMqSpTS$4.qCpQ6.rAtAtDsPrSqTpRP$4.rD6.pUuDuQtWtLsPrNqMpHA$3.uG7.uGwQvCuFuAtFrSqQpTN$2.vAL6.rKyFxLvIvBuTsXqWqFqAU$.tXqB7.wGyOyLxHwVuPqWpEpCpTpA$rDMpO6.sOxFyL2yOwDqR2.EpJpD$.WpH5.pIvNwSxQxXvEpD4.pFW$.pApM5.tUvCvUwEsI6.pOM$.TpPU3.sHtOuJuQqC7.qH$.HpJpPXIrKsFsStBpV7.pApH$2.MpGpMsStHsSrXqU8.rP$3.GrJtPuHtHrD8.sH$3.GrOsXtLsSU7.sC$4.pPrQrJpHpOQ5.qXT$5.pK.JpHpOWOQpMqHqG$8.KpEpMpQpLVqU$13.qD$12.pB!",
  bicaudatus_ignis:
    "11.pTpS$8.sMuWpVpEN$5.pHsUS3.N2pDK$3.DqEQ7.RpJQ$2.EpMB9.VpLN$2.pMH10.DpPrPqA$.RpF9.pAqJqIrOrKK$.pEpFB4.HsBvAuHsOpT.RqDX$.pNpP2pGqNtTxFyNxGuTsFpJ2.FqXsEpW$BpQqLrHsXvOwVvXuRtRrQqSqNqHqWqFqQpOG$BpNqTsFtQuItH2rRtNuCvBuRsNpD.JpLL$.pEqOrTsUtEtBtCuWyDxKvGpA4.pJK$.PqCrKsLtRvBwSyFvGpA5.ApHG$.IpOqUsBtFtWtBpI7.QpB$2.WqHrBqUpN9.pJO$2.FpNqGpMD8.pHpMqP$3.KpPpNK7.sBuD$4.EpEpITF2ApFsTrX$6.DVpJpRpLB!",
};

/**
 * Hand-coded Orbium seed used as a fallback if the RLE string fails to
 * decode.
 */
export const ORBIUM_FALLBACK: number[][] = [
  [0, 0, 0, 0, 0, 0, 0.1, 0.14, 0.1, 0, 0, 0.03, 0.03, 0, 0, 0.3, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0.08, 0.24, 0.3, 0.3, 0.18, 0.14, 0.15, 0.16, 0.15, 0.09, 0.2, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0.15, 0.34, 0.44, 0.46, 0.38, 0.18, 0.14, 0.11, 0.13, 0.19, 0.18, 0.45, 0, 0, 0],
  [0, 0, 0, 0, 0.06, 0.13, 0.39, 0.5, 0.5, 0.37, 0.06, 0, 0, 0, 0.02, 0.16, 0.68, 0, 0, 0],
  [0, 0, 0, 0.11, 0.17, 0.17, 0.33, 0.4, 0.38, 0.28, 0.14, 0, 0, 0, 0, 0, 0.18, 0.42, 0, 0],
  [0, 0, 0.09, 0.18, 0.13, 0.06, 0.08, 0.26, 0.32, 0.32, 0.27, 0, 0, 0, 0, 0, 0, 0.82, 0, 0],
  [0.27, 0, 0.16, 0.12, 0, 0, 0, 0.25, 0.38, 0.44, 0.45, 0.34, 0, 0, 0, 0, 0, 0.22, 0.17, 0],
  [0, 0.07, 0.2, 0.02, 0, 0, 0, 0.31, 0.48, 0.57, 0.6, 0.57, 0, 0, 0, 0, 0, 0, 0.49, 0],
  [0, 0.59, 0.19, 0, 0, 0, 0, 0.2, 0.57, 0.69, 0.76, 0.76, 0.49, 0, 0, 0, 0, 0, 0.36, 0],
  [0, 0.58, 0.19, 0, 0, 0, 0, 0, 0.67, 0.83, 0.9, 0.92, 0.87, 0.12, 0, 0, 0, 0, 0.22, 0.07],
  [0, 0, 0.46, 0, 0, 0, 0, 0, 0.7, 0.93, 1, 1, 1, 0.61, 0, 0, 0, 0, 0.18, 0.11],
  [0, 0, 0.82, 0, 0, 0, 0, 0, 0.47, 1, 1, 0.98, 1, 0.96, 0.27, 0, 0, 0, 0.19, 0.1],
  [0, 0, 0.46, 0, 0, 0, 0, 0, 0.25, 1, 1, 0.84, 0.92, 0.97, 0.54, 0.14, 0.04, 0.1, 0.21, 0.05],
  [0, 0, 0, 0.4, 0, 0, 0, 0, 0.09, 0.8, 1, 0.82, 0.8, 0.85, 0.63, 0.31, 0.18, 0.19, 0.2, 0.01],
  [0, 0, 0, 0.36, 0.1, 0, 0, 0, 0.05, 0.54, 0.86, 0.79, 0.74, 0.72, 0.6, 0.39, 0.28, 0.24, 0.13, 0],
  [0, 0, 0, 0.01, 0.3, 0.07, 0, 0, 0.08, 0.36, 0.64, 0.7, 0.64, 0.6, 0.51, 0.39, 0.29, 0.19, 0.04, 0],
  [0, 0, 0, 0, 0.1, 0.24, 0.14, 0.1, 0.15, 0.29, 0.45, 0.53, 0.52, 0.46, 0.4, 0.31, 0.21, 0.08, 0, 0],
  [0, 0, 0, 0, 0, 0.08, 0.21, 0.21, 0.22, 0.29, 0.36, 0.39, 0.37, 0.33, 0.26, 0.18, 0.09, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0.03, 0.13, 0.19, 0.22, 0.24, 0.24, 0.23, 0.18, 0.13, 0.05, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.06, 0.08, 0.09, 0.07, 0.05, 0.01, 0, 0, 0, 0, 0],
];

// ─── Seed scaler ──────────────────────────────────────────────────────────
/**
 * Bilinearly scale a seed grid from one kernel radius to another. Lenia
 * species are self-similar under radius rescaling (at fixed μ, σ), so
 * this lets us instantiate the same species at different R.
 */
export function scaleSeed(
  cells: number[][],
  fromR: number,
  toR: number,
): number[][] {
  if (fromR === toR) return cells;
  const scale = toR / fromR;
  const oh = cells.length;
  const ow = cells[0].length;
  const nh = Math.round(oh * scale);
  const nw = Math.round(ow * scale);
  const out: number[][] = [];
  for (let y = 0; y < nh; y++) {
    const row: number[] = [];
    for (let x = 0; x < nw; x++) {
      const sy = y / scale;
      const sx = x / scale;
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

// ─── Initial-state builder ────────────────────────────────────────────────
/**
 * Build the initial RGBA32F state texture (N×N). Places `count` copies of
 * the chosen species seed at distinct positions on the torus, with a
 * minimum separation proportional to R. Soup mode lays out a 3×3 grid
 * (minus centre) for competitive ecosystem tests.
 */
export function buildInitialState(
  R: number,
  count: number,
  isSoup: boolean,
  speciesKey: SpeciesKey | undefined,
): Float32Array {
  const data = new Float32Array(N * N * 4);
  const baseSeed =
    speciesKey && SPECIES_RLE[speciesKey]
      ? decodeRLE(SPECIES_RLE[speciesKey])
      : ORBIUM_FALLBACK;
  const seed = R !== 13 ? scaleSeed(baseSeed, 13, R) : baseSeed;
  const h = seed.length;
  const w = seed[0].length;
  const minDist = R * 4;
  const positions: Array<[number, number]> = [];

  if (isSoup) {
    const spacing = Math.floor(N / 3);
    let placed = 0;
    for (let row = 0; row < 3 && placed < 6; row++) {
      for (let col = 0; col < 3 && placed < 6; col++) {
        if (row === 1 && col === 1) continue;
        positions.push([
          Math.floor(
            spacing * (col + 0.5) + (Math.random() - 0.5) * spacing * 0.3,
          ),
          Math.floor(
            spacing * (row + 0.5) + (Math.random() - 0.5) * spacing * 0.3,
          ),
        ]);
        placed++;
      }
    }
  } else {
    let attempts = 0;
    while (positions.length < count && attempts < 300) {
      const cx = Math.floor(N * 0.12 + Math.random() * N * 0.76);
      const cy = Math.floor(N * 0.12 + Math.random() * N * 0.76);
      let ok = true;
      for (const [px, py] of positions) {
        if (
          Math.min(Math.abs(cx - px), N - Math.abs(cx - px)) < minDist &&
          Math.min(Math.abs(cy - py), N - Math.abs(cy - py)) < minDist
        ) {
          ok = false;
          break;
        }
      }
      if (ok) positions.push([cx, cy]);
      attempts++;
    }
  }

  for (const [cx, cy] of positions) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = (((cx - Math.floor(w / 2) + x) % N) + N) % N;
        const gy = (((cy - Math.floor(h / 2) + y) % N) + N) % N;
        const idx = (gy * N + gx) * 4;
        const v = seed[y][x];
        data[idx] = Math.max(data[idx], v);
        data[idx + 1] = Math.max(data[idx + 1], v);
      }
    }
  }
  return data;
}
