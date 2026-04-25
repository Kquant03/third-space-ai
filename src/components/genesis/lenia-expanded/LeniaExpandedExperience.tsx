"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Same architectural shape as /genesis/lenia and /genesis/ising — but
//  Lenia Expanded has a much richer control surface (four channels, cross-
//  coupling, 4D rotation, flow field) so the page is split across two
//  plates instead of one:
//
//    Plate 1 — hero pullquote + Dihypersphaerome callout
//    (mode toggle bar — primary view: Ecosystem / 4D)
//    Plate 2 — lab plate, three columns (260 / 1fr / 320):
//              left   = preset, brush, playback, telemetry
//              center = canvas + palette legend + preset description
//              right  = secondary view chips, mass split + sparklines,
//                       equation block
//    Plate 3 — tuning plate: channels (3-col), cross-coupling (2-col),
//              4D rotation + flow field (2-col)
//    Reading note — what to watch for
//
//  All GPU lifecycle and rAF ownership lives in `useLeniaExpanded`. This
//  file is composition only — no GL, no math.
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
  EquationBlock,
  CanvasSurface,
  TelemetryNote,
} from "@/components/genesis/SubstrateControls";

import { useLeniaExpanded } from "./useLeniaExpanded";
import {
  PRESETS,
  PRESET_LIST,
  PRIMARY_VIEW_MODES,
  SECONDARY_VIEW_MODES,
  FLOW_MODES,
  BRUSH_CHANNELS,
  type PresetId,
  type ViewModeId,
  type FlowModeId,
  type BrushChannelId,
} from "./presets";
import { Sparkline } from "./Sparkline";

// ─── Lantern palette (local copy, matches Ising/Lenia) ──────────────────
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

const SPARK_W = 288;
const SPARK_H = 46;
const MASS_HISTORY_CAP = 500;

// ───────────────────────────────────────────────────────────────────────────

