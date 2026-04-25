// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · WebGL2 utilities
//  ─────────────────────────────────────────────────────────────────────────
//  Typed wrappers around shader compile / program link / texture and
//  framebuffer creation. Deliberately identical in shape to Lenia's
//  webgl.ts — both substrates use the same pipeline primitives, but we
//  keep them per-substrate so each module can be read and reasoned about
//  without jumping directories. The duplication is <140 lines and it
//  means a future simulation that wants to use, say, REPEAT-wrapped
//  textures instead of CLAMP doesn't have to touch anyone else's code.
//
//  Note one difference from Lenia's webgl.ts: textures here wrap REPEAT
//  (not CLAMP_TO_EDGE), matching the source LeniaExpanded.jsx. The SIM
//  shader still uses fract() on UVs but REPEAT gives correct sampling
//  at the domain boundary when the advection step pulls slightly past 0
//  or 1.
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

  // Detach + delete the individual shaders now that the program has
  // linked successfully. Without this the shader source is held alive
  // for the program's lifetime — small leak per program but accumulates
  // under Strict Mode double-mount.
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
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
