"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Three-column lab plate, structurally identical to IsingExperience:
//
//    left     — preset rows (classic + ghost), field params, integration,
//               brush, rendering, playback, telemetry
//    center   — square CanvasSurface with the GPU-rendered substrate, a
//               small palette legend strip, and a preset-description panel
//               (the Lenia analogue of Ising's Onsager reference)
//    right    — observables (mass sparkline, fps, frame count), ghost-mode
//               disclosure (ghost toggle, σ paint, seasonal oscillation),
//               and an equation block with the Lenia rule + Ghost Species
//               extension
//
//  All GPU lifecycle and rAF ownership lives in `useLenia`. This file is
//  composition only — no GL, no math.
//
//  Reading mode toggle (canonical / ghost) at the top of the page is the
//  Lenia analogue of Ising's social-mode toggle: it doesn't change the
//  math, it picks the lens through which the substrate is presented and
//  auto-loads a default preset from the chosen category.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  SubstratePlate,
  SectionEyebrow,
} from "@/components/genesis/SubstrateFrame";
import {
  ControlSection,
  Slider,
  Button,
  Toggle,
  PresetRow,
  EquationBlock,
  CanvasSurface,
  TelemetryNote,
} from "@/components/genesis/SubstrateControls";

import { useLenia } from "./useLenia";
import {
  PRESETS,
  CLASSIC_PRESET_IDS,
  GHOST_PRESET_IDS,
  PALETTES,
  VIEW_MODES,
  type PresetId,
  type ViewMode,
} from "./presets";
import { Sparkline } from "./Sparkline";

// ─── Lantern palette (local copy, matches IsingExperience) ──────────────
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
  lanternGold: "#d4a550",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ─── Mass-history dimensions ────────────────────────────────────────────
const SPARK_W = 268;
const SPARK_H = 46;
const MASS_HISTORY_CAP = 500;

// ─── Reading mode (Lenia analogue of Ising's physics/social toggle) ────
type ReadingMode = "canonical" | "ghost";

// ───────────────────────────────────────────────────────────────────────────

