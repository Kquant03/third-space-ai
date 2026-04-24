"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · useLeniaExpanded hook
//  ─────────────────────────────────────────────────────────────────────────
//  Owns the six-shader WebGL2 pipeline and the rAF animation loop. The
//  per-frame flow is:
//
//    1. Update 4D hyperslice (HYPER_FRAG) — renders the Dihypersphaerome
//       cross-section into hyperTex at the accumulated (xw, yw, zw) angle
//    2. Compute flow field (FLOW_FRAG) — velocity from prey + morphogen
//       gradients, into flowTex
//    3. SPF × simulation passes (SIM_FRAG) — four-channel state ping-pong
//       with cross-coupling, advection from flowTex, 4D bleed from hyperTex
//    4. Display pass (DISPLAY_FRAG) — state → RGB8 according to view mode
//    5. Bloom (BLOOM_FRAG) — bright-pass extract + two separable blurs
//    6. Composite (COMP_FRAG) — additive bloom + tone map + vignette
//
//  Like the Lenia hook, parameters flow in as setState values that get
//  mirrored onto a paramsRef so the loop reads from a stable location.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";

import {
  N,
  DISPLAY,
  BLOOM_SCALE,
  KS,
  VERT_SRC,
  SIM_FRAG_SRC,
  FLOW_FRAG_SRC,
  HYPER_FRAG_SRC,
  DISPLAY_FRAG_SRC,
  BLOOM_FRAG_SRC,
  COMP_FRAG_SRC,
} from "./shaders";
import { makeProgram, makeTex, makeFB, type Program } from "./webgl";
import { buildKernel } from "./kernel";
import { buildEcosystem } from "./ecosystem";
import {
  PRESETS,
  VIEW_MODE_INDEX,
  FLOW_MODE_INDEX,
  BRUSH_CHANNEL_INDEX,
  type PresetId,
  type ViewModeId,
  type FlowModeId,
  type BrushChannelId,
} from "./presets";

// ─── GPU bundle ───────────────────────────────────────────────────────────

type GPU = {
  simProg: Program;
  flowProg: Program;
  hyperProg: Program;
  dispProg: Program;
  bloomProg: Program;
  compProg: Program;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  stateTex: [WebGLTexture, WebGLTexture];
  stateFB: [WebGLFramebuffer, WebGLFramebuffer];
  flowTex: [WebGLTexture, WebGLTexture];
  flowFB: [WebGLFramebuffer, WebGLFramebuffer];
  hyperTex: [WebGLTexture, WebGLTexture];
  hyperFB: [WebGLFramebuffer, WebGLFramebuffer];
  kernelTex0: WebGLTexture;
  kernelTex1: WebGLTexture;
  kernelTex2: WebGLTexture;
  dispTex: WebGLTexture;
  dispFB: WebGLFramebuffer;
  bloomTex: [WebGLTexture, WebGLTexture];
  bloomFB: [WebGLFramebuffer, WebGLFramebuffer];
  bN: number;
  readBuf: Float32Array;
};

type Params = {
  spf: number;
  dt: number;
  mu0: number; sig0: number;
  mu1: number; sig1: number;
  mu2: number; sig2: number;
  R0: number; R1: number; R2: number;
  c01: number; c10: number; c20: number;
  c02: number; c12: number;
  rotSpeed: number; rotXWSpeed: number; rotYWSpeed: number;
  wSlice: number; hyperAmp: number; hyperMix: number;
  flowStr: number; flowMode: number;
  viewMode: number;
  bloom: boolean; bloomStr: number;
};

// ─── Hook API ─────────────────────────────────────────────────────────────

