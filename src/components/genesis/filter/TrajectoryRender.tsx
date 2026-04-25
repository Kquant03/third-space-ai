"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · TrajectoryRender (v14)
//  ─────────────────────────────────────────────────────────────────────────
//  Renders a civilization's worldline(s) on the phase plot for the three
//  strategies. v14 splits the coordination-channel display into its own
//  prop (showCoordinationChannel) so the fission-dilemma beat can stage
//  the L → D rescaling as its own dramatic reveal.
//
//    monolithic    — one worldline at the scenario's τ, climbing toward
//                    target L. Crosses envelope → sanguine breach.
//
//    naïve fission — parent retires at L_fiss; daughters restart from
//                    L = 0 at the same τ and climb toward target/2.
//
//    architected   — as naïve. When showCoordinationChannel = true, the
//                    inter-fragment channel D = 2·L_daughter renders as
//                    its own dashed worldline at the same τ. The channel
//                    is the rescaled variable that §5.1 hinges on: the
//                    envelope is invariant under L → D, so architected
//                    fission inherits rather than escapes.
// ═══════════════════════════════════════════════════════════════════════════

import { L_env, LY, SEC_PER_YR, tauYrToX, lLyToY, L_MIN_LY } from "./physics";
import { ScenarioId, StrategyId, SCENARIOS } from "./scenarios";
import { COLOR, FONT } from "./styles";

export type TrajectoryProps = {
  scenarioId: ScenarioId;
  progress: number;
  strategy: StrategyId;
  showCoordinationChannel?: boolean;
  lam?: number;
  T?: number;
  v?: number;
  L_star?: number;
};

const FISSION_FRAC = 0.45;

