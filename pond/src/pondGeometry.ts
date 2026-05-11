// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Pond geometry (worker side)
//  ─────────────────────────────────────────────────────────────────────────
//  Owns the canonical gourd SDF and its helpers. Pure server math —
//  no CAM, no GLSL strings, no projection. The worker is authoritative
//  for kinematic containment and never renders.
//
//  This file's contents must stay byte-identical to the SDF section of
//  the client-side `lib/pondGeometry.ts` (which adds CAM re-exports
//  from pondCamera and emits the GLSL strings the WebGL shader inlines
//  at build time). Until the monorepo grows a shared-types package
//  reachable from both sides, the two copies are kept in lockstep
//  manually. A small CI check that diffs the SDF block of both files
//  is the safety net.
//
//  Five duplicates were collapsed into this single SDF when the cleanup
//  ran in May 2026: constants.ts, LivingSubstrate's GLSL,
//  PondDiagnostic, page.tsx, and the inline gourdSDF at usePond.ts:1059.
//  Any geometry change happens HERE (and in the client mirror); any
//  consumer with its own SDF copy is a regression.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
//  Constants
// ───────────────────────────────────────────────────────────────────

export const GOURD = {
  basinA: { cx: -1.0, cz: 0.0, r: 3.5 },
  basinB: { cx:  1.8, cz: 0.4, r: 2.2 },
  k: 0.9,
} as const;

export const POND = {
  /** Bounding radius in meters. */
  radius: 5.0,
  /** Maximum depth at the deep centroid of the larger basin. */
  maxDepth: 3.0,
  /** Shelf band — annular region just inside the rim where eggs lay. */
  shelfSdfMin: -1.8,
  shelfSdfMax: -0.2,
  /** Typical adult swim depth. */
  adultSwimDepth: -1.2,
  /** Shrine center — at the waist between the basins. */
  shrine: { x: 0.2, y: -2.4, z: -0.2 },
  /** Bounding box of the gourd, used for rejection sampling. */
  bbMinX: -4.6,
  bbMaxX:  4.1,
  bbMinZ: -3.6,
  bbMaxZ:  3.6,
  /** Geometry exposed for callers doing their own SDF math. */
  gourd: GOURD,
} as const;

// ───────────────────────────────────────────────────────────────────
//  SDF
// ───────────────────────────────────────────────────────────────────

/** Signed distance to the pond boundary in top-down pond-XZ meters.
 *  Negative inside, positive outside. Zero at the rim.
 *
 *  Implementation note: the smooth-min term is `mix(dB, dA, h)` =
 *  `dB*(1-h) + dA*h` — dB carries the (1-h) coefficient. Inverting
 *  these turns smooth-min into smooth-max and reduces the gourd to a
 *  small lens at the basin intersection. The previous inline copy in
 *  usePond carried the same warning; preserved here. */
export function pondSDF(x: number, z: number): number {
  const a = GOURD.basinA;
  const b = GOURD.basinB;
  const k = GOURD.k;
  const dA = Math.hypot(x - a.cx, z - a.cz) - a.r;
  const dB = Math.hypot(x - b.cx, z - b.cz) - b.r;
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (dB - dA) / k));
  return dB * (1 - h) + dA * h - k * h * (1 - h);
}

/** Numerical gradient of pondSDF (outward normal, un-normalized). */
export function pondSDFGradient(
  x: number, z: number, eps = 0.05,
): { gx: number; gz: number } {
  const gx = (pondSDF(x + eps, z) - pondSDF(x - eps, z)) / (2 * eps);
  const gz = (pondSDF(x, z + eps) - pondSDF(x, z - eps)) / (2 * eps);
  return { gx, gz };
}

/** True if (x, z) is strictly inside the pond, with a small margin. */
export function isInsidePond(x: number, z: number, margin = 0.12): boolean {
  return pondSDF(x, z) < -margin;
}

/** True if (x, z) is on the egg-laying shelf annulus. */
export function onShelf(x: number, z: number): boolean {
  const s = pondSDF(x, z);
  return s >= POND.shelfSdfMin && s <= POND.shelfSdfMax;
}

/** Project a point to the nearest interior point at least `margin`
 *  meters from the pond rim. Uses the SDF gradient as outward normal. */
export function clampToPond(
  x: number, z: number, margin = 0.12,
): { x: number; z: number } {
  const s = pondSDF(x, z);
  if (s < -margin) return { x, z };
  const { gx, gz } = pondSDFGradient(x, z);
  const gmag = Math.hypot(gx, gz) + 1e-6;
  const nx = gx / gmag;
  const nz = gz / gmag;
  const pushIn = s + margin;
  return { x: x - nx * pushIn, z: z - nz * pushIn };
}

/** Water depth at (x, z). Max at the deep centroid, 0.2 at the rim. */
export function waterDepthAt(x: number, z: number): number {
  const s = pondSDF(x, z);
  if (s >= 0) return 0;
  const t = Math.max(0, Math.min(1, -s / 3.5));
  return 0.2 + t * (3.0 - 0.2);
}

/** Rejection-sample a point inside the pond. */
export function samplePointInPond(
  rand: () => number, margin = 0.15,
): { x: number; z: number } {
  for (let i = 0; i < 64; i++) {
    const x = POND.bbMinX + rand() * (POND.bbMaxX - POND.bbMinX);
    const z = POND.bbMinZ + rand() * (POND.bbMaxZ - POND.bbMinZ);
    if (pondSDF(x, z) < -margin) return { x, z };
  }
  return { x: GOURD.basinA.cx, z: GOURD.basinA.cz };
}

/** Rejection-sample a point on the egg-laying shelf. */
export function samplePointOnShelf(
  rand: () => number,
): { x: number; z: number } {
  for (let i = 0; i < 128; i++) {
    const x = POND.bbMinX + rand() * (POND.bbMaxX - POND.bbMinX);
    const z = POND.bbMinZ + rand() * (POND.bbMaxZ - POND.bbMinZ);
    if (onShelf(x, z)) return { x, z };
  }
  return { x: GOURD.basinA.cx - 3.0, z: GOURD.basinA.cz };
}
