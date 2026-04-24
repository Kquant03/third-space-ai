// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · GLSL shaders
//  ─────────────────────────────────────────────────────────────────────────
//  Six WebGL2 fragment programs driving the multi-channel ecosystem:
//
//    VERT_SRC      — fullscreen quad vertex shader
//    SIM_FRAG_SRC  — four-channel integrator: prey (R), predator (G),
//                    morphogen (B), 4D hypersphere (A). Cross-coupling in
//                    the growth rules; state is advected along the flow
//                    field from the previous tick; brush paints into any
//                    one of four target channels.
//    FLOW_FRAG_SRC — derives a 2D velocity field from prey and morphogen
//                    gradients; three modes (gradient / curl / spiral).
//                    Feeds the advection step of SIM_FRAG.
//    HYPER_FRAG_SRC — samples a 2D cross-section of the Dihypersphaerome
//                    ventilans (Chan's 4D organism with β=[1/12,1/6,1]) at
//                    a rotating (XW, YW, ZW) orientation; the "breathing"
//                    of the ventilans IS the ZW rotation rate. The 2D
//                    shadow bleeds into the prey channel as generative
//                    seed material.
//    DISPLAY_FRAG_SRC — ecosystem palette (prey warm gold, predator
//                    electric violet-cyan, predation zone vivid green,
//                    4D ghostly violet), plus five channel-isolation modes.
//    BLOOM_FRAG_SRC — separable Gaussian blur with bright-pass extract.
//    COMP_FRAG_SRC  — additive bloom + Reinhard tone map + vignette.
//
//  Shader logic matches the source LeniaExpanded.jsx 1:1. Template-literal
//  substitutions use `${KC}` / `${KS}` to inline the kernel-texture size
//  at compile time — they're resolved when the module loads, not per-frame.
// ═══════════════════════════════════════════════════════════════════════════

// Grid constants shared across Lenia Expanded.
export const N = 256;
export const DISPLAY = 560;
export const BLOOM_SCALE = 4;

// Kernel texture size + center index. Maximum supported kernel radius is
// KC - 1 = 24 cells. Morphogen kernel at R=20 fits; predator at R=15 fits.
export const KS = 51;
export const KC = 25;

// ───────────────────────────────────────────────────────────────────────────
//  VERT — fullscreen quad
// ───────────────────────────────────────────────────────────────────────────

export const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  SIM — four-channel integrator with cross-coupling, advection, 4D bleed
//  State channels: R=prey, G=predator, B=morphogen, A=4D.
// ───────────────────────────────────────────────────────────────────────────

export const SIM_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_state;
uniform sampler2D u_kernel0;
uniform sampler2D u_kernel1;
uniform sampler2D u_kernel2;
uniform sampler2D u_flow;
uniform sampler2D u_hyperseed;

uniform float u_R0, u_R1, u_R2;
uniform float u_mu0, u_mu1, u_mu2;
uniform float u_sigma0, u_sigma1, u_sigma2;
uniform float u_dt;
uniform vec2  u_res;

// Cross-channel coupling strengths:
//   c01 predator suppresses prey;   c10 prey feeds predator
//   c20 morphogen modulates prey σ; c21 morphogen modulates predator σ
//   c02 prey secretes morphogen;    c12 predator secretes morphogen
uniform float u_c01, u_c10, u_c20, u_c21, u_c02, u_c12;

// Brush
uniform vec2  u_mouse;
uniform float u_brushSize, u_brushActive, u_brushErase, u_brushChan;

// 4D controls
uniform float u_hyperAmp;
uniform float u_hyperMix;
uniform float u_flowStr;
uniform float u_time;

float grow(float u, float mu, float sigma) {
  float d = u - mu;
  return 2.0 * exp(-(d*d) / (2.0*sigma*sigma)) - 1.0;
}

vec2 texel;

