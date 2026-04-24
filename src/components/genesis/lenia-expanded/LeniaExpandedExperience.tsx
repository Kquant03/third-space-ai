"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · experience
//  ─────────────────────────────────────────────────────────────────────────
//  Full-bleed chromed canvas with a floating reading plate and a peekable
//  drawer at the bottom. Composition matches Lenia's — the creature (here,
//  the ecosystem) is the room, the site chrome floats over it as another
//  lens.
//
//  Two structural differences from Lenia:
//    · View mode is a primary/secondary toggle: Ecosystem and 4D live at
//      the top of the drawer; Prey / Predator / Flow / Morphogen live
//      under a "channel isolation" disclosure.
//    · Brush channel picker — four color-coded chips for prey, predator,
//      morphogen, and composite "seed" mode.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";

import { Slider, Button } from "@/components/genesis/SubstrateControls";
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

// ───────────────────────────────────────────────────────────────────────────

export function LeniaExpandedExperience() {
  const api = useLeniaExpanded("duel");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [channelIsolationOpen, setChannelIsolationOpen] = useState(false);
  const [crossCouplingOpen, setCrossCouplingOpen] = useState(false);
  const [hyperOpen, setHyperOpen] = useState(false);

  const meta = PRESETS[api.preset];
  const totalMass = (api.mass0 + api.mass1) || 1;
  const preyPct = Math.round((api.mass0 / totalMass) * 100);
  const predPct = Math.round((api.mass1 / totalMass) * 100);

  return (
    <>
      {/* ═══ FULL-BLEED CANVAS ═══ */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <canvas
          ref={api.canvasRef}
          width={560}
          height={560}
          onMouseDown={(e) => api.handleMouse(e, true)}
          onMouseMove={(e) => api.handleMouse(e, e.buttons > 0)}
          onMouseUp={(e) => api.handleMouse(e, false)}
          onMouseLeave={(e) => api.handleMouse(e, false)}
          onContextMenu={api.handleContextMenu}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "auto",
            cursor: "default",
            imageRendering: "auto",
          }}
        />
      </div>

      {/* WebGL error banner */}
      {api.glError && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            padding: "24px 32px",
            background: "rgba(1, 1, 6, 0.9)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${COLOR.sanguine}60`,
            borderLeft: `2px solid ${COLOR.sanguine}`,
            color: COLOR.inkBody,
            maxWidth: "480px",
            fontFamily: FONT.body,
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLOR.sanguine,
              marginBottom: 10,
            }}
          >
            Substrate unavailable
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15 }}>
            {api.glError} Lenia Expanded requires WebGL2 with float texture
            support. Try a desktop browser or a newer device.
          </p>
        </div>
      )}

      {/* ═══ READING PLATE ═══ */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "calc(100vh - 220px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 200px",
          pointerEvents: "none",
        }}
      >
        <div
          className="reading-plate"
          style={{
            pointerEvents: "auto",
            maxWidth: "min(720px, 92vw)",
            marginTop: "clamp(20px, 4vh, 60px)",
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              marginBottom: 20,
            }}
          >
            {meta.name.toLowerCase()} · prey {preyPct}% · predator {predPct}%
            {api.fps > 0 && <> · {api.fps} fps</>}
          </div>

          <h2
            style={{
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(32px, 4.2vw, 52px)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: COLOR.ink,
              margin: "0 0 24px",
            }}
          >
            A four-channel ecosystem —{" "}
            <span style={{ color: COLOR.inkMuted }}>
              prey, predator, morphogen, and a four-dimensional organism
              leaking through.
            </span>
          </h2>

          <p
            style={{
              fontFamily: FONT.body,
              fontSize: 17,
              lineHeight: 1.72,
              color: COLOR.inkBody,
              margin: "0 0 20px",
            }}
          >
            Lenia's Expanded Universe (Chan, 2020) extends the original
            continuous cellular automaton with multiple interacting
            channels. Here three of them form an ecology — prey feed
            predators, predators suppress prey, and a morphogen field
            diffuses between them carrying a chemical memory of who has
            been where. The fourth channel is something else.
          </p>

          {/* ── Dihypersphaerome callout ──────────────────────── */}
          <div
            style={{
              margin: "28px 0",
              padding: "20px 24px",
              borderLeft: `2px solid ${COLOR.ghost}`,
              background: "rgba(127, 175, 179, 0.04)",
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
              topology. Rotating it through XW, YW, and ZW planes produces
              a 2D cross-section that "ventilates" — breathes in and out —
              as its fourth-dimensional structure sweeps past the plane.
              That shadow bleeds into the prey channel as generative seed.
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
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              marginBottom: 12,
            }}
          >
            what to watch for
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 22,
              fontFamily: FONT.body,
              fontSize: 15,
              lineHeight: 1.75,
              color: COLOR.inkBody,
              listStyle: "none",
            }}
          >
            <WatchBullet>
              <em>Predation flashes.</em> Where prey and predator overlap,
              the field turns brilliant green — this is the moment of
              contact, vivid and brief.
            </WatchBullet>
            <WatchBullet>
              <em>Morphogen memory.</em> A subtle teal tint lingers after
              creatures move on. The field remembers.
            </WatchBullet>
            <WatchBullet>
              <em>Ventilating shadow.</em> Load the DV Seed preset and
              watch the violet wisps pulse. The rhythm you see is the
              4D organism's rotation through its W-axis.
            </WatchBullet>
            <WatchBullet>
              <em>Advection currents.</em> Switch to the Flow view —
              colours map to velocity direction, brightness to speed.
              Ecosystem scale becomes fluid.
            </WatchBullet>
          </ul>
        </div>
      </div>

      {/* ═══ CONTROLS DRAWER ═══ */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "0 clamp(16px, 3vw, 32px)",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              display: "block",
              margin: "0 auto",
              padding: "8px 18px",
              background: "rgba(1, 1, 6, 0.75)",
              backdropFilter: "blur(20px) saturate(1.3)",
              border: `1px solid ${COLOR.inkGhost}80`,
              borderBottom: "none",
              borderRadius: "3px 3px 0 0",
              color: COLOR.inkMuted,
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 0.25s ease",
            }}
          >
            {drawerOpen ? "▾ hide controls" : "▴ controls"}
          </button>

          {drawerOpen && (
            <div
              style={{
                background: "rgba(1, 1, 6, 0.72)",
                backdropFilter: "blur(28px) saturate(1.3)",
                border: `1px solid ${COLOR.inkGhost}80`,
                borderBottom: "none",
                padding: "clamp(20px, 2.5vw, 32px) clamp(20px, 3vw, 40px)",
                maxHeight: "62vh",
                overflowY: "auto",
              }}
            >
              {/* ── Presets ── */}
              <div style={{ marginBottom: 22 }}>
                <DrawerEyebrow>ecosystem preset</DrawerEyebrow>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PRESET_LIST.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => api.loadPreset(p.id)}
                      className="genesis-hover-ghost"
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        padding: "6px 12px",
                        border: `1px solid ${api.preset === p.id ? COLOR.ghost + "80" : COLOR.inkGhost + "60"}`,
                        borderRadius: 2,
                        background: api.preset === p.id ? "rgba(127,175,179,0.08)" : "transparent",
                        color: api.preset === p.id ? COLOR.ink : COLOR.inkMuted,
                        cursor: "pointer",
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    margin: "12px 0 0",
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: COLOR.inkMuted,
                    maxWidth: "60ch",
                  }}
                >
                  {meta.desc}
                </p>
              </div>

              {/* ── Primary view mode (Ecosystem / 4D) ── */}
              <div style={{ marginBottom: 22 }}>
                <DrawerEyebrow>view</DrawerEyebrow>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRIMARY_VIEW_MODES.map((v) => (
                    <ModeChip<ViewModeId>
                      key={v.id}
                      id={v.id}
                      label={v.label}
                      active={api.viewMode === v.id}
                      onSelect={() => api.setViewMode(v.id)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Core controls grid ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 24,
                  marginBottom: 20,
                }}
              >
                <div>
                  <DrawerEyebrow>prey · ch 0</DrawerEyebrow>
                  <Slider label="μ" value={api.mu0} min={0.08} max={0.25} step={0.001} onChange={api.setMu0} format={(v) => v.toFixed(3)} />
                  <Slider label="σ" value={api.sig0} min={0.005} max={0.04} step={0.001} onChange={api.setSig0} format={(v) => v.toFixed(3)} />
                  <Slider label="R" value={api.R0} min={6} max={20} step={1} onChange={(v) => api.setR0(Math.round(v))} format={(v) => `${Math.round(v)}`} />
                </div>

                <div>
                  <DrawerEyebrow>predator · ch 1</DrawerEyebrow>
                  <Slider label="μ" value={api.mu1} min={0.12} max={0.35} step={0.001} onChange={api.setMu1} format={(v) => v.toFixed(3)} />
                  <Slider label="σ" value={api.sig1} min={0.01} max={0.05} step={0.001} onChange={api.setSig1} format={(v) => v.toFixed(3)} />
                  <Slider label="R" value={api.R1} min={8} max={22} step={1} onChange={(v) => api.setR1(Math.round(v))} format={(v) => `${Math.round(v)}`} />
                </div>

                <div>
                  <DrawerEyebrow>morphogen · ch 2</DrawerEyebrow>
                  <Slider label="μ" value={api.mu2} min={0.08} max={0.25} step={0.001} onChange={api.setMu2} format={(v) => v.toFixed(3)} />
                  <Slider label="σ" value={api.sig2} min={0.01} max={0.05} step={0.001} onChange={api.setSig2} format={(v) => v.toFixed(3)} />
                  <Slider label="R" value={api.R2} min={12} max={24} step={1} onChange={(v) => api.setR2(Math.round(v))} format={(v) => `${Math.round(v)}`} />
                </div>

                <div>
                  <DrawerEyebrow>integration</DrawerEyebrow>
                  <Slider label="dt" value={api.dt} min={0.04} max={0.2} step={0.005} onChange={api.setDt} format={(v) => v.toFixed(3)} />
                  <Slider label="spf" value={api.spf} min={1} max={6} step={1} onChange={(v) => api.setSpf(Math.round(v))} format={(v) => `${Math.round(v)}×`} />
                  <Slider label="brush" value={api.brushSize} min={2} max={30} step={1} onChange={(v) => api.setBrushSize(Math.round(v))} format={(v) => `${Math.round(v)}`} />
                </div>

                <div>
                  <DrawerEyebrow>paint channel</DrawerEyebrow>
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
                      fontFamily: FONT.display,
                      fontStyle: "italic",
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: COLOR.inkFaint,
                    }}
                  >
                    Click to paint · shift-click to erase.
                  </div>
                </div>

                <div>
                  <DrawerEyebrow>playback</DrawerEyebrow>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <Button
                      variant="primary"
                      active={api.running}
                      onClick={() => api.setRunning(!api.running)}
                    >
                      {api.running ? "pause" : "run"}
                    </Button>
                    <Button onClick={api.reset}>reset</Button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button
                      onClick={() => api.setBloom(!api.bloom)}
                      active={api.bloom}
                    >
                      bloom
                    </Button>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      color: COLOR.inkFaint,
                      lineHeight: 1.6,
                    }}
                  >
                    mass · prey {api.mass0} · pred {api.mass1}
                  </div>
                </div>
              </div>

              {/* ── Channel isolation disclosure ── */}
              <DisclosureSection
                title="channel isolation · debug views"
                open={channelIsolationOpen}
                onToggle={() => setChannelIsolationOpen(!channelIsolationOpen)}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                <p
                  style={{
                    margin: "14px 0 0",
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: COLOR.inkFaint,
                    maxWidth: "56ch",
                  }}
                >
                  Single-channel renderings for tuning and understanding.
                  The Flow view colour-codes velocity angle; Morphogen
                  shows the secreted chemical field that controls prey σ.
                </p>
              </DisclosureSection>

              {/* ── Cross-coupling disclosure ── */}
              <DisclosureSection
                title="cross-coupling · ecology strengths"
                open={crossCouplingOpen}
                onToggle={() => setCrossCouplingOpen(!crossCouplingOpen)}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 20,
                  }}
                >
                  <div>
                    <Slider label="c01 · predator → prey" value={api.c01} min={0} max={0.8} step={0.01} onChange={api.setC01} format={(v) => v.toFixed(2)} />
                    <Slider label="c10 · prey → predator" value={api.c10} min={0} max={0.8} step={0.01} onChange={api.setC10} format={(v) => v.toFixed(2)} />
                    <Slider label="c20 · morph → prey σ" value={api.c20} min={0} max={0.6} step={0.01} onChange={api.setC20} format={(v) => v.toFixed(2)} />
                  </div>
                  <div>
                    <Slider label="c02 · prey → morph" value={api.c02} min={0} max={0.2} step={0.005} onChange={api.setC02} format={(v) => v.toFixed(3)} />
                    <Slider label="c12 · pred → morph" value={api.c12} min={0} max={0.2} step={0.005} onChange={api.setC12} format={(v) => v.toFixed(3)} />
                  </div>
                </div>
              </DisclosureSection>

              {/* ── 4D / Flow disclosure ── */}
              <DisclosureSection
                title="4D rotation · flow field"
                open={hyperOpen}
                onToggle={() => setHyperOpen(!hyperOpen)}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 24,
                  }}
                >
                  <div>
                    <DrawerEyebrow>Dihypersphaerome · 4D</DrawerEyebrow>
                    <Slider label="ZW rate · breathing" value={api.rotSpeed} min={0} max={0.6} step={0.01} onChange={api.setRotSpeed} format={(v) => v.toFixed(2)} />
                    <Slider label="XW rate" value={api.rotXWSpeed} min={0} max={0.3} step={0.005} onChange={api.setRotXWSpeed} format={(v) => v.toFixed(3)} />
                    <Slider label="YW rate" value={api.rotYWSpeed} min={0} max={0.3} step={0.005} onChange={api.setRotYWSpeed} format={(v) => v.toFixed(3)} />
                    <Slider label="W slice offset" value={api.wSlice} min={-1.2} max={1.2} step={0.05} onChange={api.setWSlice} format={(v) => v.toFixed(2)} />
                    <Slider label="amplitude" value={api.hyperAmp} min={0} max={1.2} step={0.01} onChange={api.setHyperAmp} format={(v) => v.toFixed(2)} />
                    <Slider label="bleed into prey" value={api.hyperMix} min={0} max={0.4} step={0.01} onChange={api.setHyperMix} format={(v) => v.toFixed(2)} />
                  </div>

                  <div>
                    <DrawerEyebrow>flow field · advection</DrawerEyebrow>
                    <div style={{ marginBottom: 10 }}>
                      <Button
                        onClick={() => api.setFlowEnabled(!api.flowEnabled)}
                        active={api.flowEnabled}
                      >
                        {api.flowEnabled ? "flow · on" : "flow · off"}
                      </Button>
                    </div>
                    <Slider
                      label="strength"
                      value={api.flowStr}
                      min={0}
                      max={3}
                      step={0.05}
                      onChange={api.setFlowStr}
                      format={(v) => v.toFixed(2)}
                    />
                    <div style={{ marginTop: 10 }}>
                      <DrawerEyebrow>flow mode</DrawerEyebrow>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {FLOW_MODES.map((m) => (
                          <ModeChip<FlowModeId>
                            key={m.id}
                            id={m.id}
                            label={m.label}
                            active={api.flowMode === m.id}
                            onSelect={() => api.setFlowMode(m.id)}
                          />
                        ))}
                      </div>
                    </div>
                    <Slider
                      label="bloom strength"
                      value={api.bloomStr}
                      min={0}
                      max={1.2}
                      step={0.01}
                      onChange={api.setBloomStr}
                      format={(v) => v.toFixed(2)}
                    />
                  </div>
                </div>
              </DisclosureSection>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Helpers — scoped to this file to keep the composition readable
// ───────────────────────────────────────────────────────────────────────────

function DrawerEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: 9,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        color: COLOR.inkFaint,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function WatchBullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        position: "relative",
        paddingLeft: 18,
        marginBottom: 12,
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

function DisclosureSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderTop: `1px solid ${COLOR.inkGhost}50`,
        paddingTop: 16,
        marginTop: 12,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: COLOR.ghost,
        }}
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
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
