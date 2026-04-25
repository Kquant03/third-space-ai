"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · useLenia hook
//  ─────────────────────────────────────────────────────────────────────────
//  Owns the WebGL2 pipeline and the rAF animation loop. Parameters flow in
//  as setState values; the hook mirrors them onto refs so the inner loop
//  reads from stable locations rather than rebinding on every render.
//
//  The pipeline:
//    1. Upload dirty sigma-field texture (if painting landscape this frame)
//    2. Advance season phase (for Ghost mode)
//    3. Run spf simulation passes (state ping-pong, kernel conv + growth)
//    4. Memory update pass — slow low-pass on state into memTex ping-pong;
//       the Lantern palette's afterimage reads from this. Decay 0.99 →
//       ~100-frame (~1.6s) time constant.
//    5. Display pass — state + memory + σ-field → colour in dispTex
//       (RGBA16F, so the palette's HDR emissions survive into composite)
//    6. Two-pass separable Gaussian bloom (bright-pass extract then blur)
//       at quarter resolution in RGBA16F bloomTex pair
//    7. Composite pass — additive bloom + Reinhard tone map + vignette,
//       drawn to the default framebuffer
//
//  Telemetry (frame count, mass, fps) is sampled on a 15-frame cadence to
//  avoid per-frame setState cost.
//
//  Notes vs. previous iteration:
//    - brushSize lives on paramsRef.current alongside μ/σ/dt rather than
//      being captured by the rAF effect closure. Net effect: dragging the
//      brush slider no longer tears down and rebuilds the animation loop.
//    - handleMouse accepts both React.MouseEvent and React.PointerEvent
//      (the former is a structural superset of the latter). LeniaExperience
//      passes pointer events so touch input now works.
//    - Memory texture is a ping-pong pair with a per-frame update pass
//      rather than a single texture loaded once with the initial seed.
//      This makes the "ghost wisps" track motion history (paper-faithful)
//      instead of haunting the seed location forever.
//    - Display + bloom textures are RGBA16F + HALF_FLOAT, gated on the
//      same EXT_color_buffer_float extension already required for state.
//      Reinhard tone-mapping in the composite pass now has real HDR
//      input to compress, instead of pre-clamped LDR that turned the
//      tone curve into a no-op.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";

import {
  N,
  DISPLAY,
  BLOOM_SCALE,
  KERNEL_TEX_SIZE,
  VERT_SRC,
  SIM_FRAG_SRC,
  DISPLAY_FRAG_SRC,
  MEMORY_FRAG_SRC,
  BLOOM_FRAG_SRC,
  COMPOSITE_FRAG_SRC,
} from "./shaders";
import { createProgram, createTex, createFB, type Program } from "./webgl";
import { buildKernelData, buildInitialState } from "./kernel";
import {
  buildSigmaField,
  paintSigmaField,
} from "./sigmaField";
import { PRESETS, type PresetId } from "./presets";

// ───────────────────────────────────────────────────────────────────────────
//  GPU-resource bundle held on a ref for the duration of the component's
//  mount. Assembled once inside the setup effect; freed in its cleanup.
// ───────────────────────────────────────────────────────────────────────────

type GPU = {
  simProg: Program;
  dispProg: Program;
  memProg: Program;
  bloomProg: Program;
  compProg: Program;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  stateTex: [WebGLTexture, WebGLTexture];
  stateFB: [WebGLFramebuffer, WebGLFramebuffer];
  kernelTex: WebGLTexture;
  dispTex: WebGLTexture;
  dispFB: WebGLFramebuffer;
  bloomTex: [WebGLTexture, WebGLTexture];
  bloomFB: [WebGLFramebuffer, WebGLFramebuffer];
  bN: number;
  readBuf: Float32Array;
  // Ping-pong memory texture pair. Memory is now a slow low-pass on
  // state, updated every frame via memProg, rather than a static seed
  // that only ever reflected the initial creature placement.
  memTex: [WebGLTexture, WebGLTexture];
  memFB: [WebGLFramebuffer, WebGLFramebuffer];
  sigmaFieldTex: WebGLTexture;
};

