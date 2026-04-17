"use client";
import { useEffect, useRef, useCallback } from "react";
import { VERT, FIELD_FRAG, BLOOM_FRAG, COMPOSITE_FRAG } from "@/lib/shaders";

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function mkProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const v = compileShader(gl, gl.VERTEX_SHADER, vs);
  const f = compileShader(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error("Link:", gl.getProgramInfoLog(p)); return null; }
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i)!; u[info.name] = gl.getUniformLocation(p, info.name); }
  return { program: p, uniforms: u };
}

function mkFBO(gl: WebGL2RenderingContext, w: number, h: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fbo, tex };
}

export default function LivingSubstrate() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef([0.5, 0.5]);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
    if (!gl) return;
    gl.getExtension("EXT_color_buffer_half_float");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr * 0.5);
      canvas.height = Math.floor(window.innerHeight * dpr * 0.5);
    };
    resize();
    window.addEventListener("resize", resize);

    const field = mkProgram(gl, VERT, FIELD_FRAG);
    const bloom = mkProgram(gl, VERT, BLOOM_FRAG);
    const comp = mkProgram(gl, VERT, COMPOSITE_FRAG);
    if (!field || !bloom || !comp) return;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

    function bindQuad(prog: { program: WebGLProgram }) {
      const loc = gl!.getAttribLocation(prog.program, "a_pos");
      gl!.enableVertexAttribArray(loc);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, quad);
      gl!.vertexAttribPointer(loc, 2, gl!.FLOAT, false, 0, 0);
    }

    let sceneFBO = mkFBO(gl, canvas.width, canvas.height);
    const bw = Math.floor(canvas.width / 2), bh = Math.floor(canvas.height / 2);
    let bloomFBO1 = mkFBO(gl, bw, bh);
    let bloomFBO2 = mkFBO(gl, bw, bh);

    const onScroll = () => { scrollRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    let raf: number;
    const start = performance.now();

    const loop = () => {
      const t = (performance.now() - start) / 1000;
      const w = canvas!.width, h = canvas!.height;
      const bw = Math.floor(w/2), bh = Math.floor(h/2);

      gl!.bindFramebuffer(gl!.FRAMEBUFFER, sceneFBO.fbo);
      gl!.viewport(0, 0, w, h);
      gl!.useProgram(field!.program);
      bindQuad(field!);
      gl!.uniform1f(field!.uniforms.u_time, t);
      gl!.uniform2f(field!.uniforms.u_mouse, mouseRef.current[0], 1-mouseRef.current[1]);
      gl!.uniform1f(field!.uniforms.u_scroll, scrollRef.current);
      gl!.uniform2f(field!.uniforms.u_res, w, h);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      gl!.bindFramebuffer(gl!.FRAMEBUFFER, bloomFBO1.fbo);
      gl!.viewport(0, 0, bw, bh);
      gl!.useProgram(bloom!.program);
      bindQuad(bloom!);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, sceneFBO.tex);
      gl!.uniform1i(bloom!.uniforms.u_input, 0);
      gl!.uniform2f(bloom!.uniforms.u_dir, 1, 0);
      gl!.uniform2f(bloom!.uniforms.u_res, bw, bh);
      gl!.uniform1f(bloom!.uniforms.u_extract, 1);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      gl!.bindFramebuffer(gl!.FRAMEBUFFER, bloomFBO2.fbo);
      gl!.bindTexture(gl!.TEXTURE_2D, bloomFBO1.tex);
      gl!.uniform2f(bloom!.uniforms.u_dir, 0, 1);
      gl!.uniform1f(bloom!.uniforms.u_extract, 0);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, w, h);
      gl!.useProgram(comp!.program);
      bindQuad(comp!);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, sceneFBO.tex);
      gl!.uniform1i(comp!.uniforms.u_scene, 0);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, bloomFBO2.tex);
      gl!.uniform1i(comp!.uniforms.u_bloom, 1);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = [e.clientX / window.innerWidth, e.clientY / window.innerHeight];
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onMove}
      className="fixed top-0 left-0 w-screen h-screen z-0"
    />
  );
}
