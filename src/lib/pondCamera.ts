// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Camera projection (depth-aware)
//  ─────────────────────────────────────────────────────────────────────────
//  Canonical pond ↔ screen projection. Mirror of CAMERA_GLSL in
//  LivingSubstrate.tsx; the GLSL and JS sources MUST agree byte-for-byte
//  on math. Used by:
//    - app/limen-pond/page.tsx          click hit-testing, pebble targeting,
//                                       hover-name label positioning
//    - app/components/PondWhispers.tsx  utterance overlay positioning
//    - any DOM element placed against pond-meter coordinates
//
//  Convention:
//    Pond space     — x, z in meters on the y=0 plane (water surface),
//                     y in meters depth (negative going down).
//    Viewport space — x ∈ [-aspect/2, +aspect/2], y ∈ [-0.5, +0.5].
//    NDC            — x, y ∈ [-1, +1]. Output of forward projection.
//    Screen space   — pixel coords, top-left origin, y down (CSS / DOM).
//
//  Bug history:
//    1) viewportToPondXZ used `vp.x * 2 * fx` (aspect applied twice).
//       Fixed: both axes use fy. Matching GLSL fix in CAMERA_GLSL.
//    2) pondToScreen mis-converted NDC to fractional screen coords —
//       used `vx / aspect + 0.5` instead of `vx * 0.5 + 0.5`.
//       Fixed: standard NDC → fractional screen mapping.
//    3) pondToScreen assumed pondY=0 (surface) for all calls. The koi
//       vertex shader projects from the fish's actual depth, so DOM
//       overlays placed via pondToScreen(pondX, pondZ, ...) drifted
//       hundreds of pixels above the rendered koi bodies — labels and
//       whispers floated above the fish, and fish near rims rendered
//       far enough below the surface projection to slide off-screen.
//       Fixed: optional pondY parameter (default 0). Callers tracking
//       fish should pass the fish's actual depth.
// ═══════════════════════════════════════════════════════════════════════════

export const CAM = {
  HEIGHT: 2.6,
  BACK:   6.0,
  TILT:   0.52,
  FOV_Y:  0.785,
} as const;

/** Convert client (mouse) coordinates to viewport-space.
 *  Output: vx ∈ [-aspect/2, +aspect/2], vy ∈ [-0.5, +0.5]. */
export function clientToViewport(
  clientX: number, clientY: number, W: number, H: number,
): { vx: number; vy: number; aspect: number } {
  const aspect = W / H;
  const u = clientX / W - 0.5;
  const v = 0.5 - clientY / H;
  return { vx: u * aspect, vy: v, aspect };
}

/** Inverse projection: viewport → pond on the y=0 plane.
 *
 *  Returns null if the viewport ray points up or parallel to the water
 *  surface (no plane intersection).
 *
 *  CRITICAL: vx is in [-aspect/2, +aspect/2] — its range already carries
 *  the aspect correction. Both axes use fy (NOT fx) here. */
export function viewportToPondXZ(
  vx: number, vy: number, aspect: number,
): { x: number; z: number } | null {
  void aspect;  // signature kept for backward compat; aspect not needed.
  const fy = Math.tan(CAM.FOV_Y * 0.5);
  const dcx0 = vx * 2.0 * fy;
  const dcy0 = vy * 2.0 * fy;
  const dcz0 = -1.0;
  const m = Math.hypot(dcx0, dcy0, dcz0);
  const dcx = dcx0 / m, dcy = dcy0 / m, dcz = dcz0 / m;
  const cT = Math.cos(CAM.TILT);
  const sT = Math.sin(CAM.TILT);
  const dwx = dcx;
  const dwy =  cT * dcy + sT * dcz;
  const dwz = -sT * dcy + cT * dcz;
  if (dwy >= -1e-4) return null;
  const t = -CAM.HEIGHT / dwy;
  const x = 0.0 + t * dwx;
  const z = CAM.BACK + t * dwz;
  return { x, z };
}

/** Forward projection: pond meters (x, z, y) → screen pixels.
 *
 *  Origin top-left, x rightward, y downward (CSS / DOM convention).
 *  Returns null if the point is behind the camera.
 *
 *  pondY defaults to 0 (water surface). Callers placing DOM elements
 *  to track a fish must pass that fish's actual depth — otherwise the
 *  overlay lands at the surface point above the fish, which is hundreds
 *  of pixels off from where the koi shader renders the body. See bug
 *  #3 in the header. */
export function pondToScreen(
  pondX: number, pondZ: number, W: number, H: number,
  pondY: number = 0,
): { sx: number; sy: number } | null {
  const aspect = W / H;
  const relX = pondX;
  const relY = pondY - CAM.HEIGHT;
  const relZ = pondZ - CAM.BACK;
  const cT = Math.cos(CAM.TILT);
  const sT = Math.sin(CAM.TILT);
  const camX = relX;
  const camY = cT * relY - sT * relZ;
  const camZ = sT * relY + cT * relZ;
  if (camZ >= -1e-4) return null;
  const fy = Math.tan(CAM.FOV_Y * 0.5);
  const fx = fy * aspect;
  const invNegZ = 1.0 / -camZ;
  const ndcX = (camX / fx) * invNegZ;
  const ndcY = (camY / fy) * invNegZ;
  const u = ndcX * 0.5 + 0.5;
  const v = 0.5 - ndcY * 0.5;
  return { sx: u * W, sy: v * H };
}
