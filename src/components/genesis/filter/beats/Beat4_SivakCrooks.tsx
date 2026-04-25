"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 4 — Sivak–Crooks colloidal-bead explorable
//  ─────────────────────────────────────────────────────────────────────────
//  THE NOVEL ARTIFACT. No popular visualization of finite-time stochastic
//  thermodynamics exists at this resolution. We show: a colloidal bead
//  in an overdamped harmonic trap whose center is displaced from x=0 to
//  x=1 over time τ. The reader varies τ and watches dissipated work
//  fall as 1/τ. The Sivak–Crooks bound ⟨W_ex⟩ ≥ kT ℒ²/τ becomes
//  intuitive in seconds.
//
//  Implementation: Real Langevin integration via simulateBeadProtocol.
//  Two protocols shown side-by-side: a "fast" pull (small τ) and a
//  "slow" pull (large τ, slider-controlled). The dissipation accumulator
//  bar visually fills, and the 1/τ curve plots the bound.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, EquationCard, Italic, Kicker, Mono, SliderRow, btnGhost,
} from "../atoms";
import { simulateBeadProtocol, sivakCrooksDissipation } from "../physics";

export function Beat4_SivakCrooks() {
  const [tau, setTau] = useState(2.0); // dimensionless protocol duration
  const [tick, setTick] = useState(0); // re-runs simulation

  // Protocol: linearly move trap center from 0 to 1 over τ
  const samples = useMemo(() => {
    const protocol = [
      { t: 0, x: 0 },
      { t: tau, x: 1 },
    ];
    return simulateBeadProtocol(protocol, tau, 0.01);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tau, tick]);

  const finalDissipation = samples[samples.length - 1]?.dissipated ?? 0;
  const bound = sivakCrooksDissipation(tau, 1, 1) ; // dimensionless
  const excessRatio = finalDissipation / bound;

  // 1/τ floor curve
  const tauRange = useMemo(() => {
    const pts: { tau: number; W: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const t = 0.1 + (i / 79) * 9.9;
      pts.push({ tau: t, W: 1 / t }); // ⟨W_ex⟩ = ℒ²/τ in dimensionless units
    }
    return pts;
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "12vh clamp(28px, 6vw, 80px) 8vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "clamp(28px, 4vw, 48px)",
        alignContent: "center",
      }}
    >
      <div>
        <Kicker color={COLOR.amber}>beat 03·5 · the price of moving fast</Kicker>
        <div style={{ marginTop: 18 }}>
          <DisplayHeading size={56}>
            Speed costs heat.
            <br />
            Always.
          </DisplayHeading>
        </div>
        <div style={{ marginTop: 32, display: "grid", gap: 20, maxWidth: "60ch" }}>
          <Body>
            Drag the slider. A single colloidal bead sits in a harmonic trap;
            the trap moves from <Mono>x = 0</Mono> to <Mono>x = 1</Mono> over
            duration <Mono>τ</Mono>. The bead lags. The lag is a stochastic
            force pushing back on the trap. The trap-mover does work against
            it. <Italic>That work is the dissipation</Italic> — the heat
            exhausted into the bath as the protocol runs.
          </Body>
          <Body>
            Sivak & Crooks (2012) proved this dissipation has a floor:
          </Body>
          <EquationCard
            eq="⟨ W_ex ⟩  ≥  kT ℒ² / τ"
            sub="counterdiabatic excess for any finite-time protocol with thermodynamic length ℒ"
            accent={COLOR.amber}
          />
          <Body muted>
            Slow the protocol — pay less. Halve τ — pay double. The 1/τ scaling
            is universal across protocols and substrates. It is what makes
            the energetic tooth grow as <Mono>√τ</Mono>: the per-event cost
            falls as <Mono>1/τ</Mono>, but the number of events scales as the
            boundary area, and these compose into a sub-linear envelope.
          </Body>
        </div>
      </div>

      <BeadVisualization
        tau={tau}
        samples={samples}
        finalDissipation={finalDissipation}
        bound={bound}
        excessRatio={excessRatio}
        onTauChange={setTau}
        onRerun={() => setTick((t) => t + 1)}
        tauRange={tauRange}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function BeadVisualization({
  tau,
  samples,
  finalDissipation,
  bound,
  excessRatio,
  onTauChange,
  onRerun,
  tauRange,
}: {
  tau: number;
  samples: { t: number; x_bead: number; x_trap: number; dissipated: number }[];
  finalDissipation: number;
  bound: number;
  excessRatio: number;
  onTauChange: (v: number) => void;
  onRerun: () => void;
  tauRange: { tau: number; W: number }[];
}) {
  const [phase, setPhase] = useState(0); // 0..1 animation through the protocol

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const dur = Math.max(800, tau * 1200);
    const loop = (t: number) => {
      if (start === null) start = t;
      const u = Math.min(1, (t - start) / dur);
      setPhase(u);
      if (u < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tau, samples]);

  const idx = Math.min(samples.length - 1, Math.floor(phase * samples.length));
  const cur = samples[idx] ?? { x_bead: 0, x_trap: 0, dissipated: 0 };

  // Bead box dimensions (left half)
  const W = 600;
  const H = 200;
  const xToPx = (x: number) => 60 + x * (W - 120);
  const yMid = H / 2;

  // Dissipation plot (right half, 1/τ floor curve)
  const PW = 600;
  const PH = 220;
  const plotMargin = { l: 50, r: 20, t: 20, b: 40 };
  const plotW = PW - plotMargin.l - plotMargin.r;
  const plotH = PH - plotMargin.t - plotMargin.b;
  const tauMin = 0.1;
  const tauMax = 10;
  const wMax = 11;
  const wToY = (W: number) =>
    plotMargin.t + plotH * (1 - Math.min(1, W / wMax));
  const tauToX = (t: number) =>
    plotMargin.l + (plotW * (Math.log10(t) - Math.log10(tauMin))) /
      (Math.log10(tauMax) - Math.log10(tauMin));

  const floorPath = tauRange
    .map((p, i) => `${i === 0 ? "M" : "L"} ${tauToX(p.tau).toFixed(2)} ${wToY(p.W).toFixed(2)}`)
    .join(" ");

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
        background: COLOR.voidSoft,
        border: `1px solid ${COLOR.inkVeil}`,
        padding: "clamp(20px, 2vw, 32px)",
        maxWidth: 720,
      }}
    >
      {/* Bead in trap */}
      <div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
            marginBottom: 10,
          }}
        >
          colloidal bead in moving harmonic trap
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          {/* trap parabola */}
          <TrapParabola xCenter={cur.x_trap} W={W} H={H} xToPx={xToPx} />
          {/* x-axis */}
          <line
            x1={50} y1={H - 30} x2={W - 50} y2={H - 30}
            stroke={COLOR.inkGhost} strokeWidth="1"
          />
          {[0, 0.5, 1].map((tk) => (
            <g key={tk}>
              <line
                x1={xToPx(tk)} y1={H - 35} x2={xToPx(tk)} y2={H - 25}
                stroke={COLOR.inkFaint} strokeWidth="1"
              />
              <text
                x={xToPx(tk)} y={H - 12}
                textAnchor="middle"
                fontFamily={FONT.mono} fontSize="9" fill={COLOR.inkMuted}
              >
                {tk.toFixed(1)}
              </text>
            </g>
          ))}
          {/* trap center marker */}
          <line
            x1={xToPx(cur.x_trap)} y1={yMid - 60}
            x2={xToPx(cur.x_trap)} y2={yMid + 30}
            stroke={COLOR.amber} strokeWidth="1.2" strokeDasharray="3 3"
          />
          <text
            x={xToPx(cur.x_trap)} y={yMid - 70}
            textAnchor="middle"
            fontFamily={FONT.mono} fontSize="9" fill={COLOR.amber}
          >
            trap
          </text>
          {/* bead */}
          <circle
            cx={xToPx(cur.x_bead)} cy={yMid}
            r="9"
            fill={COLOR.ghost}
            stroke={COLOR.ink} strokeWidth="1.5"
          />
          {/* lag indicator */}
          {Math.abs(cur.x_trap - cur.x_bead) > 0.02 && (
            <line
              x1={xToPx(cur.x_bead)} y1={yMid}
              x2={xToPx(cur.x_trap)} y2={yMid}
              stroke={COLOR.sanguineWash} strokeWidth="1.4"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>

      {/* Dissipation accumulator */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: FONT.mono,
            fontSize: 10.5,
            color: COLOR.inkMuted,
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          <span>dissipated work this run</span>
          <span style={{ color: COLOR.amber }}>
            {cur.dissipated.toFixed(2)} kT  ·  bound = {bound.toFixed(2)} kT
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: COLOR.inkVeil,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: `${Math.min(100, (cur.dissipated / 5) * 100)}%`,
              background: excessRatio > 1.5 ? COLOR.sanguine : COLOR.amber,
              transition: "width 80ms linear",
            }}
          />
          {/* bound marker */}
          <div
            style={{
              position: "absolute",
              left: `${Math.min(100, (bound / 5) * 100)}%`,
              top: -3, bottom: -3,
              width: 1.5,
              background: COLOR.ink,
            }}
          />
        </div>
      </div>

      {/* Slider */}
      <SliderRow
        label="τ — protocol duration"
        value={tau}
        min={0.2} max={10} step={0.05}
        display={`${tau.toFixed(2)} (1/τ = ${(1/tau).toFixed(2)})`}
        onChange={onTauChange}
      />
      <button onClick={onRerun} style={btnGhost()}>
        re-run with new noise
      </button>

      {/* 1/τ floor plot */}
      <div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
            marginTop: 12, marginBottom: 6,
          }}
        >
          ⟨W_ex⟩ floor across τ — Sivak–Crooks bound
        </div>
        <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: "100%", display: "block" }}>
          {/* axes */}
          <line
            x1={plotMargin.l} y1={plotMargin.t}
            x2={plotMargin.l} y2={plotMargin.t + plotH}
            stroke={COLOR.inkGhost}
          />
          <line
            x1={plotMargin.l} y1={plotMargin.t + plotH}
            x2={plotMargin.l + plotW} y2={plotMargin.t + plotH}
            stroke={COLOR.inkGhost}
          />
          <text
            x={plotMargin.l + plotW / 2}
            y={PH - 8}
            textAnchor="middle"
            fontFamily={FONT.mono} fontSize="10"
            fill={COLOR.inkMuted} letterSpacing="0.16em"
          >
            τ (log)
          </text>
          {/* floor curve */}
          <path
            d={floorPath}
            fill="none"
            stroke={COLOR.amber}
            strokeWidth="2"
          />
          {/* current τ marker */}
          <line
            x1={tauToX(tau)} y1={plotMargin.t}
            x2={tauToX(tau)} y2={plotMargin.t + plotH}
            stroke={COLOR.ghost} strokeWidth="1.2" strokeDasharray="3 3"
          />
          <circle
            cx={tauToX(tau)}
            cy={wToY(1 / tau)}
            r="5"
            fill={COLOR.void}
            stroke={COLOR.ghost} strokeWidth="2"
          />
          <text
            x={tauToX(tau) + 8}
            y={wToY(1 / tau) - 6}
            fontFamily={FONT.mono}
            fontSize="9.5"
            fill={COLOR.ghost}
          >
            ⟨W⟩ = {(1 / tau).toFixed(2)} kT ℒ²
          </text>
        </svg>
      </div>
    </div>
  );
}

function TrapParabola({
  xCenter, W, H, xToPx,
}: {
  xCenter: number;
  W: number;
  H: number;
  xToPx: (x: number) => number;
}) {
  // Render trap as a faint parabola opening upward
  const yMid = H / 2;
  const k = 220; // visual scale
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = -0.4 + (i / 40) * 1.8;
    const y = yMid - 24 + k * (x - xCenter) ** 2;
    if (y > yMid + 24) continue;
    pts.push(`${xToPx(x).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <path
      d={pts.length ? `M ${pts.join(" L ")}` : ""}
      fill="none"
      stroke={COLOR.amber}
      strokeWidth="1.2"
      strokeOpacity="0.4"
    />
  );
}