// Internal mutable parameter packet read by the loop every frame.
type Params = {
  mu: number;
  sigma: number;
  dt: number;
  spf: number;
  palette: number;
  viewMode: number;
  showTrails: boolean;
  bloom: boolean;
  bloomStr: number;
  brightness: number;
  R: number;
  brushSize: number;
  ghostMode: boolean;
  seasonEnabled: boolean;
  seasonSpeed: number;
  seasonAmp: number;
};

// Pointer-or-mouse event the canvas may receive. Both expose the same
// fields we read (clientX/Y, button, buttons, shiftKey).
type CanvasInputEvent =
  | React.MouseEvent<HTMLCanvasElement>
  | React.PointerEvent<HTMLCanvasElement>;

// ───────────────────────────────────────────────────────────────────────────
//  Hook API
// ───────────────────────────────────────────────────────────────────────────

export type UseLeniaApi = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Lifecycle state
  glError: string | null;

  // Reactive state + setters
  running: boolean;
  setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  preset: PresetId;
  R: number;
  setR: React.Dispatch<React.SetStateAction<number>>;
  mu: number;
  setMu: React.Dispatch<React.SetStateAction<number>>;
  sigma: number;
  setSigma: React.Dispatch<React.SetStateAction<number>>;
  dt: number;
  setDt: React.Dispatch<React.SetStateAction<number>>;
  spf: number;
  setSpf: React.Dispatch<React.SetStateAction<number>>;
  palette: number;
  setPalette: React.Dispatch<React.SetStateAction<number>>;
  viewMode: number;
  setViewMode: React.Dispatch<React.SetStateAction<number>>;
  showTrails: boolean;
  setShowTrails: React.Dispatch<React.SetStateAction<boolean>>;
  bloom: boolean;
  setBloom: React.Dispatch<React.SetStateAction<boolean>>;
  bloomStr: number;
  setBloomStr: React.Dispatch<React.SetStateAction<number>>;
  brightness: number;
  setBrightness: React.Dispatch<React.SetStateAction<number>>;
  brushSize: number;
  setBrushSize: React.Dispatch<React.SetStateAction<number>>;

  ghostMode: boolean;
  setGhostMode: React.Dispatch<React.SetStateAction<boolean>>;
  landscapeBrush: boolean;
  setLandscapeBrush: React.Dispatch<React.SetStateAction<boolean>>;
  seasonEnabled: boolean;
  setSeasonEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  seasonSpeed: number;
  setSeasonSpeed: React.Dispatch<React.SetStateAction<number>>;
  seasonAmp: number;
  setSeasonAmp: React.Dispatch<React.SetStateAction<number>>;

  // Read-only telemetry
  frameCount: number;
  mass: number;
  fps: number;
  seasonPhase: number;

  // Actions
  loadPreset: (id: PresetId) => void;
  reset: () => void;
  clear: () => void;
  handleMouse: (e: CanvasInputEvent, active: boolean) => void;
  handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
};

// ───────────────────────────────────────────────────────────────────────────
//  Implementation
// ───────────────────────────────────────────────────────────────────────────

