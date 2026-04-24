"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · experience
//  ─────────────────────────────────────────────────────────────────────────
//  The substrate IS the room. A full-bleed WebGL canvas fills the viewport
//  between the SiteHeader and the footer; a reading plate floats over it
//  containing the masthead, prose, and a link to the Ghost Species
//  research page. Controls live in a collapsible drawer at the bottom of
//  the viewport — open by default on wide screens, peekable on mobile.
//
//  The SiteHeader already supplies its own glass lens on scroll; the
//  reading plate adds a second. The creature glowing in the void behind
//  both is the subject, not the interface.
//
//  This file is deliberately long and self-contained — it's the composition
//  layer, so it reads top-to-bottom: full-bleed canvas → floating plate →
//  controls drawer → helper components.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";

import { Slider, Button, PresetRow, Toggle } from "@/components/genesis/SubstrateControls";
import { useLenia } from "./useLenia";
import {
  PRESETS,
  CLASSIC_PRESET_IDS,
  GHOST_PRESET_IDS,
  PALETTES,
  VIEW_MODES,
  type PresetId,
} from "./presets";

// Inlined Lantern palette (matches page.tsx / SiteChrome.tsx pattern).
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

export function LeniaExperience() {
  const api = useLenia("orbium");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const meta = PRESETS[api.preset];
  const isGhostPreset = !!meta.ghost;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* ═══ FULL-BLEED CANVAS ═══ */}
      {/* Positioned fixed so the substrate stays still as the plate
          above it scrolls (if it ever overflows). The canvas itself
          renders at 560 × 560 internal resolution and stretches to
          fill via CSS; the GPU doesn't actually rasterise more pixels
          than it needs. */}
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
            cursor: api.landscapeBrush && api.ghostMode ? "crosshair" : "default",
            // Upscale with smoothing so the low-res sim looks organic rather
            // than pixelated. imageRendering: "pixelated" is the right call
            // for something like Gray-Scott where the cells are the subject;
            // Lenia's subject is the continuous field, so we want it smooth.
            imageRendering: "auto",
          }}
        />
      </div>

      {/* WebGL error banner if the device/browser can't run the sim. */}
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
            {api.glError} Lenia requires WebGL2 with float texture support.
            Try a desktop browser or a newer device.
          </p>
        </div>
      )}

      {/* ═══ READING PLATE (scrolls over canvas) ═══ */}
      {/* One plate, vertically centered in the upper half of the viewport;
          gives the creature room to be the subject without the reader
          having to scroll to find it. On short viewports the plate pushes
          the drawer down gracefully. */}
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
            {meta.name.toLowerCase()} · {api.frameCount.toLocaleString()} steps
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
            A creature made of field —{" "}
            <span style={{ color: COLOR.inkMuted }}>
              continuous space, continuous time, continuous state.
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
            Lenia (Chan, 2018) lifts cellular automata out of the discrete
            grid. The neighbourhood is a smooth bell, the growth rule is a
            smooth Gaussian, the state is a real number in [0, 1]. At the
            right (μ, σ) the field supports stable travelling creatures —
            Orbium, Scutium, Ignis, a small zoo of solitonic organisms
            whose morphology is what their kernel permits and whose motion
            is what their growth rule drives.
          </p>

          {/* ── Ghost Species callout ────────────────────────────
              Three-sentence tease with a link to the research page.
              Rendered with the ghost-cyan left border so it reads as
              a "by the way" rather than a main claim. */}
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
              a species engineered for this substrate
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
              The Ghost Species (Orbium unicaudatus ignis var. phantasma)
              inhabits the boundary between viability and dissolution — an
              Ignis-descendant placed in a σ-landscape where the physics
              itself varies from tight to loose. It remembers a shape it
              can no longer hold, and its drift across the substrate is
              what that looks like.
            </p>
            <Link
              href="/research/ghost-species"
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
              Read the paper →
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
              <em>Soliton glide.</em> Orbium moves without deforming — its
              shape is invariant under translation.
            </WatchBullet>
            <WatchBullet>
              <em>Iridescent edges.</em> In Lantern palette, creature
              boundaries shimmer through a rainbow driven by the growth
              field. Every ghost glows a little differently.
            </WatchBullet>
            <WatchBullet>
              <em>Soup competition.</em> Load the Soup preset; many Orbia
              compete for space on a torus. Watch natural selection on a
              timescale of seconds.
            </WatchBullet>
            <WatchBullet>
              <em>Ghost drift.</em> In the Ghost presets, creatures
              migrate toward regions of kinder physics. They can tell.
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
          {/* Drawer tab */}
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
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {/* ── Preset groups ──────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <DrawerEyebrow>classic species · Chan (2018)</DrawerEyebrow>
                <PresetRow<PresetId>
                  items={CLASSIC_PRESET_IDS.map((id) => ({
                    id,
                    label: PRESETS[id].name,
                  }))}
                  active={api.preset}
                  onSelect={api.loadPreset}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <DrawerEyebrow>
                  ghost species · Sebastian &amp; Claude (2026)
                </DrawerEyebrow>
                <PresetRow<PresetId>
                  items={GHOST_PRESET_IDS.map((id) => ({
                    id,
                    label: PRESETS[id].name,
                  }))}
                  active={api.preset}
                  onSelect={api.loadPreset}
                />
              </div>

              <p
                style={{
                  margin: "0 0 24px",
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

              {/* ── Core controls row ──────────────────────────── */}
              <div
                className="lenia-drawer-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "24px",
                  marginBottom: 20,
                }}
              >
                <div>
                  <DrawerEyebrow>field</DrawerEyebrow>
                  <Slider
                    label="μ · growth centre"
                    value={api.mu}
                    min={0.05}
                    max={0.35}
                    step={0.001}
                    onChange={api.setMu}
                    format={(v) => v.toFixed(3)}
                  />
                  <Slider
                    label="σ · growth width"
                    value={api.sigma}
                    min={0.003}
                    max={0.06}
                    step={0.001}
                    onChange={api.setSigma}
                    format={(v) => v.toFixed(3)}
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
                </div>

                <div>
                  <DrawerEyebrow>integration</DrawerEyebrow>
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
                    label="spf · steps per frame"
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
                </div>

                <div>
                  <DrawerEyebrow>rendering</DrawerEyebrow>
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: COLOR.inkMuted,
                        marginBottom: 8,
                      }}
                    >
                      palette
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
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
                            border: `1px solid ${api.palette === i ? COLOR.ghost + "80" : COLOR.inkGhost + "60"}`,
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
                </div>

                <div>
                  <DrawerEyebrow>playback</DrawerEyebrow>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 12,
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
                    <Button onClick={api.clear}>clear</Button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button
                      onClick={() => api.setShowTrails(!api.showTrails)}
                      active={api.showTrails}
                    >
                      trails
                    </Button>
                    <Button
                      onClick={() => api.setBloom(!api.bloom)}
                      active={api.bloom}
                    >
                      bloom
                    </Button>
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      color: COLOR.inkFaint,
                      lineHeight: 1.6,
                    }}
                  >
                    mass: {api.mass.toFixed(0)}
                    <br />
                    click to add · shift-click to erase
                  </div>
                </div>
              </div>

              {/* ── Advanced disclosure (Ghost-specific controls) ── */}
              <div
                style={{
                  borderTop: `1px solid ${COLOR.inkGhost}50`,
                  paddingTop: 16,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
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
                  {advancedOpen ? "▾" : "▸"} ghost mode · σ-field &amp; season
                </button>

                {advancedOpen && (
                  <div
                    style={{
                      marginTop: 16,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 20,
                    }}
                  >
                    <div>
                      <DrawerEyebrow>ghost controls</DrawerEyebrow>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        <Button
                          onClick={() => api.setGhostMode(!api.ghostMode)}
                          active={api.ghostMode}
                          variant={api.ghostMode ? "primary" : "default"}
                        >
                          ghost mode
                        </Button>
                        <Button
                          onClick={() => api.setLandscapeBrush(!api.landscapeBrush)}
                          active={api.landscapeBrush}
                          disabled={!api.ghostMode}
                        >
                          {api.landscapeBrush ? "painting σ" : "paint σ"}
                        </Button>
                      </div>
                      <div
                        style={{
                          fontFamily: FONT.display,
                          fontStyle: "italic",
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: COLOR.inkFaint,
                        }}
                      >
                        In paint mode, click to raise σ (loosen physics —
                        creatures will struggle there). Shift-click to lower
                        σ (kinder physics — safe harbor).
                      </div>
                    </div>

                    <div>
                      <DrawerEyebrow>seasonal oscillation</DrawerEyebrow>
                      <div style={{ marginBottom: 10 }}>
                        <Button
                          onClick={() => api.setSeasonEnabled(!api.seasonEnabled)}
                          active={api.seasonEnabled}
                          disabled={!api.ghostMode}
                        >
                          season
                        </Button>
                      </div>
                      <Slider
                        label="speed"
                        value={api.seasonSpeed}
                        min={0.02}
                        max={1.0}
                        step={0.01}
                        onChange={api.setSeasonSpeed}
                        format={(v) => v.toFixed(2)}
                      />
                      <Slider
                        label="amplitude"
                        value={api.seasonAmp}
                        min={0.05}
                        max={0.5}
                        step={0.01}
                        onChange={api.setSeasonAmp}
                        format={(v) => v.toFixed(2)}
                      />
                      <div
                        style={{
                          fontFamily: FONT.mono,
                          fontSize: 10,
                          color: COLOR.inkFaint,
                          marginTop: 6,
                        }}
                      >
                        phase: {api.seasonPhase.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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
