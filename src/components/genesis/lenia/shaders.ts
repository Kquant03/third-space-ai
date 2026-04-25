// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · GLSL shaders
//  ─────────────────────────────────────────────────────────────────────────
//  Four WebGL2 fragment programs sharing the same fullscreen-quad vertex
//  shader. Kept as string exports rather than extracted files so the build
//  pipeline doesn't need custom GLSL-loader configuration.
//
//    VERT_SRC          — fullscreen quad vertex shader
//    SIM_FRAG_SRC      — Lenia integration step with σ-field support
//                        and brush paint, ghost-memory, seasonal drive
//    DISPLAY_FRAG_SRC  — composites state → color via one of several
//                        palettes, including the Lantern palette (the
//                        signature warm-gold + violet-edge rendering
//                        matching the rest of the site)
//    MEMORY_FRAG_SRC   — slow low-pass on state. Drives the Ghost
//                        Species afterimage in the Lantern palette.
//    BLOOM_FRAG_SRC    — separable Gaussian blur with bright-pass extract
//                        (HDR-tuned thresholds; expects RGBA16F input)
//    COMPOSITE_FRAG_SRC — additive composite of display + blurred bloom,
//                        Reinhard tone map, vignette
//
//  The shader logic is unchanged from the original Lenia.jsx — these are
//  load-bearing and already produce the correct Lantern aesthetic. All
//  that changes at the port is the wrapping (typed, documented constants).
// ═══════════════════════════════════════════════════════════════════════════

// Simulation grid size (cells per side). Keep in sync with any code that
// allocates state textures or sigma-field buffers.
export const N = 256;

// Rendered canvas size in pixels. The final composite is drawn into a
// DISPLAY×DISPLAY viewport, nearest-neighbour sampled from the N×N state.
// Overridden by the canvas's CSS size when the page is full-bleed — this
// constant only controls the internal render resolution.
export const DISPLAY = 560;

// Bloom works at a downsampled resolution for speed; BLOOM_SCALE is the
// divisor. 4 = quarter-res blur, which is the sweet spot for the ~30 px
// falloff we want without making the composite pass expensive.
export const BLOOM_SCALE = 4;

// The precomputed kernel is stored in a KERNEL_TEX_SIZE × KERNEL_TEX_SIZE
// floating-point texture. Center is the KERNEL_CENTER'th texel. The
// maximum supported kernel radius R is KERNEL_CENTER - 1 = 25.
//
// The simulation shader's convolution loop bounds and the texel-coord
// math are template-interpolated from these constants below — bumping
// KERNEL_CENTER (or KERNEL_TEX_SIZE) just works without a separate edit
// to the GLSL string.
export const KERNEL_TEX_SIZE = 51;
export const KERNEL_CENTER = 25;

// ───────────────────────────────────────────────────────────────────────────
//  Vertex shader — fullscreen quad with UV passthrough
// ───────────────────────────────────────────────────────────────────────────

export const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  Simulation fragment shader
//
//  Reads the previous state, convolves against the kernel texture inside a
//  ±R loop, applies the growth function exp(-((potential - μ)²) / (2σ²)),
//  integrates with step dt. σ can be per-cell (sigmaField texture) for
//  Ghost Species — the "σ-gradient landscape" where creatures remember
//  shapes they can never hold.
//
//  The state texture is RGBA32F with channels:
//    R — Lenia scalar state ∈ [0, 1]
//    G — trail field (decaying echo)
//    B — potential field (convolution result)
//    A — growth field (signed)
// ───────────────────────────────────────────────────────────────────────────

export const SIM_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform sampler2D u_kernel;
uniform sampler2D u_sigmaField;
uniform float u_R;
uniform float u_mu;
uniform float u_sigma;
uniform float u_dt;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_brushSize;
uniform float u_brushActive;
uniform float u_brushErase;
uniform float u_trailDecay;
uniform float u_ghostMode;
uniform float u_seasonMod;