export function useLenia(initialPresetId: PresetId = "orbium"): UseLeniaApi {
  const initialPreset = PRESETS[initialPresetId];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const gpuRef = useRef<GPU | null>(null);
  const animRef = useRef<number | null>(null);
  const paramsRef = useRef<Params | null>(null);
  const mouseRef = useRef<{ active: boolean; erase: boolean; x: number; y: number }>({
    active: false,
    erase: false,
    x: 0,
    y: 0,
  });
  const frameRef = useRef(0);
  const swapRef = useRef(0);
  const memSwapRef = useRef(0);
  const sigmaFieldRef = useRef<Float32Array>(new Float32Array(N * N * 4));
  const sigmaFieldDirtyRef = useRef(false);
  const timeRef = useRef(0);

  // Reactive UI state
  const [running, setRunning] = useState(true);
  const [preset, setPreset] = useState<PresetId>(initialPresetId);
  const [R, setR] = useState(initialPreset.R);
  const [mu, setMu] = useState(initialPreset.mu);
  const [sigma, setSigma] = useState(initialPreset.sigma);
  const [dt, setDt] = useState(1 / initialPreset.T);
  const [spf, setSpf] = useState(initialPreset.spf ?? 2);
  const [palette, setPalette] = useState(initialPreset.palette ?? 5); // default Lantern
  const [viewMode, setViewMode] = useState(0);
  const [showTrails, setShowTrails] = useState(true);
  const [bloom, setBloom] = useState(true);
  const [bloomStr, setBloomStr] = useState(0.45);
  const [brightness, setBrightness] = useState(1.0);
  const [brushSize, setBrushSize] = useState(8);
  const [frameCount, setFrameCount] = useState(0);
  const [mass, setMass] = useState(0);
  const [fps, setFps] = useState(0);
  const [glError, setGlError] = useState<string | null>(null);

  const [ghostMode, setGhostMode] = useState(!!initialPreset.ghost);
  const [landscapeBrush, setLandscapeBrush] = useState(false);
  const [seasonEnabled, setSeasonEnabled] = useState(false);
  const [seasonSpeed, setSeasonSpeed] = useState(0.15);
  const [seasonAmp, setSeasonAmp] = useState(0.25);
  const [seasonPhase, setSeasonPhase] = useState(0);

  // Mirror reactive state onto the params ref that the loop reads.
  // brushSize now lives here too, so the rAF effect only depends on
  // `running` — pure on/off lifecycle.
  paramsRef.current = {
    mu,
    sigma,
    dt,
    spf,
    palette,
    viewMode,
    showTrails,
    bloom,
    bloomStr,
    brightness,
    R,
    brushSize,
    ghostMode,
    seasonEnabled,
    seasonSpeed,
    seasonAmp,
  };

  // ── WebGL setup (runs once on mount) ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = DISPLAY;
    canvas.height = DISPLAY;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      setGlError("WebGL2 not supported on this device.");
      return;
    }

    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
      setGlError("Float textures (EXT_color_buffer_float) not available.");
      return;
    }
    gl.getExtension("OES_texture_float_linear");

    glRef.current = gl;

    const simProg = createProgram(gl, VERT_SRC, SIM_FRAG_SRC);
    const dispProg = createProgram(gl, VERT_SRC, DISPLAY_FRAG_SRC);
    const memProg = createProgram(gl, VERT_SRC, MEMORY_FRAG_SRC);
    const bloomProg = createProgram(gl, VERT_SRC, BLOOM_FRAG_SRC);
    const compProg = createProgram(gl, VERT_SRC, COMPOSITE_FRAG_SRC);
    if (!simProg || !dispProg || !memProg || !bloomProg || !compProg) {
      setGlError("Shader compilation failed — see console for details.");
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
    for (const prog of [simProg, dispProg, memProg, bloomProg, compProg]) {
      const loc = gl.getAttribLocation(prog.program, "a_pos");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    // Double-buffered state texture (ping-pong).
    const stateTex0 = createTex(
      gl, N, N, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null,
    );
    const stateTex1 = createTex(
      gl, N, N, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null,
    );
    const stateFB0 = stateTex0 ? createFB(gl, stateTex0) : null;
    const stateFB1 = stateTex1 ? createFB(gl, stateTex1) : null;

    const kernelTex = createTex(
      gl, KERNEL_TEX_SIZE, KERNEL_TEX_SIZE, gl.RGBA32F, gl.RGBA, gl.FLOAT,
      gl.NEAREST, null,
    );

    // Memory ping-pong pair. Both initialise to zero — afterimage builds
    // up as creatures move during the first ~100 frames after load. We
    // intentionally do NOT pre-load the seed here (that was the static-
    // memory bug); the memory pass running each frame produces a true
    // motion-history afterimage instead.
    const memTex0 = createTex(
      gl, N, N, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null,
    );
    const memTex1 = createTex(
      gl, N, N, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, null,
    );
    const memFB0 = memTex0 ? createFB(gl, memTex0) : null;
    const memFB1 = memTex1 ? createFB(gl, memTex1) : null;
    if (memTex0 && memTex1) {
      const zeros = new Float32Array(N * N * 4);
      gl.bindTexture(gl.TEXTURE_2D, memTex0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, zeros);
      gl.bindTexture(gl.TEXTURE_2D, memTex1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, zeros);
    }

    const sigmaFieldTex = createTex(
      gl, N, N, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.LINEAR, null,
    );
    if (sigmaFieldTex) {
      const initSigma = buildSigmaField(initialPreset.sigma, initialPreset.landscape ?? "uniform");
      gl.bindTexture(gl.TEXTURE_2D, sigmaFieldTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, initSigma,
      );
      sigmaFieldRef.current = initSigma;
    }

    // RGBA16F display + bloom textures so the Lantern palette's HDR
    // emissions (hot cores at ~5x white) survive into the composite
    // pass where Reinhard tone-maps them properly. Previously these
    // were RGBA8, which clamped emissions at 1.0 and turned the tone
    // map into a no-op contrast curve.
    const dispTex = createTex(
      gl, N, N, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR, null,
    );
    const dispFB = dispTex ? createFB(gl, dispTex) : null;

    const bN = Math.floor(N / BLOOM_SCALE);
    const bloomTex0 = createTex(
      gl, bN, bN, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR, null,
    );
    const bloomTex1 = createTex(
      gl, bN, bN, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR, null,
    );
    const bloomFB0 = bloomTex0 ? createFB(gl, bloomTex0) : null;
    const bloomFB1 = bloomTex1 ? createFB(gl, bloomTex1) : null;

    if (
      !stateTex0 || !stateTex1 || !stateFB0 || !stateFB1 ||
      !kernelTex ||
      !memTex0 || !memTex1 || !memFB0 || !memFB1 ||
      !sigmaFieldTex ||
      !dispTex || !dispFB ||
      !bloomTex0 || !bloomTex1 || !bloomFB0 || !bloomFB1
    ) {
      setGlError("GPU resource allocation failed.");
      return;
    }

    // Upload initial state + kernel.
    const initData = buildInitialState(
      initialPreset.R,
      initialPreset.count,
      !!initialPreset.isSoup,
      initialPreset.species,
    );
    gl.bindTexture(gl.TEXTURE_2D, stateTex0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, initData);

    // (Note: ghost-mode initial seed is NO LONGER pre-loaded into memory —
    // the per-frame memory pass populates it from state.)

    const kernelData = buildKernelData(initialPreset.R, initialPreset.peaks);
    gl.bindTexture(gl.TEXTURE_2D, kernelTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, KERNEL_TEX_SIZE, KERNEL_TEX_SIZE,
      gl.RGBA, gl.FLOAT, kernelData,
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const readBuf = new Float32Array(N * N * 4);

    gpuRef.current = {
      simProg,
      dispProg,
      memProg,
      bloomProg,
      compProg,
      vao,
      vbo,
      stateTex: [stateTex0, stateTex1],
      stateFB: [stateFB0, stateFB1],
      kernelTex,
      dispTex,
      dispFB,
      bloomTex: [bloomTex0, bloomTex1],
      bloomFB: [bloomFB0, bloomFB1],
      bN,
      readBuf,
      memTex: [memTex0, memTex1],
      memFB: [memFB0, memFB1],
      sigmaFieldTex,
    };
    swapRef.current = 0;
    memSwapRef.current = 0;
    frameRef.current = 0;
    timeRef.current = 0;

    return () => {
      gl.deleteTexture(stateTex0);
      gl.deleteTexture(stateTex1);
      gl.deleteTexture(kernelTex);
      gl.deleteTexture(dispTex);
      gl.deleteTexture(bloomTex0);
      gl.deleteTexture(bloomTex1);
      gl.deleteTexture(memTex0);
      gl.deleteTexture(memTex1);
      gl.deleteTexture(sigmaFieldTex);
      gl.deleteFramebuffer(stateFB0);
      gl.deleteFramebuffer(stateFB1);
      gl.deleteFramebuffer(dispFB);
      gl.deleteFramebuffer(bloomFB0);
      gl.deleteFramebuffer(bloomFB1);
      gl.deleteFramebuffer(memFB0);
      gl.deleteFramebuffer(memFB1);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(simProg.program);
      gl.deleteProgram(dispProg.program);
      gl.deleteProgram(memProg.program);
      gl.deleteProgram(bloomProg.program);
      gl.deleteProgram(compProg.program);
      gpuRef.current = null;
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers (texture uploads) ────────────────────────────────────

  const updateKernel = useCallback((newR: number, peaks: number[] = [1]) => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    const data = buildKernelData(newR, peaks);
    gl.bindTexture(gl.TEXTURE_2D, gpu.kernelTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, KERNEL_TEX_SIZE, KERNEL_TEX_SIZE,
      gl.RGBA, gl.FLOAT, data,
    );
  }, []);

  const uploadState = useCallback((data: Float32Array) => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    const cur = swapRef.current;
    gl.bindTexture(gl.TEXTURE_2D, gpu.stateTex[cur]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, data);
  }, []);

  // Memory is ping-ponged on the GPU now; we never upload arbitrary data
  // into it externally. The only meaningful action from the host side is
  // "zero both textures" — used when loading a new preset, reset, or
  // clear, so the afterimage rebuilds from scratch rather than carrying
  // stale wisps across the substrate change.
  const clearMemory = useCallback(() => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    const zeros = new Float32Array(N * N * 4);
    gl.bindTexture(gl.TEXTURE_2D, gpu.memTex[0]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, zeros);
    gl.bindTexture(gl.TEXTURE_2D, gpu.memTex[1]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, zeros);
    memSwapRef.current = 0;
  }, []);

  const uploadSigmaField = useCallback((data: Float32Array) => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    gl.bindTexture(gl.TEXTURE_2D, gpu.sigmaFieldTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, data);
    sigmaFieldRef.current = data;
  }, []);

  // ── Load preset ──────────────────────────────────────────────────
  const loadPreset = useCallback(
    (id: PresetId) => {
      const p = PRESETS[id];
      setPreset(id);
      setR(p.R);
      setMu(p.mu);
      setSigma(p.sigma);
      setDt(1 / p.T);
      setSpf(p.spf ?? 2);
      updateKernel(p.R, p.peaks);

      const initData = buildInitialState(p.R, p.count, !!p.isSoup, p.species);
      uploadState(initData);

      // Always clear memory on preset change. With the dynamic memory
      // pass, wisps will rebuild over ~100 frames as the new creatures
      // move; carrying old memory across a preset boundary would mean
      // ghosts of the previous species haunting the new one.
      clearMemory();

      const isGhost = !!p.ghost;
      setGhostMode(isGhost);
      if (isGhost) {
        const sigField = buildSigmaField(p.sigma, p.landscape ?? "uniform");
        uploadSigmaField(sigField);
        if (p.palette !== undefined) setPalette(p.palette);
        setBloom(true);
        setBloomStr(0.55);
        setShowTrails(true);
      }

      setLandscapeBrush(false);
      frameRef.current = 0;
      timeRef.current = 0;
      setFrameCount(0);
      setSeasonPhase(0);
    },
    [updateKernel, uploadState, clearMemory, uploadSigmaField],
  );

  const reset = useCallback(() => {
    const p = PRESETS[preset];
    const initData = buildInitialState(p.R, p.count, !!p.isSoup, p.species);
    uploadState(initData);
    clearMemory();
    if (p.ghost) {
      const sigField = buildSigmaField(p.sigma, p.landscape ?? "uniform");
      uploadSigmaField(sigField);
    }
    frameRef.current = 0;
    timeRef.current = 0;
    setFrameCount(0);
    setSeasonPhase(0);
  }, [preset, uploadState, clearMemory, uploadSigmaField]);

  const clear = useCallback(() => {
    uploadState(new Float32Array(N * N * 4));
    // Always clear memory too — otherwise the wisps would persist on a
    // now-empty substrate, looking glitchy.
    clearMemory();
    frameRef.current = 0;
    setFrameCount(0);
  }, [uploadState, clearMemory]);

  // ── Propagate R slider back to kernel ──
  useEffect(() => {
    updateKernel(R);
  }, [R, updateKernel]);

  // ── Mouse / pointer handling ───────────────────────────────────
  // Accepts both PointerEvent and MouseEvent — we only read fields that
  // are common to both. PointerEvent's pointerType lets a touch-only
  // device drive the same code path that desktop mouse uses.
  const handleMouse = useCallback(
    (e: CanvasInputEvent, active: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;

      if (landscapeBrush && ghostMode && active) {
        const isErase = e.button === 2 || e.shiftKey;
        paintSigmaField(
          sigmaFieldRef.current,
          x,
          y,
          brushSize,
          !isErase,
        );
        sigmaFieldDirtyRef.current = true;
        mouseRef.current = { active: false, erase: false, x: 0, y: 0 };
      } else {
        mouseRef.current = {
          active,
          erase: e.button === 2 || e.shiftKey,
          x,
          y,
        };
      }
    },
    [landscapeBrush, ghostMode, brushSize],
  );

  // Suppress the context menu on right-click so it can be used to erase.
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
    },
    [],
  );

  // ── Animation loop ──────────────────────────────────────────────
  // Effect deps are now just `[running]` — every per-frame parameter is
  // read from paramsRef inside the loop.
  useEffect(() => {
    if (!running) return;
    let active = true;
    let lastTime = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;

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
        simProg, dispProg, memProg, bloomProg, compProg, vao,
        stateTex, stateFB, kernelTex,
        dispTex, dispFB, bloomTex, bloomFB, bN,
        memTex, memFB, sigmaFieldTex,
      } = gpu;

      gl.bindVertexArray(vao);

      // Push dirty σ-field to GPU.
      if (sigmaFieldDirtyRef.current) {
        gl.bindTexture(gl.TEXTURE_2D, sigmaFieldTex);
        gl.texSubImage2D(
          gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT,
          sigmaFieldRef.current,
        );
        sigmaFieldDirtyRef.current = false;
      }

      // Seasonal oscillation (Ghost mode only).
      timeRef.current += 0.016;
      let seasonMod = 1.0;
      if (p.ghostMode && p.seasonEnabled) {
        seasonMod = 1.0 + p.seasonAmp * Math.sin(timeRef.current * p.seasonSpeed);
        setSeasonPhase(Math.sin(timeRef.current * p.seasonSpeed));
      }

      // ── Simulation passes ──
      for (let s = 0; s < p.spf; s++) {
        const cur = swapRef.current;
        const next = 1 - cur;

        gl.useProgram(simProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, stateTex[cur]);
        gl.uniform1i(simProg.uniforms["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, kernelTex);
        gl.uniform1i(simProg.uniforms["u_kernel"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, sigmaFieldTex);
        gl.uniform1i(simProg.uniforms["u_sigmaField"], 2);

        gl.uniform1f(simProg.uniforms["u_R"], p.R);
        gl.uniform1f(simProg.uniforms["u_mu"], p.mu);
        gl.uniform1f(simProg.uniforms["u_sigma"], p.sigma);
        gl.uniform1f(simProg.uniforms["u_dt"], p.dt);
        gl.uniform2f(simProg.uniforms["u_res"], N, N);
        gl.uniform1f(simProg.uniforms["u_trailDecay"], p.showTrails ? 0.96 : 0.0);
        gl.uniform1f(simProg.uniforms["u_ghostMode"], p.ghostMode ? 1.0 : 0.0);
        gl.uniform1f(simProg.uniforms["u_seasonMod"], seasonMod);

        const m = mouseRef.current;
        gl.uniform1f(simProg.uniforms["u_brushActive"], m.active ? 1.0 : 0.0);
        gl.uniform2f(simProg.uniforms["u_mouse"], m.x, m.y);
        gl.uniform1f(simProg.uniforms["u_brushSize"], p.brushSize);
        gl.uniform1f(simProg.uniforms["u_brushErase"], m.erase ? 1.0 : 0.0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFB[next]);
        gl.viewport(0, 0, N, N);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        swapRef.current = next;
      }

      const curState = swapRef.current;

      // ── Memory update pass ──
      // Runs once per frame regardless of spf. Reads current state and
      // current memory, writes mix(state, prev_mem, decay) to the next
      // memory texture. Decay 0.99 → ~100-frame time constant. This
      // gives the Lantern palette's `ghostWisp = max(0, mem − 3·state)`
      // term real motion-history to read against, instead of the static
      // initial seed it used to read.
      {
        const curMem = memSwapRef.current;
        const nextMem = 1 - curMem;
        gl.useProgram(memProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, stateTex[curState]);
        gl.uniform1i(memProg.uniforms["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, memTex[curMem]);
        gl.uniform1i(memProg.uniforms["u_memory"], 1);
        gl.uniform1f(memProg.uniforms["u_decay"], 0.99);
        gl.bindFramebuffer(gl.FRAMEBUFFER, memFB[nextMem]);
        gl.viewport(0, 0, N, N);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        memSwapRef.current = nextMem;
      }
      const curMemTex = memTex[memSwapRef.current];

      // ── Display pass ──
      gl.useProgram(dispProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, stateTex[curState]);
      gl.uniform1i(dispProg.uniforms["u_state"], 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, curMemTex);
      gl.uniform1i(dispProg.uniforms["u_memory"], 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sigmaFieldTex);
      gl.uniform1i(dispProg.uniforms["u_sigmaField"], 2);
      gl.uniform1i(dispProg.uniforms["u_palette"], p.palette);
      gl.uniform1i(dispProg.uniforms["u_viewMode"], p.viewMode);
      gl.uniform1f(dispProg.uniforms["u_trailMix"], p.showTrails ? 0.35 : 0.0);
      gl.uniform1f(dispProg.uniforms["u_ghostMode"], p.ghostMode ? 1.0 : 0.0);
      gl.uniform1f(dispProg.uniforms["u_baseSigma"], p.sigma);
      gl.uniform1f(dispProg.uniforms["u_time"], timeRef.current);

      gl.bindFramebuffer(gl.FRAMEBUFFER, dispFB);
      gl.viewport(0, 0, N, N);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // ── Bloom (two-pass separable Gaussian, with bright-pass) ──
      if (p.bloom) {
        gl.useProgram(bloomProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dispTex);
        gl.uniform1i(bloomProg.uniforms["u_input"], 0);
        gl.uniform2f(bloomProg.uniforms["u_dir"], 1.0, 0.0);
        gl.uniform2f(bloomProg.uniforms["u_res"], bN, bN);
        gl.uniform1f(bloomProg.uniforms["u_extract"], 1.0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFB[0]);
        gl.viewport(0, 0, bN, bN);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindTexture(gl.TEXTURE_2D, bloomTex[0]);
        gl.uniform2f(bloomProg.uniforms["u_dir"], 0.0, 1.0);
        gl.uniform1f(bloomProg.uniforms["u_extract"], 0.0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFB[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindTexture(gl.TEXTURE_2D, bloomTex[1]);
        gl.uniform2f(bloomProg.uniforms["u_dir"], 1.0, 0.0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFB[0]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindTexture(gl.TEXTURE_2D, bloomTex[0]);
        gl.uniform2f(bloomProg.uniforms["u_dir"], 0.0, 1.0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFB[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      // ── Composite pass ──
      gl.useProgram(compProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dispTex);
      gl.uniform1i(compProg.uniforms["u_display"], 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, p.bloom ? bloomTex[1] : dispTex);
      gl.uniform1i(compProg.uniforms["u_bloom"], 1);
      gl.uniform1f(compProg.uniforms["u_bloomStr"], p.bloom ? p.bloomStr : 0.0);
      gl.uniform1f(compProg.uniforms["u_brightness"], p.brightness);
      gl.uniform1f(compProg.uniforms["u_vignette"], 0.35);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, DISPLAY, DISPLAY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      frameRef.current++;

      // Telemetry on a 15-frame cadence.
      fpsFrames++;
      fpsAccum += now - lastTime;
      lastTime = now;
      if (fpsFrames >= 15) {
        const avgMs = fpsAccum / fpsFrames;
        setFps(Math.round(1000 / avgMs));
        setFrameCount(frameRef.current);
        fpsFrames = 0;
        fpsAccum = 0;

        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFB[curState]);
        gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, gpu.readBuf);
        let m = 0;
        for (let i = 0; i < N * N; i++) m += gpu.readBuf[i * 4];
        setMass(m);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [running]);

  return {
    canvasRef,
    glError,
    running, setRunning,
    preset,
    R, setR,
    mu, setMu,
    sigma, setSigma,
    dt, setDt,
    spf, setSpf,
    palette, setPalette,
    viewMode, setViewMode,
    showTrails, setShowTrails,
    bloom, setBloom,
    bloomStr, setBloomStr,
    brightness, setBrightness,
    brushSize, setBrushSize,
    ghostMode, setGhostMode,
    landscapeBrush, setLandscapeBrush,
    seasonEnabled, setSeasonEnabled,
    seasonSpeed, setSeasonSpeed,
    seasonAmp, setSeasonAmp,
    frameCount, mass, fps,
    seasonPhase,
    loadPreset,
    reset,
    clear,
    handleMouse,
    handleContextMenu,
  };
}
