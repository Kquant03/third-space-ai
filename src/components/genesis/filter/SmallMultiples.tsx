"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · SmallMultiples
//  ─────────────────────────────────────────────────────────────────────────
//  2×2 grid of identical-axis envelope plots, one per scenario, with the
//  scenario's target marker overlaid. The invariance IS the argument that
//  the bound is derived, not scenario-chosen: same wall, different target.
//
//  Targets inside the envelope: ghost dot (achievable).
//  Targets outside the envelope: sanguine marker (unachievable).
// ═══════════════════════════════════════════════════════════════════════════

import {
  L_env,
  LY,
  SEC_PER_YR,
  logT_MIN,
  logT_MAX,
  logL_MIN,
  logL_MAX,
  L_MIN_LY,
  L_MAX_LY,
  TAU_MIN_YR,
  TAU_MAX_YR,
} from "./physics";
import { SCENARIO_LIST, Scenario } from "./scenarios";

const COLOR = {
  void: "#010106",
  voidSoft: "#0a0f1a",
  ink: "#f4f6fb",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  sanguine: "#9a2b2b",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// Local mini-plot dimensions (independent of PhasePlot's full-size viewBox)
const W = 420;
const H = 260;
const mL = 46;
const mR = 16;
const mT = 30;
const mB = 40;
const pW = W - mL - mR;
const pH = H - mT - mB;

const miniX = (tauYr: number) =>
  mL + (pW * (Math.log10(tauYr) - logT_MIN)) / (logT_MAX - logT_MIN);

const miniY = (L_ly: number) => {
  const c = Math.max(L_MIN_LY, Math.min(L_MAX_LY * 100, L_ly));
  return mT + pH * (1 - (Math.log10(c) - logL_MIN) / (logL_MAX - logL_MIN));
};

function miniEnvelopePath(lam: number, T: number, v: number, L_star: number) {
  const pts: string[] = [];
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const lt = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
    const ts = Math.pow(10, lt) * SEC_PER_YR;
    const L_ly_v = L_env(ts, lam, T, v, L_star) / LY;
    if (L_ly_v <= L_MIN_LY) continue;
    pts.push(`${miniX(Math.pow(10, lt)).toFixed(1)},${miniY(L_ly_v).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
}

function miniInfeasPath(lam: number, T: number, v: number, L_star: number) {
  const pts: string[] = [`${miniX(TAU_MIN_YR)},${mT}`];
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const lt = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
    const ts = Math.pow(10, lt) * SEC_PER_YR;
    const L_ly_v = Math.max(L_MIN_LY, L_env(ts, lam, T, v, L_star) / LY);
    pts.push(`${miniX(Math.pow(10, lt)).toFixed(1)},${miniY(L_ly_v).toFixed(1)}`);
  }
  pts.push(`${miniX(TAU_MAX_YR)},${mT}`);
  return `M ${pts.join(" L ")} Z`;
}

// ───────────────────────────────────────────────────────────────────────────

export function SmallMultiples({
  lam,
  T,
  v,
  L_star,
}: {
  lam: number;
  T: number;
  v: number;
  L_star: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "clamp(16px, 2vw, 24px)",
      }}
    >
      {SCENARIO_LIST.map((s) => (
        <MiniEnvelope key={s.id} scenario={s} lam={lam} T={T} v={v} L_star={L_star} />
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function MiniEnvelope({
  scenario,
  lam,
  T,
  v,
  L_star,
}: {
  scenario: Scenario;
  lam: number;
  T: number;
  v: number;
  L_star: number;
}) {
  const envPath = miniEnvelopePath(lam, T, v, L_star);
  const infeasPath = miniInfeasPath(lam, T, v, L_star);
  const targetX = miniX(scenario.tau_yr);
  const targetY = miniY(scenario.L_target_ly);
  const envAtTau = L_env(scenario.tau_yr * SEC_PER_YR, lam, T, v, L_star);
  const inside = scenario.L_target_ly * LY <= envAtTau;

  return (
    <div
      style={{
        padding: "16px 20px 20px",
        border: `1px solid ${COLOR.inkGhost}`,
        background: "rgba(10, 15, 26, 0.35)",
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 16,
          color: COLOR.ink,
          fontStyle: "italic",
          marginBottom: 2,
        }}
      >
        {scenario.label.toLowerCase()}
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          color: COLOR.inkMuted,
          letterSpacing: "0.06em",
        }}
      >
        {scenario.sub}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", display: "block", marginTop: 8 }}
      >
        <rect x={mL} y={mT} width={pW} height={pH} fill={COLOR.voidSoft} fillOpacity="0.55" />
        <path d={infeasPath} fill={COLOR.inkGhost} fillOpacity="0.32" />
        <path
          d={envPath}
          fill="none"
          stroke={COLOR.ink}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle
          cx={targetX}
          cy={targetY}
          r={inside ? 4 : 5}
          fill={inside ? COLOR.ghost : COLOR.sanguine}
          stroke={COLOR.void}
          strokeWidth="1"
        />
        {!inside && (
          <line
            x1={targetX - 6}
            y1={targetY}
            x2={targetX + 6}
            y2={targetY}
            stroke={COLOR.sanguine}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
        <text
          x={mL + pW / 2}
          y={H - 10}
          textAnchor="middle"
          fontFamily={FONT.mono}
          fontSize="9"
          fill={COLOR.inkFaint}
        >
          τ (log)
        </text>
        <text
          x={14}
          y={mT + pH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${mT + pH / 2})`}
          fontFamily={FONT.mono}
          fontSize="9"
          fill={COLOR.inkFaint}
        >
          L (log)
        </text>
      </svg>
      <div
        style={{
          marginTop: 6,
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.08em",
          color: inside ? COLOR.ghost : COLOR.sanguine,
          fontWeight: 500,
        }}
      >
        {inside ? "◉  target inside envelope" : "✕  target outside envelope"}
      </div>
    </div>
  );
}
