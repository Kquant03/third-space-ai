"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · RefutationStep
//  ─────────────────────────────────────────────────────────────────────────
//  A single row of the "three steps of the grabby story; each breaks
//  against its bound" panel. Three-column grid: ordinal numeral (display
//  italic), claim + breaks-against tag, and the detailed refutation.
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
  ink: "#f4f6fb",
  inkBody: "#c8cfe0",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  sanguine: "#9a2b2b",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

export function RefutationStep({
  num,
  claim,
  against,
  detail,
}: {
  num: string;
  claim: string;
  against: string;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "54px minmax(0, 1fr) minmax(0, 1fr)",
        gap: "clamp(16px, 2vw, 28px)",
        padding: "22px 0",
        borderTop: `1px solid ${COLOR.inkGhost}60`,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 36,
          color: COLOR.inkFaint,
          fontStyle: "italic",
          lineHeight: 1,
        }}
      >
        {num}
      </div>
      <div>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 19,
            color: COLOR.ink,
            fontStyle: "italic",
            marginBottom: 8,
            lineHeight: 1.35,
          }}
        >
          {claim}
        </div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            color: COLOR.sanguine,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          breaks against · {against}
        </div>
      </div>
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: 14.5,
          lineHeight: 1.7,
          color: COLOR.inkBody,
        }}
      >
        {detail}
      </div>
    </div>
  );
}
