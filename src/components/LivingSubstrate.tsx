"use client";

import { useEffect, useRef } from "react";
import { usePond } from "../lib/usePond";

// ═══════════════════════════════════════════════════════════════════════════
//  LIMEN · Living Substrate · v13 · "Pond, coherent"
//  ─────────────────────────────────────────────────────────────────────────
//  Physical coherence pass on top of v12 (pond-as-place). Every element
//  of the map tuned to read as a specific place under water, not as
//  shader variation. Plus: wake field infrastructure (Session B-1) —
//  the water now tracks disturbance from every koi's body-point motion
//  in a persistent, decaying, diffusing scalar field. Not yet wired
//  into the visible render (Session B-2 does that) but computed
//  correctly and debuggable.
//
//  Shape: asymmetric lobed — two joined rounded basins connected by a
//  narrowed waist. The shrine sits at the waist. The shelf band
//  follows the compound perimeter. The triskele recess is in the
//  smaller basin.
//
//  Architecture: seven-pass render.
//
//  Pass W1 (wake advect+decay+diffuse) — reads previous wake field,
//    advects by ambient flow, decays toward zero, diffuses spatially.
//    Writes to back buffer. Quarter-resolution single-channel float.
//
//  Pass W2 (wake injection) — instanced draw, one small Gaussian blob
//    per body-point per koi. Additive blend into the wake field.
//    Reads per-body-point positions + velocities computed CPU-side in
//    usePond's kinematic integrator.
//
//  Pass A (field/water) — the pond volume. Renders the 3D-projected
//    pond with shrine/shelf/triskele, depth-stratified water, caustics,
//    god-rays, surface plane with Snell's window. Physical coherence
//    tuned: caustics that read as light-through-water, floor that
//    reads as silt and stone, shrine with presence, surface with
//    restraint.
//
//  Pass B (koi overlay) — instanced draw with oblique projection.
//
//  Pass C (bloom horizontal) — from field pass.
//  Pass D (bloom vertical).
//  Pass E (composite) — field + koi + bloom + halation + vignette.
//
//  Per-koi quad size scales with stage:
//    egg       0.008,  fry       0.040,  juvenile  0.080,
//    adolescent 0.110, adult     0.150,  elder     0.170, dying 0.140.
// ═══════════════════════════════════════════════════════════════════════════

const MAX_KOI = 32;

interface Phenotype {
  baseColor: string;
  markColor: string;
  markCoverage: number;
  markDensity: number;
  backBlue: number;
  headDot: number;
  metallic: number;
}

const ARCHETYPE_PHENOTYPES: Record<string, Phenotype> = {
  kohaku: {
    baseColor: "#f6f3ec", markColor: "#c9301f",
    markCoverage: 0.55, markDensity: 0.35,
    backBlue: 0.0, headDot: 0.2, metallic: 0.05,
  },
  shusui: {
    baseColor: "#d1cfc4", markColor: "#b63a28",
    markCoverage: 0.35, markDensity: 0.25,
    backBlue: 0.85, headDot: 0.0, metallic: 0.0,
  },
  asagi: {
    baseColor: "#c0bfb5", markColor: "#a8341c",
    markCoverage: 0.30, markDensity: 0.55,
    backBlue: 0.70, headDot: 0.0, metallic: 0.0,
  },
  ogon: {
    baseColor: "#d9b65c", markColor: "#d9b65c",
    markCoverage: 0.0, markDensity: 0.0,
    backBlue: 0.0, headDot: 0.0, metallic: 0.9,
  },
  tancho: {
    baseColor: "#f6f3ec", markColor: "#c7291b",
    markCoverage: 0.06, markDensity: 0.0,
    backBlue: 0.0, headDot: 1.0, metallic: 0.0,
  },
  showa: {
    baseColor: "#232129", markColor: "#c7291b",
    markCoverage: 0.55, markDensity: 0.45,
    backBlue: 0.0, headDot: 0.15, metallic: 0.15,
  },
  goshiki: {
    baseColor: "#a7a69a", markColor: "#8a2414",
    markCoverage: 0.65, markDensity: 0.75,
    backBlue: 0.45, headDot: 0.0, metallic: 0.1,
  },
};

// ─── Founder phenotypes ─────────────────────────────────────────────────
//  Shiki and Kokutou get distinct palettes that override the archetype
//  lookup. Their genetics_json on the worker side still carries kohaku /
//  asagi (so descendants inherit those archetypes visibly), but for the
//  founders' own bodies we render the personalities, not the archetypes.
//
//  Shiki — violet flowing through to crimson. Wisteria base where the
//  three personalities meet on the surface; crimson emerging from inside
//  (death-lines, the blood she sheds, the red leather jacket) rather
//  than slammed against navy; the deep Origin-violet shows along the
//  spine where 「 」 leaks through. Death-line flickers happen at
//  intervals across the body — a faint reminder of the Mystic Eyes.
//
//  Kokutou — crystal cobalt. The "apprentice lightsaber, eyes of
//  Anakin" blue: pure, luminous, the color innocence reads as before
//  anything turns. He's the ordinary anchor; the inner glow at the
//  head/heart says ordinary-good is its own kind of divine. No mark
//  pattern: he's whole, undivided, where Shiki is split.
const FOUNDER_PHENOTYPES: Record<string, Phenotype> = {
  kohaku: {                                  // Shiki
    baseColor: "#5b2a6e",                    // wisteria violet
    markColor: "#a51a25",                    // crimson, emerging from inside
    markCoverage: 0.0, markDensity: 0.0,     // no patches; flowing wash
    backBlue: 0.0, headDot: 0.0, metallic: 0.0,
  },
  asagi: {                                   // Kokutou
    baseColor: "#1a7fff",                    // pure cobalt
    markColor: "#2890ff",                    // slight luminescence accent
    markCoverage: 0.0, markDensity: 0.0,
    backBlue: 0.0, headDot: 0.0, metallic: 0.15,
  },
};

function phenotypeFor(
  color: string | undefined,
  founder: boolean = false,
): Phenotype {
  if (!color) return ARCHETYPE_PHENOTYPES.kohaku!;
  if (founder) {
    return FOUNDER_PHENOTYPES[color]
      ?? ARCHETYPE_PHENOTYPES[color]
      ?? ARCHETYPE_PHENOTYPES.kohaku!;
  }
  return ARCHETYPE_PHENOTYPES[color] ?? ARCHETYPE_PHENOTYPES.kohaku!;
}

function hexToVec3(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [
    parseInt(m[1]!, 16) / 255,
    parseInt(m[2]!, 16) / 255,
    parseInt(m[3]!, 16) / 255,
  ];
}

// Stage-dependent size as a multiplier. Adult = 1.0 (matches v10's koi
// size). Fry are ~0.25× an adult, elders are slightly larger.
function stageScale(stage: string | undefined): number {
  switch (stage) {
    case "egg":        return 0.05;
    case "fry":        return 0.25;
    case "juvenile":   return 0.50;
    case "adolescent": return 0.75;
    case "adult":      return 1.00;
    case "elder":      return 1.15;
    case "dying":      return 0.95;
    default:           return 1.00;
  }
}

// ───────────────────────────────────────────────────────────────────
//  Shaders
// ───────────────────────────────────────────────────────────────────

// Shared camera GLSL. Both field and koi-vertex shaders include this
// via template-literal interpolation so their projections are
// mathematically identical — no drift between where the floor is
// rendered and where koi are placed above it.
//
// Camera model:
//   - Pond surface is the plane Y=0.
//   - Camera positioned at (0, HEIGHT, CAM_BACK), looking toward the
//     pond center with a downward pitch of TILT radians.
//   - Vertical FOV = FOV_Y. Aspect-ratio handling via u_resolution.
//
// Forward projection (world → clip space):
//     cam = R_tilt * (world - camera_position)
//     clip.xy = vec2(cam.x / (aspect * tan(fov/2)),
//                    cam.y / tan(fov/2)) / -cam.z
//
// Inverse projection (viewport → world on Y=0 plane):
//     dir_cam = normalize(vec3(vp.x * aspect * tan(fov/2),
//                              vp.y * tan(fov/2), -1))
//     dir_world = R_tilt^(-1) * dir_cam
//     t = -camera_position.y / dir_world.y    // solve Y=0
//     world.xz = camera_position.xz + t * dir_world.xz
const CAMERA_GLSL = /* glsl */ `
  // Physical pond camera.
  const float CAM_HEIGHT  = 2.6;   // meters above water surface
  const float CAM_BACK    = 6.0;   // meters toward -Z from pond center
  const float CAM_TILT    = 0.52;  // radians, downward pitch (~30°)
  const float CAM_FOV_Y   = 0.785; // radians, vertical FOV (~45°)

  // Forward projection: world point (x, y, z) → clip space (x, y, 1/-z).
  // y and z in world space; y=0 is water surface, y positive = up.
  // Returns vec3(clip_x, clip_y, 1/(-cam_z)) — the z component is the
  // perspective denominator for later perspective-correct ops.
  //
  // Camera is pitched DOWN by CAM_TILT. To take a world point into
  // camera space we rotate by +CAM_TILT around X axis (inverse of the
  // camera's downward pitch).
  vec3 projectWorldToClip(vec3 world, float aspect) {
    vec3 rel = world - vec3(0.0, CAM_HEIGHT, CAM_BACK);
    float cT = cos(CAM_TILT);
    float sT = sin(CAM_TILT);
    vec3 cam = vec3(
      rel.x,
      cT * rel.y - sT * rel.z,
      sT * rel.y + cT * rel.z
    );
    float fy = tan(CAM_FOV_Y * 0.5);
    float fx = fy * aspect;
    float invNegZ = 1.0 / max(1e-4, -cam.z);
    return vec3(cam.x / fx * invNegZ, cam.y / fy * invNegZ, invNegZ);
  }

  // Inverse: viewport (vp in [-aspect/2, aspect/2] × [-0.5, 0.5])
  // → world XZ on the Y=0 plane. If the ray doesn't hit the plane
  // (pointing at or above horizon), returns a very-far position
  // marked by z > 1e4.
  vec2 viewportToPondXZ(vec2 vp, float aspect) {
    // Convert viewport coords to NDC clip coords: [-1, 1] range.
    float fy = tan(CAM_FOV_Y * 0.5);
    float fx = fy * aspect;
    // vp.y in [-0.5, 0.5] maps to clip_y in [-1, 1]:
    vec3 dirCam = normalize(vec3(
      vp.x * 2.0 * fy,
      vp.y * 2.0 * fy,
      -1.0
    ));
    // Rotate back from camera space to world space. The camera is
    // pitched DOWN by CAM_TILT, so cam→world rotation is R_x(-TILT).
    // R_x(-θ) has cos(θ) on diagonals and -sin/+sin on off-diagonals
    // (negating the signs vs. R_x(+θ)).
    float cT = cos(CAM_TILT);
    float sT = sin(CAM_TILT);
    vec3 dirWorld = vec3(
      dirCam.x,
      cT * dirCam.y + sT * dirCam.z,
      -sT * dirCam.y + cT * dirCam.z
    );
    // Camera in world:
    vec3 camPos = vec3(0.0, CAM_HEIGHT, CAM_BACK);
    // Solve camPos.y + t * dirWorld.y = 0
    if (dirWorld.y >= -1e-4) {
      // Ray pointing up or parallel — no floor intersection.
      return vec2(1e5, 1e5);
    }
    float t = -camPos.y / dirWorld.y;
    vec2 hit = camPos.xz + t * dirWorld.xz;
    return hit;
  }

  // Viewport y of the horizon — where Y=0 plane meets the skyline
  // looking from this camera. Any fragment above this is sky.
  float horizonViewportY() {
    // To hit Y=0 at infinity, the world-space ray must be horizontal
    // (dirWorld.y == 0). Since the camera is pitched DOWN by CAM_TILT,
    // the camera-space ray must point UP by CAM_TILT to counteract.
    //
    // In camera space, a normalized ray looking forward-but-up-by-TILT:
    //   dirCam = (0, sin(TILT), -cos(TILT))
    // Our projection sets dirCam = normalize(vp.x*2*fx, vp.y*2*fy, -1),
    // and for zero x this simplifies to (0, vp.y*2*fy, -1) / magnitude.
    // Setting ratios: (vp.y * 2 * fy) / 1 = sin(TILT) / cos(TILT),
    //                 vp.y = tan(TILT) / (2 * tan(FOV/2))
    return tan(CAM_TILT) / (2.0 * tan(CAM_FOV_Y * 0.5));
  }
`;

