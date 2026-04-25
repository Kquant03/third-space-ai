"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · Sparkline
//  ─────────────────────────────────────────────────────────────────────────
//  Co-located mirror of /genesis/ising/Sparkline and /genesis/lenia/
//  Sparkline. We keep one per substrate so a layout shift in one doesn't
//  drag the others with it. If a fourth substrate gets added, lift the
//  shared piece into /genesis/_shared/.
// ═══════════════════════════════════════════════════════════════════════════

import { ReactNode } from "react";

const COLOR = {
  voidSoft: "#0a0f1a",
  ink: "#f4f6fb",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  sanguine: "#9a2b2b",
} as const;

const FONT = {
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

export type SparklineProps = {
  data: number[];
  width: number;
  height: number;
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  criticalLine?: number;
  format?: (v: number) => string;
  accent?: string;
};

export function Sparkline({
  data,
  width,
  height,
  label,
  value,
  unit,
  min,
  max,
  criticalLine,
  format,
  accent = COLOR.ghost,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div style={{ marginBottom: 12 }}>
        <SparklineHeader label={label} value="—" accent={accent} />
        <div
          style={{
            width,
            height,
            borderRadius: 2,
            background: COLOR.voidSoft,
            border: `1px solid ${COLOR.inkGhost}40`,
          }}
        />
      </div>
    );
  }

  const displayData = data.slice(-200);
  const yMin = min !== undefined ? min : Math.min(...displayData);
  const yMax = max !== undefined ? max : Math.max(...displayData);
  const yRange = yMax - yMin || 1;
  const points = displayData
    .map((v, i) => {
      const x = (i / (displayData.length - 1)) * width;
      const y = height - 2 - ((v - yMin) / yRange) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const criticalY =
    criticalLine !== undefined
      ? height - 2 - ((criticalLine - yMin) / yRange) * (height - 4)
      : null;

  const fmtVal =
    format !== undefined
      ? format(value)
      : typeof value === "number"
        ? value.toFixed(4)
        : String(value);

  return (
    <div style={{ marginBottom: 12 }}>
      <SparklineHeader
        label={label}
        value={fmtVal}
        unit={unit}
        accent={accent}
      />
      <svg
        width={width}
        height={height}
        style={{
          display: "block",
          borderRadius: 2,
          background: COLOR.voidSoft,
          border: `1px solid ${COLOR.inkGhost}40`,
        }}
      >
        {criticalY !== null && criticalY >= 0 && criticalY <= height && (
          <line
            x1={0}
            y1={criticalY}
            x2={width}
            y2={criticalY}
            stroke={COLOR.sanguine}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.55}
          />
        )}
        <polyline
          points={points}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.92}
        />
      </svg>
    </div>
  );
}

function SparklineHeader({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 5,
        fontFamily: FONT.mono,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: COLOR.inkMuted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: accent, fontWeight: 500 }}>
        {value}
        {unit && (
          <span
            style={{
              fontSize: 9,
              color: COLOR.inkFaint,
              marginLeft: 4,
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}
