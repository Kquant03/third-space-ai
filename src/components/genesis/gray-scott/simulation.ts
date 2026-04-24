// ═══════════════════════════════════════════════════════════════════════════
//  Gray-Scott · simulation
//  ─────────────────────────────────────────────────────────────────────────
//  Pure functions implementing the Gray-Scott reaction-diffusion system:
//
//    ∂u/∂t = D_u ∇²u − uv² + F(1−u)
//    ∂v/∂t = D_v ∇²v + uv² − (F+k)v
//
//  After Pearson (1993), "Complex patterns in a simple system." The eight
//  Pearson classifications are exposed as preset (F, k) pairs.
//
//  No React; consumed by GrayScottExperience.tsx which owns the animation
//  loop and the Canvas2D painting.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Diffusion coefficients (per Pearson 1993) ─────────────────────────────
export const DU = 0.2097;
export const DV = 0.105;

// ─── Presets — the eight Pearson classes ──────────────────────────────────
export type PresetId =
  | "mitosis"
  | "coral"
  | "spirals"
  | "worms"
  | "solitons"
  | "uskate"
  | "waves"
  | "bubbles";

export type Preset = {
  id: PresetId;
  name: string;
  F: number;
  k: number;
  desc: string;
};

export const PRESETS: Record<PresetId, Preset> = {
  mitosis:  { id: "mitosis",  name: "Mitosis",  F: 0.0367, k: 0.0649, desc: "Self-replicating spots" },
  coral:    { id: "coral",    name: "Coral",    F: 0.0545, k: 0.062,  desc: "Labyrinthine fingerprint" },
  spirals:  { id: "spirals",  name: "Spirals",  F: 0.018,  k: 0.051,  desc: "Rotating spiral waves" },
  worms:    { id: "worms",    name: "Worms",    F: 0.058,  k: 0.065,  desc: "Moving worm patterns" },
  solitons: { id: "solitons", name: "Solitons", F: 0.030,  k: 0.055,  desc: "Pulsating spots" },
  uskate:   { id: "uskate",   name: "U-Skate",  F: 0.062,  k: 0.0609, desc: "Gliding solitons" },
  waves:    { id: "waves",    name: "Waves",    F: 0.014,  k: 0.054,  desc: "Expanding wavefronts" },
  bubbles:  { id: "bubbles",  name: "Bubbles",  F: 0.098,  k: 0.057,  desc: "Negative bubbles" },
};

export const PRESET_LIST: Preset[] = [
  PRESETS.mitosis,
  PRESETS.coral,
  PRESETS.spirals,
  PRESETS.worms,
  PRESETS.solitons,
  PRESETS.uskate,
  PRESETS.waves,
  PRESETS.bubbles,
];

// ─── Field state ──────────────────────────────────────────────────────────
// Two scalar fields u, v on an N×N torus. Double-buffered: u2, v2 are the
// next-step buffers that the integrator swaps into place after each step.

export type Fields = {
  u: Float32Array;
  v: Float32Array;
  u2: Float32Array;
  v2: Float32Array;
};

/**
 * Initialise fields with five random seed patches near the centre of the
 * grid. u ≈ 1 everywhere except the seeds; v ≈ 0 except the seeds. This
 * matches the initial condition from the original Pearson paper.
 */
export function createFields(N: number): Fields {
  const u = new Float32Array(N * N).fill(1.0);
  const v = new Float32Array(N * N).fill(0.0);
  const cx = N / 2;
  const cy = N / 2;
  for (let i = 0; i < 5; i++) {
    const sx = cx + (Math.random() - 0.5) * N * 0.3;
    const sy = cy + (Math.random() - 0.5) * N * 0.3;
    const sz = 3 + Math.random() * 8;
    for (let x = Math.floor(sx - sz); x < sx + sz; x++) {
      for (let y = Math.floor(sy - sz); y < sy + sz; y++) {
        const wx = ((x % N) + N) % N;
        const wy = ((y % N) + N) % N;
        const idx = wx * N + wy;
        u[idx] = 0.5 + Math.random() * 0.1;
        v[idx] = 0.25 + Math.random() * 0.1;
      }
    }
  }
  return {
    u,
    v,
    u2: new Float32Array(N * N),
    v2: new Float32Array(N * N),
  };
}

/**
 * Explicit forward-Euler step with 5-point Laplacian and periodic
 * boundaries. `iterations` lets us run multiple sub-steps per rAF frame
 * for a speed knob without touching the animation cadence.
 *
 * Mutates the Fields object in place: at the end of each iteration, the
 * buffers rotate so that u always holds the current state.
 */
