"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · PhasePlot
//  ─────────────────────────────────────────────────────────────────────────
//  The sticky SVG that every tier of the Filter experience renders into.
//  Parameterised by a `show` visibility object so scrollytelling can toggle
//  individual layers on and off as the reader advances through beats.
//
//  Visual grammar:
//    envelope       — ink, 2.6px solid        the wall
//    L_R binding    — ink, 1.2px solid        sub-bound where active
//    L_R non-binding — ink muted, 1px dashed  sub-bound where other tooth binds
//    L_E similarly
//    infeasible     — ink-ghost wash + hatch  forbidden region above envelope
//    agent band     — void-soft wash          τ < 10³ yr strip
//    τ* cusp        — ink filled circle, leader line, mono label
//    prediction     — ghost dashed            the reader's You-Draw-It curve
//    breach         — sanguine                reserved accent, envelope crossings
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, ReactNode } from "react";
import {
  L_R,
  L_E,
  PLOT,
  LY,
  SEC_PER_YR,
  TAU_MIN_YR,
  TAU_AGENT_MAX,
  L_MIN_LY,
  L_MAX_LY,
  logT_MIN,
  logT_MAX,
  logL_MIN,
  logL_MAX,
  tauYrToX,
  lLyToY,
  xToTauYr,
  tau_star,
  fmtDecades,
  fmtDecadesL,
  fmtSci,
  generateEnvelopePath,
  generateSplitToothPath,
  generateInfeasiblePath,
} from "./physics";
import type { BeatVisibility } from "./scenarios";
import type { Scenario } from "./scenarios";

// Inlined Lantern palette + font refs — matches page.tsx pattern.
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
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ───────────────────────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────────────────────

export type PredictionPoint = { x: number; y: number };

export type PhasePlotProps = {
  // Parameters (default to v = c, T = 300 K, λ = 1 nm, L⊙)
  lam?: number;
  T?: number;
  v?: number;
  L_star?: number;

  // Beat visibility flags — which layers to show
  show?: Partial<BeatVisibility>;

  // Overlays
  trajectory?: ReactNode;        // rendered into SVG coord space
  prediction?: PredictionPoint[]; // user's You-Draw-It curve (SVG coords)
  predictionEditable?: boolean;
  onPredictionChange?: (points: PredictionPoint[]) => void;
  predictionRender?: (
    points: PredictionPoint[],
    editable: boolean,
    onChange?: (p: PredictionPoint[]) => void,
  ) => ReactNode;                 // delegate to PredictionCurve.tsx

  // Sweep-σ ghosts (±2 decades of λ)
  sweepSigma?: boolean;

  // Envelope click → open Tier 3 drawer
  onEnvelopeClick?: (seg: "LR" | "LE" | "cusp") => void;

  // Scenario overlays (sandbox)
  scenarios?: Scenario[];
  activeScenario?: string | null;

  // Optional overline label
  label?: string;
};

// ───────────────────────────────────────────────────────────────────────────
//  Defaults for the visibility object — everything off except axes
// ───────────────────────────────────────────────────────────────────────────

const DEFAULT_SHOW: BeatVisibility = {
  axes: true,
  agentBand: false,
  infeasible: false,
  L_R: false,
  L_E: false,
  envelope: false,
  tauStar: false,
};

// ───────────────────────────────────────────────────────────────────────────
//  PhasePlot
// ───────────────────────────────────────────────────────────────────────────

