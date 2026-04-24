// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Curl noise flow field (§ XI)
//  ─────────────────────────────────────────────────────────────────────────
//  Implements Bridson (2007) curl-noise: take a 3D noise potential φ and
//  evaluate its curl, which is analytically divergence-free. The result
//  is a vector field that looks visually like live fluid simulation but
//  costs nothing per-frame beyond a noise evaluation.
//
//  In the manifesto this is described as a baked 64³ RG16F texture.
//  Inside the DO we don't need a texture — we sample the field
//  analytically for the handful of fish that are alive. At 5-6 fish × 2 Hz,
//  the cost is 12 noise evaluations per second, which is nothing.
//
//  The noise function is 3D Perlin-ish simplex-flavored value noise with
//  analytic gradients. We compute the potential at three offsets to form
//  a vector potential, then take its curl by finite differences of the
//  three potentials. Output is 2D (xz) since fish mostly swim horizontally;
//  a tiny y-component is mixed in so they gently rise and fall.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
//  Permutation table — small, deterministic, re-used across calls
// ───────────────────────────────────────────────────────────────────

const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fixed shuffle with a stable sequence — same pond, same field.
  let s = 1779033703;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    const t = p[i]!; p[i] = p[j]!; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]!;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function grad3(h: number, x: number, y: number, z: number): number {
  const g = h & 15;
  const u = g < 8 ? x : y;
  const v = g < 4 ? y : (g === 12 || g === 14 ? x : z);
  return ((g & 1) === 0 ? u : -u) + ((g & 2) === 0 ? v : -v);
}

/** Classic 3D Perlin noise, returning roughly [-1, 1]. */
function perlin3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X]! + Y;
  const AA = PERM[A & 255]! + Z;
  const AB = PERM[(A + 1) & 255]! + Z;
  const B = PERM[(X + 1) & 255]! + Y;
  const BA = PERM[B & 255]! + Z;
  const BB = PERM[(B + 1) & 255]! + Z;

  return lerp(
    lerp(
      lerp(grad3(PERM[AA & 255]!,     x,     y,     z),
           grad3(PERM[BA & 255]!,     x - 1, y,     z), u),
      lerp(grad3(PERM[AB & 255]!,     x,     y - 1, z),
           grad3(PERM[BB & 255]!,     x - 1, y - 1, z), u),
      v),
    lerp(
      lerp(grad3(PERM[(AA + 1) & 255]!, x,     y,     z - 1),
           grad3(PERM[(BA + 1) & 255]!, x - 1, y,     z - 1), u),
      lerp(grad3(PERM[(AB + 1) & 255]!, x,     y - 1, z - 1),
           grad3(PERM[(BB + 1) & 255]!, x - 1, y - 1, z - 1), u),
      v),
    w,
  );
}

// ───────────────────────────────────────────────────────────────────
//  Vector potential
// ───────────────────────────────────────────────────────────────────

/**
 * Vector potential φ(x, y, z, t) — three scalar noises, offset in the
 * noise domain so they are uncorrelated. The `t` argument morphs the
 * field slowly (one full cycle every ~4 sim-minutes), so currents shift
 * over time rather than being frozen.
 */
function potential(
  x: number, y: number, z: number, t: number,
): [number, number, number] {
  const scale = 0.35;
  const morph = t * 0.003;
  return [
    perlin3(x * scale + 13.1, y * scale + 17.7, z * scale + morph),
    perlin3(x * scale + 31.7, y * scale + morph + 5.2, z * scale + 29.3),
    perlin3(x * scale + morph + 7.1, y * scale + 23.9, z * scale + 11.5),
  ];
}

// ───────────────────────────────────────────────────────────────────
//  Curl
// ───────────────────────────────────────────────────────────────────

const EPS = 0.08;  // finite-difference step in meters

/**
 * Sample the curl of the vector potential at (x, y, z) at sim-time `t`.
 * Returns a velocity increment in m/s (small, combined with boid steering).
 *
 * ∇ × φ = (∂φz/∂y - ∂φy/∂z, ∂φx/∂z - ∂φz/∂x, ∂φy/∂x - ∂φx/∂y)
 */
export function sampleCurl(
  x: number, y: number, z: number, t: number,
): { vx: number; vy: number; vz: number } {
  const pX1 = potential(x + EPS, y, z, t);
  const pX0 = potential(x - EPS, y, z, t);
  const pY1 = potential(x, y + EPS, z, t);
  const pY0 = potential(x, y - EPS, z, t);
  const pZ1 = potential(x, y, z + EPS, t);
  const pZ0 = potential(x, y, z - EPS, t);

  const dPhiZ_dY = (pY1[2] - pY0[2]) / (2 * EPS);
  const dPhiY_dZ = (pZ1[1] - pZ0[1]) / (2 * EPS);
  const dPhiX_dZ = (pZ1[0] - pZ0[0]) / (2 * EPS);
  const dPhiZ_dX = (pX1[2] - pX0[2]) / (2 * EPS);
  const dPhiY_dX = (pX1[1] - pX0[1]) / (2 * EPS);
  const dPhiX_dY = (pY1[0] - pY0[0]) / (2 * EPS);

  return {
    vx: dPhiZ_dY - dPhiY_dZ,
    vy: dPhiX_dZ - dPhiZ_dX,
    vz: dPhiY_dX - dPhiX_dY,
  };
}

/**
 * 2D projection for fish steering — ignore vy since fish swim mostly
 * horizontally, and scale by the strength the caller wants.
 */
export function sampleCurlXZ(
  x: number, z: number, t: number, strength: number,
): { vx: number; vz: number } {
  const c = sampleCurl(x, -1.5, z, t);  // sample at mid-depth
  return { vx: c.vx * strength, vz: c.vz * strength };
}
