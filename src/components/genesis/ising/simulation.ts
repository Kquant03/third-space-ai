// ═══════════════════════════════════════════════════════════════════════════
//  Ising · simulation
//  ─────────────────────────────────────────────────────────────────────────
//  Pure functions implementing the 2D Ising model on a square periodic
//  lattice. Two Monte Carlo algorithms:
//
//    metropolisSweep  — Metropolis-Hastings single-spin updates
//    wolffCluster     — Wolff single-cluster algorithm (critical slowing
//                       down is defeated near T_c)
//
//  Observables: <M>, <|M|>, <E>/N, χ (susceptibility), C_v (specific heat),
//  U_L (Binder cumulant) computed from rolling statistics.
//
//  Cluster analysis via Hoshen-Kopelman union-find labelling.
//  Domain wall detection via neighbour-comparison.
//  Onsager exact spontaneous magnetisation for reference curve.
//
//  After:
//    Ising, E. (1925). Z. Phys. 31, 253.
//    Onsager, L. (1944). Phys. Rev. 65, 117.
//    Wolff, U. (1989). Phys. Rev. Lett. 62, 361.
//    Hoshen, J. & Kopelman, R. (1976). Phys. Rev. B 14, 3438.
//    Tsarev, D. V., Trofimova, A. N., Alodjants, A. P. & Khrennikov, A.
//    (2019). Sci. Rep. 9, 18039. [Social-phase mapping]
// ═══════════════════════════════════════════════════════════════════════════

// ─── Critical constants ───────────────────────────────────────────────────
export const TC = 2.0 / Math.log(1.0 + Math.SQRT2); // 2.269185...
export const BETA_C = Math.log(1.0 + Math.SQRT2) / 2.0;

// Binder cumulant crossing at T_c for 2D Ising, exact (Kamieniarz-Blöte 1993).
export const BINDER_CRITICAL = 0.6107;

// ─── Onsager exact magnetisation ──────────────────────────────────────────
/**
 * Onsager's exact solution for spontaneous magnetisation per spin of the
 * 2D Ising model. Zero above T_c; follows a 1/8-power law below.
 */
export function onsagerMag(T: number, J: number = 1.0): number {
  const x = Math.sinh((2 * J) / T);
  if (x <= 1) return 0;
  return Math.pow(1 - Math.pow(x, -4), 1 / 8);
}

// ─── Grid management ──────────────────────────────────────────────────────

export type GridInit = "random" | "allUp" | "allDown";

/**
 * Int8Array representing ±1 spins on an N×N torus. Flat row-major layout:
 * index = x * N + y.
 */
export function createGrid(N: number, mode: GridInit = "random"): Int8Array {
  const grid = new Int8Array(N * N);
  if (mode === "allUp") {
    grid.fill(1);
  } else if (mode === "allDown") {
    grid.fill(-1);
  } else {
    for (let i = 0; i < N * N; i++) grid[i] = Math.random() < 0.5 ? 1 : -1;
  }
  return grid;
}

// ─── Metropolis-Hastings sweep ───────────────────────────────────────────
/**
 * One full Metropolis sweep = N² attempted flips. Each attempt picks a
 * random site, computes ΔE from four nearest neighbours + external field
 * H, and accepts with min(1, exp(-βΔE)).
 *
 * Coupling-term acceptance probabilities are precomputed for the five
 * possible ΔE values (-8J, -4J, 0, +4J, +8J). External-field contribution
 * is handled inline since H is continuous.
 */
export function metropolisSweep(
  grid: Int8Array,
  N: number,
  beta: number,
  J: number,
  H: number,
): void {
  // Precompute acceptance probabilities for coupling-only ΔE.
  // Index dE_coupling + 8 maps -8 → 0, -4 → 4, 0 → 8, +4 → 12, +8 → 16.
  const accept = new Float64Array(17);
  for (const dE of [-8, -4, 0, 4, 8]) {
    accept[dE + 8] = dE <= 0 ? 1.0 : Math.exp(-beta * J * dE);
  }

  const steps = N * N;
  for (let i = 0; i < steps; i++) {
    const x = (Math.random() * N) | 0;
    const y = (Math.random() * N) | 0;
    const idx = x * N + y;
    const s = grid[idx];
    const neighbours =
      grid[((x + 1) % N) * N + y] +
      grid[((x - 1 + N) % N) * N + y] +
      grid[x * N + ((y + 1) % N)] +
      grid[x * N + ((y - 1 + N) % N)];
    const dE_coupling = 2 * s * neighbours; // integer in {-8,-4,0,4,8}
    const dE_field = 2 * s * H;
    const totalDE = J * dE_coupling + dE_field;
    if (totalDE <= 0 || Math.random() < Math.exp(-beta * totalDE)) {
      grid[idx] = -s as -1 | 1;
    }
  }
}

