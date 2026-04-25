"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · PhasePlot (v14)
//  ─────────────────────────────────────────────────────────────────────────
//  The single sticky visualisation that recurs across beats 1 → 11. Reads
//  a PlotState (from scenarios.ts) and conditionally renders each layer
//  with crossfade transitions.
//
//  Layers, in z-order:
//    background gradient
//    axes + decade gridlines + tick labels
//    agent-timescale band
//    infeasible region (forbidden, sanguine hatch)
//    L_R curve (light-blue ghost) — fades to dashed when envelope active
//    L_E curve (amber)            — fades to dashed when envelope active
//    envelope (ink)
//    τ* cusp marker
//    parameter overlay sweep (beat 8)
//    scenario target marks
//    prediction curve (You-Draw-It)
//    strategy trajectories
//    small-multiples overlay (beat 7 only — replaces main plot content)
//
//  Drag interactions for the prediction curve are delegated to a
//  PredictionCurve sub-component to keep this file focused on layer
//  composition.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  L_R, L_E, L_env, tau_star, SEC_PER_YR, LY,
  PLOT, TAU_MIN_YR, TAU_MAX_YR, L_MIN_LY, L_MAX_LY,
  logT_MIN, logT_MAX, logL_MIN, logL_MAX,
  tauYrToX, lLyToY,
  fmtTau, fmtDecades, fmtDecadesL,
} from "./physics";
import {
  PlotState, SCENARIO_LIST, plotStateForBeat,
} from "./scenarios";
import { COLOR, FONT } from "./styles";
import { PredictionCurve, PredictionPoint } from "./PredictionCurve";
import { TrajectoryRender } from "./TrajectoryRender";

// ─── Default scenarios for trajectory display (galactic) ──────────────────

const TRAJ_SCENARIO = SCENARIO_LIST[3]; // galactic

// ───────────────────────────────────────────────────────────────────────────
//  PhasePlot — main component
// ───────────────────────────────────────────────────────────────────────────

export type PhasePlotProps = {
  beatId: number;
  params: { lam: number; T: number; v: number; L_star: number };
  prediction?: PredictionPoint[];
  onPredictionChange?: (pts: PredictionPoint[]) => void;
  trajectoryProgress?: number; // 0..1 — driven by FilterExperience clock
};