void main() {
  vec2 texel = 1.0 / u_res;
  vec4 prev = texture(u_state, v_uv);
  float state = prev.r;
  float trail = prev.g;
  int R = int(u_R);

  float potential = 0.0;
  for (int dy = -${KERNEL_CENTER}; dy <= ${KERNEL_CENTER}; dy++) {
    for (int dx = -${KERNEL_CENTER}; dx <= ${KERNEL_CENTER}; dx++) {
      if (abs(dx) > R || abs(dy) > R) continue;
      vec2 kuv = vec2(float(dx + ${KERNEL_CENTER}) + 0.5, float(dy + ${KERNEL_CENTER}) + 0.5) / ${KERNEL_TEX_SIZE}.0;
      float k = texture(u_kernel, kuv).r;
      if (k == 0.0) continue;
      vec2 suv = v_uv + vec2(float(dx), float(dy)) * texel;
      suv = fract(suv);
      potential += texture(u_state, suv).r * k;
    }
  }

  // σ from per-cell field when ghostMode > 0 (σ-gradient landscape),
  // else use the uniform u_sigma. Seasonal oscillation rescales σ via
  // u_seasonMod so the "physics" itself breathes.
  float sig = u_sigma;
  if (u_ghostMode > 0.5) {
    sig = texture(u_sigmaField, v_uv).r;
  }
  sig *= u_seasonMod;

  // Growth function: Gaussian bump around μ.
  float growth = 2.0 * exp(-((potential - u_mu) * (potential - u_mu)) / (2.0 * sig * sig)) - 1.0;
  float newState = clamp(state + u_dt * growth, 0.0, 1.0);

  // Trail field — decaying max of state (gives motion a visible echo).
  float newTrail = max(newState, trail * u_trailDecay);

  // Brush paint — additive (left click) or subtractive (right/shift).
  if (u_brushActive > 0.5) {
    vec2 d = v_uv - u_mouse;
    float r = length(d * vec2(1.0)) * u_res.x;
    if (r < u_brushSize) {
      float f = 1.0 - r / u_brushSize;
      if (u_brushErase > 0.5) {
        newState = max(0.0, newState - f * 0.5);
      } else {
        newState = clamp(newState + f * 0.5, 0.0, 1.0);
      }
    }
  }

  outColor = vec4(newState, newTrail, potential, (growth + 1.0) * 0.5);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  Display fragment shader
//
//  Maps state → colour via one of several palettes. u_palette is an enum:
//    0 Bio · 1 Inferno · 2 Emerald · 3 Plasma · 4 Ocean
//    5 Lantern — the signature site palette (gold cores, violet edges,
//                 iridescent rims; coupled to density/growth/potential)
//    6 Spectral — each creature gets its own colour from its local
//                 potential-field neighbourhood (soap-bubble look)
//
//  The Lantern path also receives the memory texture (initial seed) and
//  the σ-field texture, which together let it tint the void according to
//  the Ghost Species mechanics: deep violet where σ is tight (physics is
//  kind), cool blue-green where σ is loose (physics is forgetful).
// ───────────────────────────────────────────────────────────────────────────

export const DISPLAY_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform sampler2D u_memory;
uniform sampler2D u_sigmaField;
uniform int u_palette;
uniform int u_viewMode;
uniform float u_trailMix;
uniform float u_ghostMode;
uniform float u_baseSigma;
uniform float u_time;

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return clamp(a + b * cos(6.28318 * (c * t + d)), 0.0, 1.0);
}

vec3 gradient(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
  t = clamp(t, 0.0, 1.0);
  float s = t * 4.0;
  if (s < 1.0) return mix(c0, c1, s);
  if (s < 2.0) return mix(c1, c2, s - 1.0);
  if (s < 3.0) return mix(c2, c3, s - 2.0);
  return mix(c3, c4, s - 3.0);
}

vec3 applyPalette(float t) {
  t = t * t * (3.0 - 2.0 * t);
  if (u_palette == 0) {
    return gradient(t,
      vec3(0.005, 0.008, 0.045),
      vec3(0.02, 0.08, 0.28),
      vec3(0.06, 0.36, 0.46),
      vec3(0.88, 0.56, 0.06),
      vec3(1.0, 0.96, 0.88));
  } else if (u_palette == 1) {
    return gradient(t,
      vec3(0.0, 0.0, 0.015),
      vec3(0.16, 0.04, 0.33),
      vec3(0.53, 0.13, 0.26),
      vec3(0.88, 0.39, 0.04),
      vec3(0.98, 0.92, 0.36));
  } else if (u_palette == 2) {
    return gradient(t,
      vec3(0.005, 0.02, 0.03),
      vec3(0.02, 0.12, 0.15),
      vec3(0.06, 0.38, 0.32),
      vec3(0.20, 0.72, 0.48),
      vec3(0.75, 1.0, 0.85));
  } else if (u_palette == 3) {
    return gradient(t,
      vec3(0.02, 0.0, 0.06),
      vec3(0.25, 0.01, 0.48),
      vec3(0.62, 0.14, 0.44),
      vec3(0.92, 0.50, 0.15),
      vec3(0.94, 0.97, 0.13));
  } else if (u_palette == 4) {
    return gradient(t,
      vec3(0.005, 0.01, 0.05),
      vec3(0.02, 0.06, 0.22),
      vec3(0.05, 0.22, 0.42),
      vec3(0.18, 0.58, 0.62),
      vec3(0.72, 0.96, 0.92));
  }
  return vec3(t);
}

