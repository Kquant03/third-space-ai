// ═══════════════════════════════════════════════════════════════════════════
//  Particle Life · simulation
//  ─────────────────────────────────────────────────────────────────────────
//  Pure functions implementing particle life dynamics: N particles of T
//  types on a 2D torus, interacting via an asymmetric T×T force matrix.
//
//  The force kernel is the one from Tom Mohr's formulation:
//    r < β  → linear repulsion (always, independent of type pair)
//    r ≥ β  → triangular attractor whose sign and amplitude are given by
//             M[type_i][type_j]
//
//  M is asymmetric: M[a][b] ≠ M[b][a] is allowed and in fact necessary
//  for the interesting phenomena (predation, symbiosis, membranes). This
//  is the feature that distinguishes particle life from physics — there
//  is no conserved quantity corresponding to Newton's third law.
//
//  After: Hunar Ahmad (2022); Tom Mohr — "particle life" lecture series.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Particle-type palette (rendering only, not simulation) ──────────────
// Six possible types; the simulation uses `numTypes` ≤ 6 of them. Lantern-
// skinned: ghost-cyan family plus the reserved sanguine for the most
// active type, with warm-muted amber/gold and a cool violet-muted for
// contrast — stays inside the Lantern palette while giving six distinct
// channels for a T×T matrix.
export const TYPE_COLORS: Array<[number, number, number]> = [
  [127, 175, 179],   // ghost (cyan)
  [154, 43, 43],     // sanguine (reserved accent — the "predator" type)
  [93, 138, 142],    // ghost-soft
  [178, 145, 86],    // muted amber
  [138, 155, 186],   // ink-muted (cool blue-grey)
  [120, 110, 155],   // muted violet
];

// ─── Matrix presets ──────────────────────────────────────────────────────

export type MatrixPresetId = "random" | "predator" | "symbiosis" | "chaos";

export type MatrixPreset = {
  id: MatrixPresetId;
  name: string;
  description: string;
  gen: (n: number) => number[][];
};

function randomMatrix(n: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    m[i] = [];
    for (let j = 0; j < n; j++) {
      m[i][j] = Math.random() * 2 - 1; // uniform [-1, 1]
    }
  }
  return m;
}

// Predator-prey: asymmetric cycle. Each type is attracted to the one
// "in front" of it in the cycle (prey) and repelled by the one "behind"
// (predator). Small self-attraction keeps packs together.
function predatorPreyMatrix(): number[][] {
  return [
    [0.1, 0.5, -0.3, 0.0],
    [-0.5, 0.1, 0.5, -0.3],
    [0.3, -0.5, 0.1, 0.5],
    [0.0, 0.3, -0.5, 0.1],
  ];
}

// Symbiosis: all off-diagonals equal and positive between paired types;
// small self-repulsion prevents clumping-into-a-point. Produces stable
// binary membranes.
function symbiosisMatrix(): number[][] {
  return [
    [-0.1, 0.6, 0.6, 0.0],
    [0.6, -0.1, 0.0, 0.6],
    [0.6, 0.0, -0.1, 0.6],
    [0.0, 0.6, 0.6, -0.1],
  ];
}

// Chaos: hand-picked irregular matrix with no symmetry or cycle structure.
// Usually degenerates into flocking-plus-turbulence, occasionally finds
// pocket attractors. A good "what happens if" starting point.
function chaosMatrix(): number[][] {
  return [
    [0.8, -0.9, 0.3, 0.5],
    [0.4, 0.2, -0.8, 0.7],
    [-0.6, 0.9, 0.1, -0.4],
    [0.3, -0.5, 0.6, -0.2],
  ];
}

export const MATRIX_PRESETS: Record<MatrixPresetId, MatrixPreset> = {
  random: {
    id: "random",
    name: "Random",
    description:
      "New draw from uniform [-1, 1]. Most random matrices produce no interesting structure; a few find pocket attractors.",
    gen: randomMatrix,
  },
  predator: {
    id: "predator",
    name: "Predator–Prey",
    description:
      "Cyclic four-species food chain. Each type eats the next, flees the previous. Watch for ribbons of pursuit.",
    gen: () => predatorPreyMatrix(),
  },
  symbiosis: {
    id: "symbiosis",
    name: "Symbiosis",
    description:
      "Pairwise mutual attraction between disjoint pairs. Produces stable binary membranes and long-lived cells.",
    gen: () => symbiosisMatrix(),
  },
  chaos: {
    id: "chaos",
    name: "Chaos",
    description:
      "Hand-picked irregular matrix. No symmetry, no cycle. Usually turbulent, sometimes lucky.",
    gen: () => chaosMatrix(),
  },
};

