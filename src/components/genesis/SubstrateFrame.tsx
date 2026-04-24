"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Genesis · SubstrateFrame
//  ─────────────────────────────────────────────────────────────────────────
//  The chrome for a single substrate page. Renders a masthead (back-link,
//  catalog ID, italic title, subtitle, citation) and exports wrapper
//  primitives — <SubstrateFrame> for the outer padding + masthead, and
//  <SubstratePlate> for the reading-plate glass surface itself.
//
//  The plate uses the .reading-plate class from globals.css, which is the
//  site's chromatic lens onto the void — boosted saturation, dimmed
//  brightness, a faint ghost-cyan inset. Text contrast holds over any
//  substrate that renders beneath.
//
//  Also mounts the ambient Genesis styles — slider track/thumb, hover
//  transitions, textarea — pseudo-element selectors that can't be written
//  inline. Scoped to .genesis-* so they can't leak into any other plate.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ReactNode } from "react";
import type { SubstrateMeta } from "@/data/substrates";

// Inlined palette + fonts — matches page.tsx and SiteChrome.tsx pattern.
// Mirrors the CSS vars in globals.css; keep in sync if you change them.
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
//  Ambient CSS — one <style> block mounted once per page via <SubstrateFrame>
// ───────────────────────────────────────────────────────────────────────────

const GENESIS_STYLES = `
/* Range sliders inside Genesis pages. Ghost-cyan thumb, hairline track,
   light halo on hover. Scoped via .genesis-slider so it doesn't collide
   with any other range control on the site. */
input[type="range"].genesis-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  width: 100%;
  height: 22px;
  cursor: pointer;
}
input[type="range"].genesis-slider:focus { outline: none; }
input[type="range"].genesis-slider::-webkit-slider-runnable-track {
  height: 1px;
  background: rgba(127, 175, 179, 0.28);
  border: none;
}
input[type="range"].genesis-slider::-moz-range-track {
  height: 1px;
  background: rgba(127, 175, 179, 0.28);
  border: none;
}
input[type="range"].genesis-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #010106;
  border: 1px solid #7fafb3;
  border-radius: 50%;
  margin-top: -6.5px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
input[type="range"].genesis-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #010106;
  border: 1px solid #7fafb3;
  border-radius: 50%;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
input[type="range"].genesis-slider:hover::-webkit-slider-thumb,
input[type="range"].genesis-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 6px rgba(127, 175, 179, 0.08);
}
input[type="range"].genesis-slider:hover::-moz-range-thumb,
input[type="range"].genesis-slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 6px rgba(127, 175, 179, 0.08);
}

/* Back-link and preset-button hover transitions. */
.genesis-hover-ghost {
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}
.genesis-hover-ghost:hover {
  color: #eaeef7;
  border-color: rgba(127, 175, 179, 0.55);
}

/* Free-text entry (e.g. Filter's self-explanation prompt). */
.genesis-textarea {
  font-family: var(--font-display), 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 17px;
  line-height: 1.55;
  color: #eaeef7;
  background: rgba(6, 9, 18, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 16px 18px;
  width: 100%;
  resize: vertical;
  transition: border-color 0.25s ease;
}
.genesis-textarea:focus {
  outline: none;
  border-color: rgba(127, 175, 179, 0.42);
}
.genesis-textarea::placeholder {
  color: #5a6780;
  font-style: italic;
}
`;

// ───────────────────────────────────────────────────────────────────────────
//  SubstrateFrame — outer padding container + masthead + ambient styles
// ───────────────────────────────────────────────────────────────────────────

export function SubstrateFrame({
  meta,
  children,
}: {
  meta: SubstrateMeta;
  children: ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GENESIS_STYLES }} />
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 72px) clamp(24px, 4vw, 48px) 96px",
        }}
      >
        <SubstrateMasthead meta={meta} />
        {children}
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  SubstrateMasthead — back-link + catalog ID + italic title + subtitle + cite
// ───────────────────────────────────────────────────────────────────────────

function SubstrateMasthead({ meta }: { meta: SubstrateMeta }) {
  return (
    <header style={{ marginBottom: 56 }}>
      <Link
        href="/genesis"
        className="genesis-hover-ghost"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px 8px 10px",
          border: `1px solid ${COLOR.inkGhost}60`,
          borderRadius: 999,
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: COLOR.inkMuted,
        }}
      >
        <span aria-hidden style={{ color: COLOR.ghost }}>
          ←
        </span>
        <span>Genesis</span>
      </Link>

      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 11,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          {meta.catalog}
        </span>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: COLOR.inkGhost,
          }}
        >
          Substrate
        </span>
      </div>

      <h1
        style={{
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(48px, 6.5vw, 92px)",
          lineHeight: 0.96,
          letterSpacing: "-0.02em",
          color: COLOR.ink,
          margin: "18px 0 0",
        }}
      >
        {meta.title}
      </h1>

      <p
        style={{
          marginTop: 22,
          marginBottom: 0,
          maxWidth: "52ch",
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(18px, 1.8vw, 24px)",
          lineHeight: 1.45,
          color: COLOR.inkMuted,
        }}
      >
        {meta.subtitle}
      </p>

      <p
        style={{
          marginTop: 28,
          marginBottom: 0,
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
        }}
      >
        {meta.citation}
      </p>
    </header>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  SubstratePlate — reading-plate glass wrapper, one or many per page
// ───────────────────────────────────────────────────────────────────────────

export function SubstratePlate({
  children,
  variant = "default",
  style,
}: {
  children: ReactNode;
  variant?: "default" | "deep" | "article";
  style?: React.CSSProperties;
}) {
  const cls =
    "reading-plate" +
    (variant === "deep" ? " reading-plate--deep" : "") +
    (variant === "article" ? " reading-plate--article" : "");
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  SectionEyebrow — mono-uppercase section label
// ───────────────────────────────────────────────────────────────────────────

export function SectionEyebrow({
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
      }}
    >
      {children}
    </div>
  );
}
