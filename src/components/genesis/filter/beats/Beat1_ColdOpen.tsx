"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 1 — Playable cold open
//  ─────────────────────────────────────────────────────────────────────────
//  A draggable galaxy widget. The reader sets v/c and τ, watches a token
//  reach outward, and discovers (silently) that reach scales linearly
//  with τ. No bound revealed yet. Ciechanowski-style cold open: the
//  artifact precedes the formalism.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, Italic, Kicker, Mono, SliderRow, btnGhost, btnFaint,
} from "../atoms";
import { fmtL_ly, fmtTau } from "../physics";

export function Beat1_ColdOpen() {
  const [vRatio, setVRatio] = useState(1.0);
  const [tau, setTau] = useState(1e3);
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!running) return;
    let raf: number;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => {
        const next = prev + dt * 0.5;
        if (next >= 1) {
          setRunning(false);
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Reach in light-years if τ is in years and v in fraction of c
  const reachLy = vRatio * (tau / 2);

  // Galaxy box dimensions
  const W = 540;
  const H = 380;
  const cx = W / 2;
  const cy = H / 2;
  const galaxyR = Math.min(W, H) * 0.42;
  const reachR = Math.min(galaxyR, (reachLy / 1e5) * galaxyR) * t;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "12vh clamp(28px, 6vw, 80px) 8vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        alignContent: "center",
        gap: "clamp(28px, 4vw, 64px)",
      }}
    >
      <div>
        <Kicker color={COLOR.ghost}>beat 01 · cold open</Kicker>
        <div style={{ marginTop: 24 }}>
          <DisplayHeading size={64}>
            Imagine a civilization
            <br />
            reaching outward.
          </DisplayHeading>
        </div>
        <div style={{ marginTop: 32, display: "grid", gap: 20, maxWidth: "60ch" }}>
          <Body>
            Pick a fraction of lightspeed. Pick a duration. Watch the
            civilization reach. There are no rules in this widget yet —
            only what light allows. Hanson's grabby model puts{" "}
            <Mono>v/c ≈ 0.5</Mono> and asks the bubble to fill a galaxy.
          </Body>
          <Body muted>
            <Italic>The first wall enters in a moment.</Italic> It is
            the wall you cannot negotiate with — the speed at which any
            signal can travel, set by the geometry of spacetime itself.
          </Body>
        </div>
      </div>

      <div
        style={{
          background: COLOR.voidSoft,
          border: `1px solid ${COLOR.inkVeil}`,
          padding: "clamp(20px, 2vw, 36px)",
          maxWidth: 640,
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          <defs>
            <radialGradient id="galaxyG-1" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={COLOR.ghost} stopOpacity="0.18" />
              <stop offset="0.4" stopColor={COLOR.ghostSoft} stopOpacity="0.08" />
              <stop offset="1" stopColor={COLOR.void} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx={cx} cy={cy}
            rx={galaxyR} ry={galaxyR * 0.55}
            fill="url(#galaxyG-1)"
          />
          {/* Stars */}
          {Array.from({ length: 90 }).map((_, i) => {
            const ang = (i / 90) * Math.PI * 2 + (i % 7) * 0.21;
            const rr = ((i * 37) % 100) / 100;
            const r = galaxyR * (0.15 + rr * 0.85);
            const sx = cx + r * Math.cos(ang);
            const sy = cy + r * 0.55 * Math.sin(ang);
            const size = 0.4 + ((i * 13) % 7) / 6;
            return (
              <circle
                key={i}
                cx={sx} cy={sy} r={size}
                fill={COLOR.inkBody}
                opacity={0.4 + ((i * 17) % 6) / 12}
              />
            );
          })}
          {/* Civilization core */}
          <circle cx={cx} cy={cy} r={4} fill={COLOR.amber} />
          {/* Reach */}
          {t > 0 && (
            <>
              <circle
                cx={cx} cy={cy} r={reachR}
                fill="none"
                stroke={COLOR.ghost} strokeWidth="1.4" strokeOpacity="0.7"
                strokeDasharray="3 3"
              />
              <circle
                cx={cx} cy={cy} r={reachR}
                fill={COLOR.ghost} fillOpacity="0.06"
              />
            </>
          )}
          <text
            x={W - 18} y={26}
            textAnchor="end"
            fontFamily={FONT.mono} fontSize="10"
            fill={COLOR.inkMuted} letterSpacing="0.18em"
          >
            REACH · {fmtL_ly(reachLy)}
          </text>
        </svg>

        <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
          <SliderRow
            label="v / c"
            value={vRatio} min={0.05} max={1} step={0.01}
            display={vRatio.toFixed(2)}
            onChange={setVRatio}
          />
          <SliderRow
            label="τ (years)"
            value={Math.log10(tau)} min={0} max={9} step={0.05}
            display={fmtTau(tau)}
            onChange={(v) => setTau(Math.pow(10, v))}
          />
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setT(0);
              setRunning(true);
            }}
            style={btnGhost()}
          >
            run
          </button>
          <button onClick={() => setT(0)} style={btnFaint()}>
            reset
          </button>
        </div>
      </div>
    </div>
  );
}
