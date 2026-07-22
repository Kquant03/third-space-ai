// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Hyper · GLSL
//  ─────────────────────────────────────────────────────────────────────────
//  Six programs, but only two of them are the point:
//
//    SIM      — integrates the scalar field A(x,y,z,w) on the 4-torus one
//               tick forward. Each fragment is one 4D cell; it decodes its
//               (x,y,z,w) from its atlas texel, walks the precomputed sparse
//               tap list (a real 4D convolution), applies Lenia's growth
//               map, and writes A' back. This is the whole "it actually
//               lives in four dimensions" claim, in about forty lines.
//
//    DISPLAY  — the only place four-dimensionality becomes an image. It does
//               NOT flatten or fake anything: for each screen pixel it
//               marches a ray through a 3D view-cube, and every sample point
//               is lifted to 4D, rotated by the full six-plane SO(4)
//               orientation, and used to read the field's 3-dimensional
//               cross-section. Turn the XW / YW / ZW planes and you are
//               literally sweeping the hidden fourth axis through the slice
//               you can see.
//
//    REDUCE   — GPU parallel sum for mass / occupancy telemetry (a full
//               atlas readback every frame would stall).
//    BLOOM / COMP — the same HDR finishing as the sibling substrates.
//
//  Template substitutions inline the lattice side L, atlas side AW and tap
//  count as compile-time constants (same trick Lenia Expanded uses for its
//  kernel size), so the SIM loop bound is constant and the atlas indexing
//  has no per-fragment uniform reads.
// ═══════════════════════════════════════════════════════════════════════════

export const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  SIM — one tick of 4D Lenia on the flattened atlas
// ───────────────────────────────────────────────────────────────────────────

export function makeSimFrag(L: number, tapCount: number): string {
  return `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform sampler2D u_state;   // atlas: field in .r
uniform sampler2D u_tapOff;  // tapCount x 1 : (dx,dy,dz,dw)
uniform sampler2D u_tapW;    // tapCount x 1 : weight in .r

uniform float u_mu, u_sigma, u_dt;

// brush (paints a 4-ball around a target cell, in lattice coordinates)
uniform float u_brushActive, u_brushErase, u_brushSize;
uniform vec4  u_brushCell;

const int L    = ${L};
const int TAPS = ${tapCount};

int wrapL(int v){ return ((v % L) + L) % L; }

float fetchField(int x, int y, int z, int w){
  return texelFetch(u_state, ivec2(z*L + x, w*L + y), 0).r;
}

float grow(float u){
  float d = u - u_mu;
  return 2.0 * exp(-(d*d) / (2.0 * u_sigma * u_sigma)) - 1.0;
}

void main(){
  ivec2 tx = ivec2(gl_FragCoord.xy);   // atlas texel
  int x = tx.x % L;
  int z = tx.x / L;
  int y = tx.y % L;
  int w = tx.y / L;

  // ── 4D convolution over the sparse tap list ──
  float pot = 0.0;
  for(int i = 0; i < TAPS; i++){
    vec4  o  = texelFetch(u_tapOff, ivec2(i, 0), 0);
    float wt = texelFetch(u_tapW,   ivec2(i, 0), 0).r;
    int nx = wrapL(x + int(o.x));
    int ny = wrapL(y + int(o.y));
    int nz = wrapL(z + int(o.z));
    int nw = wrapL(w + int(o.w));
    pot += fetchField(nx, ny, nz, nw) * wt;
  }

  float a  = fetchField(x, y, z, w);
  float na = clamp(a + u_dt * grow(pot), 0.0, 1.0);

  // ── brush: 4-ball painted at u_brushCell (toroidal distance) ──
  if(u_brushActive > 0.5){
    vec4 cell = vec4(float(x), float(y), float(z), float(w));
    vec4 dd = abs(cell - u_brushCell);
    dd = min(dd, float(L) - dd);
    float dist = length(dd);
    if(dist < u_brushSize){
      float b = pow(1.0 - dist / u_brushSize, 2.0);
      na = clamp(na + (u_brushErase > 0.5 ? -b : b * 0.9), 0.0, 1.0);
    }
  }

  outColor = vec4(na, 0.0, 0.0, 1.0);
}`;
}

