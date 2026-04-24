"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Genesis · SubstrateCard
//  ─────────────────────────────────────────────────────────────────────────
//  Shared primitive for the /genesis catalog page. Each card is a
//  reading-plate containing:
//
//    · live or static preview canvas (render delegated to `renderCanvas`)
//    · catalog ID + substrate name
//    · subtitle, description, citation
//    · "Enter" link to the substrate's route
//
//  Visibility gate — previews only run while on-screen, via an
//  IntersectionObserver. Cards receive a `playing` prop they can read to
//  pause their simulation loops; the parent `/genesis` page also has a
//  "previews on / off" global toggle.
//
//  The card borrows from PlatformEntry on the main page but is wider,
//  shorter, and designed to tile in a grid rather than stack.
// ═══════════════════════════════════════════════════════════════════════════

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";

// Inlined Lantern palette — matches the rest of the site.
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
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

export type SubstrateCardProps = {
  catalog: string;           // "Λ — 001" identifier
  title: string;
  subtitle: string;
  description: string;
  citation: string;
  href: string;              // internal substrate route
  featured?: boolean;        // larger cell when true
  canvasAspect?: string;     // aspect ratio for the preview (default 1/1)
  renderCanvas: (playing: boolean) => ReactNode;
};

export function SubstrateCard({
  catalog,
  title,
  subtitle,
  description,
  citation,
  href,
  featured = false,
  canvasAspect = "1 / 1",
  renderCanvas,
}: SubstrateCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  // Only run the preview while the card is in (or near) the viewport.
  // 200px rootMargin gives us a beat of warm-up before it scrolls into
  // view, so the reader lands on motion rather than a blank square.
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px 0px", threshold: 0 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      href={href}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        ref={ref}
        className="reading-plate substrate-card"
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr",
          gap: 0,
          padding: 0,
          overflow: "hidden",
          transition:
            "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          height: "100%",
          cursor: "pointer",
        }}
      >
        {/* ── Preview canvas ─────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: canvasAspect,
            background: COLOR.void,
            borderBottom: `1px solid ${COLOR.inkGhost}40`,
            overflow: "hidden",
          }}
        >
          {renderCanvas(visible)}
          {/* Inset glow — faint atmospheric shadow so the preview
              reads as a window rather than a tile. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow:
                "inset 0 0 60px rgba(127, 175, 179, 0.035), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            }}
          />
        </div>

        {/* ── Text block ─────────────────────────────────────── */}
        <div
          style={{
            padding: "clamp(22px, 2.2vw, 32px) clamp(22px, 2.2vw, 32px) clamp(26px, 2.4vw, 36px)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
              }}
            >
              {catalog}
            </span>
            {featured && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: FONT.mono,
                  fontSize: 9,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: COLOR.ghost,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: COLOR.ghost,
                    boxShadow: `0 0 12px ${COLOR.ghost}`,
                  }}
                />
                Featured
              </span>
            )}
          </div>

          <h3
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: featured ? "clamp(36px, 4vw, 52px)" : "clamp(26px, 2.6vw, 34px)",
              lineHeight: 1.02,
              letterSpacing: "-0.015em",
              color: COLOR.ink,
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: featured ? "clamp(16px, 1.4vw, 20px)" : "clamp(14px, 1.1vw, 16px)",
              lineHeight: 1.45,
              color: COLOR.inkMuted,
            }}
          >
            {subtitle}
          </p>

          <p
            style={{
              margin: 0,
              fontFamily: FONT.body,
              fontSize: featured ? 15 : 13.5,
              lineHeight: 1.7,
              color: COLOR.inkBody,
            }}
          >
            {description}
          </p>

          <div
            style={{
              marginTop: "auto",
              paddingTop: 12,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 9.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {citation}
            </span>
            <span
              className="substrate-card-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: COLOR.ghost,
                borderBottom: `1px solid ${COLOR.ghost}40`,
                paddingBottom: 4,
                transition: "color 0.3s ease, border-color 0.3s ease",
                flexShrink: 0,
              }}
            >
              Enter
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
