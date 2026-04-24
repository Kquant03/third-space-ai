"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · TrajectoryRender
//  ─────────────────────────────────────────────────────────────────────────
//  Renders a civilization's worldline(s) on the phase plot for the three
//  strategies:
//
//    monolithic    — one worldline at the scenario's τ, climbing toward
//                    target L. If it crosses the envelope, sanguine breach.
//
//    naïve fission — parent worldline retires at L_fiss; two daughter
//                    worldlines restart from L = 0 at the same τ and climb
//                    toward target/2. If they breach, sanguine.
//
//    architected   — as naïve + a coordination channel D = 2 · L_daughter
//                    tracked as its own dashed worldline at the same τ.
//                    The channel is the rescaled variable that the paper's
//                    §5.1 argument hinges on: the envelope is invariant
//                    under L → D, so architected fission inherits rather
//                    than escapes. When D breaches, we label it explicitly.
//
//  Palette: trajectories in ghost (solid); coordination channel in
//  ghost-soft (dashed); breach in sanguine (reserved).
// ═══════════════════════════════════════════════════════════════════════════

import { L_env, LY, SEC_PER_YR, tauYrToX, lLyToY, L_MIN_LY } from "./physics";
import type { ScenarioId, StrategyId } from "./scenarios";
import { SCENARIOS } from "./scenarios";