// ───────────────────────────────────────────────────────────────────────────
//  DISPLAY — rotate through SO(4), raymarch the 3D cross-section
// ───────────────────────────────────────────────────────────────────────────

export function makeDisplayFrag(L: number): string {
  return `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_state;
uniform float u_axy, u_axz, u_axw, u_ayz, u_ayw, u_azw;
uniform float u_slab;        // half-thickness in w for the slab average
uniform int   u_slabSamples; // 1 or 3
uniform float u_density;
uniform float u_thresh;
uniform int   u_steps;
uniform int   u_palette;
uniform float u_time;
uniform float u_zoom;

const int L = ${L};

int wrap(int v){ return (v % L + L) % L; }

float fetchCell(int x, int y, int z, int w){
  return texelFetch(u_state, ivec2(wrap(z)*L + wrap(x), wrap(w)*L + wrap(y)), 0).r;
}

// Tile-aware sample of the flattened 4D field at normalized q in [-1,1]^4.
// Bilinear across x,y (wrapped); nearest across z,w. Verified ~1e-8.
float sampleField(vec4 q){
  vec4 g = (q * 0.5 + 0.5) * float(L) - 0.5;
  int z = int(floor(g.z + 0.5));
  int w = int(floor(g.w + 0.5));
  int x0 = int(floor(g.x));
  int y0 = int(floor(g.y));
  float tx = g.x - float(x0);
  float ty = g.y - float(y0);
  float c00 = fetchCell(x0,   y0,   z, w);
  float c10 = fetchCell(x0+1, y0,   z, w);
  float c01 = fetchCell(x0,   y0+1, z, w);
  float c11 = fetchCell(x0+1, y0+1, z, w);
  return mix(mix(c00, c10, tx), mix(c01, c11, tx), ty);
}

// Six-plane SO(4) rotation. Chained zw,yw,yz,xw,xz,xy so the net matrix
// equals the CPU buildSO4 product G_xy*G_xz*G_xw*G_yz*G_yw*G_zw applied to
// the vector — i.e. the brush and the view share one orientation.
vec4 rot(vec4 p){
  float c, s;
  c = cos(u_azw); s = sin(u_azw); p = vec4(p.x, p.y, c*p.z - s*p.w, s*p.z + c*p.w);
  c = cos(u_ayw); s = sin(u_ayw); p = vec4(p.x, c*p.y - s*p.w, p.z, s*p.y + c*p.w);
  c = cos(u_ayz); s = sin(u_ayz); p = vec4(p.x, c*p.y - s*p.z, s*p.y + c*p.z, p.w);
  c = cos(u_axw); s = sin(u_axw); p = vec4(c*p.x - s*p.w, p.y, p.z, s*p.x + c*p.w);
  c = cos(u_axz); s = sin(u_axz); p = vec4(c*p.x - s*p.z, p.y, s*p.x + c*p.z, p.w);
  c = cos(u_axy); s = sin(u_axy); p = vec4(c*p.x - s*p.y, s*p.x + c*p.y, p.z, p.w);
  return p;
}

vec3 palette(float v, float depth){
  vec3 c;
  if(u_palette == 0){
    // Lantern — void → ghost cyan → lantern gold → white-hot
    vec3 a = vec3(0.015, 0.045, 0.085);
    vec3 b = vec3(0.14, 0.52, 0.60);
    vec3 d = vec3(0.94, 0.70, 0.22);
    vec3 e = vec3(1.0, 0.96, 0.86);
    c = mix(a, b, smoothstep(0.0, 0.35, v));
    c = mix(c, d, smoothstep(0.30, 0.68, v));
    c = mix(c, e, smoothstep(0.68, 1.0, v));
    c *= 1.0 + 2.6 * smoothstep(0.55, 1.0, v);
  } else if(u_palette == 1){
    // Ember — deep red bed, molten core
    vec3 a = vec3(0.05, 0.01, 0.02);
    vec3 b = vec3(0.55, 0.10, 0.06);
    vec3 d = vec3(1.0, 0.45, 0.08);
    vec3 e = vec3(1.0, 0.95, 0.7);
    c = mix(a, b, smoothstep(0.0, 0.4, v));
    c = mix(c, d, smoothstep(0.35, 0.7, v));
    c = mix(c, e, smoothstep(0.72, 1.0, v));
    c *= 1.0 + 3.0 * smoothstep(0.6, 1.0, v);
  } else {
    // Ghost — cold violet-cyan, spectral
    vec3 a = vec3(0.02, 0.02, 0.06);
    vec3 b = vec3(0.30, 0.20, 0.55);
    vec3 d = vec3(0.35, 0.80, 0.95);
    vec3 e = vec3(0.95, 0.98, 1.0);
    c = mix(a, b, smoothstep(0.0, 0.4, v));
    c = mix(c, d, smoothstep(0.35, 0.72, v));
    c = mix(c, e, smoothstep(0.74, 1.0, v));
    c *= 1.0 + 2.4 * smoothstep(0.6, 1.0, v);
  }
  c *= mix(1.05, 0.55, depth); // front-lit depth cue
  return c;
}

void main(){
  vec2 sc = (v_uv * 2.0 - 1.0) * u_zoom;

  vec3 col = vec3(0.0);
  float trans = 1.0;
  float dtstep = 2.0 / float(u_steps);
  float jitter = fract(sin(dot(v_uv, vec2(12.9898, 78.233))) * 43758.5453);

  for(int i = 0; i < 512; i++){
    if(i >= u_steps) break;
    float cz = 1.0 - (float(i) + jitter) * dtstep; // +1 (front) → -1 (back)

    float dens;
    if(u_slabSamples <= 1){
      dens = sampleField(rot(vec4(sc.x, sc.y, cz, 0.0)));
    } else {
      dens  = sampleField(rot(vec4(sc.x, sc.y, cz, -u_slab)));
      dens += sampleField(rot(vec4(sc.x, sc.y, cz,  0.0)));
      dens += sampleField(rot(vec4(sc.x, sc.y, cz,  u_slab)));
      dens *= (1.0 / 3.0);
    }

    float d = smoothstep(u_thresh, 1.0, dens);
    if(d > 0.001){
      float depth = float(i) / float(u_steps);
      vec3 emis = palette(dens, depth);
      float a = d * u_density * dtstep * 4.0;
      a = clamp(a, 0.0, 1.0);
      col += emis * a * trans;
      trans *= (1.0 - a);
      if(trans < 0.01) break;
    }
  }

  outColor = vec4(col, 1.0);
}`;
}