export function PhasePlot({
  beatId,
  params,
  prediction,
  onPredictionChange,
  trajectoryProgress = 0,
}: PhasePlotProps) {
  const state = plotStateForBeat(beatId);
  const { lam, T, v, L_star } = params;

  // Decade ticks
  const tauTicks = useMemo(() => {
    const t: number[] = [];
    for (let lt = Math.ceil(logT_MIN); lt <= Math.floor(logT_MAX); lt++) t.push(lt);
    return t;
  }, []);
  const lTicks = useMemo(() => {
    const t: number[] = [];
    for (let ll = Math.ceil(logL_MIN); ll <= Math.floor(logL_MAX); ll++) t.push(ll);
    return t;
  }, []);

  const tauStarYr = tau_star(lam, T, v, L_star) / SEC_PER_YR;

  // ─── Path generators ────────────────────────────────────────────────
  const paths = useMemo(() => {
    const N = 280;

    const lr: string[] = [];
    const le: string[] = [];
    const env: string[] = [];
    const inf: string[] = [`${tauYrToX(TAU_MIN_YR).toFixed(2)},${PLOT.mT}`];

    for (let i = 0; i <= N; i++) {
      const lt = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
      const ts = Math.pow(10, lt) * SEC_PER_YR;
      const x = tauYrToX(Math.pow(10, lt));

      const lr_m = L_R(ts, v);
      const le_m = L_E(ts, lam, T, L_star);
      const env_m = Math.min(lr_m, le_m);

      const lr_ly = lr_m / LY;
      const le_ly = le_m / LY;
      const env_ly = env_m / LY;

      if (lr_ly > L_MIN_LY && lr_ly <= L_MAX_LY * 100)
        lr.push(`${x.toFixed(2)},${lLyToY(lr_ly).toFixed(2)}`);
      if (le_ly > L_MIN_LY && le_ly <= L_MAX_LY * 100)
        le.push(`${x.toFixed(2)},${lLyToY(le_ly).toFixed(2)}`);
      if (env_ly > L_MIN_LY)
        env.push(`${x.toFixed(2)},${lLyToY(env_ly).toFixed(2)}`);

      const env_clamped = Math.max(L_MIN_LY, env_ly);
      inf.push(`${x.toFixed(2)},${lLyToY(env_clamped).toFixed(2)}`);
    }
    inf.push(`${tauYrToX(TAU_MAX_YR).toFixed(2)},${PLOT.mT}`);

    return {
      lrPath: lr.length >= 2 ? `M ${lr.join(" L ")}` : "",
      lePath: le.length >= 2 ? `M ${le.join(" L ")}` : "",
      envPath: env.length >= 2 ? `M ${env.join(" L ")}` : "",
      infPath: `M ${inf.join(" L ")} Z`,
    };
  }, [lam, T, v, L_star]);

  // ─── Overlay variants for beat 8 ────────────────────────────────────
  const overlayVariants = useMemo(() => {
    if (!state.overlay) return [];
    const variants = [
      { label: "λ = 0.1 nm",    lam: 1e-10, T,        v, L_star, color: COLOR.amber },
      { label: "λ = 1 nm  (default)", lam: 1e-9,  T,        v, L_star, color: COLOR.ghost },
      { label: "λ = 10 nm",     lam: 1e-8,  T,        v, L_star, color: COLOR.ghostSoft },
      { label: "T = 30 K",      lam,        T: 30,    v, L_star, color: COLOR.sanguineWash },
    ];
    return variants.map((va) => {
      const pts: string[] = [];
      const N = 200;
      for (let i = 0; i <= N; i++) {
        const lt = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
        const ts = Math.pow(10, lt) * SEC_PER_YR;
        const Llv = L_env(ts, va.lam, va.T, va.v, va.L_star) / LY;
        if (Llv <= L_MIN_LY || Llv > L_MAX_LY * 100) continue;
        pts.push(
          `${tauYrToX(Math.pow(10, lt)).toFixed(2)},${lLyToY(Llv).toFixed(2)}`,
        );
      }
      return {
        ...va,
        path: pts.length >= 2 ? `M ${pts.join(" L ")}` : "",
      };
    });
  }, [state.overlay, lam, T, v, L_star]);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <svg
      viewBox={`0 0 ${PLOT.W} ${PLOT.H}`}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        userSelect: "none",
        touchAction: "pan-y",
        background: COLOR.voidDeep,
      }}
    >
      <defs>
        <linearGradient id="bgFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.voidSoft} stopOpacity="1" />
          <stop offset="1" stopColor={COLOR.voidDeep} stopOpacity="1" />
        </linearGradient>
        <linearGradient id="infeas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.sanguine} stopOpacity="0.18" />
          <stop offset="1" stopColor={COLOR.sanguine} stopOpacity="0.04" />
        </linearGradient>
        <pattern
          id="hatch"
          width="6" height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <line
            x1="0" y1="0" x2="0" y2="6"
            stroke={COLOR.sanguine} strokeOpacity="0.18" strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect
        x={PLOT.mL} y={PLOT.mT}
        width={PLOT.plotW} height={PLOT.plotH}
        fill="url(#bgFade)"
      />

      {/* ─ Axes + grid ─ */}
      <g style={{ opacity: state.axes ? 1 : 0, transition: "opacity 600ms" }}>
        {tauTicks.map((lt) => {
          const x = tauYrToX(Math.pow(10, lt));
          return (
            <g key={`tx-${lt}`}>
              <line
                x1={x} y1={PLOT.mT} x2={x} y2={PLOT.mT + PLOT.plotH}
                stroke={COLOR.inkVeil} strokeWidth="1"
              />
              <text
                x={x} y={PLOT.mT + PLOT.plotH + 22}
                textAnchor="middle"
                fontFamily={FONT.mono} fontSize="10" fill={COLOR.inkFaint}
              >
                {fmtDecades(lt)}
              </text>
            </g>
          );
        })}
        {lTicks.map((ll) => {
          const y = lLyToY(Math.pow(10, ll));
          return (
            <g key={`ly-${ll}`}>
              <line
                x1={PLOT.mL} y1={y} x2={PLOT.mL + PLOT.plotW} y2={y}
                stroke={COLOR.inkVeil} strokeWidth="1"
              />
              <text
                x={PLOT.mL - 12} y={y + 3}
                textAnchor="end"
                fontFamily={FONT.mono} fontSize="10" fill={COLOR.inkFaint}
              >
                {fmtDecadesL(ll)}
              </text>
            </g>
          );
        })}
        <rect
          x={PLOT.mL} y={PLOT.mT}
          width={PLOT.plotW} height={PLOT.plotH}
          fill="none" stroke={COLOR.inkGhost} strokeWidth="1"
        />
        <text
          x={PLOT.mL + PLOT.plotW / 2} y={PLOT.H - 22}
          textAnchor="middle"
          fontFamily={FONT.mono} fontSize="11"
          letterSpacing="0.18em" fill={COLOR.inkMuted}
        >
          τ — RESPONSE TIMESCALE
        </text>
        <text
          x={26} y={PLOT.mT + PLOT.plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 26, ${PLOT.mT + PLOT.plotH / 2})`}
          fontFamily={FONT.mono} fontSize="11"
          letterSpacing="0.18em" fill={COLOR.inkMuted}
        >
          L — COORDINATED EXTENT
        </text>
      </g>

      {/* ─ Agent-plausible band ─ */}
      <g style={{ opacity: state.agentBand ? 1 : 0, transition: "opacity 600ms" }}>
        <rect
          x={tauYrToX(0.001)} y={PLOT.mT}
          width={tauYrToX(1000) - tauYrToX(0.001)} height={PLOT.plotH}
          fill={COLOR.ghost} fillOpacity="0.025"
        />
        <text
          x={tauYrToX(1)} y={PLOT.mT + 18}
          textAnchor="middle"
          fontFamily={FONT.mono} fontSize="9"
          letterSpacing="0.2em" fill={COLOR.ghostSoft}
          opacity="0.7"
        >
          AGENT-PLAUSIBLE τ
        </text>
      </g>

      {/* ─ Infeasible region ─ */}
      <g style={{ opacity: state.infeasible ? 1 : 0, transition: "opacity 800ms" }}>
        <path d={paths.infPath} fill="url(#infeas)" />
        <path d={paths.infPath} fill="url(#hatch)" />
        <text
          x={tauYrToX(1e6)} y={PLOT.mT + 60}
          textAnchor="middle"
          fontFamily={FONT.display} fontStyle="italic" fontSize="22"
          fill={COLOR.sanguineWash} opacity="0.7"
        >
          forbidden
        </text>
      </g>

      {/* ─ Small multiples mode (beat 7) replaces L_R / L_E / envelope ─ */}
      {state.smallMultiples && (
        <SmallMultiplesInside lam={lam} T={T} v={v} L_star={L_star} />
      )}

      {/* ─ L_R curve ─ */}
      {!state.smallMultiples && (
        <g style={{ opacity: state.L_R ? 1 : 0, transition: "opacity 600ms" }}>
          <path
            d={paths.lrPath} fill="none"
            stroke={COLOR.ghost}
            strokeWidth={state.envelope ? 1 : 1.8}
            strokeOpacity={state.envelope ? 0.4 : 1}
            strokeDasharray={state.envelope ? "4 3" : "none"}
            strokeLinecap="round"
          />
          {!state.envelope && state.L_R && (
            <text
              x={tauYrToX(1e7)}
              y={lLyToY(L_R(1e7 * SEC_PER_YR, v) / LY) - 14}
              fontFamily={FONT.mono} fontSize="11" fill={COLOR.ghost}
              fontWeight="500"
            >
              L_R = vτ/2  ·  light
            </text>
          )}
        </g>
      )}

      {/* ─ L_E curve ─ */}
      {!state.smallMultiples && (
        <g style={{ opacity: state.L_E ? 1 : 0, transition: "opacity 600ms" }}>
          <path
            d={paths.lePath} fill="none"
            stroke={COLOR.amber}
            strokeWidth={state.envelope ? 1 : 1.8}
            strokeOpacity={state.envelope ? 0.4 : 1}
            strokeDasharray={state.envelope ? "4 3" : "none"}
            strokeLinecap="round"
          />
          {!state.envelope && state.L_E && (
            <text
              x={tauYrToX(1e6)}
              y={lLyToY(L_E(1e6 * SEC_PER_YR, lam, T, L_star) / LY) + 22}
              fontFamily={FONT.mono} fontSize="11" fill={COLOR.amber}
              fontWeight="500"
            >
              L_E = λ√(L⊙τ/kT ln2)  ·  heat
            </text>
          )}
        </g>
      )}

      {/* ─ Envelope ─ */}
      {!state.smallMultiples && (
        <g style={{ opacity: state.envelope ? 1 : 0, transition: "opacity 800ms" }}>
          <path
            d={paths.envPath} fill="none"
            stroke={COLOR.ink} strokeWidth="2.4"
            strokeLinejoin="round" strokeLinecap="round"
          />
        </g>
      )}

      {/* ─ τ* cusp marker ─ */}
      {state.tauStar && (
        <g>
          <line
            x1={tauYrToX(tauStarYr)} y1={PLOT.mT}
            x2={tauYrToX(tauStarYr)} y2={PLOT.mT + PLOT.plotH}
            stroke={COLOR.ghostSoft} strokeWidth="1"
            strokeDasharray="2 4" strokeOpacity="0.6"
          />
          <circle
            cx={tauYrToX(tauStarYr)}
            cy={lLyToY(L_env(tauStarYr * SEC_PER_YR, lam, T, v, L_star) / LY)}
            r="6"
            fill={COLOR.void} stroke={COLOR.ink} strokeWidth="2"
          />
          <text
            x={tauYrToX(tauStarYr) + 12} y={PLOT.mT + 32}
            fontFamily={FONT.display} fontStyle="italic" fontSize="20"
            fill={COLOR.ink}
          >
            τ*
          </text>
          <text
            x={tauYrToX(tauStarYr) + 12} y={PLOT.mT + 50}
            fontFamily={FONT.mono} fontSize="9" fill={COLOR.inkMuted}
          >
            {fmtTau(tauStarYr)}
          </text>
        </g>
      )}

      {/* ─ Overlay sweep (beat 8) ─ */}
      {state.overlay &&
        overlayVariants.map((va, i) => (
          <g key={i}>
            <path
              d={va.path} fill="none"
              stroke={va.color} strokeWidth="1.5" strokeOpacity="0.85"
            />
            <text
              x={PLOT.mL + PLOT.plotW - 14}
              y={PLOT.mT + 22 + i * 16}
              textAnchor="end"
              fontFamily={FONT.mono} fontSize="10" fill={va.color}
            >
              {va.label}
            </text>
          </g>
        ))}

      {/* ─ Scenario marks ─ */}
      {state.scenarioMarks &&
        SCENARIO_LIST.map((s) => {
          const x = tauYrToX(s.tau_yr);
          const y = lLyToY(s.L_target_ly);
          const envAt = L_env(s.tau_yr * SEC_PER_YR, lam, T, v, L_star);
          const inside = s.L_target_ly * LY <= envAt;
          return (
            <g key={s.id}>
              <circle
                cx={x} cy={y}
                r={inside ? 5 : 6}
                fill={inside ? COLOR.ghost : COLOR.sanguine}
                stroke={COLOR.void} strokeWidth="1.5"
              />
              {!inside && (
                <line
                  x1={x - 6} y1={y} x2={x + 6} y2={y}
                  stroke={COLOR.sanguine} strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}

      {/* ─ Prediction curve (You-Draw-It) ─ */}
      {state.prediction && prediction && (
        <PredictionCurve
          points={prediction}
          editable={!state.predictionLocked}
          onChange={onPredictionChange}
        />
      )}

      {/* ─ Trajectory rendering for strategy beats ─ */}
      {state.trajectory && (
        <TrajectoryRender
          scenarioId="galactic"
          progress={trajectoryProgress}
          strategy={state.trajectory}
          showCoordinationChannel={state.fissionMode === "branch"}
          lam={lam} T={T} v={v} L_star={L_star}
        />
      )}
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Small-multiples-inside-plot — beat 7 mode where the main plot area
//  becomes a 2×2 grid of envelopes, one per scenario, with shared axes.
// ───────────────────────────────────────────────────────────────────────────

function SmallMultiplesInside({
  lam, T, v, L_star,
}: {
  lam: number; T: number; v: number; L_star: number;
}) {
  const cellW = PLOT.plotW / 2;
  const cellH = PLOT.plotH / 2;

  return (
    <g>
      {SCENARIO_LIST.map((s, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = PLOT.mL + col * cellW;
        const cy = PLOT.mT + row * cellH;

        const localX = (tauYr: number) =>
          cx + (cellW * (Math.log10(tauYr) - logT_MIN)) / (logT_MAX - logT_MIN);
        const localY = (Lly: number) => {
          const c = Math.max(L_MIN_LY, Math.min(L_MAX_LY * 100, Lly));
          return cy + cellH * (1 - (Math.log10(c) - logL_MIN) / (logL_MAX - logL_MIN));
        };

        const pts: string[] = [];
        const inf: string[] = [`${localX(TAU_MIN_YR).toFixed(1)},${cy.toFixed(1)}`];
        const N = 120;
        for (let k = 0; k <= N; k++) {
          const lt = logT_MIN + ((logT_MAX - logT_MIN) * k) / N;
          const ts = Math.pow(10, lt) * SEC_PER_YR;
          const Llv = L_env(ts, lam, T, v, L_star) / LY;
          const x = localX(Math.pow(10, lt));
          if (Llv > L_MIN_LY) pts.push(`${x.toFixed(1)},${localY(Llv).toFixed(1)}`);
          inf.push(`${x.toFixed(1)},${localY(Math.max(L_MIN_LY, Llv)).toFixed(1)}`);
        }
        inf.push(`${localX(TAU_MAX_YR).toFixed(1)},${cy.toFixed(1)}`);

        const tx = localX(s.tau_yr);
        const ty = localY(s.L_target_ly);
        const envAt = L_env(s.tau_yr * SEC_PER_YR, lam, T, v, L_star);
        const inside = s.L_target_ly * LY <= envAt;

        return (
          <g key={s.id}>
            <rect
              x={cx + 2} y={cy + 2}
              width={cellW - 4} height={cellH - 4}
              fill={COLOR.voidMid}
              stroke={COLOR.inkVeil} strokeWidth="1"
            />
            <path d={`M ${inf.join(" L ")} Z`} fill={COLOR.sanguine} fillOpacity="0.1" />
            <path
              d={pts.length >= 2 ? `M ${pts.join(" L ")}` : ""}
              fill="none" stroke={COLOR.ink} strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle
              cx={tx} cy={ty}
              r={inside ? 4 : 5}
              fill={inside ? COLOR.ghost : COLOR.sanguine}
              stroke={COLOR.void} strokeWidth="1.4"
            />
            {!inside && (
              <line
                x1={tx - 5} y1={ty} x2={tx + 5} y2={ty}
                stroke={COLOR.sanguine} strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
            <text
              x={cx + 12} y={cy + 18}
              fontFamily={FONT.display} fontStyle="italic" fontSize="13"
              fill={COLOR.ink}
            >
              {s.label.toLowerCase()}
            </text>
            <text
              x={cx + 12} y={cy + 32}
              fontFamily={FONT.mono} fontSize="9" fill={COLOR.inkMuted}
            >
              {s.sub}
            </text>
            <text
              x={cx + cellW - 12} y={cy + cellH - 12}
              textAnchor="end"
              fontFamily={FONT.mono} fontSize="9"
              fill={inside ? COLOR.ghost : COLOR.sanguine}
              fontWeight="500"
            >
              {inside ? "◉ inside" : "✕ outside"}
            </text>
          </g>
        );
      })}
    </g>
  );
}