export function TrajectoryRender({
  scenarioId,
  progress,
  strategy,
  showCoordinationChannel = false,
  lam = 1e-9,
  T = 300,
  v = 2.998e8,
  L_star = 3.828e26,
}: TrajectoryProps) {
  const scen = SCENARIOS[scenarioId];
  const tauSec = scen.tau_yr * SEC_PER_YR;
  const targetL_m = scen.L_target_ly * LY;
  const envL_m = L_env(tauSec, lam, T, v, L_star);

  const x = tauYrToX(scen.tau_yr);
  const y0 = lLyToY(L_MIN_LY * 1.1);
  const yEnvCap = lLyToY(envL_m / LY);

  // ── Monolithic ────────────────────────────────────────────────
  if (strategy === "monolithic") {
    const monoLm = targetL_m * progress;
    const cappedLm = Math.min(monoLm, envL_m);
    const breached = monoLm > envL_m;
    const yCurrent = lLyToY(Math.max(L_MIN_LY * 1.1, cappedLm / LY));
    return (
      <g>
        <line
          x1={x} y1={y0} x2={x} y2={yCurrent}
          stroke={breached ? COLOR.sanguineWash : COLOR.ghost}
          strokeWidth="2" strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <circle
          cx={x} cy={yCurrent} r="7"
          fill={COLOR.void}
          stroke={breached ? COLOR.sanguine : COLOR.ghost}
          strokeWidth="2.2"
        />
        {breached && (
          <g>
            <line
              x1={x - 14} y1={yEnvCap} x2={x + 14} y2={yEnvCap}
              stroke={COLOR.sanguine} strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle
              cx={x} cy={yEnvCap} r="13"
              fill="none"
              stroke={COLOR.sanguine} strokeWidth="1.3" strokeOpacity="0.6"
            />
            <text
              x={x + 20} y={yEnvCap + 4}
              fontFamily={FONT.mono} fontSize="11"
              fill={COLOR.sanguine} fontWeight="500"
            >
              envelope breach
            </text>
          </g>
        )}
      </g>
    );
  }

  // ── Fission strategies ────────────────────────────────────────
  const fissionLm = targetL_m * FISSION_FRAC;
  const hasFissioned = progress >= FISSION_FRAC;

  if (!hasFissioned) {
    const parentLm = targetL_m * progress;
    const yParent = lLyToY(Math.max(L_MIN_LY * 1.1, parentLm / LY));
    return (
      <g>
        <line
          x1={x} y1={y0} x2={x} y2={yParent}
          stroke={COLOR.ghost} strokeWidth="2" strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <circle
          cx={x} cy={yParent} r="7"
          fill={COLOR.void} stroke={COLOR.ghost} strokeWidth="2.2"
        />
      </g>
    );
  }

  const post = (progress - FISSION_FRAC) / (1 - FISSION_FRAC);
  const dTarget = targetL_m / 2;
  const dLm = dTarget * post;
  const dCappedLm = Math.min(dLm, envL_m);
  const dBreached = dLm > envL_m;
  const yDaughter = lLyToY(Math.max(L_MIN_LY * 1.1, dCappedLm / LY));
  const yFission = lLyToY(fissionLm / LY);

  const D_m = 2 * dLm;
  const DCapped = Math.min(D_m, envL_m);
  const DBreached = D_m > envL_m;
  const yD = lLyToY(Math.max(L_MIN_LY * 1.1, DCapped / LY));

  const showD = showCoordinationChannel || strategy === "architected";

  return (
    <g>
      <line
        x1={x} y1={y0} x2={x} y2={yFission}
        stroke={COLOR.inkMuted} strokeWidth="2" strokeOpacity="0.35"
        strokeLinecap="round"
      />
      <line
        x1={x - 10} y1={yFission} x2={x + 10} y2={yFission}
        stroke={COLOR.inkMuted} strokeWidth="1.3" strokeDasharray="2 2"
      />
      <text
        x={x + 14} y={yFission + 4}
        fontFamily={FONT.mono} fontSize="9"
        fill={COLOR.inkFaint} fontStyle="italic"
      >
        fission
      </text>

      <line
        x1={x + 18} y1={y0} x2={x + 18} y2={yDaughter}
        stroke={dBreached ? COLOR.sanguineWash : COLOR.ghost}
        strokeWidth="1.7" strokeOpacity="0.55"
        strokeLinecap="round"
      />
      <circle
        cx={x + 18} cy={yDaughter} r="5"
        fill={COLOR.void}
        stroke={dBreached ? COLOR.sanguine : COLOR.ghost}
        strokeWidth="2"
      />

      <line
        x1={x - 18} y1={y0} x2={x - 18} y2={yDaughter}
        stroke={dBreached ? COLOR.sanguineWash : COLOR.ghost}
        strokeWidth="1.7" strokeOpacity="0.55"
        strokeLinecap="round"
      />
      <circle
        cx={x - 18} cy={yDaughter} r="5"
        fill={COLOR.void}
        stroke={dBreached ? COLOR.sanguine : COLOR.ghost}
        strokeWidth="2"
      />

      {dBreached && (
        <g>
          <line
            x1={x - 28} y1={yEnvCap} x2={x + 28} y2={yEnvCap}
            stroke={COLOR.sanguine} strokeWidth="2"
            strokeLinecap="round"
          />
          <text
            x={x + 34} y={yEnvCap + 4}
            fontFamily={FONT.mono} fontSize="11"
            fill={COLOR.sanguine} fontWeight="500"
          >
            daughter breach
          </text>
        </g>
      )}

      {showD && (
        <g>
          <line
            x1={x} y1={y0} x2={x} y2={yD}
            stroke={DBreached ? COLOR.sanguine : COLOR.ghostSoft}
            strokeWidth="2.5" strokeOpacity="0.8"
            strokeLinecap="round" strokeDasharray="5 3"
          />
          <circle
            cx={x} cy={yD} r="7"
            fill={COLOR.void}
            stroke={DBreached ? COLOR.sanguine : COLOR.ghostSoft}
            strokeWidth="2.3" strokeDasharray="3 2"
          />
          <text
            x={x + 14} y={yD + 4}
            fontFamily={FONT.mono} fontSize="10"
            fill={DBreached ? COLOR.sanguine : COLOR.ghostSoft}
            fontWeight={DBreached ? "500" : "400"}
          >
            D = 2·L_d{DBreached ? "  ·  channel breach" : ""}
          </text>
          {DBreached && (
            <text
              x={x - 40} y={yEnvCap - 8}
              textAnchor="end"
              fontFamily={FONT.display} fontStyle="italic" fontSize="13"
              fill={COLOR.sanguine}
            >
              L → D rescaling inherits the envelope
            </text>
          )}
        </g>
      )}
    </g>
  );
}