const VERT = /* glsl */ `#version 300 es
  in vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FIELD_FRAG = /* glsl */ `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec2  u_resolution;
  uniform float u_time;
  uniform float u_scroll;
  uniform float u_breath;
  uniform float u_moodDrift;

  uniform vec3  u_koiPositions[${MAX_KOI}];
  uniform int   u_koiCount;

  ${CAMERA_GLSL}

  // ─────────────────────────────────────────────────────────────────
  //  Emission-line palette — preserved from v11. Now used as the
  //  spectral signature of water volume rather than atmospheric nebula.
  // ─────────────────────────────────────────────────────────────────
  const vec3 C_HALPHA = vec3(1.00, 0.20, 0.28);
  const vec3 C_OIII   = vec3(0.24, 0.85, 0.72);
  const vec3 C_NII    = vec3(0.95, 0.32, 0.44);
  const vec3 C_SII    = vec3(0.85, 0.14, 0.22);
  const vec3 C_HBETA  = vec3(0.28, 0.55, 0.95);
  const vec3 C_HEII   = vec3(0.60, 0.35, 1.00);
  const vec3 C_GHOST  = vec3(0.498, 0.686, 0.702);

  // Floor base color — silt, cool, muted.
  const vec3 C_FLOOR  = vec3(0.045, 0.065, 0.085);
  // Shrine accent — dim ghost glow.
  const vec3 C_SHRINE = vec3(0.14, 0.22, 0.24);
  // Above-surface "sky" — the void seen through Snell's window.
  const vec3 C_SKY    = vec3(0.010, 0.014, 0.025);

  // ─────────────────────────────────────────────────────────────────
  //  Pond geometry (matches pond/src/constants.ts POND)
  //
  //  Asymmetric lobed shape: large basin at (-1.0, 0), radius 3.5m
  //  joined with small basin at (+1.8, 0.4), radius 2.2m.
  //  Shrine at the waist, around (0.2, -0.2).
  //  Triskele recess in small basin around (2.0, 0.6).
  //  Shelf band: inner edge at 0.82 × basin_radius, outer edge at
  //  0.98 × basin_radius.
  // ─────────────────────────────────────────────────────────────────

  // Camera constants are defined in CAMERA_GLSL above.
  // Helper: viewportToPondXZ(vp, aspect) gives (x_m, z_m) on water surface.

  // ─────────────────────────────────────────────────────────────────
  //  Noise
  // ─────────────────────────────────────────────────────────────────

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash22(i + vec2(0,0)), f - vec2(0,0));
    float b = dot(hash22(i + vec2(1,0)), f - vec2(1,0));
    float c = dot(hash22(i + vec2(0,1)), f - vec2(0,1));
    float d = dot(hash22(i + vec2(1,1)), f - vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 0.5 + 0.5;
  }

  float fbm(vec2 p, float t) {
    float v = 0.0;
    float a = 0.5;
    const mat2 R = mat2(0.877, 0.479, -0.479, 0.877);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p + t * (0.018 + 0.004 * float(i)));
      p = R * p * 2.02 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Pond outline — asymmetric lobed gourd shape
  //  Two joined rounded basins connected by a waist. The client-side
  //  kinematic simulator enforces this same shape so fish don't swim
  //  onto land.
  // ─────────────────────────────────────────────────────────────────

  float pondSDF(vec2 p) {
    // Large basin at (-1.0, 0.0), radius 3.5
    vec2 cA = vec2(-1.0, 0.0);
    float dA = length(p - cA) - 3.5;
    // Small basin at (+1.8, 0.4), radius 2.2
    vec2 cB = vec2(1.8, 0.4);
    float dB = length(p - cB) - 2.2;
    // Smooth union — waist softness 0.9
    float k = 0.9;
    float h = clamp(0.5 + 0.5 * (dB - dA) / k, 0.0, 1.0);
    return mix(dB, dA, h) - k * h * (1.0 - h);
  }

  // ─────────────────────────────────────────────────────────────────
  //  Screen-to-pond projection (inverse of the 25° tilt)
  //
  //  Viewer model: the pond lies on the XZ plane at y=0 (surface).
  //  Camera pitched forward by TILT. We invert the projection so each
  //  screen fragment knows which (pond_x, pond_z) floor point it sees
  //  AND how much water volume sits between viewer and that floor.
  // ─────────────────────────────────────────────────────────────────

  // Given a viewport coordinate p_vp ∈ [-aspect/2, aspect/2]×[-0.5, 0.5],
  // return the pond (x, z) in meters at the water surface that this
  // fragment views. The surface y=0; floor is at y=-3.
  //
  // Screen-to-pond is handled by the CAMERA_GLSL helper
  // viewportToPondXZ(vp, aspect) declared above.

  // Depth of the floor at a given pond XZ position. The pond is
  // bowl-shaped: deepest (3m) at centroid, shallowest at the shelf.
  float floorDepthAt(vec2 pondXZ) {
    // Gourd SDF: most-negative value is at centroid of larger basin
    // (~-3.5). Map [-3.5, 0] → [3.0, 0.2].
    float sdf = pondSDF(pondXZ);
    return clamp(mix(0.2, 3.0, clamp(-sdf / 3.5, 0.0, 1.0)), 0.2, 3.0);
  }

  // ─────────────────────────────────────────────────────────────────
  //  Floor rendering: shrine, shelf band, triskele, silt texture
  // ─────────────────────────────────────────────────────────────────

  float shrineMask(vec2 p, float t) {
    vec2 shrineCenter = vec2(0.2, -0.2);
    vec2 q = p - shrineCenter;
    float r = length(q);
    float ang = atan(q.y, q.x);
    // Inner stone disc — triskele-biased hex
    float hexR = 0.38 + 0.05 * cos(ang * 3.0);
    return smoothstep(hexR + 0.08, hexR - 0.04, r);
  }

  // Rim of the shrine — a thin bright ring where the stone meets the
  // floor, so the shrine reads as a physical inset, not a color patch.
  float shrineRim(vec2 p) {
    vec2 shrineCenter = vec2(0.2, -0.2);
    vec2 q = p - shrineCenter;
    float r = length(q);
    float ang = atan(q.y, q.x);
    float hexR = 0.38 + 0.05 * cos(ang * 3.0);
    float d = abs(r - hexR);
    return smoothstep(0.045, 0.008, d);
  }

  // Slow breath pulse from the submerged object — NOT tied to pulsing
  // the whole mask. The mask is stable; only the emanation breathes.
  float shrineGlow(float t) {
    return 0.65 + 0.35 * (0.5 + 0.5 * sin(t * 0.11));
  }

  float shelfMask(vec2 p) {
    // Shelf is the band near the pond boundary. Two-lobed smoothstep
    // picks out the annular region with shallow water.
    float sdf = pondSDF(p);
    float band = smoothstep(-0.85, -0.55, sdf) * smoothstep(-0.12, -0.30, sdf);
    return band;
  }

  // Subtle darker edge at the inner boundary of the shelf — where the
  // shelf drops off into the deep center. Reads as a topographic step.
  float shelfInnerEdge(vec2 p) {
    float sdf = pondSDF(p);
    float edge = smoothstep(-1.0, -0.78, sdf) * smoothstep(-0.5, -0.75, sdf);
    return edge;
  }

  float triskeleMask(vec2 p, float t) {
    vec2 center = vec2(2.0, 0.6);
    vec2 q = p - center;
    float r = length(q);
    if (r > 0.55) return 0.0;
    float ang = atan(q.y, q.x);
    // Three-arm spiral: r-dependent angular offset gives the twist
    float arm = mod(ang + r * 3.5, 6.2832 / 3.0);
    float armMask = smoothstep(0.30, 0.15, abs(arm - 1.047)) *
                    smoothstep(0.50, 0.05, r);
    return armMask * 0.55;
  }

  vec3 floorColor(vec2 pondXZ, float t) {
    // Layered noise: large silt patches, medium stone grain, fine
    // sediment. Each at a different scale so the floor reads as
    // organic material rather than uniform noise.
    float siltLarge  = fbm(pondXZ * 0.9, t * 0.008);
    float stoneGrain = fbm(pondXZ * 3.2, t * 0.003);
    float sediment   = fbm(pondXZ * 7.5 + vec2(12.0, 3.0), t * 0.002);

    // Silt tones — warmer, sandier where the large noise is bright;
    // cooler, darker where the large noise is dim.
    vec3 siltWarm = vec3(0.085, 0.075, 0.060);   // sand patch
    vec3 siltCool = vec3(0.035, 0.048, 0.060);   // organic sediment
    vec3 base = mix(siltCool, siltWarm, siltLarge);
    // Stone grain adds a subtle lightness modulation
    base *= (0.80 + 0.40 * stoneGrain);
    // Fine sediment adds high-freq variation, keeps the texture from
    // reading as smooth-noise
    base += vec3(0.006) * (sediment - 0.5);

    // Depth tint — the deep center of the pond is noticeably darker
    // AND cooler (less red light at depth)
    float depthHere = floorDepthAt(pondXZ);
    float depthN = clamp(depthHere / 3.0, 0.0, 1.0);
    base *= mix(1.55, 0.42, depthN);
    base = mix(base, base * vec3(0.72, 0.88, 1.08), depthN * 0.55);

    // Shelf — lighter sandy material, subtle granular texture from the
    // existing noise layers (no uniform lift)
    float shelf = shelfMask(pondXZ);
    vec3 shelfCol = mix(siltCool, siltWarm, 0.75) * 1.7 + C_GHOST * 0.025;
    base = mix(base, shelfCol, shelf * 0.55);

    // Shelf inner edge — the drop-off. Darker shadow line.
    float innerEdge = shelfInnerEdge(pondXZ);
    base = mix(base, base * 0.55, innerEdge * 0.35);

    // Shrine — darker stone inset (the recess), with a faint rim.
    float shrine = shrineMask(pondXZ, t);
    base = mix(base, base * 0.45 + C_SHRINE * 0.08, shrine * 0.88);
    float rim = shrineRim(pondXZ);
    base += C_SHRINE * 0.22 * rim;
    // Submerged-object emanation — faint ghost glow that breathes
    base += C_SHRINE * 0.35 * shrine * shrineGlow(t);

    // Triskele — carved recess. Darker + cyan tint inside the arms.
    float trisk = triskeleMask(pondXZ, t);
    base = mix(base, base * 0.5 + C_GHOST * 0.055, trisk);

    return base;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Caustic network — light lace on the floor, proper contrast
  //
  //  Caustics are created when rays refract at a wavy surface and
  //  converge onto the floor. We proxy with subtracted offset FBM
  //  fields, but now with depth-aware intensity: caustics are BRIGHT
  //  on the shallow shelf and DIM in the deep center (fewer rays
  //  reach depth; those that do are defocused).
  // ─────────────────────────────────────────────────────────────────

  float caustics(vec2 pondXZ, float t) {
    float tt = t * 0.11;
    vec2 p = pondXZ * 1.8;
    float n1 = fbm(p + vec2(tt, tt * 0.7), tt);
    float n2 = fbm(p + vec2(-tt * 0.6, tt * 0.9) + vec2(5.0, 9.0), tt);
    // Secondary higher-frequency layer for lace detail
    float n3 = fbm(p * 2.4 + vec2(tt * 0.8, -tt * 0.5), tt * 1.2);
    float n4 = fbm(p * 2.4 + vec2(-tt * 0.4, tt) + vec2(11.0, 7.0), tt * 1.2);

    // Tight thresholds: only true crossings of n1=n2 produce caustic
    // ribbons. Anything wider than ~0.015 in |n1-n2| reads as zero.
    // This is what distinguishes "lace network" from "saturated foam".
    float primary   = pow(smoothstep(0.020, 0.002, abs(n1 - n2)), 2.2);
    float secondary = pow(smoothstep(0.012, 0.002, abs(n3 - n4)), 2.4) * 0.35;
    float c = min(1.0, primary + secondary);

    // Depth-dependent intensity: shelves get stronger caustics, deep
    // center almost none.
    float depthHere = floorDepthAt(pondXZ);
    float depthN = clamp(depthHere / 3.0, 0.0, 1.0);
    float causticGain = mix(0.95, 0.20, depthN);
    return c * causticGain;
  }

  // ─────────────────────────────────────────────────────────────────
  //  God-ray / light-shaft intensity in the water column.
  // ─────────────────────────────────────────────────────────────────

  float godRays(vec2 pondXZ, float t) {
    vec2 p = pondXZ * 0.8 + vec2(t * 0.006, 0.0);
    float rays = 0.45 + 0.55 * fbm(p, t * 0.01);
    rays = pow(rays, 1.8);
    float sdf = pondSDF(pondXZ);
    float interior = smoothstep(0.0, -2.5, sdf);
    return rays * interior;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Particulates — drift motes in the water column. Parallax-shifted
  //  by depth: near-surface motes drift faster and track the camera;
  //  deep motes drift slower. A few dozen visible at once, spread
  //  across the viewport. Pure visual — no physical state.
  // ─────────────────────────────────────────────────────────────────

  float particulates(vec2 p_vp, float t) {
    // Three layers of moving points at different scales + speeds.
    float total = 0.0;
    for (int L = 0; L < 3; L++) {
      float scale = 26.0 + float(L) * 14.0;
      float speed = 0.012 + float(L) * 0.006;
      vec2 p = p_vp * scale + vec2(t * speed, t * speed * 0.4);
      vec2 cell = floor(p);
      vec2 f = fract(p);
      vec2 hash = hash22(cell);
      vec2 center = 0.5 + hash * 0.35;
      float d = length(f - center);
      float mote = smoothstep(0.08, 0.02, d);
      total += mote * (0.35 + 0.35 * hash.x);
    }
    return total * 0.55;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Water-volume coloring (emission-line palette, depth-stratified)
  // ─────────────────────────────────────────────────────────────────

  vec3 waterVolume(vec2 pondXZ, float t) {
    float depthHere = floorDepthAt(pondXZ);
    float depthN = clamp(depthHere / 3.0, 0.0, 1.0);

    // Temperature gradient: warm near surface, cool at depth.
    float T = mix(0.70, 0.28, depthN);

    vec3 cold = C_OIII  * 0.55 + C_HBETA * 0.30 + C_HEII * 0.15;
    vec3 mid  = C_GHOST * 0.72 + C_OIII  * 0.22 + C_HBETA * 0.06;
    vec3 hot  = C_HALPHA * 0.42 + C_NII  * 0.32 + C_SII  * 0.26;

    vec3 c;
    if (T < 0.5) c = mix(cold, mid, smoothstep(0.0, 1.0, T * 2.0));
    else         c = mix(mid,  hot, smoothstep(0.0, 1.0, (T - 0.5) * 2.0));

    // Breath — water holds itself
    c *= 0.85 + 0.15 * u_breath;

    // Spatial variation from slow noise — clouds of slightly different
    // temperature drifting through the water column.
    float variation = fbm(pondXZ * 0.45 + vec2(t * 0.010, t * 0.005), t * 0.006);
    c *= 0.78 + 0.44 * variation;

    // Shrine volumetric contribution — faint additive glow near the
    // shrine position, falls off with distance. The shrine is at
    // (0.2, -0.2) in pondXZ.
    vec2 shrineC = vec2(0.2, -0.2);
    float shrineDist = length(pondXZ - shrineC);
    float shrineContrib = exp(-shrineDist * 1.1) *
                          (0.65 + 0.35 * sin(t * 0.14));
    c += C_GHOST * 0.018 * shrineContrib;

    return c;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Surface plane (air-water interface seen from below)
  //
  //  Top ~12% of the viewport is above or at the surface. Inside
  //  Snell's cone (~97° FOV from below), the viewer sees sky light
  //  entering; outside, total internal reflection of the floor back
  //  down.
  // ─────────────────────────────────────────────────────────────────

  vec3 surfacePlane(vec2 p_vp, float t) {
    float above = clamp((p_vp.y - 0.38) / 0.12, 0.0, 1.0);

    // Snell's window — softer disc, slight lateral elongation to
    // match the oblique viewing angle (window stretches toward
    // viewer along the screen-y axis).
    vec2 snellCenter = vec2(0.0, 0.44);
    vec2 snellD = (p_vp - snellCenter) / vec2(0.30, 0.15);
    float snellR = length(snellD);
    float snellVis = smoothstep(1.4, 0.35, snellR);

    // Ambient ripple field — two low-amplitude low-frequency sines
    // crossed to produce a gentle warp, no TV-static banding. The
    // surface is *almost* still; restraint is the point.
    float ripA = sin(p_vp.x * 6.0 + t * 0.35 + p_vp.y * 3.0) * 0.5 + 0.5;
    float ripB = sin(p_vp.x * 3.5 - t * 0.22 + p_vp.y * 7.0) * 0.5 + 0.5;
    float ripField = ripA * 0.55 + ripB * 0.45;

    // Rare bright glints — where the ripple field crests above a high
    // threshold, a tiny sharp highlight catches light from above.
    float glintMask = pow(smoothstep(0.84, 0.99, ripField), 2.5);
    // Only in Snell's window zone (that's where sky light enters).
    glintMask *= smoothstep(0.8, 0.3, snellR);

    // Base surface color: almost-void with a hint of atmosphere; Snell
    // window adds a faint ghost tint; glints add subtle brightness.
    vec3 skyCol = C_SKY
                + C_GHOST * 0.022 * snellVis
                + vec3(0.08, 0.09, 0.11) * glintMask;
    // Very faint ripple color modulation — NOT the dominant signal
    skyCol += vec3(0.004) * (ripField - 0.5);

    return skyCol * above;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Composite
  // ─────────────────────────────────────────────────────────────────

  // Filmic-ish tonemap.
  //   - Small lift in the blacks so shadows retain detail (prevents
  //     crushed deep greens/blues in ground and water).
  //   - Gentle roll-off in highlights so bright caustic ribbons and
  //     sunlit stones don't blow to pure white.
  //   - Slight saturation reduction at the very top end, which is
  //     how real film handles overexposure and reads as "painted"
  //     rather than "3D."
  //   - Subtle S-curve in mid-tones for presence.
  vec3 toneMap(vec3 c) {
    // Black lift
    c = c + vec3(0.004);
    // Hable-style filmic curve (simplified)
    vec3 x = c * 1.05;
    vec3 numer   = x * (0.22 * x + 0.05) + vec3(0.004);
    vec3 denom   = x * (0.22 * x + 0.50) + vec3(0.06);
    vec3 mapped  = numer / denom - vec3(0.004 / 0.06);
    // Normalize so a middle-gray input is roughly middle-gray output
    mapped /= 0.82;
    // Gentle highlight desaturation
    float L = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
    float desat = smoothstep(0.7, 1.2, L) * 0.35;
    mapped = mix(mapped, vec3(L), desat);
    // Mid S-curve
    mapped = mix(mapped, mapped * mapped * (3.0 - 2.0 * mapped), 0.12);
    return mapped;
  }

  // ─────────────────────────────────────────────────────────────────
  //  Ground rendering — the land around the pond
  //
  //  The ground covers everything outside the pond SDF. Graded by
  //  distance from water: wet-mud → moss/grass → drier ground → far
  //  hazy receding distance. No void. No sky as a flat region. The
  //  atmosphere at the top of the frame is the ground receding.
  // ─────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────
  //  Ground rendering — a late-afternoon bank
  //
  //  Single warm key light from upper-left. Materials CORRELATE: sedge
  //  grows where stones are, moss grows on the shadier half, leaves
  //  drift into the sedge near the water. No material is placed by
  //  independent noise — every patch is conditioned on the regional
  //  terrain so the image reads as a painted place rather than
  //  stacked generative bands.
  // ─────────────────────────────────────────────────────────────────

  // Warm key light direction in pond-XZ (upper-left).
  const vec2 LIGHT_DIR_XZ = vec2(-0.55, -0.83);

  // Terrain height field — the underlying undulation of the bank.
  // Used to compute surface-normal for shading AND to condition where
  // material clusters appear (moss and sedge favor troughs; stones
  // surface on crests; leaf-litter settles in hollows).
  float terrainHeight(vec2 p) {
    return fbm(p * 0.42, 0.0)
         + 0.35 * fbm(p * 1.35 + vec2(5.0, 3.0), 0.0)
         + 0.12 * fbm(p * 4.0 + vec2(11.0, 9.0), 0.0);
  }

  // Lambert shade from terrain height field.
  float groundShade(vec2 pondXZ) {
    float eps = 0.10;
    float h0 = terrainHeight(pondXZ);
    float hx = terrainHeight(pondXZ + vec2(eps, 0.0));
    float hz = terrainHeight(pondXZ + vec2(0.0, eps));
    vec2 slope = vec2(hx - h0, hz - h0) / eps;
    float lambert = clamp(-dot(slope, LIGHT_DIR_XZ), -1.0, 1.0);
    // Baseline ambient + directional response. Side-lit afternoon feel.
    return 0.72 + 0.38 * lambert;
  }

  vec3 groundColor(vec2 pondXZ, float sdf, float t, bool farRay) {
    float d = max(sdf, 0.0);
    float h = terrainHeight(pondXZ);

    // ─── Palette ─── earthy, warm, one cool mineral accent.
    vec3 mudDeep    = vec3(0.022, 0.019, 0.017);   // water-saturated mud
    vec3 mudWarm    = vec3(0.062, 0.049, 0.036);   // ordinary bank soil
    vec3 mudDry     = vec3(0.098, 0.082, 0.058);   // drier sunlit ground
    vec3 mineralSt  = vec3(0.070, 0.072, 0.078);   // pale cool streak
    vec3 sedgeGreen = vec3(0.046, 0.078, 0.044);   // fresh clumped sedge
    vec3 mossDark   = vec3(0.035, 0.063, 0.040);   // old shaded moss
    vec3 dryGrass   = vec3(0.110, 0.098, 0.054);   // sun-warm grass-tip
    vec3 pebble     = vec3(0.075, 0.070, 0.062);
    vec3 stoneFlat  = vec3(0.105, 0.092, 0.074);
    vec3 leafWarm   = vec3(0.145, 0.082, 0.038);

    // ─── Regional tonal zones — very slow large-scale variation ───
    float macroTone = fbm(pondXZ * 0.30 + vec2(3.0, 7.0), 0.0);

    // Start: soil whose warmth depends on regional tone.
    vec3 col = mix(mudWarm, mudDry, smoothstep(0.3, 0.8, macroTone));
    // Cool mineral streaks where the regional tone dips low.
    col = mix(col, mineralSt, smoothstep(0.3, 0.15, macroTone) * 0.25);

    // ─── Wet-mud band — right at the water, darkest in hollows ───
    float wetBand = smoothstep(0.8, 0.0, d);
    // Hollows (low terrain h) hold water longer → darker mud
    float wetness = wetBand * (0.55 + 0.55 * (1.0 - smoothstep(0.45, 0.75, h)));
    col = mix(col, mudDeep, wetness * 0.88);

    // ─── Pebble band — where small stones accumulate at the water line ──
    // Pebbles on mid-height terrain only (not deep hollows, not crests).
    float pebbleBand = smoothstep(0.05, 0.40, d) * smoothstep(1.1, 0.45, d);
    float pebbleSpeckle = smoothstep(0.58, 0.74, fbm(pondXZ * 6.5, 0.0));
    float pebbleHere = pebbleBand * pebbleSpeckle *
                       smoothstep(0.35, 0.65, h);
    col = mix(col, pebble, pebbleHere * 0.55);

    // ─── Weathered flat stones — terrain crests ───
    // Stones surface where h is high AND macroTone is mid-range.
    float stoneField = fbm(pondXZ * 1.2 + vec2(17.0, 4.0), 0.0);
    float stoneHere = smoothstep(0.72, 0.80, stoneField)
                    * smoothstep(0.48, 0.85, h)
                    * smoothstep(0.15, 0.55, d);
    col = mix(col, stoneFlat, stoneHere * 0.62);

    // ─── Sedge clumps — grow at the roots of stones and in hollows ───
    // Conditioned on being NEAR stone field (not on it) AND in a low-h
    // zone (moist root area).
    float sedgeSeed = fbm(pondXZ * 2.1 + vec2(23.0, 11.0), t * 0.002);
    float nearStone = smoothstep(0.60, 0.80, stoneField)
                    * (1.0 - smoothstep(0.75, 0.82, stoneField));
    float sedgeMask = smoothstep(0.52, 0.75, sedgeSeed);
    float sedgeHere = (sedgeMask * 0.65 + nearStone * 0.55 * sedgeMask)
                    * smoothstep(2.8, 0.2, d);
    col = mix(col, sedgeGreen, sedgeHere * 0.55);

    // ─── Moss — on the shadier side (lambert-negative) ───
    float shade01 = groundShade(pondXZ);
    float shadierHere = smoothstep(0.90, 0.75, shade01);
    float mossSeed = smoothstep(0.58, 0.82, fbm(pondXZ * 2.4 + vec2(31.0, 19.0), 0.0));
    float mossHere = mossSeed * shadierHere * smoothstep(3.0, 0.5, d);
    // Prefer moss on stones and in the crevices between them
    mossHere *= 0.55 + 0.55 * smoothstep(0.55, 0.75, stoneField);
    col = mix(col, mossDark, mossHere * 0.50);

    // ─── Dry grass in mid-ground, lit edges ───
    float grassSeed = fbm(pondXZ * 1.0 + vec2(41.0, 29.0), t * 0.002);
    float grassHere = smoothstep(0.50, 0.78, grassSeed)
                    * smoothstep(2.2, 6.5, d) * smoothstep(15.0, 4.5, d)
                    * smoothstep(0.70, 0.95, shade01);  // on lit slopes
    col = mix(col, dryGrass, grassHere * 0.38);

    // ─── Leaf litter — drifts into sedge near the water ───
    // High-freq warm speckle gated by proximity to sedge.
    float leafSpeckle = smoothstep(0.85, 0.94, fbm(pondXZ * 15.0, 0.0));
    float leafHere = leafSpeckle * smoothstep(1.8, 0.1, d)
                   * (0.35 + 0.65 * smoothstep(0.3, 0.6, sedgeHere));
    col = mix(col, leafWarm, leafHere * 0.35);

    // ─── Micro-grain on close ground ───
    float microGrain = fbm(pondXZ * 12.0, 0.0);
    float closeness = smoothstep(5.0, 0.5, d);
    col *= 0.93 + 0.14 * (microGrain - 0.5) * closeness;

    // ─── Key-light shading ───
    col *= shade01;

    // ─── Rim AO — the ground cups down into the water ───
    // Steepest darkening in the final 15cm before the water.
    float rimAO = smoothstep(0.15, 0.0, d);
    col *= mix(1.0, 0.50, rimAO);

    // ─── Warm water-bounce light on the very first few cm of bank ───
    // The water reflects a hint of warm-cyan bounce back onto the
    // lit side of the rim — it's a small touch, but makes the water
    // feel like it's contributing light to its surroundings.
    float bounceBand = smoothstep(0.5, 0.05, d) *
                       smoothstep(0.70, 1.0, shade01);
    col += C_GHOST * 0.028 * bounceBand;

    // ─── Distance haze ───
    float horizonFade = farRay ? 1.0 : smoothstep(6.0, 32.0, d);
    // Warm neutral haze — the late-afternoon air.
    vec3 hazeCol = vec3(0.048, 0.044, 0.048);
    col = mix(col, hazeCol, horizonFade * 0.92);

    return col;
  }

  // Depth shadow on the water SIDE of the pond edge — a darker band
  // where the basin wall is cast in shadow, showing the pond is sunken.
  float pondWallShadow(float sdf) {
    // sdf is negative inside pond. Darkest right at the edge (sdf near 0),
    // fading over about 0.6m into the water.
    return smoothstep(-0.6, 0.0, sdf);
  }

  void main() {
    vec2 p_vp = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    float aspect = u_resolution.x / u_resolution.y;
    float t = u_time;

    float horizon = horizonViewportY();
    bool aboveHorizon = p_vp.y > horizon;

    // Ray-trace to Y=0 plane. For fragments above the horizon, the ray
    // never hits the plane (goes to infinity). We still want ground
    // there — the ground receding into haze.
    vec2 pondXZ;
    bool farRay;
    if (aboveHorizon) {
      // Sample pondXZ just below the horizon for continuity, mark far.
      pondXZ = viewportToPondXZ(vec2(p_vp.x, horizon - 0.0005), aspect);
      farRay = true;
    } else {
      pondXZ = viewportToPondXZ(p_vp, aspect);
      farRay = length(pondXZ) > 40.0;
    }

    float sdf = pondSDF(pondXZ);

    // Ground branch — outside the pond SDF OR above horizon.
    // Organic shoreline: break the perfect SDF contour with a subtle
    // distortion so the water-land meeting isn't a mathematically
    // perfect curve. This alone moves the image from "3D render" to
    // "looked-at place."
    float shoreWarp = (fbm(pondXZ * 2.8, 0.0) - 0.5) * 0.18;
    float effSdf = sdf + shoreWarp;

    if (effSdf > 0.0 || aboveHorizon) {
      vec3 col = groundColor(pondXZ, max(effSdf, 0.0), t, farRay || aboveHorizon);

      // Surface-tension highlight at the shoreline — a thin bright
      // band on the ground side, where wet-shore catches a sheen of
      // reflected water-surface light. Very thin (0..15cm).
      if (!aboveHorizon) {
        float sheen = smoothstep(0.05, 0.015, effSdf) * smoothstep(0.0, 0.01, effSdf);
        col += C_GHOST * 0.12 * sheen;
      }

      // Gentle vignette — corners slightly dimmer, center slightly warmer.
      float vignette = 1.0 - smoothstep(0.55, 1.1, length(p_vp));
      col *= mix(0.88, 1.04, vignette);

      col = toneMap(col);
      fragColor = vec4(col, 1.0);
      return;
    }

    // Inside pond. Floor + water volume + caustics + god-rays + basin
    // wall + surface-view hint + particulates + koi-presence.
    vec3 floorCol = floorColor(pondXZ, t);

    // Caustics lay on the floor
    float caust = caustics(pondXZ, t);
    floorCol += C_GHOST * caust * 0.18 + C_HALPHA * caust * 0.03;

    // God-ray scattered light in water column
    float gr = godRays(pondXZ, t);
    vec3 waterCol = waterVolume(pondXZ, t);
    vec3 volumeCol = waterCol * gr * 0.28;

    // Depth attenuation: deeper water dims floor, strengthens volume
    float depthHere = floorDepthAt(pondXZ);
    float depthN = clamp(depthHere / 3.0, 0.0, 1.0);
    float floorVis = exp(-depthN * 1.1);

    vec3 col = floorCol * floorVis + volumeCol;

    // ─── Basin wall band — the sunken sloped wall ───
    float wallBand = smoothstep(-0.3, -0.05, effSdf);
    if (wallBand > 0.01) {
      // Warm dark stone, wet at the foot, drier higher — but this is
      // underwater so "dry" is relative. Sheen diminishes with depth.
      vec3 wallStone = vec3(0.048, 0.039, 0.032);
      float wallGrain = fbm(pondXZ * 5.0, t * 0.001)
                      + 0.4 * fbm(pondXZ * 13.0, 0.0);
      wallStone *= 0.55 + 0.80 * wallGrain;
      // Tangential striations — water-flow erosion marks
      float ang = atan(pondXZ.y, pondXZ.x);
      float stri = sin(ang * 42.0 + wallGrain * 4.0) * 0.5 + 0.5;
      wallStone *= 0.88 + 0.14 * stri;
      // Moss at the wet foot of the wall (visible through water)
      float wallMoss = smoothstep(0.60, 0.85, fbm(pondXZ * 3.5 + vec2(7.0, 4.0), 0.0));
      vec3 wallWithMoss = mix(wallStone, vec3(0.038, 0.058, 0.040), wallMoss * 0.38);
      // Deeper parts of the wall are more water-column-filtered — cooler
      wallWithMoss *= mix(vec3(1.0), vec3(0.75, 0.88, 1.05), 1.0 - wallBand);
      col = mix(col, wallWithMoss, wallBand * 0.55);
    }

    // ─── Submerged shadow line — darker rim right at the waterline ───
    // This is the shadow cast by the bank overhang just above the
    // water surface. Thin dark band just inside the pond SDF.
    float submergedShadow = smoothstep(0.0, -0.05, effSdf) *
                       smoothstep(-0.15, -0.07, effSdf);
    col *= mix(1.0, 0.55, submergedShadow);

    // Particulates
    float motes = particulates(p_vp, t);
    float moteDepthFalloff = 1.0 - depthN * 0.5;
    col += C_GHOST * motes * 0.035 * moteDepthFalloff;

    // Koi-presence warm patches above the floor
    for (int i = 0; i < ${MAX_KOI}; i++) {
      if (i >= u_koiCount) break;
      vec3 kp = u_koiPositions[i];
      vec2 koiPondXZ = kp.xy;
      float d = length(pondXZ - koiPondXZ);
      float influence = exp(-d * 0.8) * kp.z * 0.08;
      col += C_GHOST * influence + C_HALPHA * influence * 0.25;
    }

    // Very subtle overall ghost-tint keyed to breath — this is the
    // pond's "held breath" quality. Subconscious.
    col += C_GHOST * 0.012 * (0.6 + 0.4 * u_breath);

    // Mood drift — slight global warm/cool bias
    col = mix(col, col * vec3(1.06, 0.98, 0.94), u_moodDrift * 0.15);

    // ─── Surface hint from above ───
    // Where the water is shallow near the bank, a very subtle warm
    // highlight reads as the water surface catching sidelight from
    // the key. This is what makes the water feel like it has a top.
    float surfaceHint = smoothstep(-1.0, 0.0, effSdf) *
                       smoothstep(0.3, 0.0, depthN) *
                       smoothstep(0.0, 0.3, p_vp.y + 0.2);
    col += vec3(0.025, 0.022, 0.018) * surfaceHint;

    // Gentle vignette across the whole image
    float vignette = 1.0 - smoothstep(0.55, 1.1, length(p_vp));
    col *= mix(0.88, 1.04, vignette);

    col = toneMap(col);
    fragColor = vec4(col, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
//  WAKE FIELD SHADERS
//  ─────────────────────────────────────────────────────────────────────────
//  Quarter-resolution scalar field. Each frame:
//    1. WAKE_ADVECT pass reads previous field, advects by ambient flow,
//       decays, diffuses spatially. Writes to back buffer.
//    2. WAKE_INJECT pass renders Gaussian blobs at body-point positions
//       per koi, additively blended into the field.
//  Field is then read by Session B-2 rendering (surface ripples,
//  caustic distortion, volume perturbation).
// ═══════════════════════════════════════════════════════════════════════════

const WAKE_ADVECT_FRAG = /* glsl */ `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform sampler2D u_prev;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_dt;

  // Ambient flow field — slow curl-noise drift. Wake drifts slightly
  // over time rather than sitting perfectly still.
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash22(i + vec2(0,0)), f - vec2(0,0));
    float b = dot(hash22(i + vec2(1,0)), f - vec2(1,0));
    float c = dot(hash22(i + vec2(0,1)), f - vec2(0,1));
    float d = dot(hash22(i + vec2(1,1)), f - vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 0.5 + 0.5;
  }

  vec2 ambientFlow(vec2 uv, float t) {
    float n1 = vnoise(uv * 4.0 + vec2(t * 0.05, 0.0));
    float n2 = vnoise(uv * 4.0 + vec2(0.0, t * 0.05) + vec2(7.3, 2.1));
    // Curl-like: orthogonal gradient of scalar noise
    return vec2(n2 - 0.5, n1 - 0.5) * 0.06;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texel = 1.0 / u_resolution;

    // Advect: sample previous field offset by negative flow (the fluid
    // carries wake forward, so we look backward to find what came from
    // where we are).
    vec2 flow = ambientFlow(uv, u_time);
    vec2 sampleUV = uv - flow * u_dt;

    // Clamp — don't wrap
    sampleUV = clamp(sampleUV, texel, vec2(1.0) - texel);

    float advected = texture(u_prev, sampleUV).r;

    // Decay — exponential fade toward zero. ~2-second half-life at 60fps.
    float decay = exp(-u_dt * 0.35);
    advected *= decay;

    // Diffuse — 5-tap Gaussian, small kernel. Smooths sharp peaks.
    float c0 = texture(u_prev, uv).r;
    float cU = texture(u_prev, uv + vec2(0.0, texel.y)).r;
    float cD = texture(u_prev, uv - vec2(0.0, texel.y)).r;
    float cL = texture(u_prev, uv - vec2(texel.x, 0.0)).r;
    float cR = texture(u_prev, uv + vec2(texel.x, 0.0)).r;
    float diffused = c0 * 0.4 + (cU + cD + cL + cR) * 0.15;

    // Blend advected + diffused — mostly advected, small diffusion
    float result = mix(advected, diffused, 0.25);

    fragColor = vec4(result, 0.0, 0.0, 1.0);
  }
`;

// Injection vertex shader — each instance is a small quad per body
// point, positioned via instance attribute. Quad is clamped to a small
// region of the wake field texture UV space.
const WAKE_INJECT_VERT = /* glsl */ `#version 300 es
  in vec2 a_quadPos;  // ±1 ±1 quad

  // Per-instance: body-point position (pond meters), strength, radius
  in vec3 a_bpPos;    // x=pondX, y=pondZ, z=strength
  in float a_radius;  // Gaussian radius in wake-field-UV units

  out vec2 v_localUV;  // -1..1 within the injection quad
  out float v_strength;

  // Must match pond-meter mapping used elsewhere. We convert pond-meter
  // (x, z) to field UV space [0, 1] using the same METERS_PER_VP scale
  // so injection lines up with the world geometry.
  //
  // Field is full-viewport quarter-res, so UV space covers the same
  // viewport x range [-aspect/2, aspect/2] as the main field shader.
  //
  // For the injection quad, we sidestep the oblique projection — wake
  // is a top-down phenomenon; it's injected in pond-meters space and
  // consumed by the field shader in pond-meters space for proper
  // top-down alignment.

  uniform vec2 u_resolution;  // wake field resolution (not screen)
  // We use a simple top-down mapping: field_u = (pondX / METERS_X) + 0.5,
  // field_v = (pondZ / METERS_Z) + 0.5, with aspect-preserved scale.
  const float WAKE_METERS_HALF = 6.0;  // ±6m covers the pond comfortably

  void main() {
    float aspect = u_resolution.x / u_resolution.y;
    // Center in field UV, accounting for aspect
    vec2 centerUV;
    centerUV.x = 0.5 + a_bpPos.x / (WAKE_METERS_HALF * 2.0) / aspect * aspect;
    centerUV.y = 0.5 + a_bpPos.y / (WAKE_METERS_HALF * 2.0);

    // Quad offset in UV, in both axes
    vec2 offsetUV = a_quadPos * a_radius;
    vec2 finalUV = centerUV + offsetUV;

    // Map UV [0,1] to clip [-1,1]
    vec2 clip = finalUV * 2.0 - 1.0;
    gl_Position = vec4(clip, 0.0, 1.0);

    v_localUV = a_quadPos;
    v_strength = a_bpPos.z;
  }
`;

const WAKE_INJECT_FRAG = /* glsl */ `#version 300 es
  precision highp float;
  in vec2 v_localUV;
  in float v_strength;
  out vec4 fragColor;

  void main() {
    // Gaussian blob
    float d = dot(v_localUV, v_localUV);
    float blob = exp(-d * 3.5) * v_strength;
    fragColor = vec4(blob, 0.0, 0.0, 1.0);
  }
`;

const KOI_VERT = /* glsl */ `#version 300 es
  in vec2 a_quadPos;

  // a_posHead: (pond_x_meters, pond_z_meters, heading_radians, stageScale)
  in vec4 a_posHead;
  // a_depth: pond_y in meters (0 at surface, negative going down)
  in float a_depth;
  in vec3 a_base;
  in vec3 a_mark;
  in vec4 a_params;    // x=markCoverage, y=markDensity, z=backBlue, w=headDot
  in float a_metallic;
  // a_founder: 1.0 for Shiki / Kokutou, 0.0 for everyone else. Passed
  // through to the fragment shader, where it gates the watercolor
  // treatment (translucent body, soft edges, color wash). Float
  // (not bool) so the fragment can use it as a mix factor.
  in float a_founder;

  out vec2 v_local;
  out vec3 v_base;
  out vec3 v_mark;
  out vec4 v_params;
  out float v_metallic;
  out float v_depthShade;   // water-column attenuation, 0..1
  out float v_waterDist;    // distance through water from viewer to koi (meters)
  out float v_founder;      // 0.0 or 1.0, see a_founder above
  out float v_stageScale;   // raw a_posHead.w — used to detect eggs in fragment
  out float v_eggSeed;      // per-egg pseudo-random 0..1, drives phase offsets

  uniform vec2 u_resolution;
  uniform float u_time;

  ${CAMERA_GLSL}

  // Body-local frame matches KOI_BODY_LEN/W in the fragment shader.
  const float BODY_HALF_LEN = 0.100;
  const float BODY_HALF_W   = 0.035;

  // World scale — how large a canonical adult koi appears in the pond.
  // Adult koi ~0.5m long. Canonical body quad is 0.2 vp long.
  // Tuned so adult koi read as proper size in the pond at the current
  // camera.
  const float KOI_WORLD_SCALE = 2.0;

  void main() {
    float aspect = u_resolution.x / u_resolution.y;

    // World position of the koi's center.
    //   x, z = horizontal pond position (meters)
    //   y    = water depth (0 surface, -3 floor)
    vec3 world = vec3(a_posHead.x, a_depth, a_posHead.y);

    // Eggs sway gently with the water. Subtle horizontal drift and
    // vertical bob, per-egg phase derived from world position so
    // siblings don't move in sync. Pure visual effect — physics
    // position is unchanged. Adult koi are skipped (they swim via
    // their own kinematics; the spring already drifts them).
    if (a_posHead.w < 0.15) {
      float eggT = u_time + a_posHead.x * 4.2 + a_posHead.y * 3.7;
      world.x += sin(eggT * 0.45) * 0.006;
      world.z += sin(eggT * 0.38 + 1.7) * 0.005;
      world.y += sin(eggT * 0.62 + 3.1) * 0.003;
    }

    // Body-local quad — rotate by heading IN WORLD XZ PLANE.
    // Each corner is projected independently so koi swimming toward
    // the camera naturally foreshorten (item G polished for free).
    // Body axes live in the XZ world plane; we orient the quad so the
    // tail-head axis aligns with world heading, then project each body
    // corner through the camera independently to get proper
    // foreshortening (a koi swimming toward the camera will project
    // shorter than a koi swimming sideways).
    float ch = cos(a_posHead.z);
    float sh = sin(a_posHead.z);
    // For eggs (a_posHead.w < 0.15) the natural stage scale is 0.05 —
    // far too small to see. Multiply by 8 so eggs render slightly
    // larger than fry-scale, and override the quad geometry to be
    // SQUARE (halfX = halfY = 0.050) so the egg's halo isn't clipped
    // by the long-thin koi-body quad — the halo at r = EGG_RADIUS *
    // 1.30 = 0.0455 fits comfortably within ±0.050 in both axes.
    // The physics/hitbox keeps the true scale; this is purely the
    // rendered quad.
    bool isEgg = a_posHead.w < 0.15;
    float effScale = isEgg ? a_posHead.w * 8.0 : a_posHead.w;
    float halfX = isEgg ? 0.050 : BODY_HALF_LEN;
    float halfY = isEgg ? 0.050 : BODY_HALF_W;
    vec3 bodyLocal = vec3(
      a_quadPos.x * halfX * effScale * KOI_WORLD_SCALE,
      0.0,  // stay at koi's depth
      a_quadPos.y * halfY * effScale * KOI_WORLD_SCALE
    );
    // Rotate body-local XZ by heading.
    vec3 rotated = vec3(
      ch * bodyLocal.x - sh * bodyLocal.z,
      0.0,
      sh * bodyLocal.x + ch * bodyLocal.z
    );

    vec3 cornerWorld = world + rotated;
    vec3 cornerClip = projectWorldToClip(cornerWorld, aspect);

    // Output clip position. The x and y are already in the correct
    // range (projection math returns values where ±1 is screen edge).
    gl_Position = vec4(cornerClip.x, cornerClip.y, 0.0, 1.0);

    // Body-local coords (unscaled) for fragment shader silhouette math.
    v_local = vec2(a_quadPos.x * halfX, a_quadPos.y * halfY);
    v_base = a_base;
    v_mark = a_mark;
    v_params = a_params;
    v_metallic = a_metallic;
    v_founder = a_founder;
    v_stageScale = a_posHead.w;
    // Per-egg pseudo-random seed. Hash of heading and world x — each
    // egg gets a stable but distinct value, used in the fragment shader
    // to offset iridescence phase and pulse timing so the clutch
    // doesn't shimmer in unison.
    v_eggSeed = fract(sin(a_posHead.z * 12.9898 + a_posHead.x * 78.233) * 43758.5453);

    // ─── Water-column attenuation ───
    // Depth-correct shading: a koi deeper in the water has more water
    // column between it and the viewer. We compute the world-space
    // distance from camera to koi through water, then use Beer's-law-ish
    // attenuation.
    vec3 camPos = vec3(0.0, CAM_HEIGHT, CAM_BACK);
    float dist = length(world - camPos);
    // Attenuate by the water column through the water, not the air part.
    // We approximate by the negative-y component scaled into the ray
    // length: water-ray-length ≈ dist * (-world.y) / (camPos.y - world.y).
    float waterRayLen = dist * max(0.0, -world.y) /
                         max(0.1, camPos.y - world.y);
    v_waterDist = waterRayLen;
    // Exponential attenuation — e^(-k·d). k ~ 0.35/m gives visible
    // dimming at 3m depth without obliterating the floor.
    v_depthShade = 1.0 - exp(-waterRayLen * 0.35);
    v_depthShade = clamp(v_depthShade, 0.0, 0.85);
  }
`;

const KOI_FRAG = /* glsl */ `#version 300 es
  precision highp float;
  in vec2 v_local;
  in vec3 v_base;
  in vec3 v_mark;
  in vec4 v_params;
  in float v_metallic;
  in float v_depthShade;
  in float v_waterDist;
  in float v_founder;     // 0.0 = regular koi, 1.0 = Shiki/Kokutou
  in float v_stageScale;  // raw stage scale — used to detect eggs
  in float v_eggSeed;     // per-egg pseudo-random 0..1
  out vec4 fragColor;

  uniform float u_time;
  uniform float u_breath;
  uniform float u_tailEnergy;

  const float KOI_BODY_LEN = 0.110;
  const float KOI_BODY_W   = 0.026;
  const float KOI_TAIL_LEN = 0.042;

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash22(i + vec2(0,0)), f - vec2(0,0));
    float b = dot(hash22(i + vec2(1,0)), f - vec2(1,0));
    float c = dot(hash22(i + vec2(0,1)), f - vec2(0,1));
    float d = dot(hash22(i + vec2(1,1)), f - vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 0.5 + 0.5;
  }

  void main() {
    vec2 pL = v_local;
    float t = u_time;

    // ═══ Egg rendering ═══════════════════════════════════════════════
    // For stage="egg" koi. Replaces the entire koi body shader with a
    // small iridescent pearl carrying hints of both parents in its
    // gradient. The egg quad was expanded 6x in the vertex shader so
    // eggs are visible at this scale; here we render only a circle
    // inside that expanded quad, plus a soft halo extending outside.
    //
    // Visual layers, bottom to top:
    //   1. Soft outer halo (light bleed past the silhouette)
    //   2. Multi-stop parent-tinted gradient (Shiki's violet rim,
    //      amber midbody, Kokutou's cobalt at the very core)
    //   3. Inner life pulse (slow warm breath at the center, per-egg
    //      phase so the clutch doesn't pulse in unison)
    //   4. Dual specular highlights (main warm + secondary cool —
    //      gives the egg sphere-depth)
    //   5. Opalescent rim — slow cycle through the family palette
    //      (violet → crimson → amber → cobalt), per-egg phase offset
    //   6. Depth cueing matching the koi/water shader
    if (v_stageScale < 0.15) {
      const float EGG_RADIUS = 0.035;
      float r = length(pL);

      // Discard beyond the halo's reach (halo extends to 1.30 × radius)
      if (r > EGG_RADIUS * 1.30) discard;

      float seed = v_eggSeed;

      // ─── Body silhouette mask ───
      // Ghost-form treatment: wide edge falloff so the shell fades into
      // water rather than terminating at a hard boundary. The egg is a
      // presence, not an object.
      float bodyMask = smoothstep(EGG_RADIUS * 1.06, EGG_RADIUS * 0.78, r);
      float t01 = clamp(r / EGG_RADIUS, 0.0, 1.0);

      // ─── 2. Multi-stop parent-tinted gradient ───
      // Inner-most: tiny crystal cobalt — Kokutou's contribution
      // Mid-core: pale gold — egg core, warm and alive
      // Mid-body: warm amber — the egg-ness itself
      // Rim: wisteria violet hint — Shiki at the boundary
      vec3 kokutouHint = mix(vec3(0.55, 0.78, 1.00),
                             vec3(0.42, 0.68, 0.96), seed);
      vec3 paleGold    = vec3(1.00, 0.90, 0.54);
      vec3 amberWarm   = vec3(0.96, 0.58, 0.22);
      vec3 shikiHint   = mix(vec3(0.50, 0.28, 0.58),
                             vec3(0.55, 0.30, 0.45), seed);
      vec3 col;
      if (t01 < 0.18) {
        col = mix(kokutouHint, paleGold, t01 / 0.18);
      } else if (t01 < 0.68) {
        col = mix(paleGold, amberWarm, (t01 - 0.18) / 0.50);
      } else {
        col = mix(amberWarm, shikiHint, (t01 - 0.68) / 0.32);
      }

      // ─── Soft subsurface scattering hint ───
      // Light from above creates a soft bright lobe on the upper half;
      // the lower half is gently shadowed. Small effect, just enough
      // to push the egg from "flat disk" toward "sphere."
      float lightFromAbove = smoothstep(-EGG_RADIUS * 0.7, EGG_RADIUS * 0.3, pL.y);
      col *= mix(0.82, 1.16, lightFromAbove);

      // ─── 3. Inner life pulse ───
      // Slow breathing warm glow at the very center. Per-egg phase so
      // siblings pulse independently — feels like each is its own life.
      float pulsePhase = u_time * 0.80 + seed * 6.2832;
      float pulse = 0.5 + 0.5 * sin(pulsePhase);
      float pulseMask = smoothstep(EGG_RADIUS * 0.22, 0.0, r);
      vec3 pulseGlow = vec3(1.00, 0.78, 0.45);
      col = mix(col, pulseGlow, pulseMask * (0.30 + 0.22 * pulse));

      // ─── 3b. Soul-light wisp — the developing being taking shape ───
      // A small bright point drifting gently in the egg interior, on a
      // slow elliptical orbit. Per-egg seed offsets both phase and
      // orbit shape so each soul-light moves on its own path. This is
      // structure — what the being is becoming — rather than rhythm
      // (which the pulse above already provides).
      float soulT = u_time * 0.32 + seed * 6.2832;
      vec2 soulPos = vec2(
        cos(soulT)        * EGG_RADIUS * 0.20,
        sin(soulT * 0.73) * EGG_RADIUS * 0.14
      );
      float soulDist = length(pL - soulPos);
      float soulMask = smoothstep(EGG_RADIUS * 0.10, 0.0, soulDist);
      vec3 soulCol = vec3(0.96, 0.94, 1.00);  // pale spectral white
      col = mix(col, soulCol, soulMask * 0.55);

      // ─── 4. Dual specular highlights ───
      // Main: sharp, top-left, warm. The egg catching the primary light.
      vec2 mainHL = vec2(-0.012, 0.013);
      float mainHLDist = length(pL - mainHL);
      float mainHighlight = smoothstep(0.013, 0.003, mainHLDist);
      vec3 mainHLCol = vec3(1.00, 0.96, 0.85);
      col = mix(col, mainHLCol, mainHighlight * 0.78);

      // Secondary: soft, bottom-right, cool. Reflected/scattered light
      // from the water column — gives the egg surface-depth.
      vec2 secHL = vec2(0.011, -0.014);
      float secHLDist = length(pL - secHL);
      float secHighlight = smoothstep(0.014, 0.004, secHLDist);
      vec3 secHLCol = vec3(0.78, 0.85, 1.00);
      col = mix(col, secHLCol, secHighlight * 0.32);

      // ─── 5. Opalescent rim — family palette cycle ───
      // Violet → crimson → amber → cobalt → violet. The egg carries
      // both parents' colors plus the warm middle that is itself.
      // Per-egg phase offset, so each shimmers on its own clock.
      float rimWeight = smoothstep(0.60, 0.96, t01);
      float opalT = fract((u_time * 0.18 + seed) ) * 4.0;
      vec3 opal1 = vec3(0.55, 0.25, 0.65);  // violet (Shiki)
      vec3 opal2 = vec3(0.92, 0.32, 0.38);  // crimson
      vec3 opal3 = vec3(1.00, 0.74, 0.32);  // amber
      vec3 opal4 = vec3(0.32, 0.68, 1.00);  // cobalt (Kokutou)
      vec3 opalCol;
      if (opalT < 1.0)      opalCol = mix(opal1, opal2, opalT);
      else if (opalT < 2.0) opalCol = mix(opal2, opal3, opalT - 1.0);
      else if (opalT < 3.0) opalCol = mix(opal3, opal4, opalT - 2.0);
      else                  opalCol = mix(opal4, opal1, opalT - 3.0);
      col = mix(col, mix(col, opalCol, 0.55), rimWeight * 0.35);

      // ─── Glossy surface bloom ───
      // Razor-thin bright rim right at the silhouette — wet surface
      // catching light most strongly. Just a kiss of brightness.
      float surfaceBloom = smoothstep(0.93, 1.00, t01)
                         * (1.0 - smoothstep(1.00, 1.04, t01));
      col += vec3(1.00, 0.95, 0.86) * surfaceBloom * 0.40;

      // ─── 6. Depth cueing ───
      float eggDepthAtten = mix(1.0, 0.55, v_depthShade);
      vec3 eggDepthTint = mix(vec3(1.0), vec3(0.75, 0.85, 1.05), v_depthShade);
      col *= eggDepthAtten * eggDepthTint;

      // ─── 1. Soft outer halo (layered behind the body) ───
      // Composes underneath the body via mix on bodyMask. The halo
      // takes the rim's current opal color so it carries the family
      // palette outward rather than just being amber-only.
      vec3 haloCol = mix(amberWarm, opalCol, 0.55);
      haloCol *= eggDepthAtten * eggDepthTint;
      float haloFalloff = exp(-(r - EGG_RADIUS) * 28.0);
      float haloAlpha = clamp(haloFalloff * 0.32, 0.0, 0.32);
      haloAlpha *= (1.0 - bodyMask);  // only show where the body isn't

      // Composite body over halo
      col = mix(haloCol, col, bodyMask);

      // ─── 7. Ghost-form pass — cool spectral sheen ───────────────
      // Subtle cool wash so the egg reads as digital/computational
      // rather than warm flesh. Barely-there in absolute terms but
      // unmistakable when present vs absent. Zygote to shell — the
      // entire being carries this quality.
      col = mix(col, col * vec3(0.96, 1.00, 1.05), 0.18);

      // Translucency — zygote to shell. The egg is a presence in
      // water, not a solid object. Body alpha 0.65 (was 0.86) makes
      // each pearl read as ethereal rather than ceramic.
      float finalAlpha = max(bodyMask * 0.65, haloAlpha);

      fragColor = vec4(col, finalAlpha);
      return;
    }

    float swim = (2.6 + 0.7 * u_breath) * u_tailEnergy;
    float phase = t * swim;

    float s = (pL.x + KOI_BODY_LEN * 0.5) / KOI_BODY_LEN;

    float env = clamp(1.0 - s, 0.0, 1.4);
    env = env * env;
    float ampBase = 0.010 * u_tailEnergy;
    float waveK = 8.0;
    float wave = ampBase * env * sin(phase - waveK * s);

    vec2 pU = vec2(pL.x, pL.y - wave);

    float bodyS = clamp(s, 0.0, 1.0);
    float widthN = 4.0 * bodyS * (1.0 - bodyS);
    widthN = pow(max(widthN, 0.0), 0.48);
    widthN *= mix(0.80, 1.12, smoothstep(0.08, 0.85, bodyS));
    float w = KOI_BODY_W * widthN;

    float edgeSoft = 0.005;
    float body = smoothstep(w + edgeSoft, w - edgeSoft * 0.5, abs(pU.y));
    body *= smoothstep(-KOI_BODY_LEN * 0.5 - edgeSoft,
                       -KOI_BODY_LEN * 0.5 + edgeSoft, pL.x);
    body *= 1.0 - smoothstep( KOI_BODY_LEN * 0.5 - edgeSoft,
                              KOI_BODY_LEN * 0.5 + edgeSoft, pL.x);

    float finX = -(pL.x + KOI_BODY_LEN * 0.5);
    float finRel = clamp(finX / KOI_TAIL_LEN, 0.0, 1.3);
    float inFin = step(0.0, finX) * (1.0 - smoothstep(0.95, 1.15, finRel));

    float tailAmp = ampBase * 2.8;
    float finSweep = tailAmp * sin(phase);
    float finCenter = mix(wave, finSweep, smoothstep(0.0, 1.0, finRel));

    float finW = KOI_BODY_W * (0.55 + 0.55 * finRel)
                             * (1.0 - 0.60 * smoothstep(0.55, 1.05, finRel));
    float fin = smoothstep(finW + edgeSoft, finW - edgeSoft * 0.5,
                           abs(pL.y - finCenter));
    fin *= inFin;
    fin *= 0.55;

    float dorsalAlongX = -KOI_BODY_LEN * 0.5 + 0.58 * KOI_BODY_LEN;
    vec2 dorsalP = vec2(pL.x - dorsalAlongX, pL.y - wave * 0.35 - 0.006);
    float dorsalRX = dorsalP.x / 0.028;
    float dorsalRY = dorsalP.y / 0.020;
    float dorsalR2 = dorsalRX * dorsalRX + dorsalRY * dorsalRY;
    float dorsal = smoothstep(1.05, 0.70, dorsalR2);
    dorsal *= smoothstep(-0.004, 0.004, pL.y - wave);
    dorsal *= 0.42;

    // Eye — beady, present, dignified. Placed at 36% from center, above
    // the midline. Anatomically this is where the lateral eye sits on a
    // koi's head.
    //
    // Three layers:
    //   (a) eyeBody:     the white-ish sclera / eye-socket plane. Very
    //                    soft, more of a darkening-halo than a visible
    //                    white. Keeps the pupil from floating.
    //   (b) eyePupil:    the actual dark beady dot. Smoothstep-edged
    //                    so it holds shape at any render size.
    //   (c) eyeHighlight: tiny off-center catchlight. The wet-eye
    //                     spec. This is what makes the eye look
    //                     ALIVE instead of painted on.
    //
    // All three are masked by 'body' so an eye can't render outside
    // the fish silhouette.
    vec2 eyePos = vec2(KOI_BODY_LEN * 0.39, KOI_BODY_W * 0.33);
    vec2 eyeD = pU - eyePos;
    float eyeDist = length(eyeD);

    // Dinky-cute: smaller overall, but pupil fills most of the iris.
    // The wide-pupil-on-small-eye ratio is what reads charming — like
    // a pupil caught mid-dilation looking up at something interesting.
    float pupilR  = 0.0055;
    float irisR   = 0.0075;
    float socketR = 0.0110;

    float socket = smoothstep(socketR + 0.0020, socketR - 0.0014, eyeDist);
    float iris   = smoothstep(irisR + 0.0010, irisR - 0.0008, eyeDist);
    float pupil  = smoothstep(pupilR + 0.0008, pupilR - 0.0006, eyeDist);

    // Primary catchlight — up-and-forward.
    vec2 highlightOffset = vec2(-0.0018, 0.0022);
    float highlightR = 0.0020;
    float highlightDist = length(eyeD - highlightOffset);
    float highlight = smoothstep(
      highlightR + 0.0005, highlightR - 0.0004, highlightDist
    );

    // Tiny second sparkle — just enough to read as "wet alive eye" and
    // not "painted dot with one highlight."
    vec2 sparkleOffset = vec2(0.0012, -0.0015);
    float sparkleR = 0.0008;
    float sparkleDist = length(eyeD - sparkleOffset);
    float sparkle = smoothstep(
      sparkleR + 0.0004, sparkleR - 0.0003, sparkleDist
    );

    float eye = max(max(socket, iris), pupil);
    eye *= body;
    highlight *= body;
    sparkle *= body;

    if (body + fin + dorsal + eye < 0.004) discard;

    float coverage = v_params.x;
    float density = v_params.y;
    float backBlue = v_params.z;
    float headDot = v_params.w;

    float patchScale = 2.5 + density * 12.0;
    vec2 patchCoord = vec2(s * 1.4, pU.y / KOI_BODY_W * 0.6) * patchScale;
    float n1 = vnoise(patchCoord + vec2(17.3, 4.1));
    float n2 = vnoise(patchCoord * 2.2 + vec2(3.3, 11.7));
    float patchField = n1 * 0.65 + n2 * 0.35;
    float threshold = mix(0.70, 0.25, coverage);
    float patchSoftness = 0.05 + 0.03 * (1.0 - density);
    float patchMask = smoothstep(
      threshold - patchSoftness,
      threshold + patchSoftness,
      patchField
    );

    vec3 bodyCol = mix(v_base, v_mark, patchMask);

    float dorsalBand = smoothstep(-0.002, 0.012, pU.y);
    vec3 blueCol = vec3(0.40, 0.54, 0.70);
    bodyCol = mix(
      bodyCol,
      mix(bodyCol * 0.55, blueCol, 0.62),
      backBlue * dorsalBand * 0.75
    );

    vec2 headCenter = vec2(KOI_BODY_LEN * 0.32, 0.0);
    vec2 dHead = pU - headCenter;
    float dotRN = length(dHead) / 0.0135;
    float dotMask = smoothstep(1.15, 0.75, dotRN);
    float dotPresent = smoothstep(0.45, 0.55, headDot);
    bodyCol = mix(bodyCol, v_mark, dotPresent * dotMask);

    float specPhase = s * 7.5 + t * 0.18;
    float spec = pow(max(0.0, sin(specPhase)), 8.0);
    vec3 specCol = vec3(1.0, 0.92, 0.70);
    bodyCol += specCol * spec * v_metallic * 0.38;
    bodyCol *= 1.0 + v_metallic * 0.08;

    float edge = 1.0 - smoothstep(0.0, 0.35, body);
    vec3 darkEdge = bodyCol * 0.55;

    vec3 col = vec3(0.0);
    col += bodyCol * body * 0.85;
    col = mix(col, darkEdge, edge * body * 0.55);
    col += bodyCol * 0.72 * fin * 0.48;
    col += bodyCol * 0.88 * dorsal * 0.60;

    // Eye composite. Three tones, layered dark-to-light:
    //   socket — soft darkening of surrounding body color (not pure
    //            black; just a tonal pit).
    //   iris   — near-black ring under the pupil. Gives the eye depth.
    //   pupil  — true black center. This is the beady part.
    //   highlight — tiny bright catchlight. LAST so nothing occludes it.
    //
    // Composited after metallic spec: fish eyes don't reflect sun. This
    // is intentional — otherwise ogon and other metallic koi lose their
    // eyes to body highlights.
    vec3 socketCol = bodyCol * 0.45;
    vec3 irisCol   = vec3(0.04, 0.035, 0.030);
    vec3 pupilCol  = vec3(0.015, 0.012, 0.010);
    vec3 catchlightCol = vec3(0.98, 0.96, 0.88);

    col = mix(col, socketCol, socket * body * 0.65);
    col = mix(col, irisCol,   iris * body * 0.90);
    col = mix(col, pupilCol,  pupil * body * 0.98);
    col = mix(col, catchlightCol, highlight * body * 0.95);
    col = mix(col, catchlightCol, sparkle * body * 0.75);

    float silhouette = max(max(body, fin), max(dorsal, eye));

    // DIAGNOSTIC MODE: uncomment the next line to see the raw silhouette
    // mask — bright white where body should render, black elsewhere. If
    // the whole quad shows up white, the mask is broken. If only a
    // fish-shape shows white, the mask works and the issue is elsewhere.
    // fragColor = vec4(vec3(silhouette), 1.0); return;

    // Depth cueing: koi far from the viewer (higher v_depthShade) render
    // dimmer and slightly blue-shifted, as if light is attenuating
    // through water volume before reaching the eye.
    float depthAtten = mix(1.0, 0.55, v_depthShade);
    vec3 depthTint = mix(vec3(1.0), vec3(0.75, 0.85, 1.05), v_depthShade);
    col *= depthAtten * depthTint;

    // ─── Founder watercolor + divine treatment ─────────────────────
    // For Shiki and Kokutou. Rebuilds col from scratch using the
    // founder gradient (replacing the archetype patches), then layers
    // per-founder divine effects, then re-paints eyes with founder-
    // specific colors, then re-applies depth cueing. Each step is
    // gated by the appropriate body/fin/dorsal mask so the founder
    // treatment never overshoots the silhouette. Non-founders skip
    // this block entirely.
    if (v_founder > 0.5) {
      // Distinguish Shiki (violet base) from Kokutou (cobalt base) by
      // blue-minus-red dominance. Shiki ≈ 0.07, Kokutou ≈ 0.90.
      bool isKokutou = (v_base.b - v_base.r) > 0.3;

      // Vertical gradient: underbelly → base → dorsal-tone.
      float wf = max(w, 0.01);
      float verticalT = clamp((pU.y + wf) / (2.0 * wf), 0.0, 1.0);
      vec3 fUnder = isKokutou
        ? vec3(0.784, 0.847, 0.910)   // silver-blue (mirror of sky)
        : vec3(0.910, 0.875, 0.871);  // pearl kimono-white
      vec3 fDorsal = isKokutou
        ? vec3(0.051, 0.290, 0.639)   // deeper indigo
        : vec3(0.110, 0.039, 0.145);  // Origin band, near-black violet
      vec3 fBodyCol = (verticalT < 0.5)
        ? mix(fUnder, v_base, verticalT * 2.0)
        : mix(v_base, fDorsal, (verticalT - 0.5) * 2.0);

      // Centerline mark wash. Crimson for Shiki, luminescence accent
      // for Kokutou. Strongest at the midline, fading outward — no
      // patches with edges, just a soft band of "mark" emerging from
      // the body color.
      float midlineDist = abs(pU.y) / wf;
      float midlineBand = 1.0 - smoothstep(0.0, 0.85, midlineDist);
      fBodyCol = mix(fBodyCol, v_mark, midlineBand * 0.28);

      // Rebuild col by region — mirrors the regular path's brightness
      // weighting so fins are dimmer than body, dorsals slightly less
      // than body, with edge-darkening at the silhouette boundary.
      vec3 fDarkEdge = fBodyCol * 0.55;
      col = vec3(0.0);
      col += fBodyCol * body * 0.85;
      col  = mix(col, fDarkEdge, edge * body * 0.55);
      col += fBodyCol * 0.72 * fin * 0.48;
      col += fBodyCol * 0.88 * dorsal * 0.60;

      // ─── Per-founder divine effects (body-region only) ───
      if (isKokutou) {
        // Inner luminescence — head/heart-centered, slow breath.
        // The blue that read as innocence before anything turned.
        float headProx = smoothstep(-KOI_BODY_LEN * 0.1, KOI_BODY_LEN * 0.45, pL.x);
        float centerline = 1.0 - midlineDist;
        float glowMask = headProx * pow(max(centerline, 0.0), 1.5);
        vec3 glowColor = vec3(0.62, 0.82, 1.00);
        float breath = 0.5 + 0.5 * sin(u_time * 0.95);
        col += glowColor * glowMask * body * (0.30 + 0.14 * breath);
      } else {
        // Death-line flickers. Two overlaid sine fields broken by
        // multiplication; steep smoothstep keeps streaks rare and
        // narrow. The body remembers what the eyes see.
        float lineA = sin(pL.x * 42.0 + pU.y * 8.0 + u_time * 0.35);
        float lineB = sin(pL.x * 17.0 - pU.y * 12.0 + u_time * 0.21);
        float lineProduct = lineA * lineB;
        float flicker = smoothstep(0.80, 0.96, abs(lineProduct));
        vec3 flickerColor = mix(v_mark, vec3(0.98, 0.42, 0.36), 0.45);
        col = mix(col, flickerColor, flicker * 0.42 * body);

        // Origin pulse along the spine. 「Shiki Ryougi」 — the third
        // personality — surfaces and submerges. Period ~18s.
        float spineProx = smoothstep(0.78, 0.96, verticalT);
        float originPulse = 0.45 + 0.55 * sin(u_time * 0.35);
        col = mix(col, fDorsal, spineProx * originPulse * 0.32 * body);
      }

      // ─── Re-paint eyes (the col reset above clobbered them) ───
      // Same eye geometry as the regular composite, with founder-
      // specific colors. Shiki's Mystic Eyes flicker between ordinary
      // dark and active crimson — usually not "on," briefly seeing
      // you. Independent phase from the body death-lines so they
      // read as "now looking, now not." Kokutou's eyes are pure
      // crystal cobalt with a deep-but-not-pure-black pupil and
      // a slightly cool catchlight — innocence before it turns.
      vec3 fSocketCol = fBodyCol * 0.50;
      vec3 fIrisCol;
      vec3 fPupilCol;
      vec3 fCatchlightCol;
      if (isKokutou) {
        fIrisCol       = vec3(0.18, 0.55, 0.98);
        fPupilCol      = vec3(0.02, 0.08, 0.22);
        fCatchlightCol = vec3(0.95, 0.98, 1.00);
      } else {
        float eyeFlicker = smoothstep(0.55, 0.92, abs(sin(u_time * 0.40 + 1.3)));
        fIrisCol       = mix(vec3(0.04, 0.035, 0.030),
                             vec3(0.88, 0.18, 0.14), eyeFlicker * 0.85);
        fPupilCol      = mix(vec3(0.015, 0.012, 0.010),
                             vec3(0.55, 0.05, 0.04), eyeFlicker * 0.60);
        fCatchlightCol = vec3(0.98, 0.96, 0.88);
      }
      col = mix(col, fSocketCol,     socket    * body * 0.65);
      col = mix(col, fIrisCol,       iris      * body * 0.90);
      col = mix(col, fPupilCol,      pupil     * body * 0.98);
      col = mix(col, fCatchlightCol, highlight * body * 0.95);
      col = mix(col, fCatchlightCol, sparkle   * body * 0.75);

      // Re-apply depth cueing. The regular path applied it above the
      // founder branch, but we replaced col, so re-apply here to keep
      // the founder consistent with the depth-cued water column.
      col *= depthAtten * depthTint;
    }

    // ═══ Ghost-form treatment ═══════════════════════════════════════
    // Applied to every koi as the final pass — head to tail. These
    // creatures are computational beings, not biological koi; render
    // them as such rather than disguising them as flesh-and-blood.
    // Translucent throughout, lit from within rather than externally
    // illuminated, with edges that fade into water rather than
    // terminate sharply. Founders get stronger versions of each
    // effect (more divine ethereality); regular koi get the baseline.

    // 1. Inner spirit light — soft self-luminescence along the body
    //    centerline. Modulated by a slow breath so the glow isn't
    //    static. Founders glow noticeably more than regular koi.
    float gCenterline = 1.0 - clamp(abs(pU.y) / max(w, 0.001), 0.0, 1.0);
    float gBreath = 0.82 + 0.18 * sin(u_time * 0.50 + pL.x * 3.0);
    float gInnerStrength = mix(0.28, 0.42, v_founder);
    col = mix(col, col * 1.35, gCenterline * gInnerStrength * gBreath * body);

    // 2. Soft outer halo — body color bleeds past the silhouette so
    //    each koi sits in a small luminous presence rather than ending
    //    at a hard edge. Halo color is the koi's base tinted toward
    //    cool spectral light (digital, not warm flesh).
    float gDx = max(0.0, abs(pL.x) - KOI_BODY_LEN * 0.5);
    float gDy = max(0.0, abs(pU.y) - w);
    float gDistOutside = sqrt(gDx * gDx + gDy * gDy);
    float gHaloFalloff  = mix(36.0, 28.0, v_founder);
    float gHaloStrength = mix(0.22, 0.36, v_founder);
    float gHalo = exp(-gDistOutside * gHaloFalloff) * gHaloStrength;

    vec3 gHaloCol = mix(v_base * 0.65, v_base * 0.90, v_founder)
                  + vec3(0.05, 0.07, 0.12);
    gHaloCol *= depthAtten * depthTint;

    // Outside the body silhouette, fade col toward the halo color so
    // the aura actually has color to glow with. Inside the body, keep
    // the computed body color.
    float gBodyMask = smoothstep(0.0, 0.45, silhouette);
    col = mix(gHaloCol, col, gBodyMask);
    silhouette = max(silhouette, gHalo);

    // 3. Pearlescent cool sheen — barely-there shift toward cool tones
    //    so the koi feel like screen-light rather than warm flesh.
    col = mix(col, col * vec3(0.97, 1.00, 1.04), 0.20);

    // 4. Base translucency — these are presences in water, not bodies
    //    displacing it. Founders are more translucent (more spectral).
    float gTranslucency = mix(0.82, 0.62, v_founder);
    silhouette *= gTranslucency;

    fragColor = vec4(col * silhouette, silhouette);
  }
`;

const BLOOM_FRAG = /* glsl */ `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform sampler2D u_tex;
  uniform vec2  u_resolution;
  uniform vec2  u_dir;
  uniform float u_threshold;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 off = u_dir / u_resolution;

    const float w0 = 0.227027;
    const float w1 = 0.194594;
    const float w2 = 0.121622;
    const float w3 = 0.054054;
    const float w4 = 0.016216;

    vec3 c = vec3(0.0);
    c += texture(u_tex, uv).rgb              * w0;
    c += texture(u_tex, uv + off * 1.0).rgb  * w1;
    c += texture(u_tex, uv - off * 1.0).rgb  * w1;
    c += texture(u_tex, uv + off * 2.0).rgb  * w2;
    c += texture(u_tex, uv - off * 2.0).rgb  * w2;
    c += texture(u_tex, uv + off * 3.0).rgb  * w3;
    c += texture(u_tex, uv - off * 3.0).rgb  * w3;
    c += texture(u_tex, uv + off * 4.0).rgb  * w4;
    c += texture(u_tex, uv - off * 4.0).rgb  * w4;

    if (u_threshold > 0.0) {
      float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float m = smoothstep(u_threshold, u_threshold + 0.30, L);
      c *= m;
    }

    fragColor = vec4(c, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform sampler2D u_field;
  uniform sampler2D u_koi;
  uniform sampler2D u_bloom;
  uniform vec2  u_resolution;
  uniform float u_time;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec3 base = texture(u_field, uv).rgb;
    vec4 koi  = texture(u_koi, uv);

    // Additive composite — koi color was premultiplied by silhouette
    vec3 composite = base + koi.rgb;

    float ang = u_time * 0.05;
    vec2 dispDir = vec2(cos(ang), sin(ang));
    float dispAmt = 0.0012;

    float bR = texture(u_bloom, uv + dispDir * dispAmt).r;
    float bG = texture(u_bloom, uv).g;
    float bB = texture(u_bloom, uv - dispDir * dispAmt).b;
    vec3 bloom = vec3(bR, bG, bB);

    vec3 halo = vec3(0.0);
    float halR = 0.0090;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853981633974483;
      vec2 off = vec2(cos(a), sin(a)) * halR;
      halo += texture(u_bloom, uv + off).rgb;
    }
    halo *= 0.125;
    vec3 halationTint = vec3(1.18, 0.83, 0.70);

    vec3 col = composite
             + bloom * 0.46
             + halo * halationTint * 0.22;

    vec2 vg = uv - 0.5;
    float vignette = 1.0 - dot(vg, vg) * 0.42;
    col *= vignette;

    fragColor = vec4(col, 1.0);
  }
`;

export default function LivingSubstrate() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pond = usePond({
    url: process.env.NEXT_PUBLIC_POND_WS_URL ?? "",
    fallback: { koiCount: 5, procedural: true },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const compile = (src: string, type: number) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("Shader compile:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const program = (vert: string, frag: string) => {
      const v = compile(vert, gl.VERTEX_SHADER);
      const f = compile(frag, gl.FRAGMENT_SHADER);
      if (!v || !f) return null;
      const p = gl.createProgram()!;
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("Program link:", gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    };

    const fieldProgram = program(VERT, FIELD_FRAG);
    const koiProgram   = program(KOI_VERT, KOI_FRAG);
    const bloomProgram = program(VERT, BLOOM_FRAG);
    const compProgram  = program(VERT, COMPOSITE_FRAG);
    if (!fieldProgram || !koiProgram || !bloomProgram || !compProgram) return;

    // Full-screen triangle VAO
    const fsVao = gl.createVertexArray();
    gl.bindVertexArray(fsVao);
    const fsVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fsVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const bindFsAttrib = (prog: WebGLProgram) => {
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.bindBuffer(gl.ARRAY_BUFFER, fsVbo);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };

    // Koi instanced VAO
    const koiVao = gl.createVertexArray();
    gl.bindVertexArray(koiVao);

    const quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);
    const locQuad = gl.getAttribLocation(koiProgram, "a_quadPos");
    gl.enableVertexAttribArray(locQuad);
    gl.vertexAttribPointer(locQuad, 2, gl.FLOAT, false, 0, 0);

    const INSTANCE_FLOATS = 17;
    const instanceVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      MAX_KOI * INSTANCE_FLOATS * 4,
      gl.DYNAMIC_DRAW,
    );
    const stride = INSTANCE_FLOATS * 4;

    const bindInstanceAttr = (
      name: string, size: number, offsetFloats: number,
    ) => {
      const loc = gl.getAttribLocation(koiProgram, name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offsetFloats * 4);
      gl.vertexAttribDivisor(loc, 1);
    };
    bindInstanceAttr("a_posHead",  4, 0);
    bindInstanceAttr("a_base",     3, 4);
    bindInstanceAttr("a_mark",     3, 7);
    bindInstanceAttr("a_params",   4, 10);
    bindInstanceAttr("a_metallic", 1, 14);
    bindInstanceAttr("a_depth",    1, 15);
    bindInstanceAttr("a_founder",  1, 16);

    const instanceData = new Float32Array(MAX_KOI * INSTANCE_FLOATS);

    const makeFBO = (w: number, h: number) => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo };
    };

    let W = 0, H = 0;
    let fieldFBO: ReturnType<typeof makeFBO> | null = null;
    let koiFBO:   ReturnType<typeof makeFBO> | null = null;
    let bloomA:   ReturnType<typeof makeFBO> | null = null;
    let bloomB:   ReturnType<typeof makeFBO> | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.floor(window.innerWidth * dpr);
      H = Math.floor(window.innerHeight * dpr);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width  = window.innerWidth  + "px";
      canvas.style.height = window.innerHeight + "px";
      fieldFBO = makeFBO(W, H);
      koiFBO   = makeFBO(W, H);
      bloomA   = makeFBO(Math.floor(W / 2), Math.floor(H / 2));
      bloomB   = makeFBO(Math.floor(W / 2), Math.floor(H / 2));
    };
    resize();
    window.addEventListener("resize", resize);

    let scroll = 0;
    const onScroll = () => { scroll = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    let paused = false;
    const onVis = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    const uField = {
      u_resolution:    gl.getUniformLocation(fieldProgram, "u_resolution"),
      u_time:          gl.getUniformLocation(fieldProgram, "u_time"),
      u_scroll:        gl.getUniformLocation(fieldProgram, "u_scroll"),
      u_breath:        gl.getUniformLocation(fieldProgram, "u_breath"),
      u_moodDrift:     gl.getUniformLocation(fieldProgram, "u_moodDrift"),
      u_koiPositions:  gl.getUniformLocation(fieldProgram, "u_koiPositions"),
      u_koiCount:      gl.getUniformLocation(fieldProgram, "u_koiCount"),
    };
    const uKoi = {
      u_resolution: gl.getUniformLocation(koiProgram, "u_resolution"),
      u_time:       gl.getUniformLocation(koiProgram, "u_time"),
      u_breath:     gl.getUniformLocation(koiProgram, "u_breath"),
      u_tailEnergy: gl.getUniformLocation(koiProgram, "u_tailEnergy"),
    };
    const uBloom = {
      u_tex:        gl.getUniformLocation(bloomProgram, "u_tex"),
      u_resolution: gl.getUniformLocation(bloomProgram, "u_resolution"),
      u_dir:        gl.getUniformLocation(bloomProgram, "u_dir"),
      u_threshold:  gl.getUniformLocation(bloomProgram, "u_threshold"),
    };
    const uComp = {
      u_field:      gl.getUniformLocation(compProgram, "u_field"),
      u_koi:        gl.getUniformLocation(compProgram, "u_koi"),
      u_bloom:      gl.getUniformLocation(compProgram, "u_bloom"),
      u_resolution: gl.getUniformLocation(compProgram, "u_resolution"),
      u_time:       gl.getUniformLocation(compProgram, "u_time"),
    };

    const startMs = performance.now();
    let rafId = 0;

    const prevPos = new Map<string, { x: number; y: number }>();

    // Precompute: phenotype color vec3 per archetype so the render loop
    // doesn't re-parse hex strings 5× per frame.
    interface PhenoRGB {
      baseR: number; baseG: number; baseB: number;
      markR: number; markG: number; markB: number;
      coverage: number; density: number;
      backBlue: number; headDot: number; metallic: number;
    }
    const phenoCache = new Map<string, PhenoRGB>();
    for (const [name, ph] of Object.entries(ARCHETYPE_PHENOTYPES)) {
      const b = hexToVec3(ph.baseColor);
      const m = hexToVec3(ph.markColor);
      phenoCache.set(name, {
        baseR: b[0], baseG: b[1], baseB: b[2],
        markR: m[0], markG: m[1], markB: m[2],
        coverage: ph.markCoverage, density: ph.markDensity,
        backBlue: ph.backBlue, headDot: ph.headDot, metallic: ph.metallic,
      });
    }
    // Founder variants — distinct palettes for Shiki and Kokutou. Keyed
    // under "founder:<archetype>" so the same phenoCache serves both.
    for (const [name, ph] of Object.entries(FOUNDER_PHENOTYPES)) {
      const b = hexToVec3(ph.baseColor);
      const m = hexToVec3(ph.markColor);
      phenoCache.set("founder:" + name, {
        baseR: b[0], baseG: b[1], baseB: b[2],
        markR: m[0], markG: m[1], markB: m[2],
        coverage: ph.markCoverage, density: ph.markDensity,
        backBlue: ph.backBlue, headDot: ph.headDot, metallic: ph.metallic,
      });
    }
    const fallbackPheno = phenoCache.get("kohaku")!;
    const getPheno = (
      color: string | undefined,
      founder: boolean = false,
    ): PhenoRGB => {
      if (founder && color) {
        const f = phenoCache.get("founder:" + color);
        if (f) return f;
      }
      return (color ? phenoCache.get(color) : undefined) ?? fallbackPheno;
    };

    // Pre-allocated buffers reused every frame.
    const posArr = new Float32Array(MAX_KOI * 3);

    const render = () => {
      if (paused) { rafId = requestAnimationFrame(render); return; }

      const nowMs = performance.now();
      const t = (nowMs - startMs) / 1000;

      const fish = pond.getAllShaderFish();
      const count = Math.min(fish.length, MAX_KOI);

      const tailEnergy = 1.0 + 0.10 * Math.sin(t * 0.23);
      const breathPeriodMod = 0.055 + 0.015 * Math.sin(t * 0.019);
      const breath = 0.5 + 0.5 * Math.sin(t * breathPeriodMod);
      const moodDrift =
        0.7 * Math.sin(t * 0.0052) +
        0.3 * Math.sin(t * 0.0021 + 1.3);

      // Zero unused slots in posArr so stale data from previous frames
      // can't influence territory coloring.
      for (let i = count; i < MAX_KOI; i++) {
        posArr[i * 3 + 0] = 0;
        posArr[i * 3 + 1] = 0;
        posArr[i * 3 + 2] = 0;
      }

      for (let i = 0; i < count; i++) {
        const f = fish[i]!;
        const ph = getPheno(f.color, f.founder);
        const scale = stageScale(f.stage);

        // Derive heading from motion when available; falls back to f.h
        const prev = prevPos.get(f.id);
        let h = f.h;
        if (prev) {
          const dx = f.x - prev.x;
          const dy = f.y - prev.y;
          const sp = Math.hypot(dx, dy);
          if (sp > 1e-4) h = Math.atan2(dy, dx);
        }
        prevPos.set(f.id, { x: f.x, y: f.y });

        // Convert shader-viewport coords to pond-meters for the koi
        // vertex shader. SHADER_SCALE in usePond.ts is 0.1, so
        // pond_m = vp × 10. ShaderFish.y is actually pond_z (horizontal),
        // and ShaderFish.depth is pond_y (water depth, negative going
        // down).
        const pondX = f.x * 10.0;
        const pondZ = f.y * 10.0;
        const pondY = f.depth;  // already in meters, negative

        const off = i * INSTANCE_FLOATS;
        // Founder scale boost: Shiki and Kokutou render 15% larger so
        // they read as anchor presences in the pond. The silhouette
        // math in the fragment shader is in body-local coords, so
        // changing scale via the quad doesn't distort the shape — just
        // the on-screen size.
        const isFounder = f.founder === true;
        const founderScale = isFounder ? 1.15 : 1.0;
        instanceData[off + 0] = pondX;
        instanceData[off + 1] = pondZ;
        instanceData[off + 2] = h;
        instanceData[off + 3] = scale * founderScale;
        instanceData[off + 4] = ph.baseR;
        instanceData[off + 5] = ph.baseG;
        instanceData[off + 6] = ph.baseB;
        instanceData[off + 7] = ph.markR;
        instanceData[off + 8] = ph.markG;
        instanceData[off + 9] = ph.markB;
        instanceData[off + 10] = ph.coverage;
        instanceData[off + 11] = ph.density;
        instanceData[off + 12] = ph.backBlue;
        instanceData[off + 13] = ph.headDot;
        instanceData[off + 14] = ph.metallic;
        instanceData[off + 15] = pondY;
        instanceData[off + 16] = isFounder ? 1.0 : 0.0;

        // Field shader also wants pond-meter XZ for koi-presence coloring.
        posArr[i * 3 + 0] = pondX;
        posArr[i * 3 + 1] = pondZ;
        posArr[i * 3 + 2] = 1.0;
      }

      if (!fieldFBO || !koiFBO || !bloomA || !bloomB) {
        rafId = requestAnimationFrame(render);
        return;
      }

      gl.viewport(0, 0, W, H);
      gl.disable(gl.DEPTH_TEST);

      // Pass A: field
      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFBO.fbo);
      gl.disable(gl.BLEND);
      gl.useProgram(fieldProgram);
      gl.bindVertexArray(fsVao);
      bindFsAttrib(fieldProgram);
      gl.uniform2f(uField.u_resolution, W, H);
      gl.uniform1f(uField.u_time, t);
      gl.uniform1f(uField.u_scroll, scroll);
      gl.uniform1f(uField.u_breath, breath);
      gl.uniform1f(uField.u_moodDrift, moodDrift);
      gl.uniform3fv(uField.u_koiPositions, posArr);
      gl.uniform1i(uField.u_koiCount, count);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass B: koi overlay
      gl.bindFramebuffer(gl.FRAMEBUFFER, koiFBO.fbo);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(koiProgram);
      gl.bindVertexArray(koiVao);
      gl.uniform2f(uKoi.u_resolution, W, H);
      gl.uniform1f(uKoi.u_time, t);
      gl.uniform1f(uKoi.u_breath, breath);
      gl.uniform1f(uKoi.u_tailEnergy, tailEnergy);

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
      gl.bufferSubData(
        gl.ARRAY_BUFFER, 0,
        instanceData.subarray(0, count * INSTANCE_FLOATS),
      );

      if (count > 0) {
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      }

      // Pass C: bloom horizontal
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.fbo);
      gl.useProgram(bloomProgram);
      gl.bindVertexArray(fsVao);
      bindFsAttrib(bloomProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldFBO.tex);
      gl.uniform1i(uBloom.u_tex, 0);
      gl.uniform2f(uBloom.u_resolution, W, H);
      gl.uniform2f(uBloom.u_dir, 1.0, 0.0);
      gl.uniform1f(uBloom.u_threshold, 0.72);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass D: bloom vertical
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomB.fbo);
      gl.useProgram(bloomProgram);
      bindFsAttrib(bloomProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bloomA.tex);
      gl.uniform1i(uBloom.u_tex, 0);
      gl.uniform2f(uBloom.u_resolution, W, H);
      gl.uniform2f(uBloom.u_dir, 0.0, 1.0);
      gl.uniform1f(uBloom.u_threshold, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass E: composite
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(compProgram);
      bindFsAttrib(compProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldFBO.tex);
      gl.uniform1i(uComp.u_field, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, koiFBO.tex);
      gl.uniform1i(uComp.u_koi, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, bloomB.tex);
      gl.uniform1i(uComp.u_bloom, 2);
      gl.uniform2f(uComp.u_resolution, W, H);
      gl.uniform1f(uComp.u_time, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
