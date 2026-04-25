// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · WebGL2 utilities
//  ─────────────────────────────────────────────────────────────────────────
//  Thin typed wrappers around the shader / texture / framebuffer creation
//  primitives. One design note: uniform locations are eagerly collected at
//  link time so the animation loop never has to go looking for them —
//  `prog.uniforms["u_mu"]` is a simple object read rather than a gl call.
// ═══════════════════════════════════════════════════════════════════════════

export type UniformMap = Record<string, WebGLUniformLocation | null>;

export type Program = {
  program: WebGLProgram;
  uniforms: UniformMap;
};

/** Compile a single vertex or fragment shader; return null on failure. */
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
    // Logged once; caller is expected to propagate via a UI error banner.
    // eslint-disable-next-line no-console
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/**
 * Compile + link a shader pair, then query all active uniforms and cache
 * their locations. After successful link the individual shader objects
 * are detached and deleted — the linked program retains its own copy of
 * the compiled binaries, so leaving the source shaders attached is just
 * a leak. Returns null on failure.
 */
export function createProgram(
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

  // Detach and free the individual shader objects now that the program
  // has been linked successfully. Without this, the shader source is
  // held alive for the lifetime of the program — a textbook GL leak,
  // small per program but it accumulates under Strict Mode double-mount.
  gl.detachShader(p, vs);
  gl.detachShader(p, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const uniforms: UniformMap = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    if (!info) continue;
    uniforms[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { program: p, uniforms };
}

/**
 * Create a 2D texture with the given internal/format/type. `filter` is
 * gl.NEAREST or gl.LINEAR; `data` (optional) initialises the texture.
 * Wrap is set to CLAMP_TO_EDGE — the Lenia substrate handles periodicity
 * in the shader via `fract(uv)` so the texture sampler itself does not
 * need to wrap.
 */
export function createTex(
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/** Create a framebuffer with the given texture as its color attachment. */
export function createFB(
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
