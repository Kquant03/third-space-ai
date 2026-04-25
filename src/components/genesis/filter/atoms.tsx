"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · atoms
//  ─────────────────────────────────────────────────────────────────────────
//  Typography primitives, slider rows, and button variants reused across
//  every beat. Beats import from here so they can stay focused on their
//  narrative content without repeating styles.
// ═══════════════════════════════════════════════════════════════════════════

import { CSSProperties, ReactNode } from "react";
import { COLOR, FONT } from "./styles";

// ─── Typography ───────────────────────────────────────────────────────────

export function Kicker({
  children,
  color = COLOR.inkFaint,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

export function DisplayHeading({
  children,
  size = 56,
  color = COLOR.ink,
  italic = true,
}: {
  children: ReactNode;
  size?: number | string;
  color?: string;
  italic?: boolean;
}) {
  return (
    <h2
      style={{
        fontFamily: FONT.display,
        fontWeight: 300,
        fontStyle: italic ? "italic" : "normal",
        fontSize: typeof size === "number" ? size : size,
        lineHeight: 1.02,
        letterSpacing: "-0.012em",
        color,
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

export function Body({
  children,
  muted = false,
  size = 17,
  maxWidth = "62ch",
  style,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  size?: number;
  maxWidth?: string | number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <p
      className={className}
      style={{
        fontFamily: FONT.body,
        fontSize: size,
        lineHeight: 1.72,
        color: muted ? COLOR.inkMuted : COLOR.inkBody,
        margin: 0,
        maxWidth,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function Mono({
  children,
  color = COLOR.ghost,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span style={{ fontFamily: FONT.mono, fontSize: "0.92em", color }}>
      {children}
    </span>
  );
}

export function Italic({ children }: { children: ReactNode }) {
  return (
    <em
      style={{
        fontFamily: FONT.display,
        fontStyle: "italic",
        fontWeight: 400,
        color: COLOR.ink,
      }}
    >
      {children}
    </em>
  );
}

// ─── Equation card — used across beats 2, 3, 4, 6 ────────────────────────

export function EquationCard({
  eq,
  sub,
  accent = COLOR.ghost,
}: {
  eq: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        background: COLOR.voidSoft,
        border: `1px solid ${COLOR.inkGhost}`,
        borderLeft: `2px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 17,
          lineHeight: 1.55,
          color: COLOR.ink,
        }}
      >
        {eq}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontSize: 14,
          color: COLOR.inkMuted,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ─── Slider rows ──────────────────────────────────────────────────────────

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT.mono,
          fontSize: 11,
          color: COLOR.inkMuted,
          letterSpacing: "0.04em",
        }}
      >
        <span>{label}</span>
        <span style={{ color: COLOR.ghost }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: COLOR.ghost }}
      />
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────

export function btnGhost(extra: CSSProperties = {}): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${COLOR.ghost}`,
    color: COLOR.ghost,
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    padding: "10px 22px",
    cursor: "pointer",
    ...extra,
  };
}

export function btnFaint(extra: CSSProperties = {}): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${COLOR.inkGhost}`,
    color: COLOR.inkMuted,
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    padding: "10px 22px",
    cursor: "pointer",
    ...extra,
  };
}

export function btnSanguine(extra: CSSProperties = {}): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${COLOR.sanguine}`,
    color: COLOR.sanguineWash,
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    padding: "10px 22px",
    cursor: "pointer",
    ...extra,
  };
}

// ─── Section frame · the standard two-column beat layout ─────────────────
// Left column: prose. Right column: empty (the sticky PhasePlot lives in
// FilterExperience and reads through this column on the desktop layout).
// Beats with their own visualizations (Beat 1 cold open, Beat 4
// Sivak–Crooks, Beat 9 fission dilemma, Beat 11 Coherence Depth) override
// this and bring their own right-column content.

export function BeatLayout({
  children,
  beatId,
  onlyText = false,
  rightColumn,
}: {
  children: ReactNode;
  beatId: number;
  onlyText?: boolean;
  rightColumn?: ReactNode;
}) {
  return (
    <section
      data-beat={beatId}
      style={{
        minHeight: "100vh",
        padding: "12vh clamp(28px, 6vw, 80px) 8vh",
        display: "grid",
        gridTemplateColumns: onlyText ? "minmax(0, 720px)" : "minmax(0, 1fr) minmax(0, 1fr)",
        gap: "clamp(28px, 4vw, 64px)",
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: 22, alignContent: "start" }}>
        {children}
      </div>
      {!onlyText && rightColumn && <div>{rightColumn}</div>}
    </section>
  );
}

// ─── Inline citation hover-card · Distill-style ──────────────────────────

export function Cite({
  children,
  refKey,
}: {
  children: ReactNode;
  refKey: string;
}) {
  return (
    <span
      title={refKey}
      style={{
        borderBottom: `1px dotted ${COLOR.ghostSoft}`,
        cursor: "help",
        color: COLOR.inkBody,
      }}
    >
      {children}
    </span>
  );
}
