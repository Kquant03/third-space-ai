"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · PredictionCurve
//  ─────────────────────────────────────────────────────────────────────────
//  The reader's You-Draw-It curve. Nine control points at fixed x-positions
//  along the τ axis; each is draggable in y only. The curve between points
//  is Catmull-Rom smoothed. Render styling is ghost-cyan dashed — reads
//  clearly as "your guess" against the ink envelope.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PLOT, L_env, LY, SEC_PER_YR, xToTauYr, yToLLy,
} from "./physics";
import { COLOR } from "./styles";

export type PredictionPoint = { x: number; y: number };

export function makeInitialPrediction(numPoints: number = 9): PredictionPoint[] {
  const pts: PredictionPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const frac = i / (numPoints - 1);
    const x = PLOT.mL + frac * PLOT.plotW;
    const y = PLOT.mT + PLOT.plotH * (0.75 - 0.5 * frac);
    pts.push({ x, y });
  }
  return pts;
}

export type PredictionScore = {
  meanSigned: number;
  meanAbs: number;
  maxOver: number;
};

export function scorePrediction(
  points: PredictionPoint[],
  lam: number, T: number, v: number, L_star: number,
): PredictionScore | null {
  if (!points || points.length < 2) return null;
  let totalLog = 0;
  let totalAbs = 0;
  let maxOver = -Infinity;
  let n = 0;
  for (const p of points) {
    const tau_yr = xToTauYr(p.x);
    const L_ly_pred = yToLLy(p.y);
    const L_ly_true = L_env(tau_yr * SEC_PER_YR, lam, T, v, L_star) / LY;
    if (L_ly_true <= 0) continue;
    const diff = Math.log10(L_ly_pred) - Math.log10(L_ly_true);
    totalLog += diff;
    totalAbs += Math.abs(diff);
    if (diff > maxOver) maxOver = diff;
    n++;
  }
  if (n === 0) return null;
  return { meanSigned: totalLog / n, meanAbs: totalAbs / n, maxOver };
}

export function PredictionCurve({
  points,
  editable = false,
  onChange,
}: {
  points: PredictionPoint[];
  editable?: boolean;
  onChange?: (points: PredictionPoint[]) => void;
}) {
  const groupRef = useRef<SVGGElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const pathD = useMemo(() => {
    if (points.length < 2) return "";
    const pts = points;
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d +=
        ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ` +
        `${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ` +
        `${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }, [points]);

  useEffect(() => {
    if (dragIdx === null) return;
    const handleMove = (e: PointerEvent) => {
      const svg = groupRef.current?.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sy = PLOT.H / rect.height;
      const y = (e.clientY - rect.top) * sy;
      const clamped = Math.max(
        PLOT.mT + 4,
        Math.min(PLOT.mT + PLOT.plotH - 4, y),
      );
      const np = points.map((p, i) =>
        i === dragIdx ? { ...p, y: clamped } : p,
      );
      onChange?.(np);
    };
    const handleUp = () => setDragIdx(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragIdx, points, onChange]);

  return (
    <g ref={groupRef}>
      <path
        d={pathD} fill="none"
        stroke={COLOR.void} strokeWidth="5" strokeOpacity="0.55"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d={pathD} fill="none"
        stroke={COLOR.ghost} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={editable ? "none" : "5 3"}
      />
      {editable &&
        points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y} r="14"
              fill="transparent"
              style={{ cursor: "ns-resize" }}
              onPointerDown={(e) => {
                e.preventDefault();
                setDragIdx(i);
              }}
            />
            <circle
              cx={p.x} cy={p.y}
              r={dragIdx === i ? 6 : 4.5}
              fill={COLOR.void}
              stroke={COLOR.ghost} strokeWidth="1.75"
              style={{ pointerEvents: "none" }}
            />
          </g>
        ))}
    </g>
  );
}