export function PhasePlot({
  lam = 1e-9,
  T = 300,
  v = 2.998e8,
  L_star = 3.828e26,
  show: showProp,
  trajectory,
  prediction,
  predictionEditable,
  onPredictionChange,
  predictionRender,
  sweepSigma = false,
  onEnvelopeClick,
  scenarios,
  activeScenario,
  label,
}: PhasePlotProps) {
  const show: BeatVisibility = { ...DEFAULT_SHOW, ...(showProp ?? {}) };

  // ── Memoised path strings ────────────────────────────────────────
  const envelopePath = useMemo(
    () => generateEnvelopePath(lam, T, v, L_star),
    [lam, T, v, L_star],
  );

  const LRSplit = useMemo(
    () => generateSplitToothPath("L_R", lam, T, v, L_star),
    [lam, T, v, L_star],
  );

  const LESplit = useMemo(
    () => generateSplitToothPath("L_E", lam, T, v, L_star),
    [lam, T, v, L_star],
  );

  const infeasiblePath = useMemo(
    () => generateInfeasiblePath(lam, T, v, L_star),
    [lam, T, v, L_star],
  );

  // ── Sweep-σ ghost envelopes (±2 decades of λ) ───────────────────
  const sigmaGhosts = useMemo(() => {
    if (!sweepSigma) return [];
    return [0.01, 0.1, 10, 100].map((mult) => ({
      path: generateEnvelopePath(lam * mult, T, v, L_star),
      label: `λ = ${fmtSci(lam * mult)} m`,
    }));
  }, [sweepSigma, lam, T, v, L_star]);

  // ── τ* cusp location ─────────────────────────────────────────────
  const tauStarYr = tau_star(lam, T, v, L_star) / SEC_PER_YR;
  const tauStarInRange = tauStarYr > TAU_MIN_YR && tauStarYr < 1e9;
  const LatTauStar = L_R(tauStarYr * SEC_PER_YR, v);

  // ── Agent band x-coordinates ─────────────────────────────────────
  const agentX0 = tauYrToX(TAU_MIN_YR);
  const agentX1 = tauYrToX(TAU_AGENT_MAX / SEC_PER_YR);

  // ── Decade tick integer exponents ────────────────────────────────
  const tauTicks: number[] = [];
  for (let e = Math.ceil(logT_MIN); e <= Math.floor(logT_MAX); e++)
    tauTicks.push(e);
  const lTicks: number[] = [];
  for (let e = Math.ceil(logL_MIN); e <= Math.floor(logL_MAX); e++)
    lTicks.push(e);

  // ── Envelope-click routing: which segment did the reader hit? ────
  const handleEnvelopeClick = (e: React.MouseEvent<SVGPathElement>) => {
    if (!onEnvelopeClick) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = PLOT.W / rect.width;
    const px = (e.clientX - rect.left) * sx;
    const tauHere = xToTauYr(px);
    const tauNearStar =
      Math.abs(Math.log10(tauHere) - Math.log10(tauStarYr)) < 0.15;
    const seg: "LR" | "LE" | "cusp" = tauNearStar
      ? "cusp"
      : tauHere < tauStarYr
        ? "LR"
        : "LE";
    onEnvelopeClick(seg);
  };

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${PLOT.W} ${PLOT.H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Feasibility envelope in log-log (τ, L) phase space, composition of Lieb-Robinson and Landauer bounds."
      >
        <defs>
          {/* Hatch pattern for infeasible region — ghost-cyan at low alpha,
              reads against void without introducing a second accent. */}
          <pattern
            id="fe-hatch"
            patternUnits="userSpaceOnUse"
            width="7"
            height="7"
            patternTransform="rotate(42)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="7"
              stroke={COLOR.ghost}
              strokeOpacity="0.18"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>

        {/* Plot-area background — a subtle voidSoft wash so the plot reads
            as a window inside the reading-plate, not transparent over it. */}
        <rect
          x={PLOT.mL}
          y={PLOT.mT}
          width={PLOT.plotW}
          height={PLOT.plotH}
          fill={COLOR.voidSoft}
          fillOpacity="0.55"
          stroke="none"
        />

        {/* Agent-timescale band — darker strip left of τ = 10³ yr. */}
        {show.agentBand && (
          <g style={{ transition: "opacity 500ms ease" }}>
            <rect
              x={agentX0}
              y={PLOT.mT}
              width={agentX1 - agentX0}
              height={PLOT.plotH}
              fill={COLOR.void}
              fillOpacity="0.35"
            />
            <line
              x1={agentX1}
              y1={PLOT.mT}
              x2={agentX1}
              y2={PLOT.mT + PLOT.plotH}
              stroke={COLOR.ghost}
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <text
              x={agentX1 - 8}
              y={PLOT.mT + 16}
              textAnchor="end"
              fontFamily={FONT.mono}
              fontSize="10"
              fill={COLOR.inkFaint}
              fontStyle="italic"
            >
              agent cutoff · τ = 10³ yr
            </text>
          </g>
        )}

        {/* Infeasible region. */}
        {show.infeasible && (
          <g>
            <path
              d={infeasiblePath}
              fill={COLOR.inkGhost}
              fillOpacity="0.22"
            />
            <path d={infeasiblePath} fill="url(#fe-hatch)" />
          </g>
        )}

        {/* Gridlines. */}
        {show.axes !== false && (
          <g>
            {tauTicks.map((e) => (
              <line
                key={`tx${e}`}
                x1={tauYrToX(Math.pow(10, e))}
                y1={PLOT.mT}
                x2={tauYrToX(Math.pow(10, e))}
                y2={PLOT.mT + PLOT.plotH}
                stroke={COLOR.inkGhost}
                strokeWidth="0.5"
                strokeOpacity="0.35"
              />
            ))}
            {lTicks.map((e) => (
              <line
                key={`ly${e}`}
                x1={PLOT.mL}
                y1={lLyToY(Math.pow(10, e))}
                x2={PLOT.mL + PLOT.plotW}
                y2={lLyToY(Math.pow(10, e))}
                stroke={COLOR.inkGhost}
                strokeWidth="0.5"
                strokeOpacity="0.35"
              />
            ))}
          </g>
        )}

        {/* Sweep-σ ghost envelopes. */}
        {sweepSigma &&
          sigmaGhosts.map((g, i) => (
            <path
              key={`ghost-${i}`}
              d={g.path}
              fill="none"
              stroke={COLOR.ink}
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          ))}

        {/* Lieb-Robinson tooth. */}
        {show.L_R && (
          <g>
            <path
              d={LRSplit.nonBindingPath}
              fill="none"
              stroke={COLOR.inkMuted}
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <path
              d={
                show.envelope
                  ? LRSplit.bindingPath
                  : `${LRSplit.bindingPath} ${LRSplit.nonBindingPath}`
              }
              fill="none"
              stroke={COLOR.ink}
              strokeOpacity={show.envelope ? 0.55 : 0.85}
              strokeWidth={show.envelope ? 1.2 : 1.6}
            />
            {show.L_R_label !== false && (
              <LabeledCurve
                curveFn={(t) => L_R(t, v)}
                label="L_R(τ) = cτ / 2"
                subLabel="Lieb–Robinson · relativistic"
                anchorLogT={-0.2}
                yOffset={-18}
              />
            )}
          </g>
        )}

        {/* Landauer tooth. */}
        {show.L_E && (
          <g>
            <path
              d={LESplit.nonBindingPath}
              fill="none"
              stroke={COLOR.inkMuted}
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <path
              d={
                show.envelope
                  ? LESplit.bindingPath
                  : `${LESplit.bindingPath} ${LESplit.nonBindingPath}`
              }
              fill="none"
              stroke={COLOR.ink}
              strokeOpacity={show.envelope ? 0.55 : 0.85}
              strokeWidth={show.envelope ? 1.2 : 1.6}
            />
            {show.L_E_label !== false && (
              <LabeledCurve
                curveFn={(t) => L_E(t, lam, T, L_star)}
                label="L_E(τ) = λ √(L⊙ τ / kT ln 2)"
                subLabel={`Landauer · energetic · λ = ${fmtSci(lam)} m`}
                anchorLogT={6.5}
                yOffset={14}
              />
            )}
          </g>
        )}

        {/* COMPOSED ENVELOPE — the wall. Heaviest stroke on the plot. */}
        {show.envelope && (
          <g>
            <path
              d={envelopePath}
              fill="none"
              stroke={COLOR.ink}
              strokeWidth="2.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ cursor: onEnvelopeClick ? "pointer" : "default" }}
            />
            {/* Fat invisible click target. */}
            {onEnvelopeClick && (
              <path
                d={envelopePath}
                fill="none"
                stroke="transparent"
                strokeWidth="22"
                style={{ cursor: "pointer" }}
                onClick={handleEnvelopeClick}
              />
            )}
          </g>
        )}

        {/* τ* cusp marker. Offset label below to avoid colliding with
            the Landauer-tooth label which anchors to the upper right. */}
        {show.tauStar && tauStarInRange && show.envelope && (
          <g>
            <circle
              cx={tauYrToX(tauStarYr)}
              cy={lLyToY(LatTauStar / LY)}
              r="5"
              fill={COLOR.void}
              stroke={COLOR.ink}
              strokeWidth="1.5"
            />
            <line
              x1={tauYrToX(tauStarYr)}
              y1={lLyToY(LatTauStar / LY) + 6}
              x2={tauYrToX(tauStarYr) - 40}
              y2={lLyToY(LatTauStar / LY) + 40}
              stroke={COLOR.inkMuted}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <text
              x={tauYrToX(tauStarYr) - 44}
              y={lLyToY(LatTauStar / LY) + 44}
              textAnchor="end"
              fontFamily={FONT.mono}
              fontSize="10"
              fill={COLOR.ink}
              fontStyle="italic"
            >
              τ*
            </text>
            <text
              x={tauYrToX(tauStarYr) - 44}
              y={lLyToY(LatTauStar / LY) + 56}
              textAnchor="end"
              fontFamily={FONT.mono}
              fontSize="9"
              fill={COLOR.inkFaint}
              fontStyle="italic"
            >
              teeth meet
            </text>
          </g>
        )}

        {/* Prediction curve — delegated to caller. */}
        {prediction &&
          prediction.length > 0 &&
          predictionRender &&
          predictionRender(prediction, !!predictionEditable, onPredictionChange)}

        {/* Scenario overlays. */}
        {scenarios &&
          scenarios.map((s) => {
            const isActive = s.id === activeScenario;
            return (
              <g key={s.id}>
                <circle
                  cx={tauYrToX(s.tau_yr)}
                  cy={lLyToY(s.L_target_ly)}
                  r={isActive ? 7 : 4}
                  fill={isActive ? COLOR.ghost : "transparent"}
                  stroke={COLOR.ink}
                  strokeWidth={isActive ? 2 : 1}
                  strokeOpacity={isActive ? 1 : 0.55}
                />
                {isActive && (
                  <text
                    x={tauYrToX(s.tau_yr) + 12}
                    y={lLyToY(s.L_target_ly) - 8}
                    fontFamily={FONT.display}
                    fontSize="14"
                    fill={COLOR.ink}
                    fontStyle="italic"
                  >
                    {s.label.toLowerCase()}
                  </text>
                )}
              </g>
            );
          })}

        {/* Live trajectory overlay. */}
        {trajectory}

        {/* Axes. */}
        {show.axes !== false && (
          <g>
            {tauTicks.map((e) => (
              <text
                key={`tlab${e}`}
                x={tauYrToX(Math.pow(10, e))}
                y={PLOT.mT + PLOT.plotH + 18}
                textAnchor="middle"
                fontFamily={FONT.mono}
                fontSize="10"
                fill={COLOR.inkMuted}
              >
                {fmtDecades(e)}
              </text>
            ))}
            {lTicks.map((e) => (
              <text
                key={`llab${e}`}
                x={PLOT.mL - 10}
                y={lLyToY(Math.pow(10, e)) + 3}
                textAnchor="end"
                fontFamily={FONT.mono}
                fontSize="10"
                fill={COLOR.inkMuted}
              >
                {fmtDecadesL(e)}
              </text>
            ))}
            <text
              x={PLOT.mL + PLOT.plotW / 2}
              y={PLOT.H - 24}
              textAnchor="middle"
              fontFamily={FONT.display}
              fontSize="15"
              fill={COLOR.inkBody}
              fontStyle="italic"
            >
              coordination timescale&nbsp;&nbsp;τ
            </text>
            <text
              transform={`translate(22, ${PLOT.mT + PLOT.plotH / 2}) rotate(-90)`}
              textAnchor="middle"
              fontFamily={FONT.display}
              fontSize="15"
              fill={COLOR.inkBody}
              fontStyle="italic"
            >
              coordinated extent&nbsp;&nbsp;L
            </text>
          </g>
        )}

        {/* Overline label (optional). */}
        {label && (
          <text
            x={PLOT.mL}
            y={PLOT.mT - 18}
            fontFamily={FONT.display}
            fontSize="15"
            fill={COLOR.inkBody}
            fontStyle="italic"
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  LabeledCurve — positions a two-line label at a given τ on the curve
// ───────────────────────────────────────────────────────────────────────────

function LabeledCurve({
  curveFn,
  label,
  subLabel,
  anchorLogT,
  yOffset,
}: {
  curveFn: (tau_sec: number) => number;
  label: string;
  subLabel: string;
  anchorLogT: number;
  yOffset: number;
}) {
  const tauYr = Math.pow(10, anchorLogT);
  const tauSec = tauYr * SEC_PER_YR;
  const L_m = curveFn(tauSec);
  const L_ly_v = L_m / LY;
  if (L_ly_v <= L_MIN_LY || L_ly_v > L_MAX_LY) return null;
  const x = tauYrToX(tauYr);
  const y = lLyToY(L_ly_v) + yOffset;
  return (
    <g>
      <text
        x={x}
        y={y}
        fontFamily={FONT.mono}
        fontSize="11"
        fill={COLOR.ink}
        fontWeight="500"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 13}
        fontFamily={FONT.mono}
        fontSize="9.5"
        fill={COLOR.inkMuted}
        fillOpacity="0.85"
        fontStyle="italic"
      >
        {subLabel}
      </text>
    </g>
  );
}