// ─── Wolff single-cluster algorithm ───────────────────────────────────────

export type WolffResult = {
  clusterSize: number;
  clusterSites: number[]; // flat indices of flipped sites (capped for viz)
};

/**
 * Wolff cluster flip: pick a seed, iteratively add aligned neighbours with
 * probability p_add = 1 - exp(-2βJ). Flip the whole cluster at once. This
 * defeats critical slowing down near T_c because the correlation length
 * grows, but clusters can span the lattice in O(L^d) time.
 *
 * Returns the cluster size and (bounded) list of flipped sites for
 * visualisation.
 */
export function wolffCluster(
  grid: Int8Array,
  N: number,
  beta: number,
  J: number,
): WolffResult {
  const pAdd = 1.0 - Math.exp(-2.0 * beta * J);
  const seedIdx = (Math.random() * N * N) | 0;
  const sigma = grid[seedIdx];
  grid[seedIdx] = -sigma as -1 | 1;
  const stack: number[] = [seedIdx];
  let clusterSize = 1;
  const clusterSites: number[] = [seedIdx];

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = (idx / N) | 0;
    const y = idx % N;
    const neighbours = [
      ((x + 1) % N) * N + y,
      ((x - 1 + N) % N) * N + y,
      x * N + ((y + 1) % N),
      x * N + ((y - 1 + N) % N),
    ];
    for (const nIdx of neighbours) {
      if (grid[nIdx] === sigma && Math.random() < pAdd) {
        grid[nIdx] = -sigma as -1 | 1;
        stack.push(nIdx);
        clusterSize++;
        if (clusterSites.length < 50000) clusterSites.push(nIdx);
      }
    }
  }
  return { clusterSize, clusterSites };
}

// ─── Observables ──────────────────────────────────────────────────────────

export type Observables = {
  magnetization: number;
  energy: number;        // per spin
  absMag: number;
  totalMag: number;
};

/**
 * Per-spin magnetisation and energy including the external field H. Energy
 * counts each bond once by summing only +x and +y neighbours.
 */
export function computeObservables(
  grid: Int8Array,
  N: number,
  J: number,
  H: number,
): Observables {
  let mag = 0;
  let energy = 0;
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const s = grid[x * N + y];
      mag += s;
      energy +=
        -J * s * (grid[((x + 1) % N) * N + y] + grid[x * N + ((y + 1) % N)]) -
        H * s;
    }
  }
  const total = N * N;
  return {
    magnetization: mag / total,
    energy: energy / total,
    absMag: Math.abs(mag / total),
    totalMag: mag,
  };
}

// ─── Hoshen-Kopelman cluster labelling ────────────────────────────────────

export type ClusterLabeling = {
  labels: Int32Array;
  clusterCount: number;
  maxSize: number;
  maxLabel: number;
  clusterSizeMap: Record<number, number>;
};

/**
 * Single-pass cluster labelling for same-spin domains using union-find.
 * Treats periodic boundaries as non-connecting (left/up comparison only);
 * the dominant clusters are still correctly identified.
 */
export function hoshenKopelman(grid: Int8Array, N: number): ClusterLabeling {
  const labels = new Int32Array(N * N);
  const parent = new Int32Array(N * N + 1);
  const sizes = new Int32Array(N * N + 1);
  let nextLabel = 1;

  function find(x: number): number {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const n = parent[x];
      parent[x] = root;
      x = n;
    }
    return root;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      if (sizes[ra] < sizes[rb]) {
        parent[ra] = rb;
        sizes[rb] += sizes[ra];
      } else {
        parent[rb] = ra;
        sizes[ra] += sizes[rb];
      }
    }
  }

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const idx = x * N + y;
      const s = grid[idx];
      const leftIdx = y > 0 ? x * N + (y - 1) : -1;
      const upIdx = x > 0 ? (x - 1) * N + y : -1;
      const sameLeft = leftIdx >= 0 && grid[leftIdx] === s;
      const sameUp = upIdx >= 0 && grid[upIdx] === s;

      if (!sameLeft && !sameUp) {
        labels[idx] = nextLabel;
        parent[nextLabel] = nextLabel;
        sizes[nextLabel] = 1;
        nextLabel++;
      } else if (sameLeft && !sameUp) {
        labels[idx] = find(labels[leftIdx]);
        sizes[labels[idx]]++;
      } else if (!sameLeft && sameUp) {
        labels[idx] = find(labels[upIdx]);
        sizes[labels[idx]]++;
      } else {
        const lL = find(labels[leftIdx]);
        const lU = find(labels[upIdx]);
        union(lL, lU);
        labels[idx] = find(lL);
        sizes[labels[idx]]++;
      }
    }
  }

  // Canonicalise all labels to their root.
  for (let i = 0; i < N * N; i++) labels[i] = find(labels[i]);

  // Count cluster sizes and find the largest.
  const clusterSizeMap: Record<number, number> = {};
  for (let i = 0; i < N * N; i++) {
    const l = labels[i];
    clusterSizeMap[l] = (clusterSizeMap[l] || 0) + 1;
  }
  let maxLabel = 0;
  let maxSize = 0;
  const clusterCount = Object.keys(clusterSizeMap).length;
  for (const [l, s] of Object.entries(clusterSizeMap)) {
    if (s > maxSize) {
      maxSize = s;
      maxLabel = parseInt(l);
    }
  }

  return { labels, clusterCount, maxSize, maxLabel, clusterSizeMap };
}