export function LeniaExpandedExperience() {
  const api = useLeniaExpanded("duel");

  const meta = PRESETS[api.preset];
  const totalMass = (api.mass0 + api.mass1) || 1;
  const preyPct = Math.round((api.mass0 / totalMass) * 100);
  const predPct = Math.round((api.mass1 / totalMass) * 100);

  // Rolling histories sampled off the hook's mass setters (which are
  // already throttled to a 15-frame cadence inside useLeniaExpanded).
  const [preyHistory, setPreyHistory] = useState<number[]>([]);
  const [predHistory, setPredHistory] = useState<number[]>([]);
  const lastPreyRef = useRef(0);
  const lastPredRef = useRef(0);

  useEffect(() => {
    if (api.mass0 === lastPreyRef.current) return;
    lastPreyRef.current = api.mass0;
    setPreyHistory((prev) => {
      const next = prev.length >= MASS_HISTORY_CAP
        ? [...prev.slice(1), api.mass0]
        : [...prev, api.mass0];
      return next;
    });
  }, [api.mass0]);

  useEffect(() => {
    if (api.mass1 === lastPredRef.current) return;
    lastPredRef.current = api.mass1;
    setPredHistory((prev) => {
      const next = prev.length >= MASS_HISTORY_CAP
        ? [...prev.slice(1), api.mass1]
        : [...prev, api.mass1];
      return next;
    });
  }, [api.mass1]);

  // Reset histories on preset change so the sparklines don't show a
  // confusing jump between two ecosystems.
  useEffect(() => {
    setPreyHistory([]);
    setPredHistory([]);
    lastPreyRef.current = 0;
    lastPredRef.current = 0;
  }, [api.preset]);

  // ───────────────────────────────────────────────────────────────
  //  Render
  // ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Hero plate ────────────────────────────────────────── */}
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
          A four-channel ecosystem —{" "}
          <span style={{ color: COLOR.inkMuted }}>
            prey, predator, morphogen, and a four-dimensional organism
            leaking through.
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
          Lenia&apos;s Expanded Universe (Chan, 2020) extends the original
          continuous cellular automaton with multiple interacting channels.
          Here three of them form an ecology — prey feed predators,
          predators suppress prey, and a morphogen field diffuses between
          them carrying a chemical memory of who has been where. The
          fourth channel is something else.
        </p>

        {/* Dihypersphaerome callout */}
        <div
          style={{
            marginTop: 28,
            padding: "20px 24px",
            borderLeft: `2px solid ${COLOR.ghost}`,
            background: "rgba(127, 175, 179, 0.04)",
            maxWidth: "62ch",
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLOR.ghost,
              marginBottom: 10,
            }}
          >
            a four-dimensional organism
          </div>
          <p
            style={{
              margin: "0 0 12px",
              fontFamily: FONT.body,
              fontSize: 15.5,
              lineHeight: 1.7,
              color: COLOR.inkBody,
            }}
          >
            The Dihypersphaerome ventilans (Chan, animals4D) is a 4D
            organism whose shells match the β=[1/12, 1/6, 1] kernel
            topology. Rotating it through XW, YW, and ZW planes produces a
            2D cross-section that &ldquo;ventilates&rdquo; — breathes in
            and out — as its fourth-dimensional structure sweeps past the
            plane. That shadow bleeds into the prey channel as generative
            seed.
          </p>
          <Link
            href="/research/dihypersphaerome"
            style={{
              fontFamily: FONT.mono,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLOR.ghost,
              borderBottom: `1px solid ${COLOR.ghost}50`,
              paddingBottom: 2,
            }}
          >
            Read the report →
          </Link>
        </div>

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
          Chan (2018) · Chan &amp; Heiney (2020) · Chan (animals4D)
        </div>
      </SubstratePlate>

      {/* ── Mode toggle bar ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <ToggleGroup<ViewModeId>
          label="view"
          options={PRIMARY_VIEW_MODES.map((v) => ({ id: v.id, label: v.label }))}
          active={
            // If user has a primary-view selected, surface it; if they're
            // on a secondary (channel-isolation) view, fall back to
            // ecosystem so the toggle isn't visually empty.
            PRIMARY_VIEW_MODES.some((v) => v.id === api.viewMode)
              ? api.viewMode
              : "ecosystem"
          }
          onSelect={api.setViewMode}
        />
      </div>

      {/* ── Lab plate ────────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 32 }}>
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
            {api.glError} Lenia Expanded requires WebGL2 with float texture
            support.
          </div>
        )}

        <div
          className="lenia-expanded-lab-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr) 320px",
            gap: "clamp(20px, 2.5vw, 36px)",
            alignItems: "start",
          }}
        >
          {/* ═══ LEFT: essentials ═══ */}
          <div>
            <ControlSection title="ecosystem preset" compact>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PRESET_LIST.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => api.loadPreset(p.id)}
                    className="genesis-hover-ghost"
                    style={presetBtnStyle(api.preset === p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </ControlSection>

            <ControlSection title="paint channel" compact>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {BRUSH_CHANNELS.map((c) => (
                  <ChannelChip<BrushChannelId>
                    key={c.id}
                    id={c.id}
                    label={c.label}
                    color={c.color}
                    active={api.brushChan === c.id}
                    onSelect={() => api.setBrushChan(c.id)}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: FONT.body,
                  fontStyle: "italic",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: COLOR.inkFaint,
                }}
              >
                Click to paint · shift-click to erase.
              </div>
              <div style={{ marginTop: 12 }}>
                <Slider
                  label="brush size"
                  value={api.brushSize}
                  min={2}
                  max={30}
                  step={1}
                  onChange={(v) => api.setBrushSize(Math.round(v))}
                  format={(v) => `${Math.round(v)} cells`}
                />
              </div>
            </ControlSection>

            <ControlSection title="integration" compact>
              <Slider
                label="dt · timestep"
                value={api.dt}
                min={0.04}
                max={0.2}
                step={0.005}
                onChange={api.setDt}
                format={(v) => v.toFixed(3)}
              />
              <Slider
                label="spf · steps/frame"
                value={api.spf}
                min={1}
                max={6}
                step={1}
                onChange={(v) => api.setSpf(Math.round(v))}
                format={(v) => `${Math.round(v)}×`}
              />
            </ControlSection>

            <ControlSection title="rendering" compact>
              <Slider
                label="bloom strength"
                value={api.bloomStr}
                min={0}
                max={1.2}
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
                  onClick={() => api.setBloom(!api.bloom)}
                  active={api.bloom}
                  fullWidth
                >
                  bloom
                </Button>
                <Button
                  onClick={() => api.setFlowEnabled(!api.flowEnabled)}
                  active={api.flowEnabled}
                  fullWidth
                >
                  flow
                </Button>
              </div>
            </ControlSection>

            <ControlSection title="playback" compact>
              <div style={{ display: "flex", gap: 8 }}>
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
            </ControlSection>

            <TelemetryNote>
              {api.fps} fps · 256² lattice
              <br />
              prey {api.mass0.toLocaleString()} · pred {api.mass1.toLocaleString()}
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
                  imageRendering: "auto",
                  touchAction: "none",
                  cursor: "default",
                }}
              />
            </CanvasSurface>

            {/* Mass split bar — visual prey/predator dominance read-out */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.08em",
                color: COLOR.inkMuted,
              }}
            >
              <span style={{ color: COLOR.lanternGold }}>
                prey {preyPct}%
              </span>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: COLOR.voidSoft,
                  border: `1px solid ${COLOR.inkGhost}40`,
                  borderRadius: 2,
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${preyPct}%`,
                    background: COLOR.lanternGold,
                    transition: "width 0.4s ease",
                  }}
                />
                <div
                  style={{
                    width: `${predPct}%`,
                    background: COLOR.ghost,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span style={{ color: COLOR.ghost }}>
                pred {predPct}%
              </span>
            </div>

            {/* Preset reference panel — Onsager-equivalent */}
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "rgba(10, 15, 26, 0.4)",
                border: `1px solid ${COLOR.inkGhost}`,
                borderLeft: `2px solid ${
                  api.preset === "hyperseed" ? COLOR.ghost : COLOR.lanternGold
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
                  color:
                    api.preset === "hyperseed" ? COLOR.ghost : COLOR.lanternGold,
                  marginBottom: 6,
                }}
              >
                {meta.name}
                {api.preset === "hyperseed" && " · ventilans shadow"}
              </div>
              {meta.desc}
            </div>
          </div>

          {/* ═══ RIGHT: secondary views + observables + theory ═══ */}
          <div>
            <SectionEyebrow>secondary views</SectionEyebrow>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginTop: 12,
                marginBottom: 22,
              }}
            >
              {SECONDARY_VIEW_MODES.map((v) => (
                <ModeChip<ViewModeId>
                  key={v.id}
                  id={v.id}
                  label={v.label}
                  active={api.viewMode === v.id}
                  onSelect={() => api.setViewMode(v.id)}
                />
              ))}
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 12.5,
                fontStyle: "italic",
                lineHeight: 1.55,
                color: COLOR.inkFaint,
                marginBottom: 22,
              }}
            >
              Single-channel renderings for tuning. Flow colour-codes
              velocity angle; brightness is speed.
            </div>

            <SectionEyebrow>observables</SectionEyebrow>
            <div style={{ marginTop: 16 }}>
              <Sparkline
                data={preyHistory}
                width={SPARK_W}
                height={SPARK_H}
                label="prey mass · ⟨A⟩"
                value={api.mass0}
                format={(v) => v.toLocaleString()}
                accent={COLOR.lanternGold}
              />
              <Sparkline
                data={predHistory}
                width={SPARK_W}
                height={SPARK_H}
                label="predator mass · ⟨B⟩"
                value={api.mass1}
                format={(v) => v.toLocaleString()}
                accent={COLOR.ghost}
              />
            </div>

            <EquationBlock
              title="Lenia Expanded rule (Chan, 2020)"
              note={
                <>
                  R=prey · G=predator · B=morphogen · A=4D
                  <br />
                  predation flash where prey ∩ predator
                  <br />
                  ventilans rate ≡ ZW rotation
                </>
              }
            >
              ∂Aᵢ/∂t = Gᵢ(Kᵢ * Aᵢ; μᵢ, σᵢ + Σⱼ cⱼᵢ Aⱼ)
              <br />
              − Σⱼ cⱼᵢ Aⱼ Aᵢ + h(x, t)
            </EquationBlock>
          </div>
        </div>

        <style>{`
          @media (max-width: 1100px) {
            .lenia-expanded-lab-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </SubstratePlate>

      {/* ── Tuning plate ─────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <SectionEyebrow>channel tuning</SectionEyebrow>
        <div
          className="lenia-expanded-channels"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(20px, 2.5vw, 32px)",
            marginTop: 18,
            marginBottom: 28,
          }}
        >
          <ControlSection title="prey · ch 0" compact>
            <Slider
              label="μ"
              value={api.mu0}
              min={0.08}
              max={0.25}
              step={0.001}
              onChange={api.setMu0}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="σ"
              value={api.sig0}
              min={0.005}
              max={0.04}
              step={0.001}
              onChange={api.setSig0}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="R"
              value={api.R0}
              min={6}
              max={20}
              step={1}
              onChange={(v) => api.setR0(Math.round(v))}
              format={(v) => `${Math.round(v)} cells`}
            />
          </ControlSection>

          <ControlSection title="predator · ch 1" compact>
            <Slider
              label="μ"
              value={api.mu1}
              min={0.12}
              max={0.35}
              step={0.001}
              onChange={api.setMu1}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="σ"
              value={api.sig1}
              min={0.01}
              max={0.05}
              step={0.001}
              onChange={api.setSig1}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="R"
              value={api.R1}
              min={8}
              max={22}
              step={1}
              onChange={(v) => api.setR1(Math.round(v))}
              format={(v) => `${Math.round(v)} cells`}
            />
          </ControlSection>

          <ControlSection title="morphogen · ch 2" compact>
            <Slider
              label="μ"
              value={api.mu2}
              min={0.08}
              max={0.25}
              step={0.001}
              onChange={api.setMu2}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="σ"
              value={api.sig2}
              min={0.01}
              max={0.05}
              step={0.001}
              onChange={api.setSig2}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="R"
              value={api.R2}
              min={12}
              max={24}
              step={1}
              onChange={(v) => api.setR2(Math.round(v))}
              format={(v) => `${Math.round(v)} cells`}
            />
          </ControlSection>
        </div>

        <SectionEyebrow>cross-coupling · ecology strengths</SectionEyebrow>
        <div
          className="lenia-expanded-coupling"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "clamp(20px, 2.5vw, 32px)",
            marginTop: 18,
            marginBottom: 28,
          }}
        >
          <ControlSection title="predation" compact>
            <Slider
              label="c01 · predator → prey"
              value={api.c01}
              min={0}
              max={0.8}
              step={0.01}
              onChange={api.setC01}
              format={(v) => v.toFixed(2)}
              hint="How strongly predators suppress prey on contact."
            />
            <Slider
              label="c10 · prey → predator"
              value={api.c10}
              min={0}
              max={0.8}
              step={0.01}
              onChange={api.setC10}
              format={(v) => v.toFixed(2)}
              hint="How strongly prey feed predators."
            />
            <Slider
              label="c20 · morphogen → prey σ"
              value={api.c20}
              min={0}
              max={0.6}
              step={0.01}
              onChange={api.setC20}
              format={(v) => v.toFixed(2)}
            />
          </ControlSection>

          <ControlSection title="diffusion · scent trails" compact>
            <Slider
              label="c02 · prey → morphogen"
              value={api.c02}
              min={0}
              max={0.2}
              step={0.005}
              onChange={api.setC02}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="c12 · predator → morphogen"
              value={api.c12}
              min={0}
              max={0.2}
              step={0.005}
              onChange={api.setC12}
              format={(v) => v.toFixed(3)}
            />
          </ControlSection>
        </div>

        <SectionEyebrow>4D rotation + flow field</SectionEyebrow>
        <div
          className="lenia-expanded-hyper"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "clamp(20px, 2.5vw, 32px)",
            marginTop: 18,
          }}
        >
          <ControlSection title="Dihypersphaerome · 4D" compact>
            <Slider
              label="ZW rate · breathing"
              value={api.rotSpeed}
              min={0}
              max={0.6}
              step={0.01}
              onChange={api.setRotSpeed}
              format={(v) => v.toFixed(2)}
              hint="The ventilans rhythm. Higher = faster inhale/exhale."
            />
            <Slider
              label="XW rate"
              value={api.rotXWSpeed}
              min={0}
              max={0.3}
              step={0.005}
              onChange={api.setRotXWSpeed}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="YW rate"
              value={api.rotYWSpeed}
              min={0}
              max={0.3}
              step={0.005}
              onChange={api.setRotYWSpeed}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="W slice offset"
              value={api.wSlice}
              min={-1.2}
              max={1.2}
              step={0.05}
              onChange={api.setWSlice}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="amplitude"
              value={api.hyperAmp}
              min={0}
              max={1.2}
              step={0.01}
              onChange={api.setHyperAmp}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="bleed into prey"
              value={api.hyperMix}
              min={0}
              max={0.4}
              step={0.01}
              onChange={api.setHyperMix}
              format={(v) => v.toFixed(2)}
              hint="How much of the 4D shadow seeds prey activity."
            />
          </ControlSection>

          <ControlSection title="flow field · advection" compact>
            <div style={{ marginBottom: 12 }}>
              <ToggleGroup<FlowModeId>
                label="mode"
                options={FLOW_MODES.map((m) => ({ id: m.id, label: m.label }))}
                active={api.flowMode}
                onSelect={api.setFlowMode}
              />
            </div>
            <Slider
              label="strength"
              value={api.flowStr}
              min={0}
              max={3}
              step={0.05}
              onChange={api.setFlowStr}
              format={(v) => v.toFixed(2)}
              hint="How aggressively state advects along the velocity field."
            />
            <div
              style={{
                marginTop: 14,
                fontFamily: FONT.body,
                fontSize: 12.5,
                fontStyle: "italic",
                lineHeight: 1.55,
                color: COLOR.inkFaint,
              }}
            >
              Gradient: state flows downhill along prey gradient. Curl:
              perpendicular to gradient (vortices). Spiral: combination
              with time-dependent rotation.
            </div>
          </ControlSection>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .lenia-expanded-channels,
            .lenia-expanded-coupling,
            .lenia-expanded-hyper {
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
        <SectionEyebrow>what to watch for</SectionEyebrow>
        <ul
          style={{
            margin: "16px 0 0",
            paddingLeft: 22,
            listStyle: "none",
          }}
        >
          <WatchBullet>
            <em style={{ color: COLOR.ink }}>Predation flashes.</em> Where
            prey and predator overlap, the field turns brilliant green —
            the moment of contact, vivid and brief.
          </WatchBullet>
          <WatchBullet>
            <em style={{ color: COLOR.ink }}>Morphogen memory.</em> A
            subtle teal tint lingers after creatures move on. The field
            remembers who has been where, and that memory feeds the prey
            channel&apos;s σ — kinder physics where the trail is fresh.
          </WatchBullet>
          <WatchBullet>
            <em style={{ color: COLOR.ink }}>Ventilating shadow.</em> Load
            the <em style={{ color: COLOR.ink }}>DV Seed</em> preset and
            watch the violet wisps pulse. The rhythm is the 4D
            organism&apos;s rotation through its W-axis — the shadow you
            see is a 2D cross-section of a 4D body breathing in and out
            through the plane.
          </WatchBullet>
          <WatchBullet>
            <em style={{ color: COLOR.ink }}>Advection currents.</em>{" "}
            Switch to the <em style={{ color: COLOR.ink }}>Flow</em>{" "}
            secondary view — colours map to velocity direction, brightness
            to speed. Ecosystem scale becomes fluid.
          </WatchBullet>
        </ul>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Internal helpers
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

function ModeChip<T extends string>({
  id,
  label,
  active,
  onSelect,
}: {
  id: T;
  label: string;
  active: boolean;
  onSelect: (id: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="genesis-hover-ghost"
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.12em",
        padding: "6px 12px",
        border: `1px solid ${active ? COLOR.ghost + "80" : COLOR.inkGhost + "60"}`,
        borderRadius: 2,
        background: active ? "rgba(127, 175, 179, 0.08)" : "transparent",
        color: active ? COLOR.ink : COLOR.inkMuted,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}

function ChannelChip<T extends string>({
  id,
  label,
  color,
  active,
  onSelect,
}: {
  id: T;
  label: string;
  color: string;
  active: boolean;
  onSelect: (id: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="genesis-hover-ghost"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.1em",
        padding: "6px 12px",
        border: `1px solid ${active ? color + "aa" : COLOR.inkGhost + "60"}`,
        borderRadius: 2,
        background: active ? `${color}14` : "transparent",
        color: active ? COLOR.ink : COLOR.inkMuted,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </button>
  );
}

function WatchBullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        position: "relative",
        paddingLeft: 18,
        marginBottom: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: "0.65em",
          width: 6,
          height: 1,
          background: COLOR.ghost,
        }}
      />
      {children}
    </li>
  );
}

function presetBtnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: "0.1em",
    padding: "6px 12px",
    border: `1px solid ${active ? COLOR.ghost + "80" : COLOR.inkGhost + "60"}`,
    borderRadius: 2,
    background: active ? "rgba(127, 175, 179, 0.08)" : "transparent",
    color: active ? COLOR.ink : COLOR.inkMuted,
    cursor: "pointer",
    transition: "all 0.2s ease",
  };
}
