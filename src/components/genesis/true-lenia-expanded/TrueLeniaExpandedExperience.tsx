"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  True Lenia Expanded · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Composition only — no GL, no math. Everything lives in useLeniaHyper.
//
//    Plate 1 — hero: what "actually four-dimensional" means here
//    Plate 2 — lab: canvas (drag to rotate through the 4th axis) flanked by
//              preset / seed / interaction on the left and rotation-plane +
//              render controls on the right
//    Plate 3 — tuning: growth rule + lattice/kernel
//    Reading note — what to watch for as you turn the object
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";

import { SubstratePlate, SectionEyebrow } from "@/components/genesis/SubstrateFrame";
import {
  ControlSection,
  Slider,
  Button,
  Toggle,
  EquationBlock,
  CanvasSurface,
  TelemetryNote,
} from "@/components/genesis/SubstrateControls";

import { useLeniaHyper } from "./useLeniaHyper";
import { Sparkline } from "./Sparkline";
import {
  PRESETS,
  PRESET_LIST,
  PALETTES,
  ROTATION_PLANES,
  type PresetId,
  type PaletteId,
} from "./hyperpresets";
import { RESOLUTIONS, type Resolution, type SeedId } from "./hyperfield";
import { KERNEL_PROFILES, type KernelProfileId } from "./hyperkernel";

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

const SPARK_W = 300;
const SPARK_H = 46;
const MASS_CAP = 400;

const SEEDS: Array<{ id: SeedId; label: string }> = [
  { id: "point", label: "4-ball" },
  { id: "glome", label: "Glome" },
  { id: "clifford", label: "Clifford" },
  { id: "hopf", label: "Hopf" },
  { id: "duo", label: "Twin" },
  { id: "noise", label: "Noise" },
];

const PROFILES: Array<{ id: KernelProfileId; label: string }> = (
  Object.keys(KERNEL_PROFILES) as KernelProfileId[]
).map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }));