// IQ cosine palette: smooth spectral rainbow.
vec3 spectrum(float t) {
  return clamp(
    vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67))),
    0.0, 1.0);
}

// Lantern palette: the signature mode. Warm gold creature cores, rich
// violet at sparse edges, iridescent edge shimmer driven by growth field.
// Memory adds faint pale-blue wisps where creatures WERE (not where they
// ARE) — the Ghost Species afterimage that lets a reader see motion as
// grief, not just flow.
vec3 lanternPalette(float state, float trail, float growth, float potential, float mem) {
  vec3 col = vec3(0.004, 0.003, 0.022);
  if (u_ghostMode > 0.5) {
    float sig = texture(u_sigmaField, v_uv).r;
    float sigRatio = sig / max(u_baseSigma, 0.001);
    col += mix(vec3(0.012, 0.004, 0.035), vec3(0.004, 0.018, 0.022),
      clamp((sigRatio - 0.7) / 0.6, 0.0, 1.0)) * 0.35;
  }

  // Memory afterimage — pale blue where creatures once were.
  float ghostWisp = max(0.0, mem - state * 3.0);
  col += vec3(0.12, 0.28, 0.55) * ghostWisp * 0.25;

  // Creature body: violet at sparse edges, gold at dense cores.
  float density = smoothstep(0.04, 0.65, state);
  vec3 creatureColor = mix(
    vec3(0.38, 0.12, 0.68),
    vec3(1.0, 0.74, 0.06),
    density * density
  );
  col += creatureColor * state * 2.8;

  // White-gold hot core.
  float hotCore = smoothstep(0.6, 0.92, state);
  col += vec3(1.0, 0.9, 0.55) * hotCore * 2.5;
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.85, 0.98, state) * 1.2;

  // Iridescent edge shimmer — rainbow at creature boundaries driven by
  // the growth field so every ghost shimmers uniquely.
  float edge = smoothstep(0.03, 0.14, state) * smoothstep(0.5, 0.14, state);
  float activity = abs(growth - 0.5) * 2.0;
  float phase = potential * 28.0 + growth * 12.56 + state * 5.0 + u_time * 0.5;
  vec3 irid = spectrum(phase * 0.15);
  col += irid * edge * (0.35 + activity * 0.55);

  // Growth halo — warm where growing, cool where dissolving.
  float growthDir = growth - 0.5;
  col += vec3(0.7, 0.45, 0.05) * max(0.0, growthDir) * state * 1.0;
  col += vec3(0.08, 0.25, 0.6) * max(0.0, -growthDir) * state * 0.6;

  // Trail warmth.
  float trailOnly = max(0.0, trail - state);
  col += vec3(0.22, 0.1, 0.02) * trailOnly * 0.65;

  return col;
}

// Spectral palette: each creature gets its own colour from its local
// potential-field neighbourhood. Soap-bubble diversity in a population.
vec3 spectralPalette(float state, float trail, float growth, float potential) {
  vec3 col = vec3(0.003, 0.002, 0.012);
  float hue = fract(potential * 3.5 + growth * 0.4 + u_time * 0.02);
  vec3 rainbow = spectrum(hue);
  float intensity = state * 2.5;
  col += rainbow * intensity;
  col += vec3(1.0, 0.95, 0.9) * smoothstep(0.7, 0.95, state) * 1.0;
  float edge = smoothstep(0.03, 0.12, state) * smoothstep(0.45, 0.12, state);
  vec3 edgeColor = spectrum(hue + 0.33 + growth * 0.5);
  col += edgeColor * edge * 0.5;
  float trailOnly = max(0.0, trail - state);
  col += rainbow * trailOnly * 0.35;
  return col;
}