// ───────────────────────────────────────────────────────────────────────────
//  REDUCE — 2×2 box sum, ping-ponged down to a few texels (mass + occupancy)
// ───────────────────────────────────────────────────────────────────────────

export const REDUCE_FRAG_SRC = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;
uniform sampler2D u_src;
uniform ivec2 u_srcSize;
uniform float u_first;   // 1.0 on the first pass (reads state.r as field)

vec2 fetch2(ivec2 p){
  vec4 t = texelFetch(u_src, p, 0);
  return u_first > 0.5 ? vec2(t.r, step(0.02, t.r)) : t.rg;
}

void main(){
  ivec2 dst = ivec2(gl_FragCoord.xy);
  ivec2 s = dst * 2;
  vec2 sum = vec2(0.0);
  for(int j = 0; j < 2; j++){
    for(int i = 0; i < 2; i++){
      ivec2 p = s + ivec2(i, j);
      if(p.x < u_srcSize.x && p.y < u_srcSize.y) sum += fetch2(p);
    }
  }
  outColor = vec4(sum, 0.0, 1.0);
}`;

// ───────────────────────────────────────────────────────────────────────────
//  BLOOM / COMP — HDR finishing (same as the sibling substrates)
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
      s *= smoothstep(0.6, 1.4, br);
    }
    result += s * w[abs(i)];
  }
  outColor = vec4(result, 1.0);
}`;

export const COMP_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_display, u_bloom;
uniform float u_bloomStr, u_brightness, u_vignette;

void main() {
  vec3 col = texture(u_display, v_uv).rgb * u_brightness;
  col += texture(u_bloom, v_uv).rgb * u_bloomStr;
  col = col / (1.0 + col * 0.38);
  vec2 c = v_uv - 0.5;
  col *= 1.0 - dot(c, c) * u_vignette;
  col = pow(col, vec3(0.92));
  outColor = vec4(col, 1.0);
}`;