export function TrueLeniaExpandedExperience() {
  const api = useLeniaHyper("genesis");
  const meta = PRESETS[api.preset];

  const [massHistory, setMassHistory] = useState<number[]>([]);
  const lastMassRef = useRef(-1);

  useEffect(() => {
    if (api.mass === lastMassRef.current) return;
    lastMassRef.current = api.mass;
    setMassHistory((prev) =>
      prev.length >= MASS_CAP ? [...prev.slice(1), api.mass] : [...prev, api.mass],
    );
  }, [api.mass]);

  useEffect(() => {
    setMassHistory([]);
    lastMassRef.current = -1;
  }, [api.preset, api.seed]);

  const fourthPlanes = ROTATION_PLANES.filter((p) => p.fourth);
  const threePlanes = ROTATION_PLANES.filter((p) => !p.fourth);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <div style={{ maxWidth: 760 }}>
          <SectionEyebrow>Λ — 008 · Lenia · True Fourth Dimension</SectionEyebrow>
          <h1
            style={{
              fontFamily: FONT.display,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: COLOR.ink,
              margin: "12px 0 18px",
              lineHeight: 1.05,
            }}
          >
            A creature that lives in four dimensions
          </h1>
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: COLOR.inkBody,
              margin: 0,
            }}
          >
            Not a hypersphere drawn on a flat sheet. This is a continuous field{" "}
            <span style={{ color: COLOR.lanternGold }}>A(x, y, z, w)</span> defined on a
            four-torus — every one of its L⁴ cells a real degree of freedom, integrated
            each tick by a genuine four-dimensional Lenia rule. Nothing is projected in
            advance. You are looking at a three-dimensional cross-section of a living 4D
            organism, and when you turn the{" "}
            <span style={{ color: COLOR.ghost }}>XW, YW, ZW</span> planes you sweep the
            hidden fourth axis straight through the slice you can see. Drag the canvas to
            rotate; watch a shape appear from, and vanish into, a direction that isn't there.
          </p>
        </div>
      </SubstratePlate>

      {/* ── Lab ──────────────────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr) 320px",
            gap: 28,
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div>
            <ControlSection title="preset" compact>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PRESET_LIST.map((pr) => (
                  <Button
                    key={pr.id}
                    onClick={() => api.loadPreset(pr.id as PresetId)}
                    active={api.preset === pr.id}
                  >
                    {pr.name}
                  </Button>
                ))}
              </div>
            </ControlSection>

            <ControlSection title="seed structure" compact>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SEEDS.map((s) => (
                  <Button
                    key={s.id}
                    onClick={() => api.reseed(s.id)}
                    active={api.seed === s.id}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </ControlSection>

            <ControlSection title="interaction" compact>
              <Toggle<"rotate" | "paint">
                options={[
                  { id: "rotate", label: "Rotate 4D" },
                  { id: "paint", label: "Paint" },
                ]}
                active={api.mode}
                onSelect={api.setMode}
              />
              {api.mode === "paint" && (
                <Slider
                  label="brush · 4-ball radius"
                  value={api.brushSize}
                  min={2}
                  max={Math.round(api.L * 0.4)}
                  step={1}
                  onChange={(v) => api.setBrushSize(Math.round(v))}
                  format={(v) => `${Math.round(v)} cells`}
                />
              )}
              <p
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: COLOR.inkFaint,
                  lineHeight: 1.5,
                  margin: "8px 0 0",
                }}
              >
                {api.mode === "rotate"
                  ? "drag ↔ YW · drag ↕ XW — both turn through the 4th axis"
                  : "drag paints a 4-ball · shift/right-drag erases"}
              </p>
            </ControlSection>

            <ControlSection title="playback" compact>
              <div style={{ display: "flex", gap: 6 }}>
                <Button onClick={() => api.setRunning(!api.running)} active={api.running} fullWidth>
                  {api.running ? "running" : "paused"}
                </Button>
                <Button onClick={() => api.reseed(api.seed)} fullWidth>
                  reseed
                </Button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <Button onClick={api.recenter} fullWidth>
                  recenter view
                </Button>
              </div>
            </ControlSection>

            <ControlSection title="telemetry" compact>
              <Sparkline
                data={massHistory}
                width={SPARK_W > 240 ? 232 : SPARK_W}
                height={SPARK_H}
                label="field mass"
                value={api.mass}
                format={(v) => v.toLocaleString()}
                accent={COLOR.lanternGold}
              />
              <TelemetryRow label="fps" value={String(api.fps)} />
              <TelemetryRow label="occupancy" value={`${(api.occupancy * 100).toFixed(2)}%`} />
              <TelemetryRow label="lattice" value={`${api.L}⁴ = ${(api.L ** 4).toLocaleString()}`} />
            </ControlSection>
          </div>

          {/* Center column — canvas */}
          <div>
            <CanvasSurface aspectRatio="1 / 1">
              <canvas
                ref={api.canvasRef}
                width={560}
                height={560}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  cursor: api.mode === "paint" ? "crosshair" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  api.handlePointerDown(e);
                }}
                onPointerMove={api.handlePointerMove}
                onPointerUp={api.handlePointerUp}
                onPointerLeave={api.handlePointerUp}
                onContextMenu={api.handleContextMenu}
              />
            </CanvasSurface>

            {api.glError && (
              <p style={{ fontFamily: FONT.mono, fontSize: 12, color: COLOR.sanguine, marginTop: 10 }}>
                {api.glError}
              </p>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: COLOR.inkMuted,
                  alignSelf: "center",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                palette
              </span>
              {PALETTES.map((pal) => (
                <Button
                  key={pal.id}
                  onClick={() => api.setPalette(pal.id as PaletteId)}
                  active={api.palette === pal.id}
                >
                  {pal.label}
                </Button>
              ))}
            </div>

            <p
              style={{
                fontFamily: FONT.body,
                fontSize: "0.95rem",
                lineHeight: 1.55,
                color: COLOR.inkBody,
                margin: "16px 0 0",
              }}
            >
              <span style={{ color: COLOR.lanternGold, fontFamily: FONT.mono, fontSize: 12 }}>
                {meta.name}
              </span>
              {"  —  "}
              {meta.desc}
            </p>
          </div>

          {/* Right column — rotation + render */}
          <div>
            <ControlSection title="fourth-axis rotation" compact>
              <p
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: COLOR.inkFaint,
                  margin: "0 0 8px",
                  lineHeight: 1.5,
                }}
              >
                the planes with no 3D analogue — each sweeps w through the slice
              </p>
              {fourthPlanes.map((pl) => (
                <Slider
                  key={pl.id}
                  label={`${pl.label} · rot/s`}
                  value={api.speeds[pl.id]}
                  min={-0.4}
                  max={0.4}
                  step={0.005}
                  onChange={(v) => api.setSpeed(pl.id, v)}
                  format={(v) => v.toFixed(3)}
                />
              ))}
            </ControlSection>

            <ControlSection title="3d slice rotation" compact>
              {threePlanes.map((pl) => (
                <Slider
                  key={pl.id}
                  label={`${pl.label} · rot/s`}
                  value={api.speeds[pl.id]}
                  min={-0.4}
                  max={0.4}
                  step={0.005}
                  onChange={(v) => api.setSpeed(pl.id, v)}
                  format={(v) => v.toFixed(3)}
                />
              ))}
            </ControlSection>

            <ControlSection title="render" compact>
              <Slider
                label="ray steps"
                value={api.steps}
                min={24}
                max={200}
                step={4}
                onChange={(v) => api.setSteps(Math.round(v))}
                format={(v) => `${Math.round(v)}`}
              />
              <Slider
                label="density"
                value={api.density}
                min={0.2}
                max={3.5}
                step={0.05}
                onChange={api.setDensity}
                format={(v) => v.toFixed(2)}
              />
              <Slider
                label="iso threshold"
                value={api.thresh}
                min={0.02}
                max={0.5}
                step={0.01}
                onChange={api.setThresh}
                format={(v) => v.toFixed(2)}
              />
              <Slider
                label="zoom"
                value={api.zoom}
                min={0.6}
                max={1.6}
                step={0.01}
                onChange={api.setZoom}
                format={(v) => v.toFixed(2)}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <Button onClick={() => api.setSlabDepth(!api.slabDepth)} active={api.slabDepth} fullWidth>
                  4D depth
                </Button>
                <Button onClick={() => api.setBloom(!api.bloom)} active={api.bloom} fullWidth>
                  bloom
                </Button>
              </div>
            </ControlSection>

            <EquationBlock
              title="4D Lenia rule"
              note={
                <>
                  A : field on the 4-torus (x,y,z,w)
                  <br />K : radial kernel over the unit 4-ball
                  <br />G : Gaussian growth, μ={api.mu.toFixed(3)} σ={api.sigma.toFixed(3)}
                </>
              }
            >
              Aₜ₊₁ = clip( Aₜ + Δt · G( K ∗₄ Aₜ ) )
            </EquationBlock>
          </div>
        </div>
      </SubstratePlate>

      {/* ── Tuning ───────────────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <SectionEyebrow>Tuning</SectionEyebrow>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            marginTop: 16,
          }}
        >
          <ControlSection title="growth rule">
            <Slider
              label="μ · growth centre"
              value={api.mu}
              min={0.1}
              max={0.5}
              step={0.005}
              onChange={api.setMu}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="σ · growth width"
              value={api.sigma}
              min={0.02}
              max={0.12}
              step={0.002}
              onChange={api.setSigma}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="Δt · timestep"
              value={api.dt}
              min={0.02}
              max={0.2}
              step={0.005}
              onChange={api.setDt}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="steps / frame"
              value={api.spf}
              min={1}
              max={6}
              step={1}
              onChange={(v) => api.setSpf(Math.round(v))}
              format={(v) => `${Math.round(v)}×`}
            />
            <p style={{ fontFamily: FONT.mono, fontSize: 10, color: COLOR.inkFaint, lineHeight: 1.5, marginTop: 4 }}>
              the living band sits near μ≈0.30, σ≈0.06 — push μ up to starve the
              field, σ up to flood it. 2D Orbium values (μ≈0.15) simply kill it.
            </p>
          </ControlSection>

          <ControlSection title="lattice · kernel">
            <div style={{ marginBottom: 12 }}>
              <ControlLabel>resolution · L (rebuilds GPU state)</ControlLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {RESOLUTIONS.map((r) => (
                  <Button key={r} onClick={() => api.setL(r as Resolution)} active={api.L === r}>
                    {r}⁴
                  </Button>
                ))}
              </div>
            </div>
            <Slider
              label="kernel radius · R"
              value={api.R}
              min={2}
              max={5}
              step={1}
              onChange={(v) => api.setR(Math.round(v))}
              format={(v) => `${Math.round(v)} cells`}
            />
            <div style={{ marginTop: 12 }}>
              <ControlLabel>kernel profile · β shells</ControlLabel>
              <Toggle<KernelProfileId>
                options={PROFILES}
                active={api.profile}
                onSelect={api.setProfile}
              />
            </div>
            <p style={{ fontFamily: FONT.mono, fontSize: 10, color: COLOR.inkFaint, lineHeight: 1.5, marginTop: 10 }}>
              R=4 in 4D is a 1,064-tap sparse convolution per cell. Raising R or
              L makes the organism finer and the frame heavier; the SIM shader
              recompiles when the tap count changes.
            </p>
          </ControlSection>
        </div>
      </SubstratePlate>

      {/* ── Reading note ─────────────────────────────────────────── */}
      <SubstratePlate>
        <SectionEyebrow>What to watch for</SectionEyebrow>
        <TelemetryNote>
          <p style={{ fontFamily: FONT.body, fontSize: "0.98rem", lineHeight: 1.6, color: COLOR.inkBody, margin: "12px 0 0" }}>
            Load <b style={{ color: COLOR.ink }}>Hidden Twin</b> and leave every rotation at
            zero: one lump. Now nudge <span style={{ color: COLOR.ghost }}>YW</span> and the
            single lump splits — the second was always there, sitting a short distance away
            along an axis you had no line of sight to. Load{" "}
            <b style={{ color: COLOR.ink }}>Hopf Link</b> and turn slowly: the two rings pass
            clean through one another and never touch, because in four dimensions they are
            linked in a way no three-dimensional link can be. Load{" "}
            <b style={{ color: COLOR.ink }}>Glome</b> and spin any fourth-axis plane: its
            cross-section breathes — a 2-sphere whose radius is really the height of your slice
            through the 3-sphere. The mass trace holds roughly steady because the rule is tuned
            to the homeostatic band; drive μ or σ out of it and you can watch a whole
            four-dimensional ecology starve or drown.
          </p>
        </TelemetryNote>
      </SubstratePlate>
    </>
  );
}

// ── local helpers ───────────────────────────────────────────────────────────

function TelemetryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontFamily: FONT.mono,
        fontSize: 11,
        padding: "3px 0",
        borderBottom: `1px solid ${COLOR.inkGhost}22`,
      }}
    >
      <span style={{ color: COLOR.inkMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ color: COLOR.ghost }}>{value}</span>
    </div>
  );
}

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        color: COLOR.inkMuted,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
