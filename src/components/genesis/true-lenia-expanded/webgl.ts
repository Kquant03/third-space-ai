// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Hyper · WebGL2 utilities
//  ─────────────────────────────────────────────────────────────────────────
//  Same typed wrappers as Lenia / Lenia Expanded's webgl.ts. Kept local to
//  the substrate so this module reads top-to-bottom without jumping
//  directories, per the house convention. One deliberate difference from
//  Lenia Expanded: the state atlas here is a genuinely 4-dimensional field
//  flattened into a 2D texture (see hyperfield.ts), so its neighbour reads
//  must NOT bleed across tile seams under hardware filtering — every state
//  texture is created NEAREST and sampled with texelFetch / manual
//  interpolation. LINEAR is reserved for the display / bloom textures where
//  smooth magnification is wanted and there are no tile seams.
// ═══════════════════════════════════════════════════════════════════════════

export type UniformMap = Record<string, WebGLUniformLocation | null>;

export type Program = {
  program: WebGLProgram;
  u: UniformMap;
};

export function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  src: string,
): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
    // eslint-disable-next-line no-console
    console.error(withLineNumbers(src));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

// Dump source with line numbers so a GLSL error at "0:214" is findable.
function withLineNumbers(src: string): string {
  return src
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(4, " ")} | ${l}`)
    .join("\n");
}

export function makeProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string,
): Program | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }

  const p = gl.createProgram();
  if (!p) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);

  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    // eslint-disable-next-line no-console
    console.error("Program link error:", gl.getProgramInfoLog(p));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteProgram(p);
    return null;
  }

  gl.detachShader(p, vs);
  gl.detachShader(p, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const u: UniformMap = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    if (!info) continue;
    u[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { program: p, u };
}

export function makeTex(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  intFmt: GLenum,
  fmt: GLenum,
  type: GLenum,
  filter: GLenum,
  data: ArrayBufferView | null,
): WebGLTexture | null {
  const t = gl.createTexture();
  if (!t) return null;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, intFmt, w, h, 0, fmt, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  // CLAMP the atlas: toroidal wrap is done explicitly in-shader per 4D
  // sub-axis, so we must NOT let the hardware wrap the flattened 2D texture
  // (that would wrap the *tiling*, not the torus).
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export function makeFB(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
): WebGLFramebuffer | null {
  const fb = gl.createFramebuffer();
  if (!fb) return null;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  return fb;
}