export function stepRD(
  fields: Fields,
  N: number,
  F: number,
  k: number,
  iterations: number,
): void {
  let { u, v, u2, v2 } = fields;
  for (let iter = 0; iter < iterations; iter++) {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        const idx = x * N + y;
        const xp = ((x + 1) % N) * N + y;
        const xm = ((x - 1 + N) % N) * N + y;
        const yp = x * N + ((y + 1) % N);
        const ym = x * N + ((y - 1 + N) % N);
        const lap_u = u[xp] + u[xm] + u[yp] + u[ym] - 4.0 * u[idx];
        const lap_v = v[xp] + v[xm] + v[yp] + v[ym] - 4.0 * v[idx];
        const uvv = u[idx] * v[idx] * v[idx];
        u2[idx] = u[idx] + DU * lap_u - uvv + F * (1.0 - u[idx]);
        v2[idx] = v[idx] + DV * lap_v + uvv - (F + k) * v[idx];
        if (u2[idx] < 0) u2[idx] = 0;
        else if (u2[idx] > 1) u2[idx] = 1;
        if (v2[idx] < 0) v2[idx] = 0;
        else if (v2[idx] > 1) v2[idx] = 1;
      }
    }
    // Swap buffers; rebind locals so the next iteration sees the swap.
    [fields.u, fields.u2] = [fields.u2, fields.u];
    [fields.v, fields.v2] = [fields.v2, fields.v];
    u = fields.u;
    v = fields.v;
    u2 = fields.u2;
    v2 = fields.v2;
  }
}

// ─── Colour modes (Lantern) ───────────────────────────────────────────────
// The original had saturated purple/cyan/heat palettes. We re-skin into
// three Lantern-family modes so Gray-Scott reads as a chapter of the same
// book as Filter / Genesis:
//
//   ghost   — monochromatic ghost-cyan on void; v scalar → alpha
//   duotone — u blue-cool, v ghost-cyan; a reading of the two species
//   inkwash — high-contrast, ink white, v scalar → luminance
//
// Renderers write directly into an ImageData backing store for speed.

export type ColorMode = "ghost" | "duotone" | "inkwash";

export const COLOR_MODES: Array<{ id: ColorMode; label: string }> = [
  { id: "ghost", label: "Ghost" },
  { id: "duotone", label: "Duotone" },
  { id: "inkwash", label: "Inkwash" },
];

/**
 * Render the v-field into a Canvas2D ImageData. We paint v because it's
 * the catalyst field whose structure defines the patterns; u is mostly
 * the negative image.
 *
 * The grid is N×N but the canvas is rendered at canvasSize×canvasSize —
 * we nearest-neighbor upsample by `scale` integer pixels per cell so the
 * sim doesn't pay for a larger integration grid.
 */
export function renderFields(
  ctx: CanvasRenderingContext2D,
  fields: Fields,
  N: number,
  canvasSize: number,
  mode: ColorMode,
): void {
  const imgData = ctx.createImageData(canvasSize, canvasSize);
  const data = imgData.data;
  const scale = canvasSize / N;
  const { u, v } = fields;

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const idx = x * N + y;
      const uv = u[idx];
      const vv = v[idx];

      let r: number, g: number, b: number;

      if (mode === "ghost") {
        // Ghost-cyan on void. v alone drives luminance in the cyan channel.
        // Gives the cleanest reading against the reading-plate substrate.
        const t = Math.min(1, Math.max(0, vv * 1.4));
        r = Math.floor(127 * t);
        g = Math.floor(175 * t);
        b = Math.floor(179 * t);
      } else if (mode === "duotone") {
        // u pushes toward a cool blue; v pushes toward ghost-cyan.
        // Where both are low, void shows through; where they compete,
        // a faint purple-grey wash emerges.
        const uT = Math.min(1, Math.max(0, 1 - uv));  // where u is depleted
        const vT = Math.min(1, Math.max(0, vv));      // where v is active
        r = Math.floor(40 * uT + 127 * vT);
        g = Math.floor(70 * uT + 175 * vT);
        b = Math.floor(120 * uT + 179 * vT);
      } else {
        // Inkwash: monochrome ink, v drives luminance. High contrast.
        const lum = Math.floor(vv * 244);
        r = lum;
        g = Math.floor(lum * 1.005);      // ink has slight warm tilt (#f4f6fb)
        b = Math.floor(lum * 1.03);
      }

      // Nearest-neighbor upsample. Inner loop is hot — no per-pixel clamp;
      // upstream logic keeps r/g/b in [0, 255].
      for (let dx = 0; dx < scale; dx++) {
        for (let dy = 0; dy < scale; dy++) {
          const px = Math.floor(y * scale + dy);
          const py = Math.floor(x * scale + dx);
          if (px < canvasSize && py < canvasSize) {
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
  ctx.putImageData(imgData, 0, 0);
}

// ─── Seed painting ────────────────────────────────────────────────────────
/**
 * Paint a circular seed patch at grid coordinates (mx, my). Used by the
 * click/drag interaction so readers can perturb the field during playback.
 */
export function paintSeed(
  fields: Fields,
  N: number,
  mx: number,
  my: number,
  radius: number = 5,
): void {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = ((mx + dx) % N + N) % N;
      const y = ((my + dy) % N + N) % N;
      const idx = x * N + y;
      fields.u[idx] = 0.5;
      fields.v[idx] = 0.25;
    }
  }
}
