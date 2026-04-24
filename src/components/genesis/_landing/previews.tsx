"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Genesis · landing previews
//  ─────────────────────────────────────────────────────────────────────────
//  Reduced-resolution live previews for the /genesis catalog grid. Each
//  preview imports the canonical simulation code from its substrate module
//  (so the physics is identical to the full page) and runs it at a smaller
//  grid / fewer particles / simpler rendering to keep CPU + GPU tolerable
//  when six are visible at once.
//
//  A `playing` prop gates every rAF loop — when false, the simulation
//  pauses. The parent grid sets this via an IntersectionObserver in
//  <SubstrateCard> and a global toggle. That means a reader who scrolls
//  past a card stops paying for it; a reader who scrolls back picks up
//  where it left off.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

import {
  createFields as gsCreateFields,
  stepRD as gsStepRD,
  renderFields as gsRenderFields,
  PRESETS as GS_PRESETS,
} from "@/components/genesis/gray-scott/simulation";

import {
  createGrid as isingCreateGrid,
  metropolisSweep,
  TC,
} from "@/components/genesis/ising/simulation";
import { renderGrid as isingRenderGrid } from "@/components/genesis/ising/renderer";

import {
  initParticles as plInitParticles,
  stepParticleLife,
  renderParticles as plRenderParticles,
  MATRIX_PRESETS as PL_MATRIX_PRESETS,
} from "@/components/genesis/particle-life/simulation";

// Lantern palette for the Filter mini-plot.
const COLOR = {
  void: "#010106",
  voidSoft: "#0a0f1a",
  ink: "#f4f6fb",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
} as const;

// ───────────────────────────────────────────────────────────────────────────
//  Gray-Scott preview
// ───────────────────────────────────────────────────────────────────────────