export type UseLeniaExpandedApi = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  glError: string | null;

  running: boolean; setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  preset: PresetId;
  spf: number; setSpf: React.Dispatch<React.SetStateAction<number>>;
  dt: number; setDt: React.Dispatch<React.SetStateAction<number>>;

  mu0: number; setMu0: React.Dispatch<React.SetStateAction<number>>;
  sig0: number; setSig0: React.Dispatch<React.SetStateAction<number>>;
  mu1: number; setMu1: React.Dispatch<React.SetStateAction<number>>;
  sig1: number; setSig1: React.Dispatch<React.SetStateAction<number>>;
  mu2: number; setMu2: React.Dispatch<React.SetStateAction<number>>;
  sig2: number; setSig2: React.Dispatch<React.SetStateAction<number>>;
  R0: number; setR0: React.Dispatch<React.SetStateAction<number>>;
  R1: number; setR1: React.Dispatch<React.SetStateAction<number>>;
  R2: number; setR2: React.Dispatch<React.SetStateAction<number>>;

  c01: number; setC01: React.Dispatch<React.SetStateAction<number>>;
  c10: number; setC10: React.Dispatch<React.SetStateAction<number>>;
  c20: number; setC20: React.Dispatch<React.SetStateAction<number>>;
  c02: number; setC02: React.Dispatch<React.SetStateAction<number>>;
  c12: number; setC12: React.Dispatch<React.SetStateAction<number>>;

  rotSpeed: number; setRotSpeed: React.Dispatch<React.SetStateAction<number>>;
  rotXWSpeed: number; setRotXWSpeed: React.Dispatch<React.SetStateAction<number>>;
  rotYWSpeed: number; setRotYWSpeed: React.Dispatch<React.SetStateAction<number>>;
  wSlice: number; setWSlice: React.Dispatch<React.SetStateAction<number>>;
  hyperAmp: number; setHyperAmp: React.Dispatch<React.SetStateAction<number>>;
  hyperMix: number; setHyperMix: React.Dispatch<React.SetStateAction<number>>;

  flowStr: number; setFlowStr: React.Dispatch<React.SetStateAction<number>>;
  flowEnabled: boolean; setFlowEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  flowMode: FlowModeId; setFlowMode: React.Dispatch<React.SetStateAction<FlowModeId>>;

  viewMode: ViewModeId; setViewMode: React.Dispatch<React.SetStateAction<ViewModeId>>;
  bloom: boolean; setBloom: React.Dispatch<React.SetStateAction<boolean>>;
  bloomStr: number; setBloomStr: React.Dispatch<React.SetStateAction<number>>;
  brushSize: number; setBrushSize: React.Dispatch<React.SetStateAction<number>>;
  brushChan: BrushChannelId; setBrushChan: React.Dispatch<React.SetStateAction<BrushChannelId>>;

  fps: number;
  mass0: number;
  mass1: number;

  loadPreset: (id: PresetId) => void;
  reset: () => void;
  handleMouse: (e: React.MouseEvent<HTMLCanvasElement>, active: boolean) => void;
  handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
};

// ───────────────────────────────────────────────────────────────────────────

