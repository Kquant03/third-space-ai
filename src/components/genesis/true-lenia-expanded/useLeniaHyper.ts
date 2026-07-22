"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Hyper · useLeniaHyper hook
//  ─────────────────────────────────────────────────────────────────────────
//  Owns the whole WebGL2 pipeline and the rAF loop. Per frame:
//
//    1. advance the six SO(4) rotation angles by their autonomous speeds
//       (plus whatever the pointer drag has added)
//    2. spf × SIM passes — integrate the 4D field one tick each, ping-pong
//       on the flattened atlas; the brush paints a 4-ball if active
//    3. DISPLAY — raymarch the rotated 3-slice into an HDR display texture
//    4. BLOOM (bright-pass + separable blur) and COMP (Reinhard + vignette)
//       to the canvas
//    5. every 15 frames, a GPU 2×2 reduction chain sums the field (mass) and
//       an occupancy indicator, read back from a ≤4×4 target — cheap, versus
//       an ~4 MB full-atlas readback
//
//  Reactive params are mirrored onto paramsRef so the loop reads a stable
//  packet without re-subscribing. Changing the lattice side L or kernel
//  radius R rebuilds GPU resources (L → full re-init; R/profile → new tap
//  textures + a SIM recompile, since the tap count is a compile-time loop
//  bound). Everything else is a live uniform.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_L,
  DEFAULT_R,
  ZERO_ANGLES,
  screenToCell,
  buildSeed,
  type Angles6,
  type Resolution,
  type SeedId,
} from "./hyperfield";
import { buildHyperKernel, KERNEL_PROFILES, type KernelProfileId } from "./hyperkernel";
import {
  VERT_SRC,
  makeSimFrag,
  makeDisplayFrag,
  REDUCE_FRAG_SRC,
  BLOOM_FRAG_SRC,
  COMP_FRAG_SRC,
} from "./hypershaders";
import { makeProgram, makeTex, makeFB, type Program } from "./webgl";
import { PRESETS, PALETTE_INDEX, type PresetId, type PaletteId } from "./hyperpresets";

const DISP = 560; // display render size (square)
const BLOOM_SCALE = 4;

type PlaneKey = keyof Angles6;

type GPU = {
  simProg: Program;
  dispProg: Program;
  reduceProg: Program;
  bloomProg: Program;
  compProg: Program;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  stateTex: [WebGLTexture, WebGLTexture];
  stateFB: [WebGLFramebuffer, WebGLFramebuffer];
  tapOff: WebGLTexture;
  tapW: WebGLTexture;
  tapCount: number;
  dispTex: WebGLTexture;
  dispFB: WebGLFramebuffer;
  bloomTex: [WebGLTexture, WebGLTexture];
  bloomFB: [WebGLFramebuffer, WebGLFramebuffer];
  redTex: [WebGLTexture, WebGLTexture];
  redFB: [WebGLFramebuffer, WebGLFramebuffer];
  bN: number;
  AW: number;
  L: number;
};

type Params = {
  spf: number;
  mu: number;
  sigma: number;
  dt: number;
  steps: number;
  density: number;
  thresh: number;
  slab: number;
  slabSamples: number;
  zoom: number;
  palette: number;
  bloom: boolean;
  bloomStr: number;
  brightness: number;
  brushSize: number;
  speeds: Angles6;
};

type CanvasInputEvent =
  | React.MouseEvent<HTMLCanvasElement>
  | React.PointerEvent<HTMLCanvasElement>;

export type InteractionMode = "rotate" | "paint";