export function GrayScottPreview({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = 120;
    const CANVAS = 240;
    canvas.width = CANVAS;
    canvas.height = CANVAS;

    // Mitosis preset — self-replicating spots, good visual hook.
    const fields = gsCreateFields(N);
    const p = GS_PRESETS.mitosis;

    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (playing) {
        gsStepRD(fields, N, p.F, p.k, 6);
        gsRenderFields(ctx, fields, N, CANVAS, "ghost");
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Ising preview
// ───────────────────────────────────────────────────────────────────────────

export function IsingPreview({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = 80;
    const CELL = 3;
    const CANVAS = N * CELL;
    canvas.width = CANVAS;
    canvas.height = CANVAS;

    // Sit at T just above T_c — the critical regime, most visually alive.
    const T = TC * 1.02;
    const beta = 1.0 / T;
    const J = 1.0;
    const grid = isingCreateGrid(N);

    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (playing) {
        // Run a few Metropolis sweeps then re-render.
        metropolisSweep(grid, N, beta, J, 0);
        metropolisSweep(grid, N, beta, J, 0);
        isingRenderGrid(ctx, grid, N, CANVAS, CELL, "spin", J);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Particle Life preview
// ───────────────────────────────────────────────────────────────────────────

export function ParticleLifePreview({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 240;
    const H = 240;
    canvas.width = W;
    canvas.height = H;

    // Reduced particle count — the triangular-kernel force loop is O(n²),
    // so 300 particles is the ceiling for six simultaneous previews.
    const particles = plInitParticles(300, 4, W, H);
    const matrix = PL_MATRIX_PRESETS.symbiosis.gen(4);

    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (playing) {
        stepParticleLife(particles, matrix, W, H, 60, 0.5, 0.3);
        plRenderParticles(ctx, particles, W, H, true);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Lenia preview — tiny WebGL pipeline (sim + display, no bloom)
// ───────────────────────────────────────────────────────────────────────────

import {
  VERT_SRC as LENIA_VERT,
  SIM_FRAG_SRC as LENIA_SIM,
  DISPLAY_FRAG_SRC as LENIA_DISPLAY,
  KERNEL_TEX_SIZE as LENIA_KS,
} from "@/components/genesis/lenia/shaders";
import { createProgram as leniaCreateProgram, createTex as leniaCreateTex, createFB as leniaCreateFB } from "@/components/genesis/lenia/webgl";
import {
  buildKernelData as leniaBuildKernelData,
  buildInitialState as leniaBuildInitialState,
} from "@/components/genesis/lenia/kernel";

export function LeniaPreview({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reduced grid. The full substrate uses N=256; 128 is plenty for a
    // 240×240 thumbnail and quarters the convolution cost per pixel.
    const N_MINI = 128;
    const CANVAS = 240;
    canvas.width = CANVAS;
    canvas.height = CANVAS;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    if (!gl.getExtension("EXT_color_buffer_float")) return;
    gl.getExtension("OES_texture_float_linear");

    // The real Lenia SIM shader hardcodes N via texel = 1/u_res, so any N
    // works as long as we pass the matching u_res — no shader change needed.

    const simProg = leniaCreateProgram(gl, LENIA_VERT, LENIA_SIM);
    const dispProg = leniaCreateProgram(gl, LENIA_VERT, LENIA_DISPLAY);
    if (!simProg || !dispProg) return;

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) return;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    for (const prog of [simProg, dispProg]) {
      const loc = gl.getAttribLocation(prog.program, "a_pos");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    const stateTex0 = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const stateTex1 = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const kernelTex = leniaCreateTex(gl, LENIA_KS, LENIA_KS, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const memoryTex = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const sigmaTex = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.LINEAR, null);
    if (!stateTex0 || !stateTex1 || !kernelTex || !memoryTex || !sigmaTex) return;

    const stateFB0 = leniaCreateFB(gl, stateTex0);
    const stateFB1 = leniaCreateFB(gl, stateTex1);
    if (!stateFB0 || !stateFB1) return;

    // Need an initial state sized for N_MINI. buildInitialState in the
    // real kernel.ts hardcodes N=256; we generate a tiny seed manually.
    const initData = buildMiniLeniaState(N_MINI, 13);
    gl.bindTexture(gl.TEXTURE_2D, stateTex0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N_MINI, N_MINI, gl.RGBA, gl.FLOAT, initData);

    const kernelData = leniaBuildKernelData(13, [1]);
    gl.bindTexture(gl.TEXTURE_2D, kernelTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LENIA_KS, LENIA_KS, gl.RGBA, gl.FLOAT, kernelData);

    gl.bindTexture(gl.TEXTURE_2D, memoryTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N_MINI, N_MINI, gl.RGBA, gl.FLOAT, new Float32Array(N_MINI * N_MINI * 4));

    const sigField = new Float32Array(N_MINI * N_MINI * 4);
    for (let i = 0; i < N_MINI * N_MINI; i++) sigField[i * 4] = 0.017;
    gl.bindTexture(gl.TEXTURE_2D, sigmaTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N_MINI, N_MINI, gl.RGBA, gl.FLOAT, sigField);

    let swap = 0;
    let time = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      if (playing) {
        time += 0.016;

        // Sim pass
        const cur = swap;
        const nxt = 1 - cur;
        gl.useProgram(simProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cur === 0 ? stateTex0 : stateTex1);
        gl.uniform1i(simProg.uniforms["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, kernelTex);
        gl.uniform1i(simProg.uniforms["u_kernel"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, sigmaTex);
        gl.uniform1i(simProg.uniforms["u_sigmaField"], 2);
        gl.uniform1f(simProg.uniforms["u_R"], 13);
        gl.uniform1f(simProg.uniforms["u_mu"], 0.15);
        gl.uniform1f(simProg.uniforms["u_sigma"], 0.017);
        gl.uniform1f(simProg.uniforms["u_dt"], 0.1);
        gl.uniform2f(simProg.uniforms["u_res"], N_MINI, N_MINI);
        gl.uniform1f(simProg.uniforms["u_trailDecay"], 0.96);
        gl.uniform1f(simProg.uniforms["u_ghostMode"], 0.0);
        gl.uniform1f(simProg.uniforms["u_seasonMod"], 1.0);
        gl.uniform1f(simProg.uniforms["u_brushActive"], 0.0);
        gl.uniform2f(simProg.uniforms["u_mouse"], 0, 0);
        gl.uniform1f(simProg.uniforms["u_brushSize"], 0);
        gl.uniform1f(simProg.uniforms["u_brushErase"], 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, nxt === 0 ? stateFB0 : stateFB1);
        gl.viewport(0, 0, N_MINI, N_MINI);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        swap = nxt;

        // Display direct to canvas (skip bloom + composite for perf).
        const cs = swap;
        gl.useProgram(dispProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cs === 0 ? stateTex0 : stateTex1);
        gl.uniform1i(dispProg.uniforms["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, memoryTex);
        gl.uniform1i(dispProg.uniforms["u_memory"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, sigmaTex);
        gl.uniform1i(dispProg.uniforms["u_sigmaField"], 2);
        gl.uniform1i(dispProg.uniforms["u_palette"], 5);  // Lantern
        gl.uniform1i(dispProg.uniforms["u_viewMode"], 0);
        gl.uniform1f(dispProg.uniforms["u_trailMix"], 0.35);
        gl.uniform1f(dispProg.uniforms["u_ghostMode"], 0.0);
        gl.uniform1f(dispProg.uniforms["u_baseSigma"], 0.017);
        gl.uniform1f(dispProg.uniforms["u_time"], time);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, CANVAS, CANVAS);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      gl.deleteTexture(stateTex0); gl.deleteTexture(stateTex1);
      gl.deleteTexture(kernelTex); gl.deleteTexture(memoryTex); gl.deleteTexture(sigmaTex);
      gl.deleteFramebuffer(stateFB0); gl.deleteFramebuffer(stateFB1);
      gl.deleteBuffer(vbo); gl.deleteVertexArray(vao);
      gl.deleteProgram(simProg.program); gl.deleteProgram(dispProg.program);
    };
  }, [playing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "auto",
      }}
    />
  );
}

/**
 * Tiny Orbium seed baked directly into a Float32Array sized for the
 * preview grid — sidesteps buildInitialState's hardcoded N=256.
 */
function buildMiniLeniaState(Nsize: number, R: number): Float32Array {
  const data = new Float32Array(Nsize * Nsize * 4);
  // Place two small Gaussian blobs — reliable seed for Orbium-class growth.
  const blobs = [
    [Nsize * 0.35, Nsize * 0.5],
    [Nsize * 0.65, Nsize * 0.5],
  ];
  for (const [cx, cy] of blobs) {
    for (let y = 0; y < Nsize; y++) {
      for (let x = 0; x < Nsize; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > R * 1.2) continue;
        const v = Math.exp(-(d * d) / (R * R * 0.4));
        const idx = (y * Nsize + x) * 4;
        data[idx] = Math.max(data[idx], v * 0.9);
        data[idx + 1] = Math.max(data[idx + 1], v * 0.9);
      }
    }
  }
  return data;
}

// ───────────────────────────────────────────────────────────────────────────
//  Lenia Expanded preview — mini version of the ecosystem
//  We reuse Lenia's single-channel pipeline here rather than bringing up
//  the full six-shader Expanded pipeline. The preview shows a stable
//  Lenia creature with ghost palette — faithful enough to hint at what
//  the real substrate does without paying for six shaders at thumbnail
//  size. The card text tells the reader it's an ecosystem; the preview
//  says "organisms live here."
//
//  If this feels too close to LeniaPreview in practice, swap in a
//  separate reduced Expanded pipeline later.
// ───────────────────────────────────────────────────────────────────────────

export function LeniaExpandedPreview({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const N_MINI = 128;
    const CANVAS = 240;
    canvas.width = CANVAS;
    canvas.height = CANVAS;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    if (!gl.getExtension("EXT_color_buffer_float")) return;
    gl.getExtension("OES_texture_float_linear");

    const simProg = leniaCreateProgram(gl, LENIA_VERT, LENIA_SIM);
    const dispProg = leniaCreateProgram(gl, LENIA_VERT, LENIA_DISPLAY);
    if (!simProg || !dispProg) return;

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) return;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    for (const prog of [simProg, dispProg]) {
      const loc = gl.getAttribLocation(prog.program, "a_pos");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    const stateTex0 = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const stateTex1 = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const kernelTex = leniaCreateTex(gl, LENIA_KS, LENIA_KS, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const memoryTex = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null);
    const sigmaTex = leniaCreateTex(gl, N_MINI, N_MINI, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.LINEAR, null);
    if (!stateTex0 || !stateTex1 || !kernelTex || !memoryTex || !sigmaTex) return;

    const stateFB0 = leniaCreateFB(gl, stateTex0);
    const stateFB1 = leniaCreateFB(gl, stateTex1);
    if (!stateFB0 || !stateFB1) return;

    // Three-creature seed — busier than Lenia's single-pair for an
    // "ecosystem" impression.
    const initData = buildMiniLeniaState(N_MINI, 13);
    addBlob(initData, N_MINI, N_MINI * 0.5, N_MINI * 0.28, 13);
    gl.bindTexture(gl.TEXTURE_2D, stateTex0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N_MINI, N_MINI, gl.RGBA, gl.FLOAT, initData);

    const kernelData = leniaBuildKernelData(13, [1]);
    gl.bindTexture(gl.TEXTURE_2D, kernelTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LENIA_KS, LENIA_KS, gl.RGBA, gl.FLOAT, kernelData);

    gl.bindTexture(gl.TEXTURE_2D, memoryTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N_MINI, N_MINI, gl.RGBA, gl.FLOAT, new Float32Array(initData));

    const sigField = new Float32Array(N_MINI * N_MINI * 4);
    // Spatial σ gradient — creatures drift toward center where physics is kinder.
    for (let y = 0; y < N_MINI; y++) {
      for (let x = 0; x < N_MINI; x++) {
        const nx = (x / N_MINI - 0.5) * 2;
        const ny = (y / N_MINI - 0.5) * 2;
        const r = Math.sqrt(nx * nx + ny * ny);
        sigField[(y * N_MINI + x) * 4] = 0.015 * (0.8 + 0.5 * r);
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, sigmaTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N_MINI, N_MINI, gl.RGBA, gl.FLOAT, sigField);

    let swap = 0;
    let time = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      if (playing) {
        time += 0.016;
        const cur = swap;
        const nxt = 1 - cur;
        gl.useProgram(simProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cur === 0 ? stateTex0 : stateTex1);
        gl.uniform1i(simProg.uniforms["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, kernelTex);
        gl.uniform1i(simProg.uniforms["u_kernel"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, sigmaTex);
        gl.uniform1i(simProg.uniforms["u_sigmaField"], 2);
        gl.uniform1f(simProg.uniforms["u_R"], 13);
        gl.uniform1f(simProg.uniforms["u_mu"], 0.15);
        gl.uniform1f(simProg.uniforms["u_sigma"], 0.015);
        gl.uniform1f(simProg.uniforms["u_dt"], 0.1);
        gl.uniform2f(simProg.uniforms["u_res"], N_MINI, N_MINI);
        gl.uniform1f(simProg.uniforms["u_trailDecay"], 0.96);
        // Ghost mode enables σ-field lookup — slower drift toward center.
        gl.uniform1f(simProg.uniforms["u_ghostMode"], 1.0);
        gl.uniform1f(simProg.uniforms["u_seasonMod"], 1.0);
        gl.uniform1f(simProg.uniforms["u_brushActive"], 0.0);
        gl.uniform2f(simProg.uniforms["u_mouse"], 0, 0);
        gl.uniform1f(simProg.uniforms["u_brushSize"], 0);
        gl.uniform1f(simProg.uniforms["u_brushErase"], 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, nxt === 0 ? stateFB0 : stateFB1);
        gl.viewport(0, 0, N_MINI, N_MINI);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        swap = nxt;

        const cs = swap;
        gl.useProgram(dispProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cs === 0 ? stateTex0 : stateTex1);
        gl.uniform1i(dispProg.uniforms["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, memoryTex);
        gl.uniform1i(dispProg.uniforms["u_memory"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, sigmaTex);
        gl.uniform1i(dispProg.uniforms["u_sigmaField"], 2);
        // Spectral palette — hints at the multi-channel real substrate.
        gl.uniform1i(dispProg.uniforms["u_palette"], 6);
        gl.uniform1i(dispProg.uniforms["u_viewMode"], 0);
        gl.uniform1f(dispProg.uniforms["u_trailMix"], 0.35);
        gl.uniform1f(dispProg.uniforms["u_ghostMode"], 1.0);
        gl.uniform1f(dispProg.uniforms["u_baseSigma"], 0.015);
        gl.uniform1f(dispProg.uniforms["u_time"], time);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, CANVAS, CANVAS);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      gl.deleteTexture(stateTex0); gl.deleteTexture(stateTex1);
      gl.deleteTexture(kernelTex); gl.deleteTexture(memoryTex); gl.deleteTexture(sigmaTex);
      gl.deleteFramebuffer(stateFB0); gl.deleteFramebuffer(stateFB1);
      gl.deleteBuffer(vbo); gl.deleteVertexArray(vao);
      gl.deleteProgram(simProg.program); gl.deleteProgram(dispProg.program);
    };
  }, [playing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "auto",
      }}
    />
  );
}

function addBlob(data: Float32Array, Nsize: number, cx: number, cy: number, R: number): void {
  for (let y = 0; y < Nsize; y++) {
    for (let x = 0; x < Nsize; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R * 1.2) continue;
      const v = Math.exp(-(d * d) / (R * R * 0.4));
      const idx = (y * Nsize + x) * 4;
      data[idx] = Math.max(data[idx], v * 0.9);
      data[idx + 1] = Math.max(data[idx + 1], v * 0.9);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  Filter preview — animated SVG mini-envelope
//
//  Filter isn't a running simulation; it's a plot. We render a small SVG
//  version of the composed envelope with a slowly drifting scenario dot
//  that orbits around (τ, L) phase space. Cheap, readable, motion enough
//  to read as "alive" on a catalog page.
// ───────────────────────────────────────────────────────────────────────────

export function FilterPreview({ playing }: { playing: boolean }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const dot = ref.current.querySelector<SVGCircleElement>("[data-dot]");
    if (!dot) return;

    let t = 0;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (playing) {
        t += 0.005;
        // Drift the dot in a slow circle inside the feasible region
        // (below the envelope). Units are SVG viewBox coordinates.
        const cx = 110 + Math.cos(t * 1.5) * 34;
        const cy = 110 + Math.sin(t) * 20;
        dot.setAttribute("cx", cx.toFixed(2));
        dot.setAttribute("cy", cy.toFixed(2));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 240"
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: COLOR.voidSoft,
      }}
    >
      <defs>
        <pattern id="fp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(42)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR.ghost} strokeOpacity="0.18" strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* Grid */}
      <g stroke={COLOR.inkGhost} strokeOpacity="0.35" strokeWidth="0.3">
        {[40, 80, 120, 160, 200].map((x) => (
          <line key={`v${x}`} x1={x} y1={24} x2={x} y2={216} />
        ))}
        {[60, 100, 140, 180].map((y) => (
          <line key={`h${y}`} x1={28} y1={y} x2={220} y2={y} />
        ))}
      </g>

      {/* Infeasible region above the envelope, hatched. */}
      <path
        d="M 28 24 L 220 24 L 220 60 L 140 85 L 70 130 L 28 180 Z"
        fill={COLOR.inkGhost}
        fillOpacity="0.22"
      />
      <path
        d="M 28 24 L 220 24 L 220 60 L 140 85 L 70 130 L 28 180 Z"
        fill="url(#fp-hatch)"
      />

      {/* The envelope — two teeth meeting at a cusp. */}
      <path
        d="M 28 180 L 70 130 L 140 85 L 220 60"
        fill="none"
        stroke={COLOR.ink}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Cusp marker. */}
      <circle cx={140} cy={85} r={3} fill={COLOR.void} stroke={COLOR.ink} strokeWidth="1.2" />

      {/* Drifting scenario dot (the "agent" moving through phase space). */}
      <circle data-dot cx={110} cy={110} r={4} fill={COLOR.ghost} opacity="0.85" />
    </svg>
  );
}