export function useLeniaExpanded(
  initialPresetId: PresetId = "duel",
): UseLeniaExpandedApi {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const gpuRef = useRef<GPU | null>(null);
  const animRef = useRef<number | null>(null);
  const paramsRef = useRef<Params | null>(null);
  const mouseRef = useRef<{ active: boolean; erase: boolean; x: number; y: number }>({
    active: false, erase: false, x: 0, y: 0,
  });
  const swapRef = useRef(0);
  const timeRef = useRef(0);
  const frameRef = useRef(0);
  // Accumulated 4D rotation angles. Updated every frame by (xw, yw, zw)
  // speeds; ZW is the "breathing" rotation that produces the ventilans
  // oscillation of the 2D cross-section.
  const rotRef = useRef({ xw: 0, yw: 0, zw: 0 });

  // ── Reactive state ─────────────────────────────────────────────
  const [running, setRunning] = useState(true);
  const [preset, setPreset] = useState<PresetId>(initialPresetId);
  const [spf, setSpf] = useState(2);
  const [dt, setDt] = useState(0.12);

  const [mu0, setMu0] = useState(0.15);
  const [sig0, setSig0] = useState(0.017);
  const [mu1, setMu1] = useState(0.26);
  const [sig1, setSig1] = useState(0.036);
  const [mu2, setMu2] = useState(0.15);
  const [sig2, setSig2] = useState(0.028);
  const [R0, setR0] = useState(13);
  const [R1, setR1] = useState(15);
  const [R2, setR2] = useState(20);

  const [c01, setC01] = useState(0.35);
  const [c10, setC10] = useState(0.4);
  const [c20, setC20] = useState(0.2);
  const [c02, setC02] = useState(0.08);
  const [c12, setC12] = useState(0.04);

  const [rotSpeed, setRotSpeed] = useState(0.18);
  const [rotXWSpeed, setRotXWSpeed] = useState(0.05);
  const [rotYWSpeed, setRotYWSpeed] = useState(0.07);
  const [wSlice, setWSlice] = useState(0);
  const [hyperAmp, setHyperAmp] = useState(0.65);
  const [hyperMix, setHyperMix] = useState(0.12);

  const [flowStr, setFlowStr] = useState(1.2);
  const [flowEnabled, setFlowEnabled] = useState(true);
  const [flowMode, setFlowMode] = useState<FlowModeId>("gradient");

  const [viewMode, setViewMode] = useState<ViewModeId>("ecosystem");
  const [bloom, setBloom] = useState(true);
  const [bloomStr, setBloomStr] = useState(0.55);
  const [brushSize, setBrushSize] = useState(8);
  const [brushChan, setBrushChan] = useState<BrushChannelId>("prey");

  const [fps, setFps] = useState(0);
  const [mass0, setMass0] = useState(0);
  const [mass1, setMass1] = useState(0);
  const [glError, setGlError] = useState<string | null>(null);

  // Mirror reactive state into the loop-visible packet.
  paramsRef.current = {
    spf, dt,
    mu0, sig0, mu1, sig1, mu2, sig2,
    R0, R1, R2,
    c01, c10, c20, c02, c12,
    rotSpeed, rotXWSpeed, rotYWSpeed,
    wSlice, hyperAmp, hyperMix,
    flowStr: flowEnabled ? flowStr : 0,
    flowMode: FLOW_MODE_INDEX[flowMode],
    viewMode: VIEW_MODE_INDEX[viewMode],
    bloom, bloomStr,
  };

  // ── WebGL setup ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = DISPLAY;
    canvas.height = DISPLAY;

    const gl = canvas.getContext("webgl2", {
      antialias: false, alpha: false, preserveDrawingBuffer: false,
    });
    if (!gl) {
      setGlError("WebGL2 not supported on this device.");
      return;
    }
    if (!gl.getExtension("EXT_color_buffer_float")) {
      setGlError("Float textures (EXT_color_buffer_float) not available.");
      return;
    }
    gl.getExtension("OES_texture_float_linear");
    glRef.current = gl;

    const simProg   = makeProgram(gl, VERT_SRC, SIM_FRAG_SRC);
    const flowProg  = makeProgram(gl, VERT_SRC, FLOW_FRAG_SRC);
    const hyperProg = makeProgram(gl, VERT_SRC, HYPER_FRAG_SRC);
    const dispProg  = makeProgram(gl, VERT_SRC, DISPLAY_FRAG_SRC);
    const bloomProg = makeProgram(gl, VERT_SRC, BLOOM_FRAG_SRC);
    const compProg  = makeProgram(gl, VERT_SRC, COMP_FRAG_SRC);
    if (!simProg || !flowProg || !hyperProg || !dispProg || !bloomProg || !compProg) {
      setGlError("Shader compilation failed.");
      return;
    }

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) {
      setGlError("VAO / VBO allocation failed.");
      return;
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    for (const prog of [simProg, flowProg, hyperProg, dispProg, bloomProg, compProg]) {
      const loc = gl.getAttribLocation(prog.program, "a_pos");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    const F = gl.RGBA32F;
    const RF = gl.RGBA;
    const FL = gl.FLOAT;

    // State ping-pong (R=prey, G=predator, B=morphogen, A=4D).
    const stateTex0 = makeTex(gl, N, N, F, RF, FL, gl.NEAREST, null);
    const stateTex1 = makeTex(gl, N, N, F, RF, FL, gl.NEAREST, null);
    const stateFB0 = stateTex0 ? makeFB(gl, stateTex0) : null;
    const stateFB1 = stateTex1 ? makeFB(gl, stateTex1) : null;

    // Flow ping-pong.
    const flowTex0 = makeTex(gl, N, N, F, RF, FL, gl.LINEAR, null);
    const flowTex1 = makeTex(gl, N, N, F, RF, FL, gl.LINEAR, null);
    const flowFB0 = flowTex0 ? makeFB(gl, flowTex0) : null;
    const flowFB1 = flowTex1 ? makeFB(gl, flowTex1) : null;

    // 4D hyperslice ping-pong.
    const hyperTex0 = makeTex(gl, N, N, F, RF, FL, gl.LINEAR, null);
    const hyperTex1 = makeTex(gl, N, N, F, RF, FL, gl.LINEAR, null);
    const hyperFB0 = hyperTex0 ? makeFB(gl, hyperTex0) : null;
    const hyperFB1 = hyperTex1 ? makeFB(gl, hyperTex1) : null;

    // Kernels for the three channels — prey single-peak, predator multi-peak,
    // morphogen wide-diffuse.
    const kernelTex0 = makeTex(gl, KS, KS, F, RF, FL, gl.NEAREST, null);
    const kernelTex1 = makeTex(gl, KS, KS, F, RF, FL, gl.NEAREST, null);
    const kernelTex2 = makeTex(gl, KS, KS, F, RF, FL, gl.NEAREST, null);

    // Display + bloom.
    const dispTex = makeTex(gl, N, N, gl.RGBA8, RF, gl.UNSIGNED_BYTE, gl.LINEAR, null);
    const dispFB = dispTex ? makeFB(gl, dispTex) : null;
    const bN = Math.floor(N / BLOOM_SCALE);
    const bloomTex0 = makeTex(gl, bN, bN, gl.RGBA8, RF, gl.UNSIGNED_BYTE, gl.LINEAR, null);
    const bloomTex1 = makeTex(gl, bN, bN, gl.RGBA8, RF, gl.UNSIGNED_BYTE, gl.LINEAR, null);
    const bloomFB0 = bloomTex0 ? makeFB(gl, bloomTex0) : null;
    const bloomFB1 = bloomTex1 ? makeFB(gl, bloomTex1) : null;

    if (
      !stateTex0 || !stateTex1 || !stateFB0 || !stateFB1 ||
      !flowTex0 || !flowTex1 || !flowFB0 || !flowFB1 ||
      !hyperTex0 || !hyperTex1 || !hyperFB0 || !hyperFB1 ||
      !kernelTex0 || !kernelTex1 || !kernelTex2 ||
      !dispTex || !dispFB ||
      !bloomTex0 || !bloomTex1 || !bloomFB0 || !bloomFB1
    ) {
      setGlError("GPU resource allocation failed.");
      return;
    }

    // Upload initial kernels.
    const uploadKernelTex = (tex: WebGLTexture, R: number, peaks: number[]) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KS, KS, RF, FL, buildKernel(R, peaks));
    };
    uploadKernelTex(kernelTex0, 13, [1]);
    uploadKernelTex(kernelTex1, 15, [1 / 3, 2 / 3, 1]);
    uploadKernelTex(kernelTex2, 20, [1, 0.5, 0.1]);

    // Upload initial state.
    const init = buildEcosystem(PRESETS[initialPresetId].ecosystem);
    gl.bindTexture(gl.TEXTURE_2D, stateTex0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, RF, FL, init);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const readBuf = new Float32Array(N * N * 4);

    gpuRef.current = {
      simProg, flowProg, hyperProg, dispProg, bloomProg, compProg,
      vao, vbo,
      stateTex: [stateTex0, stateTex1],
      stateFB: [stateFB0, stateFB1],
      flowTex: [flowTex0, flowTex1],
      flowFB: [flowFB0, flowFB1],
      hyperTex: [hyperTex0, hyperTex1],
      hyperFB: [hyperFB0, hyperFB1],
      kernelTex0, kernelTex1, kernelTex2,
      dispTex, dispFB,
      bloomTex: [bloomTex0, bloomTex1],
      bloomFB: [bloomFB0, bloomFB1],
      bN, readBuf,
    };
    swapRef.current = 0;
    timeRef.current = 0;
    frameRef.current = 0;

    return () => {
      [stateTex0, stateTex1, flowTex0, flowTex1, hyperTex0, hyperTex1, bloomTex0, bloomTex1]
        .forEach((t) => gl.deleteTexture(t));
      [kernelTex0, kernelTex1, kernelTex2, dispTex].forEach((t) => gl.deleteTexture(t));
      [stateFB0, stateFB1, flowFB0, flowFB1, hyperFB0, hyperFB1, bloomFB0, bloomFB1]
        .forEach((f) => gl.deleteFramebuffer(f));
      gl.deleteFramebuffer(dispFB);
      [simProg, flowProg, hyperProg, dispProg, bloomProg, compProg]
        .forEach((p) => gl.deleteProgram(p.program));
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gpuRef.current = null;
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Kernel reupload on R changes ──
  useEffect(() => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    gl.bindTexture(gl.TEXTURE_2D, gpu.kernelTex0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KS, KS, gl.RGBA, gl.FLOAT, buildKernel(R0, [1]));
  }, [R0]);
  useEffect(() => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    gl.bindTexture(gl.TEXTURE_2D, gpu.kernelTex1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KS, KS, gl.RGBA, gl.FLOAT, buildKernel(R1, [1 / 3, 2 / 3, 1]));
  }, [R1]);
  useEffect(() => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    gl.bindTexture(gl.TEXTURE_2D, gpu.kernelTex2);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KS, KS, gl.RGBA, gl.FLOAT, buildKernel(R2, [1, 0.5, 0.1]));
  }, [R2]);

  // ── Actions ────────────────────────────────────────────────────
  const loadPreset = useCallback((id: PresetId) => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    const data = buildEcosystem(PRESETS[id].ecosystem);
    gl.bindTexture(gl.TEXTURE_2D, gpu.stateTex[swapRef.current]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, data);
    setPreset(id);
    timeRef.current = 0;
    frameRef.current = 0;
    rotRef.current = { xw: 0, yw: 0, zw: 0 };
  }, []);

  const reset = useCallback(() => {
    loadPreset(preset);
  }, [loadPreset, preset]);

  // ── Mouse ─────────────────────────────────────────────────────
  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, active: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        active,
        erase: e.button === 2 || e.shiftKey,
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
    },
    [],
  );

  // ── Animation loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    let active = true;
    let lastT = performance.now();
    let fpsAcc = 0;
    let fpsF = 0;

    const loop = (now: number) => {
      if (!active) return;
      const gl = glRef.current;
      const gpu = gpuRef.current;
      const p = paramsRef.current;
      if (!gl || !gpu || !p) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const {
        simProg, flowProg, hyperProg, dispProg, bloomProg, compProg, vao,
        stateTex, stateFB, flowTex, flowFB, hyperTex, hyperFB,
        kernelTex0, kernelTex1, kernelTex2,
        dispTex, dispFB, bloomTex, bloomFB, bN, readBuf,
      } = gpu;

      gl.bindVertexArray(vao);
      timeRef.current += 0.016;
      const t = timeRef.current;

      // ── 1. 4D hyperslice ──
      rotRef.current.xw += p.rotXWSpeed * 0.016;
      rotRef.current.yw += p.rotYWSpeed * 0.016;
      rotRef.current.zw += p.rotSpeed * 0.016;

      gl.useProgram(hyperProg.program);
      gl.uniform1f(hyperProg.u["u_time"], t);
      gl.uniform1f(hyperProg.u["u_wSlice"], p.wSlice + Math.sin(t * 0.5) * 0.3);
      gl.uniform1f(hyperProg.u["u_rotXW"], rotRef.current.xw);
      gl.uniform1f(hyperProg.u["u_rotYW"], rotRef.current.yw);
      gl.uniform1f(hyperProg.u["u_rotZW"], rotRef.current.zw);
      gl.uniform1f(hyperProg.u["u_R4D"], 0.85);
      gl.uniform1f(hyperProg.u["u_mu4D"], 0.18);
      gl.uniform1f(hyperProg.u["u_sigma4D"], 0.033);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, stateTex[swapRef.current]);
      gl.uniform1i(hyperProg.u["u_prev4D"], 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, hyperFB[0]);
      gl.viewport(0, 0, N, N);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // ── 2. Flow field ──
      gl.useProgram(flowProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, stateTex[swapRef.current]);
      gl.uniform1i(flowProg.u["u_state"], 0);
      gl.uniform2f(flowProg.u["u_res"], N, N);
      gl.uniform1f(flowProg.u["u_time"], t);
      gl.uniform1f(flowProg.u["u_flowMode"], p.flowMode);
      gl.bindFramebuffer(gl.FRAMEBUFFER, flowFB[0]);
      gl.viewport(0, 0, N, N);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // ── 3. Simulation passes ──
      for (let s = 0; s < p.spf; s++) {
        const cur = swapRef.current;
        const nxt = 1 - cur;

        gl.useProgram(simProg.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, stateTex[cur]);
        gl.uniform1i(simProg.u["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, kernelTex0);
        gl.uniform1i(simProg.u["u_kernel0"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, kernelTex1);
        gl.uniform1i(simProg.u["u_kernel1"], 2);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, kernelTex2);
        gl.uniform1i(simProg.u["u_kernel2"], 3);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, flowTex[0]);
        gl.uniform1i(simProg.u["u_flow"], 4);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, hyperTex[0]);
        gl.uniform1i(simProg.u["u_hyperseed"], 5);

        gl.uniform1f(simProg.u["u_R0"], p.R0);
        gl.uniform1f(simProg.u["u_R1"], p.R1);
        gl.uniform1f(simProg.u["u_R2"], p.R2);
        gl.uniform1f(simProg.u["u_mu0"], p.mu0);
        gl.uniform1f(simProg.u["u_mu1"], p.mu1);
        gl.uniform1f(simProg.u["u_mu2"], p.mu2);
        gl.uniform1f(simProg.u["u_sigma0"], p.sig0);
        gl.uniform1f(simProg.u["u_sigma1"], p.sig1);
        gl.uniform1f(simProg.u["u_sigma2"], p.sig2);
        gl.uniform1f(simProg.u["u_dt"], p.dt);
        gl.uniform2f(simProg.u["u_res"], N, N);

        gl.uniform1f(simProg.u["u_c01"], p.c01);
        gl.uniform1f(simProg.u["u_c10"], p.c10);
        gl.uniform1f(simProg.u["u_c20"], p.c20);
        gl.uniform1f(simProg.u["u_c21"], 0.15);
        gl.uniform1f(simProg.u["u_c02"], p.c02);
        gl.uniform1f(simProg.u["u_c12"], p.c12);

        gl.uniform1f(simProg.u["u_hyperAmp"], p.hyperAmp);
        gl.uniform1f(simProg.u["u_hyperMix"], p.hyperMix);
        gl.uniform1f(simProg.u["u_flowStr"], p.flowStr);
        gl.uniform1f(simProg.u["u_time"], t);

        const m = mouseRef.current;
        gl.uniform1f(simProg.u["u_brushActive"], m.active ? 1.0 : 0.0);
        gl.uniform2f(simProg.u["u_mouse"], m.x, m.y);
        gl.uniform1f(simProg.u["u_brushSize"], brushSize);
        gl.uniform1f(simProg.u["u_brushErase"], m.erase ? 1.0 : 0.0);
        gl.uniform1f(simProg.u["u_brushChan"], BRUSH_CHANNEL_INDEX[brushChan]);

        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFB[nxt]);
        gl.viewport(0, 0, N, N);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        swapRef.current = nxt;
      }

      const cur = swapRef.current;

      // ── 4. Display ──
      gl.useProgram(dispProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, stateTex[cur]);
      gl.uniform1i(dispProg.u["u_state"], 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, flowTex[0]);
      gl.uniform1i(dispProg.u["u_flow"], 1);
      gl.uniform1i(dispProg.u["u_viewMode"], p.viewMode);
      gl.uniform1f(dispProg.u["u_time"], t);
      gl.uniform1i(dispProg.u["u_palette"], 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dispFB);
      gl.viewport(0, 0, N, N);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // ── 5. Bloom ──
      if (p.bloom) {
        gl.useProgram(bloomProg.program);
        gl.activeTexture(gl.TEXTURE0);
        const passes: Array<[WebGLTexture, WebGLFramebuffer, [number, number], number]> = [
          [dispTex, bloomFB[0], [1, 0], 1.0],
          [bloomTex[0], bloomFB[1], [0, 1], 0.0],
          [bloomTex[1], bloomFB[0], [1, 0], 0.0],
          [bloomTex[0], bloomFB[1], [0, 1], 0.0],
        ];
        for (const [src, fb, dir, ext] of passes) {
          gl.bindTexture(gl.TEXTURE_2D, src);
          gl.uniform1i(bloomProg.u["u_input"], 0);
          gl.uniform2f(bloomProg.u["u_dir"], dir[0], dir[1]);
          gl.uniform2f(bloomProg.u["u_res"], bN, bN);
          gl.uniform1f(bloomProg.u["u_extract"], ext);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
          gl.viewport(0, 0, bN, bN);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }

      // ── 6. Composite ──
      gl.useProgram(compProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dispTex);
      gl.uniform1i(compProg.u["u_display"], 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, p.bloom ? bloomTex[1] : dispTex);
      gl.uniform1i(compProg.u["u_bloom"], 1);
      gl.uniform1f(compProg.u["u_bloomStr"], p.bloom ? p.bloomStr : 0);
      gl.uniform1f(compProg.u["u_vignette"], 0.4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, DISPLAY, DISPLAY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      frameRef.current++;
      fpsF++;
      fpsAcc += now - lastT;
      lastT = now;
      if (fpsF >= 15) {
        setFps(Math.round(1000 / (fpsAcc / fpsF)));
        fpsF = 0;
        fpsAcc = 0;
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFB[cur]);
        gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, readBuf);
        let m0 = 0;
        let m1 = 0;
        for (let i = 0; i < N * N; i++) {
          m0 += readBuf[i * 4];
          m1 += readBuf[i * 4 + 1];
        }
        setMass0(Math.round(m0));
        setMass1(Math.round(m1));
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [running, brushSize, brushChan]);

  return {
    canvasRef,
    glError,
    running, setRunning,
    preset,
    spf, setSpf,
    dt, setDt,
    mu0, setMu0, sig0, setSig0,
    mu1, setMu1, sig1, setSig1,
    mu2, setMu2, sig2, setSig2,
    R0, setR0, R1, setR1, R2, setR2,
    c01, setC01, c10, setC10, c20, setC20, c02, setC02, c12, setC12,
    rotSpeed, setRotSpeed,
    rotXWSpeed, setRotXWSpeed,
    rotYWSpeed, setRotYWSpeed,
    wSlice, setWSlice,
    hyperAmp, setHyperAmp,
    hyperMix, setHyperMix,
    flowStr, setFlowStr,
    flowEnabled, setFlowEnabled,
    flowMode, setFlowMode,
    viewMode, setViewMode,
    bloom, setBloom,
    bloomStr, setBloomStr,
    brushSize, setBrushSize,
    brushChan, setBrushChan,
    fps, mass0, mass1,
    loadPreset,
    reset,
    handleMouse,
    handleContextMenu,
  };
}
