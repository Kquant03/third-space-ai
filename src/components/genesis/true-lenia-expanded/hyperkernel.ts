// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Hyper · the 4-dimensional kernel
//  ─────────────────────────────────────────────────────────────────────────
//  A 2D Lenia kernel is a ring you can bake into a (2R+1)² image and read
//  back with a double loop. In four dimensions the neighbourhood is a
//  (2R+1)⁴ hyper-block — 6,561 cells at R=4 — and looping all of it per
//  fragment is mostly wasted work, since only the ~⅓ that fall inside the
//  unit 4-ball carry any weight.
//
//  So instead of a dense kernel image we precompute a *sparse tap list*:
//  enumerate the hyper-block once on the CPU, keep only the offsets whose
//  radial weight is non-negligible, normalise, and hand the shader a flat
//  list of (offset, weight) it can loop straight down. At R=4 this is 1064
//  taps for a single-shell kernel — a 6× cull — and it makes the SIM shader
//  a single flat loop whose length is a compile-time constant, independent
//  of dimension. Bumping to a genuine 5-D lattice later is "enumerate a
//  (2R+1)⁵ block and widen the offset texture", nothing structural.
//
//  Packing: two RGBA32F textures of size tapCount×1.
//    offTex[i].xyzw = integer offset (dx,dy,dz,dw)   (stored as float)
//    wTex[i].r      = normalised weight
//  The SIM shader texelFetches both at column i.
//
//  Radial profile is Lenia's exponential bump, split into `beta.length`
//  concentric shells exactly as Lenia Expanded's buildKernel does, so a
//  β=[1] kernel is a solid 4-ball, β=[1/2,1] is a shell-heavy annulus, and
//  β=[1/12,1/6,1] recovers the three-ring "ventilans" profile — now as a
//  real 4D convolution rather than an analytic slice.
// ═══════════════════════════════════════════════════════════════════════════

import { DIM } from "./hyperfield";

export type KernelData = {
  tapCount: number;
  offsets: Float32Array; // tapCount×4  (dx,dy,dz,dw,  padded per-texel RGBA)
  weights: Float32Array; // tapCount×4  (weight in .r, rest 0)
  R: number;
  beta: number[];
};

export const KERNEL_PROFILES: Record<string, number[]> = {
  ball: [1],
  shell: [0.5, 1],
  ventilans: [1 / 12, 1 / 6, 1],
};

export type KernelProfileId = keyof typeof KERNEL_PROFILES;

// Lenia's smooth bump, zero at r=0 and r=1, peak at r=0.5.
function kernelCore(r: number): number {
  if (r <= 0 || r >= 1) return 0;
  return Math.exp(4 - 4 / (4 * r * (1 - r)));
}

/**
 * Enumerate the D-dimensional hyper-block [-R,R]^D, keep the taps inside the
 * unit hyperball with non-negligible weight, normalise to unit sum, and pack
 * into the two RGBA32F payloads the SIM shader reads.
 *
 * Written dimension-generically (loops over DIM); the shipped SIM shader
 * consumes the first four offset components, so DIM=4 is the live path.
 */
export function buildHyperKernel(R: number, beta: number[]): KernelData {
  const span = 2 * R + 1;
  const total = span ** DIM;
  const B = beta.length;

  const offList: number[][] = [];
  const wList: number[] = [];
  let sum = 0;

  const off = new Array(DIM).fill(0);
  for (let n = 0; n < total; n++) {
    let m = n;
    let r2 = 0;
    for (let d = 0; d < DIM; d++) {
      const v = (m % span) - R;
      off[d] = v;
      m = Math.floor(m / span);
      r2 += v * v;
    }
    const r = Math.sqrt(r2) / R;
    if (r <= 0 || r >= 1) continue;
    const bin = Math.min(Math.floor(r * B), B - 1);
    const wgt = beta[bin] * kernelCore(r * B - bin);
    if (wgt < 1e-7) continue;
    offList.push(off.slice());
    wList.push(wgt);
    sum += wgt;
  }

  const tapCount = offList.length;
  const offsets = new Float32Array(tapCount * 4);
  const weights = new Float32Array(tapCount * 4);
  for (let i = 0; i < tapCount; i++) {
    const o = offList[i];
    offsets[i * 4 + 0] = o[0] ?? 0;
    offsets[i * 4 + 1] = o[1] ?? 0;
    offsets[i * 4 + 2] = o[2] ?? 0;
    offsets[i * 4 + 3] = o[3] ?? 0;
    weights[i * 4 + 0] = sum > 0 ? wList[i] / sum : 0;
  }

  return { tapCount, offsets, weights, R, beta };
}