export const MATRIX_PRESET_LIST: MatrixPreset[] = [
  MATRIX_PRESETS.random,
  MATRIX_PRESETS.predator,
  MATRIX_PRESETS.symbiosis,
  MATRIX_PRESETS.chaos,
];

// ─── Particle state ──────────────────────────────────────────────────────
// All state lives in typed arrays for cache-friendly iteration; the force
// loop is O(N²) inner hot so allocation pressure matters.

export type Particles = {
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  types: Uint8Array;
  n: number;
};

export function initParticles(
  n: number,
  numTypes: number,
  W: number,
  H: number,
): Particles {
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const types = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    px[i] = Math.random() * W;
    py[i] = Math.random() * H;
    vx[i] = 0;
    vy[i] = 0;
    types[i] = Math.floor(Math.random() * numTypes);
  }
  return { px, py, vx, vy, types, n };
}

// ─── Force kernel + integration step ─────────────────────────────────────
/**
 * One Euler step. Mutates the particles in place.
 *
 *   rMax     — interaction cutoff; forces vanish beyond this distance
 *   friction — velocity retention per step (0 = sticky; 1 = ballistic)
 *   beta     — repulsion zone fraction. For r/rMax < beta, linear repulsion;
 *              for beta ≤ r/rMax ≤ 1, triangular attractor centered at
 *              r/rMax = (1+beta)/2
 *
 * Toroidal boundaries: shortest-path dx/dy wrap via the standard
 * dx > W/2 → dx -= W trick.
 */
export function stepParticleLife(
  particles: Particles,
  matrix: number[][],
  W: number,
  H: number,
  rMax: number,
  friction: number,
  beta: number,
): void {
  const { px, py, vx, vy, types, n } = particles;
  const invBeta1 = 1.0 / (1.0 - beta); // precompute for attractor scaling
  const halfW = W / 2;
  const halfH = H / 2;

  // Accumulate forces first; integrate after. This keeps the simulation
  // order-independent within a step (no particle sees a mid-step neighbour).
  for (let i = 0; i < n; i++) {
    let fx = 0;
    let fy = 0;
    const tiRow = matrix[types[i]];

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      let dx = px[j] - px[i];
      let dy = py[j] - py[i];
      // Toroidal shortest-path wrap.
      if (dx > halfW) dx -= W;
      else if (dx < -halfW) dx += W;
      if (dy > halfH) dy -= H;
      else if (dy < -halfH) dy += H;

      const dist2 = dx * dx + dy * dy;
      if (dist2 > rMax * rMax || dist2 < 1e-4) continue;

      const dist = Math.sqrt(dist2);
      const r = dist / rMax; // normalised [0, 1]
      const nx = dx / dist;
      const ny = dy / dist;

      let force: number;
      if (r < beta) {
        // Repulsion zone: linear ramp from -1 at r=0 to 0 at r=beta.
        force = r / beta - 1.0;
      } else {
        // Interaction zone: triangular attractor peaking at r=(1+beta)/2.
        const a = tiRow[types[j]];
        force = a * (1.0 - Math.abs(1.0 + beta - 2.0 * r) * invBeta1);
      }
      fx += force * nx;
      fy += force * ny;
    }

    // Integrate: friction damping + force acceleration.
    // The 0.01 scale factor keeps the system numerically sane across the
    // rMax slider range; it plays the role of a timestep.
    vx[i] = vx[i] * friction + fx * rMax * 0.01;
    vy[i] = vy[i] * friction + fy * rMax * 0.01;
  }

  // Apply velocities with toroidal wrap.
  for (let i = 0; i < n; i++) {
    px[i] += vx[i];
    py[i] += vy[i];
    px[i] = ((px[i] % W) + W) % W;
    py[i] = ((py[i] % H) + H) % H;
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────
/**
 * Paint the current frame to a Canvas2D context. Uses a trail-fade pass
 * when trails=true — a semi-transparent void rect that gives each particle
 * a ~30-frame decay tail. Brightness modulated by speed so motion reads
 * as energy.
 */
export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particles,
  W: number,
  H: number,
  trails: boolean,
): void {
  if (trails) {
    // Semi-transparent void fade — lets motion trails build up. The
    // alpha (0.12) sets the decay rate; lower → longer trails.
    ctx.fillStyle = "rgba(1, 1, 6, 0.12)";
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = "#010106";
    ctx.fillRect(0, 0, W, H);
  }

  const { px, py, vx, vy, types, n } = particles;
  for (let i = 0; i < n; i++) {
    const col = TYPE_COLORS[types[i] % TYPE_COLORS.length];
    const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
    // Alpha couples to speed: at rest, particles read as faint dots;
    // in motion, they brighten. Makes flocking/hunting states legible.
    const alpha = Math.min(1, 0.45 + speed * 0.35);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
    ctx.beginPath();
    ctx.arc(px[i], py[i], 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
