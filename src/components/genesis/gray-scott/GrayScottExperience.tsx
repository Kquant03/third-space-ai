"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Gray-Scott · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Client component composing the simulation from simulation.ts with the
//  shared Lantern primitives. Stage layout (canvas + controls sidebar),
//  rAF-driven animation, click-to-seed painting, preset switching.
//
//  Wraps the canvas in a SubstratePlate so the reading-plate treatment
//  puts the substrate behind the sim rather than making it a dashboard.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";

import {
  SubstratePlate,
  SectionEyebrow,
} from "@/components/genesis/SubstrateFrame";
import {
  Stage,
  ControlSection,
  Slider,
  Button,
  PresetRow,
  Toggle,
  StatRow,
  EquationBlock,
  CanvasSurface,
  TelemetryNote,
} from "@/components/genesis/SubstrateControls";

import {
  DU,
  DV,
  PRESETS,
  PRESET_LIST,
  COLOR_MODES,
  type PresetId,
  type ColorMode,
  type Fields,
  createFields,
  stepRD,
  renderFields,
  paintSeed,
} from "./simulation";

// Inlined Lantern tokens — matches page.tsx / SiteChrome.tsx pattern.
const COLOR = {
  ink: "#f4f6fb",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ─── Simulation constants ─────────────────────────────────────────────────
const N = 200;           // integration grid size
const CANVAS = 500;      // rendered pixel size (2.5× upsample)

// ───────────────────────────────────────────────────────────────────────────

export function GrayScottExperience() {
  // ── Canvas + field refs ─────────────────────────────────────────
  // Fields live in a ref (not state) because mutating a Float32Array
  // 200×200 per frame through setState would be catastrophic. The rAF
  // loop reads and mutates directly; React is told about nothing.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldsRef = useRef<Fields | null>(null);
  const rafRef = useRef<number | null>(null);

  // ── UI state ────────────────────────────────────────────────────
  const [running, setRunning] = useState(true);
  const [preset, setPreset] = useState<PresetId>("mitosis");
  const [F, setF] = useState(PRESETS.mitosis.F);
  const [k, setK] = useState(PRESETS.mitosis.k);
  const [speed, setSpeed] = useState(8);
  const [colorMode, setColorMode] = useState<ColorMode>("ghost");
  const [stepCount, setStepCount] = useState(0);
  const [painting, setPainting] = useState(false);

  // ── Reset ───────────────────────────────────────────────────────
  const reset = useCallback(() => {
    fieldsRef.current = createFields(N);
    setStepCount(0);
  }, []);

  // Initialise fields on mount.
  useEffect(() => {
    fieldsRef.current = createFields(N);
  }, []);

  // ── Load preset ─────────────────────────────────────────────────
  const loadPreset = useCallback((id: PresetId) => {
    const p = PRESETS[id];
    setPreset(id);
    setF(p.F);
    setK(p.k);
    fieldsRef.current = createFields(N);
    setStepCount(0);
  }, []);

  // ── Paint seed on click/drag ────────────────────────────────────
  const handleCanvasInteraction = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const fields = fieldsRef.current;
      if (!canvas || !fields) return;
      const rect = canvas.getBoundingClientRect();
      // The canvas is drawn at CANVAS pixels but may be rendered at any
      // CSS size. Map mouse → canvas pixels → grid cells.
      const cssScaleX = CANVAS / rect.width;
      const cssScaleY = CANVAS / rect.height;
      const canvasX = (e.clientX - rect.left) * cssScaleX;
      const canvasY = (e.clientY - rect.top) * cssScaleY;
      const gridScale = N / CANVAS;
      const mx = Math.floor(canvasX * gridScale);
      const my = Math.floor(canvasY * gridScale);
      paintSeed(fields, N, mx, my);
    },
    [],
  );

  // ── Animation loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    let active = true;
    const loop = () => {
      if (!active) return;
      const fields = fieldsRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (fields && ctx) {
        stepRD(fields, N, F, k, speed);
        renderFields(ctx, fields, N, CANVAS, colorMode);
        setStepCount((s) => s + speed);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, F, k, speed, colorMode]);

  // ── Render a single frame when paused (so color-mode / F / k
  //    changes are visible immediately without having to play). ────
  useEffect(() => {
    if (running) return;
    const fields = fieldsRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (fields && ctx) renderFields(ctx, fields, N, CANVAS, colorMode);
  }, [running, colorMode]);

  // ───────────────────────────────────────────────────────────────
  //  Render
  // ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Hero pullquote ─────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(28px, 3.8vw, 44px)",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: COLOR.ink,
            maxWidth: "32ch",
          }}
        >
          Two partial differential equations.{" "}
          <span style={{ color: COLOR.inkMuted }}>
            Eight classifications. One pattern-forming substrate.
          </span>
        </div>
        <p
          style={{
            marginTop: 24,
            maxWidth: "60ch",
            fontFamily: FONT.body,
            fontSize: 16.5,
            lineHeight: 1.7,
            color: COLOR.inkBody,
          }}
        >
          The Gray-Scott reaction-diffusion system models a catalytic
          reaction where substrate <em>u</em> feeds at rate <em>F</em>, and
          catalyst <em>v</em> is removed at rate <em>k</em>. Pearson
          (1993) showed that small changes in these two parameters produce
          radically different steady-state morphologies — mitosis,
          solitons, coral, worms. Each a phase of the same substrate.
        </p>
        <div
          style={{
            marginTop: 28,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          Pearson, J. E. (1993). Science 261(5118), 189–192.
        </div>
      </SubstratePlate>

      {/* ── Stage ──────────────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <Stage
          controlsWidth={340}
          canvas={
            <div>
              <CanvasSurface aspectRatio="1 / 1">
                <canvas
                  ref={canvasRef}
                  width={CANVAS}
                  height={CANVAS}
                  onMouseDown={(e) => {
                    setPainting(true);
                    handleCanvasInteraction(e);
                  }}
                  onMouseMove={(e) => {
                    if (painting) handleCanvasInteraction(e);
                  }}
                  onMouseUp={() => setPainting(false)}
                  onMouseLeave={() => setPainting(false)}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    imageRendering: "pixelated",
                    cursor: "crosshair",
                  }}
                />
              </CanvasSurface>
              <TelemetryNote>
                {N}² grid · {PRESETS[preset].name.toLowerCase()} · step{" "}
                {stepCount.toLocaleString()} · click or drag on the field to
                seed
              </TelemetryNote>
            </div>
          }
          controls={
            <div>
              <ControlSection title="Pearson classification">
                <PresetRow<PresetId>
                  items={PRESET_LIST.map((p) => ({ id: p.id, label: p.name }))}
                  active={preset}
                  onSelect={loadPreset}
                />
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: COLOR.inkMuted,
                    marginTop: 4,
                  }}
                >
                  {PRESETS[preset].desc}
                </div>
              </ControlSection>

              <ControlSection title="parameters">
                <Slider
                  label="feed rate · F"
                  value={F}
                  min={0.01}
                  max={0.1}
                  step={0.0001}
                  onChange={setF}
                  format={(v) => v.toFixed(4)}
                />
                <Slider
                  label="kill rate · k"
                  value={k}
                  min={0.04}
                  max={0.07}
                  step={0.0001}
                  onChange={setK}
                  format={(v) => v.toFixed(4)}
                />
                <Slider
                  label="integration speed"
                  value={speed}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(v) => setSpeed(Math.round(v))}
                  format={(v) => `${Math.round(v)}×`}
                />
              </ControlSection>

              <ControlSection title="color mode">
                <Toggle<ColorMode>
                  options={COLOR_MODES}
                  active={colorMode}
                  onSelect={setColorMode}
                />
              </ControlSection>

              <ControlSection title="playback" compact>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="primary"
                    active={running}
                    onClick={() => setRunning(!running)}
                  >
                    {running ? "pause" : "run"}
                  </Button>
                  <Button onClick={reset}>reset</Button>
                </div>
              </ControlSection>

              <div>
                <SectionEyebrow>derived, not chosen</SectionEyebrow>
                <div style={{ marginTop: 12 }}>
                  <StatRow label="D_u · u-diffusion" value={DU.toFixed(4)} />
                  <StatRow label="D_v · v-diffusion" value={DV.toFixed(4)} />
                  <StatRow
                    label="ratio D_u / D_v"
                    value={(DU / DV).toFixed(2)}
                    hint="Turing condition requires > 1"
                  />
                </div>
              </div>

              <EquationBlock
                title="Gray-Scott equations"
                note={
                  <>
                    F controls the feed rate of the <em>u</em> substrate.
                    <br />k controls the removal rate of the <em>v</em>{" "}
                    catalyst.
                  </>
                }
              >
                ∂u/∂t = D_u ∇²u − uv² + F(1−u)
                <br />
                ∂v/∂t = D_v ∇²v + uv² − (F+k)v
              </EquationBlock>
            </div>
          }
        />
      </SubstratePlate>

      {/* ── Reading note ───────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "56rem",
          margin: "0 auto 64px",
          fontFamily: FONT.body,
          fontSize: 15.5,
          lineHeight: 1.72,
          color: COLOR.inkBody,
        }}
      >
        <SectionEyebrow>on reading the patterns</SectionEyebrow>
        <p style={{ marginTop: 16 }}>
          The eight preset classes are not a complete taxonomy — they are{" "}
          <em>landmarks</em> in a continuous two-dimensional parameter space.
          Drag <em>F</em> and <em>k</em> through small increments and the
          field morphology glides between them; drag past certain thresholds
          and the pattern destabilises into a new class entirely. The
          boundaries between classes are themselves a phase diagram.
        </p>
        <p>
          This is the shape of the argument the paper makes about
          homeostatic minds: architectures in a continuous configuration
          space, with regions of stable pattern formation separated by
          destabilising boundaries. Finding the right region is not a matter
          of solving an optimisation problem — it is a matter of landing
          somewhere the field can sustain itself.
        </p>
      </div>
    </>
  );
}