float conv(sampler2D kern, float R, vec2 uv) {
  int Ri = int(R);
  float pot = 0.0;
  for (int dy = -25; dy <= 25; dy++) {
    if (dy < -Ri || dy > Ri) continue;
    for (int dx = -25; dx <= 25; dx++) {
      if (dx < -Ri || dx > Ri) continue;
      vec2 kUV = (vec2(float(dx + ${KC}), float(dy + ${KC})) + 0.5) / ${KS}.0;
      float w = texture(kern, kUV).r;
      if (w < 1e-7) continue;
      vec2 sUV = fract(uv + vec2(float(dx), float(dy)) * texel);
      pot += texture(u_state, sUV).r * w;
    }
  }
  return pot;
}

float conv1(sampler2D kern, float R, vec2 uv) {
  int Ri = int(R);
  float pot = 0.0;
  for (int dy = -25; dy <= 25; dy++) {
    if (dy < -Ri || dy > Ri) continue;
    for (int dx = -25; dx <= 25; dx++) {
      if (dx < -Ri || dx > Ri) continue;
      vec2 kUV = (vec2(float(dx + ${KC}), float(dy + ${KC})) + 0.5) / ${KS}.0;
      float w = texture(kern, kUV).r;
      if (w < 1e-7) continue;
      vec2 sUV = fract(uv + vec2(float(dx), float(dy)) * texel);
      pot += texture(u_state, sUV).g * w;
    }
  }
  return pot;
}

float conv2(sampler2D kern, float R, vec2 uv) {
  int Ri = int(R);
  float pot = 0.0;
  for (int dy = -25; dy <= 25; dy++) {
    if (dy < -Ri || dy > Ri) continue;
    for (int dx = -25; dx <= 25; dx++) {
      if (dx < -Ri || dx > Ri) continue;
      vec2 kUV = (vec2(float(dx + ${KC}), float(dy + ${KC})) + 0.5) / ${KS}.0;
      float w = texture(kern, kUV).r;
      if (w < 1e-7) continue;
      vec2 sUV = fract(uv + vec2(float(dx), float(dy)) * texel);
      pot += texture(u_state, sUV).b * w;
    }
  }
  return pot;
}