export type UseLeniaHyperApi = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  glError: string | null;

  running: boolean;
  setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  preset: PresetId;
  loadPreset: (id: PresetId) => void;
  seed: SeedId;
  reseed: (id: SeedId) => void;

  // lattice / kernel (rebuild triggers)
  L: Resolution;
  setL: React.Dispatch<React.SetStateAction<Resolution>>;
  R: number;
  setR: React.Dispatch<React.SetStateAction<number>>;
  profile: KernelProfileId;
  setProfile: React.Dispatch<React.SetStateAction<KernelProfileId>>;

  // growth
  mu: number; setMu: React.Dispatch<React.SetStateAction<number>>;
  sigma: number; setSigma: React.Dispatch<React.SetStateAction<number>>;
  dt: number; setDt: React.Dispatch<React.SetStateAction<number>>;
  spf: number; setSpf: React.Dispatch<React.SetStateAction<number>>;

  // rotation speeds (per SO(4) plane)
  speeds: Angles6;
  setSpeed: (plane: PlaneKey, v: number) => void;

  // render
  steps: number; setSteps: React.Dispatch<React.SetStateAction<number>>;
  density: number; setDensity: React.Dispatch<React.SetStateAction<number>>;
  thresh: number; setThresh: React.Dispatch<React.SetStateAction<number>>;
  slab: number; setSlab: React.Dispatch<React.SetStateAction<number>>;
  slabDepth: boolean; setSlabDepth: React.Dispatch<React.SetStateAction<boolean>>;
  zoom: number; setZoom: React.Dispatch<React.SetStateAction<number>>;
  palette: PaletteId; setPalette: React.Dispatch<React.SetStateAction<PaletteId>>;
  bloom: boolean; setBloom: React.Dispatch<React.SetStateAction<boolean>>;
  bloomStr: number; setBloomStr: React.Dispatch<React.SetStateAction<number>>;
  brightness: number; setBrightness: React.Dispatch<React.SetStateAction<number>>;

  // interaction
  mode: InteractionMode; setMode: React.Dispatch<React.SetStateAction<InteractionMode>>;
  brushSize: number; setBrushSize: React.Dispatch<React.SetStateAction<number>>;
  recenter: () => void;

  fps: number;
  mass: number;
  occupancy: number; // fraction of cells above 0.02

  handlePointerDown: (e: CanvasInputEvent) => void;
  handlePointerMove: (e: CanvasInputEvent) => void;
  handlePointerUp: (e: CanvasInputEvent) => void;
  handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
};