// ─── Domain wall detection ────────────────────────────────────────────────

export type DomainWalls = {
  walls: Uint8Array; // [horizontal, vertical] pair per cell
  wallCount: number;
};

export function computeDomainWalls(grid: Int8Array, N: number): DomainWalls {
  const walls = new Uint8Array(N * N * 2);
  let wallCount = 0;
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const s = grid[x * N + y];
      if (s !== grid[((x + 1) % N) * N + y]) {
        walls[(x * N + y) * 2] = 1;
        wallCount++;
      }
      if (s !== grid[x * N + ((y + 1) % N)]) {
        walls[(x * N + y) * 2 + 1] = 1;
        wallCount++;
      }
    }
  }
  return { walls, wallCount };
}

// ─── HSL → RGB utility (for cluster coloring) ────────────────────────────
export const PHI_INV = 0.618033988749895;

export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [(r * 255) | 0, (g * 255) | 0, (b * 255) | 0];
}

// ─── Rolling statistics accumulator ───────────────────────────────────────

type StatEntry = {
  m: number;
  absM: number;
  e: number;
  m2: number;
  m4: number;
  e2: number;
};

/**
 * Fixed-window FIFO of observable samples. Computes susceptibility,
 * specific heat, and Binder cumulant from the window on demand so the
 * caller doesn't pay for recomputation until requested.
 */
export class StatAccumulator {
  window: number;
  vals: StatEntry[];

  constructor(windowSize: number = 200) {
    this.window = windowSize;
    this.vals = [];
  }

  push(m: number, absM: number, e: number): void {
    this.vals.push({
      m,
      absM,
      e,
      m2: m * m,
      m4: m * m * m * m,
      e2: e * e,
    });
    if (this.vals.length > this.window) this.vals.shift();
  }

  get n(): number {
    return this.vals.length;
  }

  mean(key: keyof StatEntry): number {
    if (this.vals.length === 0) return 0;
    let s = 0;
    for (const v of this.vals) s += v[key];
    return s / this.vals.length;
  }

  /**
   * χ = β N² (<M²> − <|M|>²).
   * Using absM instead of raw M avoids spurious growth when the system
   * tunnels between ±M states at low T (the raw variance there includes
   * inter-state jumps, which isn't what χ measures).
   */
  susceptibility(T: number, N: number): number {
    if (this.vals.length < 10) return 0;
    const beta = 1.0 / T;
    const mM2 = this.mean("m2");
    const mAbsM = this.mean("absM");
    return beta * N * N * (mM2 - mAbsM * mAbsM);
  }

  /** C_v = (N² / T²) (<E²> − <E>²). */
  specificHeat(T: number, N: number): number {
    if (this.vals.length < 10) return 0;
    const mE2 = this.mean("e2");
    const mE = this.mean("e");
    return (N * N / (T * T)) * (mE2 - mE * mE);
  }

  /**
   * U_L = 1 − <M⁴> / (3 <M²>²). At criticality this approaches the
   * universal value ≈ 0.6107 for 2D Ising (Kamieniarz-Blöte 1993).
   */
  binderCumulant(): number {
    if (this.vals.length < 10) return 0;
    const m2 = this.mean("m2");
    const m4 = this.mean("m4");
    if (m2 === 0) return 0;
    return 1.0 - m4 / (3.0 * m2 * m2);
  }

  reset(): void {
    this.vals = [];
  }
}
