"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Genesis · SubstrateControls
//  ─────────────────────────────────────────────────────────────────────────
//  The shared primitives every substrate page composes from:
//
//    <Stage>            — two-column canvas + sidebar layout
//    <ControlSection>   — labelled group of controls, eyebrow + body
//    <Slider>           — range input with label, value readout, optional hint
//    <Button>           — outline button, optional variant
//    <PresetRow>        — wrapped row of preset buttons (one active)
//    <Toggle>           — two-state pill
//    <StatRow>          — label : value readout line for telemetry panels
//    <EquationBlock>    — small mono-framed equation card
//    <CanvasSurface>    — consistent ghost-bordered frame for canvases
//    <TelemetryNote>    — italic footnote line under a canvas
//
//  Every primitive is Lantern-skinned — void background, ghost-cyan accent
//  on activity, Cormorant italic for display titles, JetBrains Mono for
//  labels and numerics. No per-substrate rainbow. The site's voice is one
//  voice.
// ═══════════════════════════════════════════════════════════════════════════

import { ReactNode } from "react";

// Inlined palette + fonts — matches page.tsx and SiteChrome.tsx pattern.
const COLOR = {
  void: "#010106",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ───────────────────────────────────────────────────────────────────────────
//  Stage — canvas + sidebar layout
//  Default: 2fr canvas on the left, 360px controls on the right. Collapses
//  to a stacked layout below 900px.
// ───────────────────────────────────────────────────────────────────────────

export function Stage({
  canvas,
  controls,
  controlsWidth = 360,
}: {
  canvas: ReactNode;
  controls: ReactNode;
  controlsWidth?: number;
}) {
  return (
    <div
      className="genesis-stage"
      style={{
        display: "grid",
        gridTemplateColumns: `minmax(0, 2fr) ${controlsWidth}px`,
        gap: "clamp(24px, 3vw, 48px)",
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>{canvas}</div>
      <div style={{ minWidth: 0 }}>{controls}</div>
      <style>{`
        @media (max-width: 900px) {
          .genesis-stage {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  ControlSection — eyebrow + grouped controls
// ───────────────────────────────────────────────────────────────────────────

export function ControlSection({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section style={{ marginBottom: compact ? 20 : 30 }}>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          paddingBottom: 10,
          marginBottom: 14,
          borderBottom: `1px solid ${COLOR.inkGhost}40`,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Slider — range input with label and value readout
// ───────────────────────────────────────────────────────────────────────────

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  hint,
  accent = COLOR.ghost,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: ReactNode;
  accent?: string;
}) {
  const displayed = format ? format(value) : value.toFixed(step < 0.01 ? 4 : 2);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: FONT.mono,
          fontSize: 11,
          color: COLOR.inkMuted,
          marginBottom: 6,
        }}
      >
        <span style={{ letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ color: accent, fontWeight: 500 }}>{displayed}</span>
      </div>
      <input
        type="range"
        className="genesis-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && (
        <div
          style={{
            marginTop: 6,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontSize: 12,
            lineHeight: 1.5,
            color: COLOR.inkFaint,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Button — ghost-outline, three variants
// ───────────────────────────────────────────────────────────────────────────

export function Button({
  children,
  onClick,
  disabled,
  variant = "default",
  active = false,
  fullWidth = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "default" | "quiet";
  active?: boolean;
  fullWidth?: boolean;
}) {
  const base: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    padding: "10px 18px",
    borderRadius: 2,
    cursor: disabled ? "not-allowed" : "pointer",
    transition:
      "color 0.25s ease, background 0.25s ease, border-color 0.25s ease",
    opacity: disabled ? 0.4 : 1,
    width: fullWidth ? "100%" : "auto",
    textAlign: "center",
  };

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          background: active ? COLOR.ghost : "transparent",
          color: active ? COLOR.void : COLOR.ghost,
          border: `1px solid ${COLOR.ghost}`,
        }
      : variant === "quiet"
      ? {
          background: "transparent",
          color: active ? COLOR.ink : COLOR.inkMuted,
          border: "1px solid transparent",
        }
      : {
          background: active
            ? "rgba(127, 175, 179, 0.06)"
            : "transparent",
          color: active ? COLOR.ink : COLOR.inkMuted,
          border: `1px solid ${active ? COLOR.ghost + "66" : COLOR.inkGhost + "60"}`,
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="genesis-hover-ghost"
      style={{ ...base, ...variantStyle }}
    >
      {children}
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  PresetRow — wrapped row of small preset buttons, one active
// ───────────────────────────────────────────────────────────────────────────

export function PresetRow<T extends string>({
  items,
  active,
  onSelect,
}: {
  items: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 16,
      }}
    >
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className="genesis-hover-ghost"
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              padding: "6px 10px",
              border: `1px solid ${on ? COLOR.ghost + "70" : COLOR.inkGhost + "60"}`,
              borderRadius: 2,
              background: on ? "rgba(127, 175, 179, 0.08)" : "transparent",
              color: on ? COLOR.ink : COLOR.inkMuted,
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Toggle — two-state pill, for binary choices
// ───────────────────────────────────────────────────────────────────────────

export function Toggle<T extends string>({
  options,
  active,
  onSelect,
}: {
  options: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${COLOR.inkGhost}60`,
        borderRadius: 2,
        padding: 2,
      }}
    >
      {options.map((o) => {
        const on = o.id === active;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "6px 14px",
              border: "none",
              borderRadius: 1,
              background: on ? "rgba(127, 175, 179, 0.1)" : "transparent",
              color: on ? COLOR.ghost : COLOR.inkMuted,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  StatRow — label : value line for telemetry / derived-quantity panels
// ───────────────────────────────────────────────────────────────────────────

export function StatRow({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
        fontFamily: FONT.mono,
        fontSize: 11,
      }}
    >
      <div>
        <div style={{ color: COLOR.inkMuted }}>{label}</div>
        {hint && (
          <div
            style={{
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontSize: 11,
              color: COLOR.inkFaint,
              marginTop: 2,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div
        style={{
          color: accent ?? COLOR.ink,
          fontWeight: 500,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  EquationBlock — small framed card showing substrate equations
// ───────────────────────────────────────────────────────────────────────────

export function EquationBlock({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        border: `1px solid ${COLOR.inkGhost}40`,
        background: "rgba(6, 9, 18, 0.35)",
        borderRadius: 2,
        marginTop: 20,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 12,
          lineHeight: 1.8,
          color: COLOR.inkBody,
        }}
      >
        {children}
      </div>
      {note && (
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.55,
            color: COLOR.inkFaint,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  CanvasSurface — consistent framed surface for canvases
// ───────────────────────────────────────────────────────────────────────────

export function CanvasSurface({
  children,
  aspectRatio = "1 / 1",
}: {
  children: ReactNode;
  aspectRatio?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio,
        border: `1px solid ${COLOR.inkGhost}50`,
        borderRadius: 2,
        overflow: "hidden",
        background: COLOR.void,
        boxShadow:
          "inset 0 0 60px rgba(127, 175, 179, 0.035), 0 0 40px rgba(127, 175, 179, 0.04)",
      }}
    >
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  TelemetryNote — italic footnote line beneath a canvas or plate
// ───────────────────────────────────────────────────────────────────────────

export function TelemetryNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 10,
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.08em",
        color: COLOR.inkFaint,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
