// ═══════════════════════════════════════════════════════════════════════════
//  Ising · renderer
//  ─────────────────────────────────────────────────────────────────────────
//  Four canvas rendering modes, each re-skinned into Lantern:
//
//    spin     — ±1 spins as two complementary tones: sanguine for +1,
//               ghost-cyan for -1. Local neighbour alignment brightens
//               the tone so domain interiors read as solidly committed
//               and boundaries read as uncertain.
//
//    cluster  — Hoshen-Kopelman cluster labels. The largest cluster
//               (the percolating one at T_c) gets a gold treatment;
//               others get φ-rotated hues with luminance proportional
//               to log size so the fractal structure is legible at
//               criticality.
//
//    walls    — domain walls as bright ghost-cyan lines against a near-
//               void lattice. What percolation looks like at T_c: SLE(3)
//               curves with fractal dimension 11/8.
//
//    energy   — local energy density as a cool→warm diverging colormap.
//               Low bond energy (-4J, aligned) maps to void-blue; high
//               (+4J, frustrated) maps to sanguine.
// ═══════════════════════════════════════════════════════════════════════════

import {
  hslToRgb,
  PHI_INV,
  hoshenKopelman,
  computeDomainWalls,
  type ClusterLabeling,
} from "./simulation";

export type VizMode = "spin" | "cluster" | "walls" | "energy";

export type RenderStats = {
  clusterCount?: number;
  maxClusterSize?: number;
  wallCount?: number;
};

/**
 * Main render entry point. Dispatches to the chosen viz mode and returns
 * derived stats (cluster counts, wall counts) so the caller can update
 * telemetry displays without recomputing.
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  grid: Int8Array,
  N: number,
  canvasSize: number,
  cellSize: number,
  mode: VizMode,
  coupling: number,
): RenderStats {
  const imgData = ctx.createImageData(canvasSize, canvasSize);
  const data = imgData.data;
  const stats: RenderStats = {};

  if (mode === "spin") {
    renderSpin(data, grid, N, canvasSize, cellSize);
  } else if (mode === "cluster") {
    const labeling = hoshenKopelman(grid, N);
    renderCluster(data, labeling, N, canvasSize, cellSize);
    stats.clusterCount = labeling.clusterCount;
    stats.maxClusterSize = labeling.maxSize;
  } else if (mode === "walls") {
    const { walls, wallCount } = computeDomainWalls(grid, N);
    renderWalls(data, grid, walls, N, canvasSize, cellSize);
    stats.wallCount = wallCount;
  } else {
    renderEnergy(data, grid, N, canvasSize, cellSize, coupling);
  }

  ctx.putImageData(imgData, 0, 0);
  return stats;
}

// ─── Spin mode ─────────────────────────────────────────────────────────────
/**
 * +1 spin → sanguine (#9a2b2b), -1 spin → ghost-cyan (#7fafb3). Alignment
 * with local neighbours brightens the colour; spins near a boundary are
 * rendered dimmer so the reader can see domain interiors vs walls.
 */
function renderSpin(
  data: Uint8ClampedArray,
  grid: Int8Array,
  N: number,
  canvasSize: number,
  cellSize: number,
): void {
  // Lantern tones — these are the SOLE re-skin point. +1 gets sanguine (the
  // reserved accent; Ising's two-phase structure justifies using it here
  // against ghost-cyan for the other phase).
  const SANG = [154, 43, 43] as const;        // #9a2b2b
  const GHOST = [127, 175, 179] as const;     // #7fafb3
  // Dim floor for unaligned spins, so the domain interior reads solid.
  const DIM = 0.55;

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const s = grid[x * N + y];
      const nb =
        grid[((x + 1) % N) * N + y] +
        grid[((x - 1 + N) % N) * N + y] +
        grid[x * N + ((y + 1) % N)] +
        grid[x * N + ((y - 1 + N) % N)];
      const alignment = (s * nb) / 4;
      const intensity = DIM + (1 - DIM) * Math.max(0, alignment);
      const base = s === 1 ? SANG : GHOST;
      const r = (base[0] * intensity) | 0;
      const g = (base[1] * intensity) | 0;
      const b = (base[2] * intensity) | 0;

      for (let dx = 0; dx < cellSize; dx++) {
        for (let dy = 0; dy < cellSize; dy++) {
          const px = y * cellSize + dy;
          const py = x * cellSize + dx;
          const pi = (py * canvasSize + px) * 4;
          data[pi] = r;
          data[pi + 1] = g;
          data[pi + 2] = b;
          data[pi + 3] = 255;
        }
      }
    }
  }
}

// ─── Cluster mode ─────────────────────────────────────────────────────────
/**
 * Hoshen-Kopelman cluster label → colour. Largest cluster highlighted in
 * ink-gold; other clusters get φ-rotated hues keyed to label, with
 * luminance proportional to log(size) to emphasise percolating structure.
 */