void main() {
  texel = 1.0 / u_res;

  // Advect: sample state from where flow carries us FROM.
  vec2 vel = (texture(u_flow, v_uv).rg - 0.5) * 2.0;
  vec2 advUV = fract(v_uv - vel * texel * u_flowStr);

  vec4 prev = texture(u_state, advUV);
  float a0 = prev.r, a1 = prev.g, a2 = prev.b, a3 = prev.a;

  float pot0 = conv(u_kernel0, u_R0, advUV);
  float pot1 = conv1(u_kernel1, u_R1, advUV);
  float pot2 = conv2(u_kernel2, u_R2, advUV);

  // Morphogen modulates the σ of prey and predator growth functions —
  // the field's "opinion" about how kind physics should be at each cell.
  float sig0eff = clamp(u_sigma0 * (1.0 + u_c20 * (a2 - 0.3)), 0.005, 0.06);
  float sig1eff = clamp(u_sigma1 * (1.0 + u_c21 * (a2 - 0.3)), 0.005, 0.06);

  // Growth with cross-coupling.
  float g0 = grow(pot0, u_mu0, sig0eff) - u_c01 * a1 * 0.8;             // prey
  float g1 = grow(pot1, u_mu1, sig1eff) + u_c10 * a0 * 1.2 - 0.012;     // predator
  float g2 = grow(pot2, u_mu2, u_sigma2) + u_c02 * a0 + u_c12 * a1 - 0.018; // morphogen

  // 4D channel: read current hyperseed slice, decay toward it.
  float hyperSlice = texture(u_hyperseed, v_uv).r;
  float g3 = (hyperSlice * u_hyperAmp - a3) * 0.08;

  // The Dihypersphaerome bleeds into prey — ecosystem seeded from 4D.
  g0 += a3 * u_hyperMix * 0.4;

  float n0 = clamp(a0 + u_dt * g0, 0.0, 1.0);
  float n1 = clamp(a1 + u_dt * g1, 0.0, 1.0);
  float n2 = clamp(a2 + u_dt * g2, 0.0, 1.0);
  float n3 = clamp(a3 + u_dt * g3, 0.0, 1.0);

  if (u_brushActive > 0.5) {
    vec2 delta = v_uv - u_mouse;
    delta -= round(delta);
    float dist = length(delta * u_res);
    if (dist < u_brushSize) {
      float b = pow(1.0 - dist / u_brushSize, 2.0);
      float amt = u_brushErase > 0.5 ? -b * 0.6 : b * 0.45;
      int ch = int(u_brushChan);
      if (ch == 0) n0 = clamp(n0 + amt, 0.0, 1.0);
      else if (ch == 1) n1 = clamp(n1 + amt, 0.0, 1.0);
      else if (ch == 2) n2 = clamp(n2 + amt, 0.0, 1.0);
      else {
        // Composite: paint prey + predator at lower mix
        n0 = clamp(n0 + amt * 0.5, 0.0, 1.0);
        n1 = clamp(n1 + amt * 0.3, 0.0, 1.0);
      }
    }
  }

  outColor = vec4(n0, n1, n2, n3);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  FLOW — derives velocity from prey + morphogen gradients
// ───────────────────────────────────────────────────────────────────────────

export const FLOW_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_res;
uniform float u_time;
uniform float u_flowMode;

void main() {
  vec2 texel = 1.0 / u_res;

  float px = texture(u_state, fract(v_uv + vec2(texel.x, 0.0))).r;
  float nx = texture(u_state, fract(v_uv - vec2(texel.x, 0.0))).r;
  float py = texture(u_state, fract(v_uv + vec2(0.0, texel.y))).r;
  float ny = texture(u_state, fract(v_uv - vec2(0.0, texel.y))).r;
  float mx = texture(u_state, fract(v_uv + vec2(texel.x, 0.0))).b;
  float wx = texture(u_state, fract(v_uv - vec2(texel.x, 0.0))).b;
  float my = texture(u_state, fract(v_uv + vec2(0.0, texel.y))).b;
  float wy = texture(u_state, fract(v_uv - vec2(0.0, texel.y))).b;

  vec2 gradPrey  = vec2(px - nx, py - ny) * 0.5;
  vec2 gradMorph = vec2(mx - wx, my - wy) * 0.5;

  vec2 vel = vec2(0.0);

  if (u_flowMode < 0.5) {
    // Gradient: prey follows morphogen gradient + orthogonal circulation
    vel = gradMorph * 3.0 + vec2(-gradPrey.y, gradPrey.x) * 1.5;
  } else if (u_flowMode < 1.5) {
    // Curl: pure rotational flow derived from prey gradient
    vel = vec2(-gradPrey.y, gradPrey.x) * 4.0;
  } else {
    // Spiral: time-rotated radial flow + morphogen bias
    vec2 centered = v_uv - 0.5;
    float angle = atan(centered.y, centered.x) + u_time * 0.3;
    float r = length(centered);
    vel = vec2(cos(angle), sin(angle)) * r * 2.0 + gradMorph * 2.0;
  }

  // Pack vel into [0, 1] range with 0.5 = zero velocity.
  outColor = vec4(vel * 0.15 + 0.5, 0.5, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  HYPER — 4D Dihypersphaerome ventilans 2D cross-section
//  Analytical three-shell approximation of Chan's β=[1/12, 1/6, 1] organism.
// ───────────────────────────────────────────────────────────────────────────

export const HYPER_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform float u_time;
uniform float u_wSlice;
uniform float u_rotXW;
uniform float u_rotYW;
uniform float u_rotZW;
uniform float u_R4D;
uniform float u_mu4D;
uniform float u_sigma4D;
uniform sampler2D u_prev4D;

vec4 rotXW(vec4 p, float a) {
  float c = cos(a), s = sin(a);
  return vec4(c*p.x - s*p.w, p.y, p.z, s*p.x + c*p.w);
}
vec4 rotYW(vec4 p, float a) {
  float c = cos(a), s = sin(a);
  return vec4(p.x, c*p.y - s*p.w, p.z, s*p.y + c*p.w);
}
vec4 rotZW(vec4 p, float a) {
  float c = cos(a), s = sin(a);
  return vec4(p.x, p.y, c*p.z - s*p.w, s*p.z + c*p.w);
}

// Analytical density of the Dihypersphaerome — three hyperspherical shells
// at radii matching Chan's β=[1/12, 1/6, 1] peak vector.
float sampleDV(vec4 pos4D) {
  float r = length(pos4D) / u_R4D;
  if (r >= 1.0) return 0.0;
  float ring3 = exp(-pow((r - 0.85) / 0.08, 2.0)) * 1.0;
  float ring2 = exp(-pow((r - 0.55) / 0.10, 2.0)) * (1.0/6.0);
  float ring1 = exp(-pow((r - 0.20) / 0.12, 2.0)) * (1.0/12.0);
  return clamp(ring3 + ring2 + ring1, 0.0, 1.0);
}

void main() {
  vec2 xy = (v_uv - 0.5) * 2.2;
  vec4 p4 = vec4(xy.x, xy.y, 0.0, u_wSlice);
  p4 = rotXW(p4, u_rotXW);
  p4 = rotYW(p4, u_rotYW);
  p4 = rotZW(p4, u_rotZW);

  float density = sampleDV(p4);

  // Ventilating pulse: makes the 2D cross-section breathe in and out.
  // This is the "ventilans" in the species name — the rotation of the
  // 4D organism produces a periodic oscillation of its 2D shadow.
  float phase = sin(u_time * 0.8 + length(xy) * 2.5) * 0.5 + 0.5;
  density *= 0.7 + 0.3 * phase;

  outColor = vec4(density, density, density, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  DISPLAY — multi-channel palette + five channel-isolation modes
// ───────────────────────────────────────────────────────────────────────────

export const DISPLAY_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform sampler2D u_flow;
uniform int u_viewMode;
uniform float u_time;
uniform float u_trailMix;
uniform int u_palette;

vec3 spectrum(float t) {
  return clamp(
    vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67))),
    0.0, 1.0);
}

vec3 hsv(float h, float s, float v) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(vec3(h) + K.xyz) * 6.0 - K.www);
  return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
}

