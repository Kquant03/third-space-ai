// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · σ-field landscape
//  ─────────────────────────────────────────────────────────────────────────
//  The σ-field is what makes Ghost Species different from ordinary Lenia.
//  In classic Lenia, σ is a single global scalar — the width of the
//  Gaussian growth band around μ. Here, σ varies across space: tight at
//  creature cores (physics is "kind" — small perturbations still survive),
//  loose at the edges (physics is "forgetful" — creatures dissolve).
//
//  A Ghost Species creature is one whose morphology is viable in the
//  tight-σ regions of its past and unviable in the loose-σ regions of its
//  present. It remembers a shape it can no longer hold — which is why
//  we care about the display shader's memory-wisp afterimage.
//
//  Four landscape types:
//    uniform   — σ constant everywhere (classic Lenia)
//    radial    — tight centre, loose edges
//    waves     — sinusoidal rivers of varying σ (drift-corridors)
//    islands   — discrete tight-σ patches in a loose-σ sea
// ═══════════════════════════════════════════════════════════════════════════

import { N } from "./shaders";

export type LandscapeType = "uniform" | "radial" | "waves" | "islands";

/**
 * Construct an RGBA32F σ-field texture-data array. Only the R channel
 * is read by the sim shader; other channels are spare for future use
 * (we've discussed per-channel μ fields on paper but haven't shipped it).
 *
 * σ is clamped to [0.003, 0.06] — outside this range the integrator
 * either freezes (σ too small → growth function becomes a delta) or
 * everything dissolves (σ too large → no stable creatures possible).
 */
export function buildSigmaField(
  baseSigma: number,
  landscape: LandscapeType,
): Float32Array {
  const data = new Float32Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = (y * N + x) * 4;
      const nx = x / N;
      const ny = y / N;
      let sig = baseSigma;

      if (landscape === "radial") {
        // Centre tight → edges loose. Creatures drift inward toward
        // kinder physics.
        const cx = (nx - 0.5) * 2;
        const cy = (ny - 0.5) * 2;
        const r = Math.sqrt(cx * cx + cy * cy);
        sig = baseSigma * (0.65 + 0.7 * r);
      } else if (landscape === "waves") {
        // Sinusoidal rivers — kinder-physics corridors snaking across
        // the substrate. Creatures tend to follow them.
        const wave = Math.sin(nx * Math.PI * 5) * Math.sin(ny * Math.PI * 4);
        sig = baseSigma * (0.75 + 0.5 * wave);
      } else if (landscape === "islands") {
        // Three Gaussian islands of tight σ in a loose-σ ocean.
        // Creatures hop between islands; long drifts through open
        // water usually dissolve them.
        const island1 = Math.exp(
          -(Math.pow(nx - 0.25, 2) + Math.pow(ny - 0.3, 2)) * 40,
        );
        const island2 = Math.exp(
          -(Math.pow(nx - 0.7, 2) + Math.pow(ny - 0.65, 2)) * 35,
        );
        const island3 = Math.exp(
          -(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2)) * 50,
        );
        const islands = Math.max(island1, island2, island3);
        sig = baseSigma * (1.2 - islands * 0.6);
      }

      data[idx] = Math.max(0.003, Math.min(0.06, sig));
    }
  }
  return data;
}

/**
 * Paint σ into the field with a circular brush. `increase=true` raises σ
 * (makes physics looser at that spot — creatures will struggle); false
 * lowers σ (kinder physics). Mutates the passed field in place.
 *
 * This is the landscape-sculpting mode — readers paint their own kind
 * and cruel zones and watch creatures migrate across the gradient.
 */
export function paintSigmaField(
  field: Float32Array,
  uvX: number,
  uvY: number,
  radius: number,
  increase: boolean,
): void {
  const r = Math.round(radius);
  const cx = Math.round(uvX * N);
  const cy = Math.round(uvY * N);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) continue;
      const gx = (((cx + dx) % N) + N) % N;
      const gy = (((cy + dy) % N) + N) % N;
      const idx = (gy * N + gx) * 4;
      const strength = (1 - dist / r) * 0.003;
      field[idx] += increase ? strength : -strength;
      if (field[idx] < 0.003) field[idx] = 0.003;
      else if (field[idx] > 0.06) field[idx] = 0.06;
    }
  }
}