function renderCluster(
  data: Uint8ClampedArray,
  labeling: ClusterLabeling,
  N: number,
  canvasSize: number,
  cellSize: number,
): void {
  const { labels, maxLabel, clusterSizeMap } = labeling;
  const colorCache: Record<number, [number, number, number]> = {};

  // A warm gold for the percolating cluster; reads as distinguished against
  // the ghost/sanguine vocabulary of spin mode. Stays inside the Lantern
  // warm-accent family (similar hue to ink-gold annotations).
  const GOLD: [number, number, number] = [212, 180, 92];

  for (let i = 0; i < N * N; i++) {
    const l = labels[i];
    if (colorCache[l] !== undefined) continue;
    if (l === maxLabel) {
      colorCache[l] = GOLD;
    } else {
      const size = clusterSizeMap[l] || 1;
      const hue = ((l * PHI_INV) % 1.0) * 360;
      const sat = 45 + Math.min(20, Math.log2(size + 1) * 3);
      const lum = 32 + Math.min(25, Math.log2(size + 1) * 4);
      colorCache[l] = hslToRgb(hue, sat, lum);
    }
  }

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const l = labels[x * N + y];
      const [r, g, b] = colorCache[l];
      for (let dx = 0; dx < cellSize; dx++) {
        for (let dy = 0; dy < cellSize; dy++) {
          const px = y * cellSize + dy;
          const py = x * cellSize + dx;
          const pi = (py * canvasSize + px) * 4;
          data[pi] = r;
          data[pi + 1] = g;
          data[pi + 2] = b;
          data[pi + 3] = 255;
        }
      }
    }
  }
}

// ─── Walls mode ───────────────────────────────────────────────────────────
/**
 * Near-void base with a slight tint keyed to the spin, overlaid with
 * bright ghost-cyan wall lines at domain boundaries.
 */
function renderWalls(
  data: Uint8ClampedArray,
  grid: Int8Array,
  walls: Uint8Array,
  N: number,
  canvasSize: number,
  cellSize: number,
): void {
  const TINT_UP = [18, 14, 16] as const;   // near-void, slight warm
  const TINT_DN = [12, 16, 22] as const;   // near-void, slight cool

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const s = grid[x * N + y];
      const base = s === 1 ? TINT_UP : TINT_DN;
      for (let dx = 0; dx < cellSize; dx++) {
        for (let dy = 0; dy < cellSize; dy++) {
          const px = y * cellSize + dy;
          const py = x * cellSize + dx;
          const pi = (py * canvasSize + px) * 4;
          data[pi] = base[0];
          data[pi + 1] = base[1];
          data[pi + 2] = base[2];
          data[pi + 3] = 255;
        }
      }
    }
  }

  // Ghost-cyan walls, 2px thick.
  const WR = 127;
  const WG = 175;
  const WB = 179;
  const WA = 235;

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const idx = x * N + y;
      // Horizontal wall below cell (x, y).
      if (walls[idx * 2]) {
        const py = (x + 1) * cellSize;
        if (py < canvasSize) {
          for (let dy = 0; dy < cellSize; dy++) {
            const px = y * cellSize + dy;
            for (let t = -1; t <= 0; t++) {
              const row = py + t;
              if (row >= 0 && row < canvasSize) {
                const pi = (row * canvasSize + px) * 4;
                data[pi] = WR;
                data[pi + 1] = WG;
                data[pi + 2] = WB;
                data[pi + 3] = WA;
              }
            }
          }
        }
      }
      // Vertical wall right of cell (x, y).
      if (walls[idx * 2 + 1]) {
        const px = (y + 1) * cellSize;
        if (px < canvasSize) {
          for (let dx = 0; dx < cellSize; dx++) {
            const py2 = x * cellSize + dx;
            for (let t = -1; t <= 0; t++) {
              const col = px + t;
              if (col >= 0 && col < canvasSize) {
                const pi = (py2 * canvasSize + col) * 4;
                data[pi] = WR;
                data[pi + 1] = WG;
                data[pi + 2] = WB;
                data[pi + 3] = WA;
              }
            }
          }
        }
      }
    }
  }
}

// ─── Energy mode ──────────────────────────────────────────────────────────
/**
 * Local energy density = -J s (Σ neighbours). Diverging colormap:
 * low (aligned) → void-blue; mid → ink-muted; high (frustrated) → sanguine.
 */
function renderEnergy(
  data: Uint8ClampedArray,
  grid: Int8Array,
  N: number,
  canvasSize: number,
  cellSize: number,
  coupling: number,
): void {
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const s = grid[x * N + y];
      const nb =
        grid[((x + 1) % N) * N + y] +
        grid[((x - 1 + N) % N) * N + y] +
        grid[x * N + ((y + 1) % N)] +
        grid[x * N + ((y - 1 + N) % N)];
      const localE = -coupling * s * nb; // in [-4, +4]
      const t = (localE + 4) / 8;         // normalise to [0, 1]

      // Void-blue → ink-muted → sanguine (Lantern diverging map).
      let r: number;
      let g: number;
      let b: number;
      if (t < 0.5) {
        const u = t * 2; // 0..1 for the cool half
        r = (14 + 126 * u) | 0;     // 14 → 140
        g = (22 + 138 * u) | 0;     // 22 → 160
        b = (40 + 140 * u) | 0;     // 40 → 180  (approaches ink-muted)
      } else {
        const u = (t - 0.5) * 2;    // 0..1 for the warm half
        r = (140 + 14 * u) | 0;     // 140 → 154 (sanguine)
        g = (160 - 117 * u) | 0;    // 160 → 43
        b = (180 - 137 * u) | 0;    // 180 → 43
      }

      for (let dx = 0; dx < cellSize; dx++) {
        for (let dy = 0; dy < cellSize; dy++) {
          const px = y * cellSize + dy;
          const py = x * cellSize + dx;
          const pi = (py * canvasSize + px) * 4;
          data[pi] = r;
          data[pi + 1] = g;
          data[pi + 2] = b;
          data[pi + 3] = 255;
        }
      }
    }
  }
}