void main() {
  vec4 s = texture(u_state, v_uv);
  float a0 = s.r, a1 = s.g, a2 = s.b, a3 = s.a;

  vec3 col = vec3(0.003, 0.005, 0.012);

  if (u_viewMode == 0) {
    // ── Ecosystem view — the main rendering ──
    col += vec3(0.0, 0.02, 0.03) * a2 * 3.0;

    float preyDense = smoothstep(0.05, 0.7, a0);
    vec3 preyEdge = vec3(0.55, 0.28, 0.02);
    vec3 preyCore = vec3(1.0, 0.72, 0.06);
    vec3 preyHot  = vec3(1.0, 0.95, 0.75);
    col += mix(preyEdge, preyCore, preyDense * preyDense) * a0 * 2.5;
    col += preyHot * smoothstep(0.62, 0.92, a0) * 2.2;

    float predDense = smoothstep(0.05, 0.65, a1);
    vec3 predEdge = vec3(0.08, 0.22, 0.55);
    vec3 predCore = vec3(0.28, 0.85, 0.98);
    vec3 predHot  = vec3(0.85, 0.98, 1.0);
    col += mix(predEdge, predCore, predDense * predDense) * a1 * 2.8;
    col += predHot * smoothstep(0.6, 0.9, a1) * 1.8;

    // Predation overlap — vivid green flash where prey and predator meet.
    float overlap = a0 * a1;
    col += vec3(0.2, 1.0, 0.35) * overlap * 6.0;
    col += vec3(1.0, 1.0, 0.5) * smoothstep(0.15, 0.5, overlap) * 3.0;

    // 4D overlay — ghostly violet wisps drifting through the ecosystem.
    col += vec3(0.55, 0.25, 0.85) * a3 * 1.8;
    col += vec3(0.85, 0.75, 1.0) * smoothstep(0.5, 0.85, a3) * 1.2;

    // Edge iridescence from combined potential.
    float edge0 = smoothstep(0.03, 0.12, a0) * smoothstep(0.45, 0.12, a0);
    float edge1 = smoothstep(0.03, 0.12, a1) * smoothstep(0.45, 0.12, a1);
    float phase = a0 * 3.1 + a1 * 2.3 + a2 * 1.7 + u_time * 0.4;
    col += spectrum(phase * 0.12) * (edge0 + edge1) * 0.6;

  } else if (u_viewMode == 1) {
    col = mix(vec3(0.01, 0.04, 0.02), vec3(1.0, 0.7, 0.05), a0 * a0);
    col += vec3(1.0, 0.95, 0.7) * smoothstep(0.7, 0.95, a0);

  } else if (u_viewMode == 2) {
    col = mix(vec3(0.01, 0.02, 0.06), vec3(0.2, 0.85, 1.0), a1 * a1);
    col += vec3(0.9, 1.0, 1.0) * smoothstep(0.7, 0.95, a1);

  } else if (u_viewMode == 3) {
    col = vec3(0.0, 0.0, 0.01);
    col += vec3(0.4, 0.2, 0.8) * a3 * 2.5;
    col += vec3(0.8, 0.7, 1.0) * smoothstep(0.45, 0.85, a3) * 2.0;
    col += vec3(1.0, 0.98, 1.0) * smoothstep(0.75, 0.98, a3) * 1.5;
    float edge3 = smoothstep(0.04, 0.18, a3) * smoothstep(0.7, 0.18, a3);
    col += spectrum(a3 * 4.0 + u_time * 0.3) * edge3 * 1.2;

  } else if (u_viewMode == 4) {
    vec2 vel = (texture(u_flow, v_uv).rg - 0.5) * 2.0;
    float speed = length(vel);
    float angle = atan(vel.y, vel.x) / 6.28318 + 0.5;
    col = hsv(angle, 0.9, smoothstep(0.0, 0.3, speed) * 0.9);
    col *= 0.6 + a0 * 0.4 + a1 * 0.4;

  } else {
    col = mix(vec3(0.0, 0.01, 0.03), vec3(0.1, 0.6, 0.45), a2 * a2 * 2.0);
    col += vec3(0.5, 1.0, 0.8) * smoothstep(0.6, 0.9, a2);
  }

  outColor = vec4(col, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  BLOOM — separable Gaussian with bright-pass extract
// ───────────────────────────────────────────────────────────────────────────

export const BLOOM_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_input;
uniform vec2 u_dir, u_res;
uniform float u_extract;

void main() {
  vec2 texel = 1.0 / u_res;
  float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 result = vec3(0.0);
  for (int i = -4; i <= 4; i++) {
    vec3 s = texture(u_input, v_uv + u_dir * texel * float(i) * 1.5).rgb;
    if (u_extract > 0.5) {
      float br = dot(s, vec3(0.2126, 0.7152, 0.0722));
      s *= smoothstep(0.06, 0.4, br) * 2.0;
    }
    result += s * w[abs(i)];
  }
  outColor = vec4(result, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  COMP — additive bloom, Reinhard tone map, vignette
// ───────────────────────────────────────────────────────────────────────────

export const COMP_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_display, u_bloom;
uniform float u_bloomStr, u_vignette;

void main() {
  vec3 col = texture(u_display, v_uv).rgb;
  col += texture(u_bloom, v_uv).rgb * u_bloomStr;
  col = col / (1.0 + col * 0.38);
  vec2 c = v_uv - 0.5;
  col *= 1.0 - dot(c, c) * u_vignette;
  col = pow(col, vec3(0.92));
  outColor = vec4(col, 1.0);
}`;