export function LeniaExperience() {
  const api = useLenia("orbium");

  // Reading mode is local; switching it auto-loads a default preset from
  // the chosen category if the current preset doesn't already match.
  const [readingMode, setReadingMode] = useState<ReadingMode>("canonical");

  // Mass history for the right-column sparkline. We sample useLenia's
  // `mass` setter (already throttled to a 15-frame cadence) by watching
  // its value with a useEffect. Cheaper than instrumenting useLenia.
  const [massHistory, setMassHistory] = useState<number[]>([]);
  const lastMassRef = useRef<number>(0);

  useEffect(() => {
    if (api.mass === lastMassRef.current) return;
    lastMassRef.current = api.mass;
    setMassHistory((prev) => {
      const next = prev.length >= MASS_HISTORY_CAP
        ? [...prev.slice(1), api.mass]
        : [...prev, api.mass];
      return next;
    });
  }, [api.mass]);

  // Reading mode → preset category sync. Only nudges when the user flips
  // the toggle; if they pick a specific preset directly we leave them be.
  const handleReadingModeChange = (mode: ReadingMode) => {
    setReadingMode(mode);
    const meta = PRESETS[api.preset];
    const inGhostCategory = !!meta.ghost;
    if (mode === "ghost" && !inGhostCategory) {
      api.loadPreset("ghost_radial");
    } else if (mode === "canonical" && inGhostCategory) {
      api.loadPreset("orbium");
    }
  };

  // Keep reading-mode UI in sync if user picks a preset directly.
  useEffect(() => {
    const isGhost = !!PRESETS[api.preset].ghost;
    setReadingMode((prev) => {
      const desired: ReadingMode = isGhost ? "ghost" : "canonical";
      return prev === desired ? prev : desired;
    });
  }, [api.preset]);

  const meta = PRESETS[api.preset];
  const isGhostPreset = !!meta.ghost;
  const currentPaletteName = PALETTES[api.palette]?.name ?? "Lantern";

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
          A creature made of field —{" "}
          <span style={{ color: COLOR.inkMuted }}>
            continuous space, continuous time, continuous state.
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
          Lenia (Chan, 2018) lifts cellular automata out of the discrete
          grid. The neighbourhood is a smooth bell, the growth rule a smooth
          Gaussian, the state a real number in [0, 1]. At the right (μ, σ)
          the field supports stable travelling creatures — Orbium, Scutium,
          Ignis, a small zoo of solitonic organisms whose morphology is
          what their kernel permits and whose motion is what their growth
          rule drives.{" "}
          {readingMode === "ghost" ? (
            <>
              The Ghost Species variant places Ignis-descendant seeds in a
              σ-landscape that varies across space. They drift across
              regions of kinder and crueler physics, remembering shapes
              they can no longer hold.
            </>
          ) : (
            <>
              Onsager solved the Ising lattice exactly; Lenia has no closed
              form. We watch its solitons live and die.
            </>
          )}
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
          Chan (2018) · Chan &amp; Heiney (2020) ·{" "}
          {readingMode === "ghost"
            ? "Sebastian & Claude (2026)"
            : "Lenia Expanded Universe"}
        </div>
      </SubstratePlate>

      {/* ── Mode toggles bar ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <ToggleGroup<ViewMode>
          label="view"
          options={[
            { id: "state", label: "State" },
            { id: "potential", label: "Potential" },
            { id: "growth", label: "Growth" },
            { id: "composite", label: "Composite" },
          ]}
          active={VIEW_MODES[api.viewMode]}
          onSelect={(id) => api.setViewMode(VIEW_MODES.indexOf(id))}
        />
        <ToggleGroup<ReadingMode>
          label="reading"
          options={[
            { id: "canonical", label: "Canonical" },
            { id: "ghost", label: "Ghost Species" },
          ]}
          active={readingMode}
          onSelect={handleReadingModeChange}
        />
      </div>

      {/* ── Three-column lab layout ───────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        {api.glError && (
          <div
            style={{
              padding: "16px 20px",
              marginBottom: 24,
              background: "rgba(154, 43, 43, 0.08)",
              border: `1px solid ${COLOR.sanguine}40`,
              borderLeft: `2px solid ${COLOR.sanguine}`,
              fontFamily: FONT.body,
              color: COLOR.inkBody,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: COLOR.sanguine,
                marginBottom: 8,
              }}
            >
              Substrate unavailable
            </div>
            {api.glError} Lenia requires WebGL2 with float texture support.
          </div>
        )}

        <div
          className="lenia-lab-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr) 300px",
            gap: "clamp(20px, 2.5vw, 36px)",
            alignItems: "start",
          }}
        >
          {/* ═══ LEFT: parameter controls ═══ */}
          <div>
            <ControlSection title="classic species · Chan (2018)" compact>
              <PresetRow<PresetId>
                items={CLASSIC_PRESET_IDS.map((id) => ({
                  id,
                  label: PRESETS[id].name,
                }))}
                active={api.preset}
                onSelect={api.loadPreset}
              />
            </ControlSection>

            <ControlSection title="ghost species · Sebastian & Claude (2026)" compact>
              <PresetRow<PresetId>
                items={GHOST_PRESET_IDS.map((id) => ({
                  id,
                  label: PRESETS[id].name,
                }))}
                active={api.preset}
                onSelect={api.loadPreset}
              />
            </ControlSection>

            <ControlSection title="field" compact>
              <Slider
                label="μ · growth centre"
                value={api.mu}
                min={0.05}
                max={0.35}
                step={0.001}
                onChange={api.setMu}
                format={(v) => v.toFixed(3)}
                hint="Centre of the Gaussian growth band."
              />
              <Slider
                label="σ · growth width"
                value={api.sigma}
                min={0.003}
                max={0.06}
                step={0.001}
                onChange={api.setSigma}
                format={(v) => v.toFixed(3)}
                hint={
                  isGhostPreset
                    ? "Base width — actual σ varies per cell."
                    : "Tolerance band around μ. Tight → fragile."
                }
              />
              <Slider
                label="R · kernel radius"
                value={api.R}
                min={6}
                max={25}
                step={1}
                onChange={(v) => api.setR(Math.round(v))}
                format={(v) => `${Math.round(v)} cells`}
              />
            </ControlSection>

            <ControlSection title="integration" compact>
              <Slider
                label="dt · timestep"
                value={api.dt}
                min={0.02}
                max={0.15}
                step={0.005}
                onChange={api.setDt}
                format={(v) => v.toFixed(3)}
              />
              <Slider
                label="spf · steps/frame"
                value={api.spf}
                min={1}
                max={8}
                step={1}
                onChange={(v) => api.setSpf(Math.round(v))}
                format={(v) => `${Math.round(v)}×`}
              />
              <Slider
                label="brush · cells"
                value={api.brushSize}
                min={2}
                max={30}
                step={1}
                onChange={(v) => api.setBrushSize(Math.round(v))}
                format={(v) => Math.round(v).toString()}
              />
            </ControlSection>

            <ControlSection title="rendering" compact>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginBottom: 14,
                }}
              >
                {PALETTES.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => api.setPalette(i)}
                    className="genesis-hover-ghost"
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 9,
                      letterSpacing: "0.06em",
                      padding: "5px 9px",
                      border: `1px solid ${
                        api.palette === i
                          ? COLOR.ghost + "80"
                          : COLOR.inkGhost + "60"
                      }`,
                      background:
                        api.palette === i
                          ? "rgba(127, 175, 179, 0.1)"
                          : "transparent",
                      color: api.palette === i ? COLOR.ink : COLOR.inkMuted,
                      cursor: "pointer",
                      borderRadius: 2,
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <Slider
                label="bloom strength"
                value={api.bloomStr}
                min={0}
                max={1}
                step={0.01}
                onChange={api.setBloomStr}
                format={(v) => v.toFixed(2)}
              />
              <Slider
                label="brightness"
                value={api.brightness}
                min={0.3}
                max={2.5}
                step={0.01}
                onChange={api.setBrightness}
                format={(v) => `${v.toFixed(2)}×`}
                hint="Pre-tonemap exposure. Reinhard rolls off highlights."
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Button
                  onClick={() => api.setShowTrails(!api.showTrails)}
                  active={api.showTrails}
                  fullWidth
                >
                  trails
                </Button>
                <Button
                  onClick={() => api.setBloom(!api.bloom)}
                  active={api.bloom}
                  fullWidth
                >
                  bloom
                </Button>
              </div>
            </ControlSection>

            <ControlSection title="playback" compact>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Button
                  variant="primary"
                  active={api.running}
                  onClick={() => api.setRunning(!api.running)}
                  fullWidth
                >
                  {api.running ? "pause" : "run"}
                </Button>
                <Button onClick={api.reset} fullWidth>
                  reset
                </Button>
              </div>
              <Button onClick={api.clear} fullWidth>
                clear
              </Button>
            </ControlSection>

            <TelemetryNote>
              {api.frameCount.toLocaleString()} steps · {api.fps} fps · mass{" "}
              {api.mass.toFixed(0)}
              <br />
              click to add · shift-click to erase
            </TelemetryNote>
          </div>

          {/* ═══ CENTER: canvas ═══ */}
          <div>
            <CanvasSurface aspectRatio="1 / 1">
              <canvas
                ref={api.canvasRef}
                width={560}
                height={560}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  api.handleMouse(e, true);
                }}
                onPointerMove={(e) => api.handleMouse(e, e.buttons > 0)}
                onPointerUp={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  api.handleMouse(e, false);
                }}
                onPointerCancel={(e) => api.handleMouse(e, false)}
                onPointerLeave={(e) => api.handleMouse(e, false)}
                onContextMenu={api.handleContextMenu}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  cursor:
                    api.landscapeBrush && api.ghostMode
                      ? "crosshair"
                      : "default",
                  // Lenia's subject is a continuous field, so we want the
                  // upscale smooth rather than nearest-neighbour pixelated.
                  imageRendering: "auto",
                  touchAction: "none",
                }}
              />
            </CanvasSurface>

            {/* Palette legend strip — analog of Ising's spin-color legend */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 18,
                marginTop: 10,
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.08em",
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: COLOR.inkMuted }}>
                palette:{" "}
                <span style={{ color: PALETTES[api.palette]?.color }}>
                  {currentPaletteName}
                </span>
              </span>
              {isGhostPreset && api.ghostMode && (
                <span style={{ color: COLOR.inkMuted }}>
                  σ-landscape:{" "}
                  <span style={{ color: COLOR.ghost }}>
                    {meta.landscape ?? "uniform"}
                  </span>
                </span>
              )}
              {api.seasonEnabled && api.ghostMode && (
                <span style={{ color: COLOR.inkMuted }}>
                  season φ:{" "}
                  <span style={{ color: COLOR.lanternGold }}>
                    {api.seasonPhase.toFixed(2)}
                  </span>
                </span>
              )}
            </div>

            {/* Preset reference panel — analog of Ising's Onsager block */}
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "rgba(10, 15, 26, 0.4)",
                border: `1px solid ${COLOR.inkGhost}`,
                borderLeft: `2px solid ${
                  isGhostPreset ? COLOR.ghost : COLOR.lanternGold
                }`,
                fontFamily: FONT.body,
                fontSize: 13.5,
                lineHeight: 1.6,
                color: COLOR.inkBody,
              }}
            >
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: isGhostPreset ? COLOR.ghost : COLOR.lanternGold,
                  marginBottom: 6,
                }}
              >
                {meta.name}
                {isGhostPreset && " · phantasma"}
              </div>
              {meta.desc}
            </div>
          </div>

          {/* ═══ RIGHT: observables + ghost controls + theory ═══ */}
          <div>
            <SectionEyebrow>observables</SectionEyebrow>
            <div style={{ marginTop: 16 }}>
              <Sparkline
                data={massHistory}
                width={SPARK_W}
                height={SPARK_H}
                label="total mass · Σ A(x)"
                value={api.mass}
                format={(v) =>
                  v > 9999 ? v.toExponential(2) : v.toFixed(0)
                }
                accent={
                  isGhostPreset ? COLOR.ghost : COLOR.lanternGold
                }
              />
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: COLOR.inkFaint,
                  lineHeight: 1.6,
                  marginTop: -4,
                  marginBottom: 18,
                }}
              >
                {api.frameCount.toLocaleString()} simulation steps
                <br />
                {api.fps} fps · 256² lattice · R = {api.R}
              </div>
            </div>

            {/* Ghost-mode controls — disclosed inline rather than in a
                drawer. Disabled when not in ghost mode so the affordances
                are visible but inert. */}
            <SectionEyebrow>ghost mode</SectionEyebrow>
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              <div
                style={{ display: "flex", gap: 6, marginBottom: 12 }}
              >
                <Button
                  onClick={() => api.setGhostMode(!api.ghostMode)}
                  active={api.ghostMode}
                  variant={api.ghostMode ? "primary" : "default"}
                  fullWidth
                >
                  ghost mode
                </Button>
                <Button
                  onClick={() => api.setLandscapeBrush(!api.landscapeBrush)}
                  active={api.landscapeBrush}
                  disabled={!api.ghostMode}
                  fullWidth
                >
                  {api.landscapeBrush ? "painting σ" : "paint σ"}
                </Button>
              </div>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize: 12.5,
                  fontStyle: "italic",
                  lineHeight: 1.55,
                  color: COLOR.inkFaint,
                  marginBottom: 16,
                }}
              >
                In paint mode, click to raise σ (loosen physics; creatures
                struggle). Shift-click to lower σ (kinder physics; safe
                harbour).
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <Button
                  onClick={() => api.setSeasonEnabled(!api.seasonEnabled)}
                  active={api.seasonEnabled}
                  disabled={!api.ghostMode}
                  fullWidth
                >
                  seasonal oscillation
                </Button>
              </div>
              <Slider
                label="season speed"
                value={api.seasonSpeed}
                min={0.02}
                max={1.0}
                step={0.01}
                onChange={api.setSeasonSpeed}
                format={(v) => v.toFixed(2)}
              />
              <Slider
                label="season amplitude"
                value={api.seasonAmp}
                min={0.05}
                max={0.5}
                step={0.01}
                onChange={api.setSeasonAmp}
                format={(v) => v.toFixed(2)}
              />
            </div>

            {/* Theory panel — analog of Ising's EquationBlock */}
            {readingMode === "ghost" ? (
              <EquationBlock
                title="ghost species rule"
                note={
                  <>
                    Orbium unicaudatus ignis var. phantasma
                    <br />
                    σ-gap 0.012–0.015 (paper)
                    <br />
                    coherence depth as biosignature
                  </>
                }
              >
                ∂A/∂t = G(K * A; μ, σ(x))
                <br />
                σ(x) ∈ [0.003, 0.06]
                <br />
                G(u) = 2·exp(−(u−μ)²/2σ²) − 1
                <br />
                <br />
                memory: shape it cannot hold
                <br />
                drift: gradient of σ-field
              </EquationBlock>
            ) : (
              <EquationBlock
                title="Lenia rule (Chan, 2018)"
                note={
                  <>
                    K(r) = exp(4 − 4 / (4r(1−r)))
                    <br />
                    Orbium · Scutium · Ignis
                    <br />
                    self-similar under (R, μ, σ) rescaling
                  </>
                }
              >
                ∂A/∂t = G(K * A; μ, σ)
                <br />
                A(x, t) ∈ [0, 1]
                <br />
                G(u) = 2·exp(−(u−μ)²/2σ²) − 1
              </EquationBlock>
            )}
          </div>
        </div>

        <style>{`
          @media (max-width: 1100px) {
            .lenia-lab-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </SubstratePlate>

      {/* ── Reading note ─────────────────────────────────────── */}
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
        <SectionEyebrow>
          {readingMode === "ghost" ? "on the ghost species" : "what to watch"}
        </SectionEyebrow>
        {readingMode === "ghost" ? (
          <>
            <p style={{ marginTop: 16 }}>
              The Ghost Species (Orbium unicaudatus ignis var. phantasma)
              inhabits the boundary between viability and dissolution. An
              Ignis-descendant is placed in a σ-landscape where the physics
              itself varies from tight (kind, supports the ancestral
              morphology) to loose (forgetful, dissolves it). The creature
              remembers a shape it can no longer hold, and its drift across
              the substrate is what that looks like.
            </p>
            <p>
              Load <em style={{ color: COLOR.ink }}>Lanterns</em> to watch
              ghosts migrate inward toward kinder σ.{" "}
              <em style={{ color: COLOR.ink }}>Rivers</em> shows them
              following sinusoidal corridors;{" "}
              <em style={{ color: COLOR.ink }}>Archipelago</em> shows them
              hopping between tight-σ islands. Toggle{" "}
              <em style={{ color: COLOR.ink }}>paint σ</em> to sculpt the
              landscape under them in real time.{" "}
              <Link
                href="/research/ghost-species"
                style={{
                  color: COLOR.ghost,
                  borderBottom: `1px solid ${COLOR.ghost}50`,
                }}
              >
                Read the paper →
              </Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ marginTop: 16 }}>
              Watch Orbium for the soliton glide — it moves without
              deforming, its shape invariant under translation. In{" "}
              <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
                Lantern
              </em>{" "}
              palette, every creature&apos;s edge shimmers a slightly
              different rainbow because the iridescent layer reads from the
              local growth field. The hot core blows out warm gold; the
              dissolving rim cools to violet.
            </p>
            <p>
              Load <em style={{ color: COLOR.ink }}>Soup</em> to watch
              natural selection on a timescale of seconds — many Orbium
              compete for substrate space and the colliders annihilate.
              Switch the <em style={{ color: COLOR.ink }}>view</em> toggle
              to <em style={{ color: COLOR.ink }}>potential</em> to see the
              convolution field underneath the creature; to{" "}
              <em style={{ color: COLOR.ink }}>growth</em> to see the
              signed contribution that drives state forward; to{" "}
              <em style={{ color: COLOR.ink }}>composite</em> for all three
              at once.
            </p>
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Internal helpers — same shape as IsingExperience's ToggleGroup
// ═══════════════════════════════════════════════════════════════════════════

function ToggleGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px 6px 14px",
        border: `1px solid ${COLOR.inkGhost}`,
        borderRadius: 2,
        background: "rgba(10, 15, 26, 0.35)",
      }}
    >
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
        }}
      >
        {label}
      </span>
      <Toggle<T> options={options} active={active} onSelect={onSelect} />
    </div>
  );
}
