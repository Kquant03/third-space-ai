"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · LoopholesPanel
//  ─────────────────────────────────────────────────────────────────────────
//  A deliberately-named list of the precise places where the composed
//  bound could fail. Borrowed from Bell-inequality practice: naming the
//  loopholes strengthens the claim rather than weakens it.
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
  ink: "#f4f6fb",
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

const LOOPHOLES: Array<{ name: string; text: string }> = [
  {
    name: "Exotic-matter loophole",
    text:
      "If operating temperature T can be reduced toward zero, the Landauer quantum k_B T ln 2 scales down with it. But reducing T requires heat rejection to an even colder reservoir; the CMB at ~2.7 K is the practical floor for any civilization in our universe.",
  },
  {
    name: "Physics-beyond-Lieb-Robinson loophole",
    text:
      "A theory with genuine superluminal signalling would evade the relativistic tooth. Known physics does not provide one. Wormhole-mediated communication would require traversable geometries and exotic matter; none observed.",
  },
  {
    name: "Non-Markovian-reservoir loophole",
    text:
      "Sivak–Crooks assumes the driving protocol interacts with a memoryless bath. Highly non-Markovian reservoirs can show transient violations, but the time-averaged bound is restored.",
  },
  {
    name: "Uncoordinated expansion",
    text:
      "A civilization that abandons coordination across its frontier — becomes a cloud of non-communicating fragments — evades the envelope BY becoming not-a-civilization in the sense the grabby-aliens framework requires. Hanson's scenario presupposes coordination.",
  },
];

export function LoopholesPanel() {
  return (
    <div
      style={{
        padding: "clamp(28px, 3vw, 44px) clamp(28px, 3vw, 44px)",
        border: `1px solid ${COLOR.inkGhost}`,
        background: "rgba(10, 15, 26, 0.35)",
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          marginBottom: 18,
        }}
      >
        What this bound does not rule out
      </div>
      <div
        style={{
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontSize: 15.5,
          lineHeight: 1.6,
          color: COLOR.inkMuted,
          marginBottom: 28,
          maxWidth: "60ch",
        }}
      >
        Following the Bell-inequality convention of naming limits explicitly.
        Each loophole is a precise place where the argument could fail — and
        where it doesn't, against present evidence.
      </div>
      {LOOPHOLES.map((l, i) => (
        <div
          key={i}
          style={{
            marginBottom: 22,
            paddingBottom: 22,
            borderBottom:
              i < LOOPHOLES.length - 1 ? `1px solid ${COLOR.inkGhost}60` : "none",
          }}
        >
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 17,
              color: COLOR.ink,
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            {l.name}
          </div>
          <div
            style={{
              fontFamily: FONT.body,
              fontSize: 15,
              lineHeight: 1.7,
              color: COLOR.inkBody,
            }}
          >
            {l.text}
          </div>
        </div>
      ))}
    </div>
  );
}