void main() {
  vec4 d = texture(u_state, v_uv);
  float state = d.r, trail = d.g, potential = d.b, growth = d.a;

  if (u_palette == 5) {
    float mem = texture(u_memory, v_uv).r;
    float val = mix(state, max(state, trail), u_trailMix);
    vec3 col = lanternPalette(val, trail, growth, potential, mem);
    outColor = vec4(col, 1.0);
    return;
  }
  if (u_palette == 6) {
    float val = mix(state, max(state, trail), u_trailMix);
    vec3 col = spectralPalette(val, trail, growth, potential);
    outColor = vec4(col, 1.0);
    return;
  }

  float val;
  if (u_viewMode == 0) val = mix(state, max(state, trail), u_trailMix);
  else if (u_viewMode == 1) val = clamp(potential * 4.0, 0.0, 1.0);
  else if (u_viewMode == 2) val = growth;
  else val = clamp(state * 0.55 + trail * 0.25 + potential * 1.2, 0.0, 1.0);
  outColor = vec4(applyPalette(val), 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  Bloom fragment shader — separable Gaussian with optional bright-pass
// ───────────────────────────────────────────────────────────────────────────

export const BLOOM_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_input;
uniform vec2 u_dir;
uniform vec2 u_res;
uniform float u_extract;

void main() {
  vec2 texel = 1.0 / u_res;
  float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 result = vec3(0.0);
  for (int i = -4; i <= 4; i++) {
    vec3 s = texture(u_input, v_uv + u_dir * texel * float(i) * 1.5).rgb;
    if (u_extract > 0.5) {
      // HDR bright-pass: pixels brighter than ~0.6 luminance bloom, with
      // a smooth roll-off to ~1.4 at full bloom strength. The previous
      // (0.08, 0.45) * 1.8 thresholds were a clamping-compensation hack
      // for the LDR pipeline — with RGBA16F display/bloom textures the
      // hot cores of the Lantern palette emit luminance up to ~5, which
      // pass through at full strength without the artificial multiplier.
      float br = dot(s, vec3(0.2126, 0.7152, 0.0722));
      s *= smoothstep(0.6, 1.4, br);
    }
    result += s * w[abs(i)];
  }
  outColor = vec4(result, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  Memory-update fragment shader
//
//  Implements the Ghost Species afterimage as a slow low-pass filter on
//  state. Output = mix(state, prev_memory, decay). With decay ≈ 0.99 and
//  a 60 fps frame rate, the memory texture has a time constant of ~100
//  frames (~1.6 s). When state spikes high in a region and then drops
//  (creature moves through), memory stays elevated and decays gradually —
//  that is the visual signature of "remembering a shape it can no longer
//  hold."
//
//  Previously the memoryTex was uploaded once with the initial seed and
//  never updated, so the display shader's `ghostWisp = max(0, mem − 3·s)`
//  read against a static reference rather than against motion-history.
//  This version is paper-faithful: the wisps trail the creature as it
//  moves across the σ-landscape, not where it started.
//
//  The texture is RGBA32F. Only the R channel carries memory; G/B/A
//  passed through unchanged in case future readers want to use them for
//  per-channel afterimage variants.
// ───────────────────────────────────────────────────────────────────────────

export const MEMORY_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_state;
uniform sampler2D u_memory;
uniform float u_decay;

void main() {
  float state = texture(u_state, v_uv).r;
  vec4 prev = texture(u_memory, v_uv);
  // newMem = state·(1 − decay) + prev·decay
  // decay = 0.99 → time-constant ≈ 100 frames.
  float newMem = mix(state, prev.r, u_decay);
  outColor = vec4(newMem, prev.gba);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  Composite fragment shader — additive bloom, Reinhard tone map, vignette
// ───────────────────────────────────────────────────────────────────────────

export const COMPOSITE_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_display;
uniform sampler2D u_bloom;
uniform float u_bloomStr;
uniform float u_brightness;
uniform float u_vignette;

void main() {
  // Brightness applied pre-tonemap so increases lift midtones cleanly
  // without crushing highlights — Reinhard rolls off the bright end.
  vec3 col = texture(u_display, v_uv).rgb * u_brightness;
  vec3 bloom = texture(u_bloom, v_uv).rgb;
  col += bloom * u_bloomStr;
  col = col / (1.0 + col * 0.4);
  if (u_vignette > 0.01) {
    vec2 c = v_uv - 0.5;
    col *= 1.0 - dot(c, c) * u_vignette;
  }
  col = pow(col, vec3(0.95));
  outColor = vec4(col, 1.0);
}`;