const COLOR = {
  void: "#010106",
  ink: "#f4f6fb",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
  sanguine: "#9a2b2b",
  sanguineWash: "#c9817a",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ───────────────────────────────────────────────────────────────────────────

export type TrajectoryProps = {
  scenarioId: ScenarioId;
  progress: number;         // 0..1 playback clock
  strategy: StrategyId;
  lam?: number;
  T?: number;
  v?: number;
  L_star?: number;
};

const FISSION_FRAC = 0.45; // parent fissions at 45% of target L

export function TrajectoryRender({
  scenarioId,
  progress,
  strategy,
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
        {/* Trail from bottom to current position. */}
        <line
          x1={x}
          y1={y0}
          x2={x}
          y2={yCurrent}
          stroke={breached ? COLOR.sanguineWash : COLOR.ghost}
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        {/* Current-position dot. */}
        <circle
          cx={x}
          cy={yCurrent}
          r="7"
          fill={COLOR.void}
          stroke={breached ? COLOR.sanguine : COLOR.ghost}
          strokeWidth="2.2"
        />
        {/* Breach marker. */}
        {breached && (
          <g>
            <line
              x1={x - 14}
              y1={yEnvCap}
              x2={x + 14}
              y2={yEnvCap}
              stroke={COLOR.sanguine}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle
              cx={x}
              cy={yEnvCap}
              r="13"
              fill="none"
              stroke={COLOR.sanguine}
              strokeWidth="1.3"
              strokeOpacity="0.6"
            />
            <text
              x={x + 20}
              y={yEnvCap + 4}
              fontFamily={FONT.mono}
              fontSize="11"
              fill={COLOR.sanguine}
              fontWeight="500"
            >
              envelope breach
            </text>
          </g>
        )}
      </g>
    );
  }

  // ── Fission strategies (naïve or architected) ───────────────────

  const fissionLm = targetL_m * FISSION_FRAC;
  const fissionProgressThreshold = FISSION_FRAC;
  const hasFissioned = progress >= fissionProgressThreshold;

  if (!hasFissioned) {
    // Pre-fission: act like monolithic parent climbing toward L_fiss.
    const parentLm = targetL_m * progress;
    const yParent = lLyToY(Math.max(L_MIN_LY * 1.1, parentLm / LY));
    return (
      <g>
        <line
          x1={x}
          y1={y0}
          x2={x}
          y2={yParent}
          stroke={COLOR.ghost}
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <circle
          cx={x}
          cy={yParent}
          r="7"
          fill={COLOR.void}
          stroke={COLOR.ghost}
          strokeWidth="2.2"
        />
      </g>
    );
  }

  // Post-fission: daughters climbing from L = 0 toward target/2.
  const postFissionProgress =
    (progress - fissionProgressThreshold) / (1 - fissionProgressThreshold);
  const daughterTargetLm = targetL_m / 2;
  const daughterLm = daughterTargetLm * postFissionProgress;
  const daughterCappedLm = Math.min(daughterLm, envL_m);
  const daughterBreached = daughterLm > envL_m;
  const yDaughter = lLyToY(Math.max(L_MIN_LY * 1.1, daughterCappedLm / LY));
  const yFission = lLyToY(fissionLm / LY);

  // Architected: the coordination channel D = 2·L_daughter at the same τ.
  const D_m = 2 * daughterLm;
  const DCappedLm = Math.min(D_m, envL_m);
  const DBreached = D_m > envL_m;
  const yD = lLyToY(Math.max(L_MIN_LY * 1.1, DCappedLm / LY));

  return (
    <g>
      {/* Parent trail up to fission point — muted, to show retirement. */}
      <line
        x1={x}
        y1={y0}
        x2={x}
        y2={yFission}
        stroke={COLOR.inkMuted}
        strokeWidth="2"
        strokeOpacity="0.35"
        strokeLinecap="round"
      />
      <line
        x1={x - 10}
        y1={yFission}
        x2={x + 10}
        y2={yFission}
        stroke={COLOR.inkMuted}
        strokeWidth="1.3"
        strokeDasharray="2 2"
      />
      <text
        x={x + 14}
        y={yFission + 4}
        fontFamily={FONT.mono}
        fontSize="9"
        fill={COLOR.inkFaint}
        fontStyle="italic"
      >
        fission
      </text>

      {/* Daughter A (offset right). */}
      <line
        x1={x + 18}
        y1={y0}
        x2={x + 18}
        y2={yDaughter}
        stroke={daughterBreached ? COLOR.sanguineWash : COLOR.ghost}
        strokeWidth="1.7"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />
      <circle
        cx={x + 18}
        cy={yDaughter}
        r="5"
        fill={COLOR.void}
        stroke={daughterBreached ? COLOR.sanguine : COLOR.ghost}
        strokeWidth="2"
      />

      {/* Daughter B (offset left). */}
      <line
        x1={x - 18}
        y1={y0}
        x2={x - 18}
        y2={yDaughter}
        stroke={daughterBreached ? COLOR.sanguineWash : COLOR.ghost}
        strokeWidth="1.7"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />
      <circle
        cx={x - 18}
        cy={yDaughter}
        r="5"
        fill={COLOR.void}
        stroke={daughterBreached ? COLOR.sanguine : COLOR.ghost}
        strokeWidth="2"
      />

      {daughterBreached && (
        <g>
          <line
            x1={x - 28}
            y1={yEnvCap}
            x2={x + 28}
            y2={yEnvCap}
            stroke={COLOR.sanguine}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text
            x={x + 34}
            y={yEnvCap + 4}
            fontFamily={FONT.mono}
            fontSize="11"
            fill={COLOR.sanguine}
            fontWeight="500"
          >
            daughter breach
          </text>
        </g>
      )}

      {/* Architected: coordination channel D = 2·L_daughter.
          Dashed thicker ghost-soft line tracks the rescaled L→D variable. */}
      {strategy === "architected" && (
        <g>
          <line
            x1={x}
            y1={y0}
            x2={x}
            y2={yD}
            stroke={DBreached ? COLOR.sanguine : COLOR.ghostSoft}
            strokeWidth="2.5"
            strokeOpacity="0.8"
            strokeLinecap="round"
            strokeDasharray="5 3"
          />
          <circle
            cx={x}
            cy={yD}
            r="7"
            fill={COLOR.void}
            stroke={DBreached ? COLOR.sanguine : COLOR.ghostSoft}
            strokeWidth="2.3"
            strokeDasharray="3 2"
          />
          <text
            x={x + 14}
            y={yD + 4}
            fontFamily={FONT.mono}
            fontSize="10"
            fill={DBreached ? COLOR.sanguine : COLOR.ghostSoft}
            fontWeight={DBreached ? "500" : "400"}
          >
            D = 2·L_daughter{DBreached ? " · channel breach" : ""}
          </text>

          {DBreached && (
            <text
              x={x - 40}
              y={yEnvCap - 8}
              textAnchor="end"
              fontFamily={FONT.display}
              fontSize="13"
              fill={COLOR.sanguine}
              fontStyle="italic"
            >
              L → D rescaling inherits the envelope
            </text>
          )}
        </g>
      )}
    </g>
  );
}
