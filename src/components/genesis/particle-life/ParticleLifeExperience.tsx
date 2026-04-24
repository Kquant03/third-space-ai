"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Particle Life · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Client component composing the Particle Life simulation with Lantern
//  primitives. Single-canvas stage, sidebar with matrix display (the
//  matrix IS the argument — readers should see it), three parameter
//  sliders, matrix-preset picker, playback controls, trails toggle.
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
  CanvasSurface,
  TelemetryNote,
} from "@/components/genesis/SubstrateControls";

import {
  MATRIX_PRESETS,
  MATRIX_PRESET_LIST,
  TYPE_COLORS,
  type MatrixPresetId,
  type Particles,
  initParticles,
  stepParticleLife,
  renderParticles,
} from "./simulation";

const COLOR = {
  void: "#010106",
  voidSoft: "#0a0f1a",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
  sanguine: "#9a2b2b",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ─── Simulation constants ─────────────────────────────────────────────────
const CANVAS_W = 540;
const CANVAS_H = 540;
const N_PARTICLES = 600;
const NUM_TYPES = 4;

// ───────────────────────────────────────────────────────────────────────────

export function ParticleLifeExperience() {
  // ── Refs (non-reactive sim state) ───────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particles | null>(null);
  const matrixRef = useRef<number[][]>(MATRIX_PRESETS.random.gen(NUM_TYPES));
  const animRef = useRef<number | null>(null);

  // ── UI state ────────────────────────────────────────────────────
  const [running, setRunning] = useState(true);
  const [rMax, setRMax] = useState(80);
  const [friction, setFriction] = useState(0.5);
  const [beta, setBeta] = useState(0.3);
  const [matrixPresetId, setMatrixPresetId] = useState<MatrixPresetId>("random");
  // Matrix also in state so the display updates when we regenerate.
  const [matrix, setMatrix] = useState<number[][]>(matrixRef.current);
  const [showTrails, setShowTrails] = useState(true);
  const [frameCount, setFrameCount] = useState(0);

  // ── Reset ───────────────────────────────────────────────────────
  const reset = useCallback(() => {
    particlesRef.current = initParticles(
      N_PARTICLES,
      NUM_TYPES,
      CANVAS_W,
      CANVAS_H,
    );
    setFrameCount(0);
  }, []);

  const loadPreset = useCallback(
    (id: MatrixPresetId) => {
      const m = MATRIX_PRESETS[id].gen(NUM_TYPES);
      matrixRef.current = m;
      setMatrix(m.map((row) => [...row]));
      setMatrixPresetId(id);
      reset();
    },
    [reset],
  );

  // Roll a new random matrix without changing other params.
  const reroll = useCallback(() => {
    if (matrixPresetId === "random") {
      const m = MATRIX_PRESETS.random.gen(NUM_TYPES);
      matrixRef.current = m;
      setMatrix(m.map((row) => [...row]));
    } else {
      loadPreset(matrixPresetId);
    }
    reset();
  }, [matrixPresetId, loadPreset, reset]);

  // Initialise on mount.
  useEffect(() => {
    reset();
  }, [reset]);

  // ── Animation loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    let active = true;
    const loop = () => {
      if (!active) return;
      const particles = particlesRef.current;
      const canvas = canvasRef.current;
      if (particles && canvas) {
        stepParticleLife(
          particles,
          matrixRef.current,
          CANVAS_W,
          CANVAS_H,
          rMax,
          friction,
          beta,
        );
        const ctx = canvas.getContext("2d");
        if (ctx) {
          renderParticles(ctx, particles, CANVAS_W, CANVAS_H, showTrails);
        }
        setFrameCount((f) => f + 1);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [running, rMax, friction, beta, showTrails]);

  // Render a single frame when params change while paused.
  useEffect(() => {
    if (running) return;
    const particles = particlesRef.current;
    const canvas = canvasRef.current;
    if (!particles || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) renderParticles(ctx, particles, CANVAS_W, CANVAS_H, showTrails);
  }, [running, showTrails]);

  const activePreset = MATRIX_PRESETS[matrixPresetId];

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
          Sixteen numbers.{" "}
          <span style={{ color: COLOR.inkMuted }}>
            Predation. Symbiosis. Membranes. Nothing agent-like, and yet
            everything agent-like.
          </span>
        </div>
        <p
          style={{
            marginTop: 24,
            maxWidth: "62ch",
            fontFamily: FONT.body,
            fontSize: 16.5,
            lineHeight: 1.7,
            color: COLOR.inkBody,
          }}
        >
          Each particle has a type. Each type pair has a force coefficient
          in the 4×4 matrix on the left — negative is repulsion, positive
          is attraction, and the matrix is allowed to be asymmetric. That
          asymmetry is everything. Newton&apos;s third law is absent by
          design; what emerges is chased, chased, and chased.
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
          Ahmad (2022) · Mohr (2020) · {N_PARTICLES} particles · {NUM_TYPES}{" "}
          types
        </div>
      </SubstratePlate>

      {/* ── Stage ──────────────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <Stage
          controlsWidth={320}
          canvas={
            <div>
              <CanvasSurface aspectRatio="1 / 1">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                  }}
                />
              </CanvasSurface>
              <TelemetryNote>
                {N_PARTICLES} particles · {NUM_TYPES} types · frame{" "}
                {frameCount.toLocaleString()} · toroidal boundaries ·{" "}
                {activePreset.name.toLowerCase()}
              </TelemetryNote>
            </div>
          }
          controls={
            <div>
              <ControlSection title="matrix preset">
                <PresetRow<MatrixPresetId>
                  items={MATRIX_PRESET_LIST.map((p) => ({
                    id: p.id,
                    label: p.name,
                  }))}
                  active={matrixPresetId}
                  onSelect={loadPreset}
                />
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: COLOR.inkMuted,
                    marginTop: 4,
                  }}
                >
                  {activePreset.description}
                </div>
              </ControlSection>

              <ControlSection title="interaction matrix · M[i][j]">
                <MatrixDisplay matrix={matrix} />
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: COLOR.inkFaint,
                  }}
                >
                  Rows act on columns. Each cell M[i][j] is the force that
                  type <em>j</em> exerts on type <em>i</em>. Diagonal = self-
                  interaction. The matrix need not be symmetric.
                </div>
              </ControlSection>

              <ControlSection title="parameters">
                <Slider
                  label="interaction range · r_max"
                  value={rMax}
                  min={30}
                  max={150}
                  step={5}
                  onChange={(v) => setRMax(Math.round(v))}
                  format={(v) => `${Math.round(v)} px`}
                />
                <Slider
                  label="friction · μ"
                  value={friction}
                  min={0.1}
                  max={0.95}
                  step={0.05}
                  onChange={setFriction}
                  format={(v) => v.toFixed(2)}
                />
                <Slider
                  label="repulsion fraction · β"
                  value={beta}
                  min={0.05}
                  max={0.6}
                  step={0.05}
                  onChange={setBeta}
                  format={(v) => v.toFixed(2)}
                  hint="Below β·r_max, all pairs repel. Above, M[i][j] governs."
                />
              </ControlSection>

              <ControlSection title="playback" compact>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Button
                    variant="primary"
                    active={running}
                    onClick={() => setRunning(!running)}
                    fullWidth
                  >
                    {running ? "pause" : "run"}
                  </Button>
                  <Button onClick={reset} fullWidth>
                    reset
                  </Button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={reroll} fullWidth>
                    new matrix
                  </Button>
                  <Button
                    onClick={() => setShowTrails(!showTrails)}
                    active={showTrails}
                    fullWidth
                  >
                    {showTrails ? "trails · on" : "trails · off"}
                  </Button>
                </div>
              </ControlSection>
            </div>
          }
        />
      </SubstratePlate>

      {/* ── Reading note ──────────────────────────────────────── */}
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
        <SectionEyebrow>on the absence of Newton&apos;s third law</SectionEyebrow>
        <p style={{ marginTop: 16 }}>
          In Newtonian physics, every force comes in a pair: if A attracts
          B, B attracts A with equal magnitude. Momentum is conserved.
          Closed systems do not spontaneously accelerate.
        </p>
        <p>
          The matrix here is not required to be symmetric. M[A][B] = +0.5
          and M[B][A] = -0.5 is allowed — A is drawn toward B while B flees
          from A. What this produces is not unphysical noise. It is{" "}
          <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
            predation
          </em>
          , formally identical to a food chain. No species-level cognition,
          no goals, no representations — just sixteen numbers and a
          quadratic-time force kernel. And yet what emerges reads
          unambiguously as{" "}
          <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
            ecology
          </em>
          .
        </p>
        <p>
          That disjunction — between what the system <em>is</em> at the
          code level and what it <em>looks like</em> at the screen level —
          is the same gap that appears when we look at a brain and call it
          a mind. The question of when pattern becomes agent is not a
          question about adding ingredients. It is a question about how far
          emergence goes before the vocabulary has to change.
        </p>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MatrixDisplay — the visual table of coefficients
//  ─────────────────────────────────────────────────────────────────────────
//  The matrix is load-bearing — readers need to SEE it. Rows and columns
//  are labelled by coloured dots matching the particle types. Positive
//  values show ghost-cyan, negative show sanguine, near-zero show ink-muted.
// ═══════════════════════════════════════════════════════════════════════════

function MatrixDisplay({ matrix }: { matrix: number[][] }) {
  const numTypes = matrix.length;
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(10, 15, 26, 0.4)",
        border: `1px solid ${COLOR.inkGhost}`,
        borderRadius: 2,
      }}
    >
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontFamily: FONT.mono,
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: 20 }} />
            {TYPE_COLORS.slice(0, numTypes).map((c, j) => (
              <td
                key={j}
                style={{ textAlign: "center", padding: "4px 2px" }}
              >
                <TypeDot color={c} />
              </td>
            ))}
          </tr>
          {matrix.slice(0, numTypes).map((row, i) => (
            <tr key={i}>
              <td style={{ padding: "4px 2px" }}>
                <TypeDot color={TYPE_COLORS[i]} />
              </td>
              {row.slice(0, numTypes).map((v, j) => {
                const accent =
                  v > 0.05
                    ? COLOR.ghost
                    : v < -0.05
                      ? COLOR.sanguine
                      : COLOR.inkMuted;
                return (
                  <td
                    key={j}
                    style={{
                      textAlign: "center",
                      padding: "4px 2px",
                      fontSize: 10,
                      color: accent,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {v >= 0 ? "+" : ""}
                    {v.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TypeDot({ color }: { color: readonly [number, number, number] }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
        verticalAlign: "middle",
      }}
    />
  );
}
