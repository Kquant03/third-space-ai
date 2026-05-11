// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Pond geometry (client side)
//  ─────────────────────────────────────────────────────────────────────────
//  Owns:
//    - the gourd SDF and helpers (must stay byte-identical to the
//      worker copy at worker/src/pondGeometry.ts)
//    - re-exports CAM and projection functions from ./pondCamera so
//      callers can pull "everything geometry" from this one module
//    - emits POND_SDF_GLSL and CAMERA_GLSL strings for shader inlining,
//      with constants templated from the canonical TS values so the
//      WebGL shader and the JS implementations cannot drift
//
//  The Next.js client and the Cloudflare Worker live in separate
//  source trees with no shared filesystem path. The SDF block is
//  duplicated here and at worker/src/pondGeometry.ts; the two must
//  stay in lockstep until the monorepo grows a shared package both
//  sides can import from. A small CI check that diffs the SDF block
//  is the safety net.
//
//  Five duplicates were collapsed in May 2026: constants.ts (worker),
//  the LivingSubstrate GLSL, PondDiagnostic, page.tsx, and the inline
//  gourdSDF at usePond.ts:1059. Any consumer with its own SDF copy is
//  a regression.
// ═══════════════════════════════════════════════════════════════════════════

import { CAM } from "./pondCamera";

// Re-export the canonical camera + projection so callers can pull
// "geometry plus projection" from one module. Don't duplicate — the
// originals in pondCamera.ts have battle-tested bug fixes (the
// `pondY` parameter on pondToScreen is critical for label drift).
export {
  CAM,
  clientToViewport,
  viewportToPondXZ,
  pondToScreen,
} from "./pondCamera";

// ───────────────────────────────────────────────────────────────────
//  Constants — must match worker/src/pondGeometry.ts byte-for-byte
// ───────────────────────────────────────────────────────────────────

export const GOURD = {
  basinA: { cx: -1.0, cz: 0.0, r: 3.5 },
  basinB: { cx:  1.8, cz: 0.4, r: 2.2 },
  k: 0.9,
} as const;

export const POND = {
  radius: 5.0,
  maxDepth: 3.0,
  shelfSdfMin: -1.8,
  shelfSdfMax: -0.2,
  adultSwimDepth: -1.2,
  shrine: { x: 0.2, y: -2.4, z: -0.2 },
  bbMinX: -4.6,
  bbMaxX:  4.1,
  bbMinZ: -3.6,
  bbMaxZ:  3.6,
  gourd: GOURD,
} as const;

// ───────────────────────────────────────────────────────────────────
//  SDF — keep byte-identical to worker/src/pondGeometry.ts
// ───────────────────────────────────────────────────────────────────

/** Signed distance to the pond boundary in top-down pond-XZ meters.
 *  Negative inside, positive outside. Zero at the rim.
 *
 *  The smooth-min term is `mix(dB, dA, h)` = `dB*(1-h) + dA*h` — dB
 *  carries the (1-h) coefficient. Inverting these turns smooth-min
 *  into smooth-max and reduces the gourd to a small lens at the
 *  basin intersection. */
export function pondSDF(x: number, z: number): number {
  const a = GOURD.basinA;
  const b = GOURD.basinB;
  const k = GOURD.k;
  const dA = Math.hypot(x - a.cx, z - a.cz) - a.r;
  const dB = Math.hypot(x - b.cx, z - b.cz) - b.r;
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (dB - dA) / k));
  return dB * (1 - h) + dA * h - k * h * (1 - h);
}

export function pondSDFGradient(
  x: number, z: number, eps = 0.05,
): { gx: number; gz: number } {
  const gx = (pondSDF(x + eps, z) - pondSDF(x - eps, z)) / (2 * eps);
  const gz = (pondSDF(x, z + eps) - pondSDF(x, z - eps)) / (2 * eps);
  return { gx, gz };
}

export function isInsidePond(x: number, z: number, margin = 0.12): boolean {
  return pondSDF(x, z) < -margin;
}

export function onShelf(x: number, z: number): boolean {
  const s = pondSDF(x, z);
  return s >= POND.shelfSdfMin && s <= POND.shelfSdfMax;
}

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