export function useLeniaHyper(initialPreset: PresetId = "genesis"): UseLeniaHyperApi {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const gpuRef = useRef<GPU | null>(null);
  const animRef = useRef<number | null>(null);
  const paramsRef = useRef<Params | null>(null);

  const angRef = useRef<Angles6>({ ...ZERO_ANGLES }); // live accumulated angles
  const pointerRef = useRef<{
    down: boolean;
    erase: boolean;
    sx: number;
    sy: number;
    lastX: number;
    lastY: number;
  }>({ down: false, erase: false, sx: 0, sy: 0, lastX: 0, lastY: 0 });
  const swapRef = useRef(0);
  const timeRef = useRef(0);
  const frameRef = useRef(0);
  const modeRef = useRef<InteractionMode>("rotate");

  const p0 = PRESETS[initialPreset];

  const [running, setRunning] = useState(true);
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [seed, setSeed] = useState<SeedId>(p0.seed);
  const [L, setL] = useState<Resolution>(DEFAULT_L);
  const [R, setR] = useState<number>(p0.R ?? DEFAULT_R);
  const [profile, setProfile] = useState<KernelProfileId>(p0.profile);

  const [mu, setMu] = useState(p0.mu);
  const [sigma, setSigma] = useState(p0.sigma);
  const [dt, setDt] = useState(p0.dt);
  const [spf, setSpf] = useState(1);

  const [speeds, setSpeeds] = useState<Angles6>({
    xy: 0, xz: 0, yz: 0, xw: 0.06, yw: 0.09, zw: 0.04,
  });

  const [steps, setSteps] = useState(80);
  const [density, setDensity] = useState(1.4);
  const [thresh, setThresh] = useState(0.12);
  const [slab, setSlab] = useState(0.04);
  const [slabDepth, setSlabDepth] = useState(true);
  const [zoom, setZoom] = useState(1.05);
  const [palette, setPalette] = useState<PaletteId>("lantern");
  const [bloom, setBloom] = useState(true);
  const [bloomStr, setBloomStr] = useState(0.6);
  const [brightness, setBrightness] = useState(1.0);

  const [mode, setMode] = useState<InteractionMode>("rotate");
  const [brushSize, setBrushSize] = useState(6);

  const [fps, setFps] = useState(0);
  const [mass, setMass] = useState(0);
  const [occupancy, setOccupancy] = useState(0);
  const [glError, setGlError] = useState<string | null>(null);

  const setSpeed = useCallback((plane: PlaneKey, v: number) => {
    setSpeeds((s) => ({ ...s, [plane]: v }));
  }, []);

  const recenter = useCallback(() => {
    angRef.current = { ...ZERO_ANGLES };
  }, []);

  paramsRef.current = {
    spf, mu, sigma, dt, steps, density, thresh, slab,
    slabSamples: slabDepth ? 3 : 1,
    zoom, palette: PALETTE_INDEX[palette],
    bloom, bloomStr, brightness, brushSize,
    speeds,
  };

  // ── Full (re)initialization on L change ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = DISP;
    canvas.height = DISP;

    const gl = canvas.getContext("webgl2", {
      antialias: false, alpha: false, preserveDrawingBuffer: false,
    });
    if (!gl) { setGlError("WebGL2 not supported on this device."); return; }
    if (!gl.getExtension("EXT_color_buffer_float")) {
      setGlError("Float render targets (EXT_color_buffer_float) unavailable.");
      return;
    }
    gl.getExtension("OES_texture_float_linear");
    glRef.current = gl;
    setGlError(null);

    const AW = L * L;

    // programs — sim + display are dimension/atlas specialized at compile time
    const kernel0 = buildHyperKernel(R, KERNEL_PROFILES[profile]);
    const simProg = makeProgram(gl, VERT_SRC, makeSimFrag(L, kernel0.tapCount));
    const dispProg = makeProgram(gl, VERT_SRC, makeDisplayFrag(L));
    const reduceProg = makeProgram(gl, VERT_SRC, REDUCE_FRAG_SRC);
    const bloomProg = makeProgram(gl, VERT_SRC, BLOOM_FRAG_SRC);
    const compProg = makeProgram(gl, VERT_SRC, COMP_FRAG_SRC);
    if (!simProg || !dispProg || !reduceProg || !bloomProg || !compProg) {
      setGlError("Shader compilation failed (see console).");
      return;
    }

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) { setGlError("VAO/VBO allocation failed."); return; }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const prog of [simProg, dispProg, reduceProg, bloomProg, compProg]) {
      const loc = gl.getAttribLocation(prog.program, "a_pos");
      if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); }
    }

    const F = gl.RGBA32F, RF = gl.RGBA, FL = gl.FLOAT;

    const stateTex0 = makeTex(gl, AW, AW, F, RF, FL, gl.NEAREST, null);
    const stateTex1 = makeTex(gl, AW, AW, F, RF, FL, gl.NEAREST, null);
    const stateFB0 = stateTex0 ? makeFB(gl, stateTex0) : null;
    const stateFB1 = stateTex1 ? makeFB(gl, stateTex1) : null;

    const tapOff = makeTex(gl, kernel0.tapCount, 1, F, RF, FL, gl.NEAREST, null);
    const tapW = makeTex(gl, kernel0.tapCount, 1, F, RF, FL, gl.NEAREST, null);

    const dispTex = makeTex(gl, DISP, DISP, gl.RGBA16F, RF, gl.HALF_FLOAT, gl.LINEAR, null);
    const dispFB = dispTex ? makeFB(gl, dispTex) : null;
    const bN = Math.floor(DISP / BLOOM_SCALE);
    const bloomTex0 = makeTex(gl, bN, bN, gl.RGBA16F, RF, gl.HALF_FLOAT, gl.LINEAR, null);
    const bloomTex1 = makeTex(gl, bN, bN, gl.RGBA16F, RF, gl.HALF_FLOAT, gl.LINEAR, null);
    const bloomFB0 = bloomTex0 ? makeFB(gl, bloomTex0) : null;
    const bloomFB1 = bloomTex1 ? makeFB(gl, bloomTex1) : null;

    const redSide = Math.max(1, Math.ceil(AW / 2));
    const redTex0 = makeTex(gl, redSide, redSide, F, RF, FL, gl.NEAREST, null);
    const redTex1 = makeTex(gl, redSide, redSide, F, RF, FL, gl.NEAREST, null);
    const redFB0 = redTex0 ? makeFB(gl, redTex0) : null;
    const redFB1 = redTex1 ? makeFB(gl, redTex1) : null;

    if (
      !stateTex0 || !stateTex1 || !stateFB0 || !stateFB1 ||
      !tapOff || !tapW || !dispTex || !dispFB ||
      !bloomTex0 || !bloomTex1 || !bloomFB0 || !bloomFB1 ||
      !redTex0 || !redTex1 || !redFB0 || !redFB1
    ) {
      setGlError("GPU resource allocation failed.");
      return;
    }

    // upload taps
    gl.bindTexture(gl.TEXTURE_2D, tapOff);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, kernel0.tapCount, 1, RF, FL, kernel0.offsets);
    gl.bindTexture(gl.TEXTURE_2D, tapW);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, kernel0.tapCount, 1, RF, FL, kernel0.weights);

    // upload initial state
    const init = buildSeed(seed, L);
    gl.bindTexture(gl.TEXTURE_2D, stateTex0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AW, AW, RF, FL, init);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gpuRef.current = {
      simProg, dispProg, reduceProg, bloomProg, compProg, vao, vbo,
      stateTex: [stateTex0, stateTex1], stateFB: [stateFB0, stateFB1],
      tapOff, tapW, tapCount: kernel0.tapCount,
      dispTex, dispFB, bloomTex: [bloomTex0, bloomTex1], bloomFB: [bloomFB0, bloomFB1],
      redTex: [redTex0, redTex1], redFB: [redFB0, redFB1],
      bN, AW, L,
    };
    swapRef.current = 0;
    timeRef.current = 0;
    frameRef.current = 0;

    return () => {
      [stateTex0, stateTex1, tapOff, tapW, dispTex, bloomTex0, bloomTex1, redTex0, redTex1]
        .forEach((t) => gl.deleteTexture(t));
      [stateFB0, stateFB1, dispFB, bloomFB0, bloomFB1, redFB0, redFB1]
        .forEach((f) => gl.deleteFramebuffer(f));
      [simProg, dispProg, reduceProg, bloomProg, compProg].forEach((pr) => gl.deleteProgram(pr.program));
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gpuRef.current = null;
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // ── Rebuild kernel (tap textures + SIM recompile) on R / profile change ──
  useEffect(() => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    const k = buildHyperKernel(R, KERNEL_PROFILES[profile]);

    if (k.tapCount !== gpu.tapCount) {
      // tap count is a compile-time loop bound → recompile SIM + realloc taps
      const simProg = makeProgram(gl, VERT_SRC, makeSimFrag(gpu.L, k.tapCount));
      if (!simProg) { setGlError("SIM recompile failed."); return; }
      // Configure the new program's a_pos into the shared VAO. Bind the VAO
      // and VBO first so the pointer state is recorded on the right object.
      gl.bindVertexArray(gpu.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gpu.vbo);
      const loc = gl.getAttribLocation(simProg.program, "a_pos");
      if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); }
      gl.deleteProgram(gpu.simProg.program);
      gpu.simProg = simProg;

      gl.deleteTexture(gpu.tapOff);
      gl.deleteTexture(gpu.tapW);
      const F = gl.RGBA32F, RF = gl.RGBA, FL = gl.FLOAT;
      const tapOff = makeTex(gl, k.tapCount, 1, F, RF, FL, gl.NEAREST, null);
      const tapW = makeTex(gl, k.tapCount, 1, F, RF, FL, gl.NEAREST, null);
      if (!tapOff || !tapW) { setGlError("Tap texture realloc failed."); return; }
      gpu.tapOff = tapOff; gpu.tapW = tapW; gpu.tapCount = k.tapCount;
    }

    const RF = gl.RGBA, FL = gl.FLOAT;
    gl.bindTexture(gl.TEXTURE_2D, gpu.tapOff);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, k.tapCount, 1, RF, FL, k.offsets);
    gl.bindTexture(gl.TEXTURE_2D, gpu.tapW);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, k.tapCount, 1, RF, FL, k.weights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, profile]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const reseed = useCallback((id: SeedId) => {
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (!gl || !gpu) return;
    const data = buildSeed(id, gpu.L);
    gl.bindTexture(gl.TEXTURE_2D, gpu.stateTex[swapRef.current]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gpu.AW, gpu.AW, gl.RGBA, gl.FLOAT, data);
    setSeed(id);
    timeRef.current = 0;
    frameRef.current = 0;
  }, []);

  const loadPreset = useCallback((id: PresetId) => {
    const pr = PRESETS[id];
    setPreset(id);
    setMu(pr.mu); setSigma(pr.sigma); setDt(pr.dt); setR(pr.R);
    setProfile(pr.profile);
    setSeed(pr.seed);
    angRef.current = { ...ZERO_ANGLES };
    // reseed after state setters flush
    const gl = glRef.current;
    const gpu = gpuRef.current;
    if (gl && gpu) {
      const data = buildSeed(pr.seed, gpu.L);
      gl.bindTexture(gl.TEXTURE_2D, gpu.stateTex[swapRef.current]);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gpu.AW, gpu.AW, gl.RGBA, gl.FLOAT, data);
      timeRef.current = 0;
      frameRef.current = 0;
    }
  }, []);

  // ── Pointer handling: drag = rotate (through the 4th axis) or paint ───────
  const readPointer = (e: CanvasInputEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: 1.0 - (e.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = useCallback((e: CanvasInputEvent) => {
    const { x, y } = readPointer(e);
    pointerRef.current = {
      down: true,
      erase: e.button === 2 || e.shiftKey,
      sx: x * 2 - 1,
      sy: y * 2 - 1,
      lastX: x,
      lastY: y,
    };
  }, []);

  const handlePointerMove = useCallback((e: CanvasInputEvent) => {
    const pt = pointerRef.current;
    if (!pt.down) return;
    const { x, y } = readPointer(e);
    if (modeRef.current === "rotate") {
      // horizontal drag → YW plane, vertical drag → XW plane: both sweep the
      // hidden fourth axis through the visible slice.
      const k = 3.2;
      angRef.current.yw += (x - pt.lastX) * k;
      angRef.current.xw += (y - pt.lastY) * k;
    }
    pt.sx = x * 2 - 1;
    pt.sy = y * 2 - 1;
    pt.lastX = x;
    pt.lastY = y;
  }, []);

  const handlePointerUp = useCallback((_e: CanvasInputEvent) => {
    pointerRef.current.down = false;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // keep a ref of mode for the pointer-move closure
  modeRef.current = mode;

  // ── Animation loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    let active = true;
    let lastT = performance.now();
    let fpsAcc = 0, fpsF = 0;

    const loop = (now: number) => {
      if (!active) return;
      const gl = glRef.current;
      const gpu = gpuRef.current;
      const p = paramsRef.current;
      if (!gl || !gpu || !p) { animRef.current = requestAnimationFrame(loop); return; }

      const {
        simProg, dispProg, reduceProg, bloomProg, compProg, vao,
        stateTex, stateFB, tapOff, tapW, dispTex, dispFB, bloomTex, bloomFB,
        redTex, redFB, bN, AW, L: Lc,
      } = gpu;

      gl.bindVertexArray(vao);
      timeRef.current += 0.016;
      const t = timeRef.current;

      // 1. advance rotation angles
      const a = angRef.current;
      a.xy += p.speeds.xy * 0.016; a.xz += p.speeds.xz * 0.016; a.yz += p.speeds.yz * 0.016;
      a.xw += p.speeds.xw * 0.016; a.yw += p.speeds.yw * 0.016; a.zw += p.speeds.zw * 0.016;

      // brush target (only meaningful in paint mode while dragging)
      const pt = pointerRef.current;
      const painting = pt.down && modeRef.current === "paint";
      let bc: [number, number, number, number] = [0, 0, 0, 0];
      if (painting) bc = screenToCell(a, pt.sx, pt.sy, Lc);

      // 2. simulation passes
      for (let s = 0; s < p.spf; s++) {
        const cur = swapRef.current, nxt = 1 - cur;
        gl.useProgram(simProg.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, stateTex[cur]);
        gl.uniform1i(simProg.u["u_state"], 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tapOff);
        gl.uniform1i(simProg.u["u_tapOff"], 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, tapW);
        gl.uniform1i(simProg.u["u_tapW"], 2);
        gl.uniform1f(simProg.u["u_mu"], p.mu);
        gl.uniform1f(simProg.u["u_sigma"], p.sigma);
        gl.uniform1f(simProg.u["u_dt"], p.dt);
        gl.uniform1f(simProg.u["u_brushActive"], painting ? 1.0 : 0.0);
        gl.uniform1f(simProg.u["u_brushErase"], pt.erase ? 1.0 : 0.0);
        gl.uniform1f(simProg.u["u_brushSize"], p.brushSize);
        gl.uniform4f(simProg.u["u_brushCell"], bc[0], bc[1], bc[2], bc[3]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFB[nxt]);
        gl.viewport(0, 0, AW, AW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        swapRef.current = nxt;
      }
      const cur = swapRef.current;

      // 3. display (raymarch the rotated 3-slice)
      gl.useProgram(dispProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, stateTex[cur]);
      gl.uniform1i(dispProg.u["u_state"], 0);
      gl.uniform1f(dispProg.u["u_axy"], a.xy);
      gl.uniform1f(dispProg.u["u_axz"], a.xz);
      gl.uniform1f(dispProg.u["u_axw"], a.xw);
      gl.uniform1f(dispProg.u["u_ayz"], a.yz);
      gl.uniform1f(dispProg.u["u_ayw"], a.yw);
      gl.uniform1f(dispProg.u["u_azw"], a.zw);
      gl.uniform1f(dispProg.u["u_slab"], p.slab);
      gl.uniform1i(dispProg.u["u_slabSamples"], p.slabSamples);
      gl.uniform1f(dispProg.u["u_density"], p.density);
      gl.uniform1f(dispProg.u["u_thresh"], p.thresh);
      gl.uniform1i(dispProg.u["u_steps"], p.steps);
      gl.uniform1i(dispProg.u["u_palette"], p.palette);
      gl.uniform1f(dispProg.u["u_time"], t);
      gl.uniform1f(dispProg.u["u_zoom"], p.zoom);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dispFB);
      gl.viewport(0, 0, DISP, DISP);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 4. bloom
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

      // 5. composite
      gl.useProgram(compProg.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dispTex);
      gl.uniform1i(compProg.u["u_display"], 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, p.bloom ? bloomTex[1] : dispTex);
      gl.uniform1i(compProg.u["u_bloom"], 1);
      gl.uniform1f(compProg.u["u_bloomStr"], p.bloom ? p.bloomStr : 0);
      gl.uniform1f(compProg.u["u_brightness"], p.brightness);
      gl.uniform1f(compProg.u["u_vignette"], 0.42);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, DISP, DISP);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 6. telemetry (mass + occupancy) via GPU reduction, throttled
      frameRef.current++;
      fpsF++;
      fpsAcc += now - lastT;
      lastT = now;
      if (fpsF >= 15) {
        setFps(Math.round(1000 / (fpsAcc / fpsF)));
        fpsF = 0; fpsAcc = 0;
        const tel = reduceTelemetry(gl, gpu, reduceProg, stateTex[cur], redTex, redFB, AW);
        setMass(Math.round(tel.mass));
        setOccupancy(tel.occ / (Lc * Lc * Lc * Lc));
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
    canvasRef, glError,
    running, setRunning,
    preset, loadPreset, seed, reseed,
    L, setL, R, setR, profile, setProfile,
    mu, setMu, sigma, setSigma, dt, setDt, spf, setSpf,
    speeds, setSpeed,
    steps, setSteps, density, setDensity, thresh, setThresh,
    slab, setSlab, slabDepth, setSlabDepth, zoom, setZoom,
    palette, setPalette, bloom, setBloom, bloomStr, setBloomStr,
    brightness, setBrightness,
    mode, setMode, brushSize, setBrushSize, recenter,
    fps, mass, occupancy,
    handlePointerDown, handlePointerMove, handlePointerUp, handleContextMenu,
  };
}

// ── GPU parallel reduction → mass (Σ field) and occupancy (Σ [field>0.02]) ──
function reduceTelemetry(
  gl: WebGL2RenderingContext,
  gpu: GPU,
  reduceProg: Program,
  stateTex: WebGLTexture,
  redTex: [WebGLTexture, WebGLTexture],
  redFB: [WebGLFramebuffer, WebGLFramebuffer],
  AW: number,
): { mass: number; occ: number } {
  gl.useProgram(reduceProg.program);
  gl.activeTexture(gl.TEXTURE0);

  let srcTex = stateTex;
  let srcSize = AW;
  let first = 1.0;
  let ping = 0;

  while (srcSize > 4) {
    const dstSize = Math.ceil(srcSize / 2);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1i(reduceProg.u["u_src"], 0);
    gl.uniform2i(reduceProg.u["u_srcSize"], srcSize, srcSize);
    gl.uniform1f(reduceProg.u["u_first"], first);
    gl.bindFramebuffer(gl.FRAMEBUFFER, redFB[ping]);
    gl.viewport(0, 0, dstSize, dstSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    srcTex = redTex[ping];
    srcSize = dstSize;
    first = 0.0;
    ping = 1 - ping;
  }

  // read back the final ≤4×4 region and sum on the CPU
  const out = new Float32Array(srcSize * srcSize * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, redFB[1 - ping]);
  gl.readPixels(0, 0, srcSize, srcSize, gl.RGBA, gl.FLOAT, out);
  let mass = 0, occ = 0;
  for (let i = 0; i < srcSize * srcSize; i++) { mass += out[i * 4]; occ += out[i * 4 + 1]; }
  return { mass, occ };
}