export function waterDepthAt(x: number, z: number): number {
  const s = pondSDF(x, z);
  if (s >= 0) return 0;
  const t = Math.max(0, Math.min(1, -s / 3.5));
  return 0.2 + t * (3.0 - 0.2);
}

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

// ───────────────────────────────────────────────────────────────────
//  GLSL strings — inlined into shader compilations at build time so
//  the WebGL pondSDF and the camera projection are byte-identical to
//  the TS implementations above (and to pondCamera.ts).
//
//  Use: in LivingSubstrate.tsx, replace any inlined gourd / pondSDF /
//  camera GLSL with template substitution:
//
//    const FRAG = `#version 300 es
//      ...
//      ${POND_SDF_GLSL}
//      ${CAMERA_GLSL}
//      ...
//    `;
// ───────────────────────────────────────────────────────────────────

export const GOURD_GLSL_DEFS = `
const vec2  GOURD_A_C = vec2(${GOURD.basinA.cx.toFixed(3)}, ${GOURD.basinA.cz.toFixed(3)});
const float GOURD_A_R = ${GOURD.basinA.r.toFixed(3)};
const vec2  GOURD_B_C = vec2(${GOURD.basinB.cx.toFixed(3)}, ${GOURD.basinB.cz.toFixed(3)});
const float GOURD_B_R = ${GOURD.basinB.r.toFixed(3)};
const float GOURD_K   = ${GOURD.k.toFixed(3)};
`;

export const POND_SDF_GLSL = `
${GOURD_GLSL_DEFS}
float pondSDF(vec2 p) {
  float dA = length(p - GOURD_A_C) - GOURD_A_R;
  float dB = length(p - GOURD_B_C) - GOURD_B_R;
  float h  = clamp(0.5 + 0.5 * (dB - dA) / GOURD_K, 0.0, 1.0);
  return mix(dB, dA, h) - GOURD_K * h * (1.0 - h);
}
`;

/** Camera projection in GLSL — exact match to pondCamera.ts:
 *    - vx ∈ [-aspect/2, +aspect/2], vy ∈ [-0.5, +0.5]
 *    - camera-space ray normalized BEFORE rotation
 *    - inverse pitch around X-axis: y' = c*y + s*z, z' = -s*y + c*z */
export const CAMERA_GLSL = `
const float CAM_HEIGHT = ${CAM.HEIGHT.toFixed(3)};
const float CAM_BACK   = ${CAM.BACK.toFixed(3)};
const float CAM_TILT   = ${CAM.TILT.toFixed(3)};
const float CAM_FOV_Y  = ${CAM.FOV_Y.toFixed(3)};

vec2 viewportToPondXZ(vec2 vp) {
  float fy = tan(CAM_FOV_Y * 0.5);
  vec3 dc0 = vec3(vp.x * 2.0 * fy, vp.y * 2.0 * fy, -1.0);
  vec3 dc  = normalize(dc0);
  float cT = cos(CAM_TILT);
  float sT = sin(CAM_TILT);
  vec3 dw  = vec3(
    dc.x,
    cT * dc.y + sT * dc.z,
   -sT * dc.y + cT * dc.z
  );
  float t = -CAM_HEIGHT / dw.y;
  return vec2(0.0 + t * dw.x, CAM_BACK + t * dw.z);
}

// pondXYZ.x = pond_x meters, pondXYZ.y = pond_z meters,
// pondXYZ.z = pond_y depth (negative going down). Callers tracking
// a fish must pass that fish's actual depth — passing 0 (water
// surface) drifts hundreds of pixels off the rendered body for fish
// near rims. Matches pondCamera.pondToScreen with explicit pondY.
vec4 pondToClip(vec3 pondXYZ, float aspect) {
  float relX = pondXYZ.x;
  float relY = pondXYZ.z - CAM_HEIGHT;
  float relZ = pondXYZ.y - CAM_BACK;
  float cT = cos(CAM_TILT);
  float sT = sin(CAM_TILT);
  vec3 cam = vec3(
    relX,
    cT * relY - sT * relZ,
    sT * relY + cT * relZ
  );
  float fy = tan(CAM_FOV_Y * 0.5);
  float fx = fy * aspect;
  return vec4(cam.x / fx, cam.y / fy, cam.z, -cam.z);
}
`;
