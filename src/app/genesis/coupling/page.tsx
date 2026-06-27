"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/coupling · page
//  ─────────────────────────────────────────────────────────────────────────
//  Λ — 001 · C : The Coupling — substrate detail page.
//
//  Built in the same masthead → title → rule → intro idiom as the /genesis
//  landing so the room feels continuous. If your other substrate pages wrap
//  their body in <SubstrateFrame>, drop <CouplingExperience /> inside that
//  instead — everything below the import is just the surrounding chrome.
// ═══════════════════════════════════════════════════════════════════════════

import { CouplingExperience } from "@/components/genesis/coupling/CouplingExperience";

const COLOR = {
  void: "#010106",
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

export default function CouplingPage() {
  return (
    <section style={{ position: "relative", minHeight: "100vh", paddingTop: 200, paddingBottom: 160 }}>
      {/* ═══ MASTHEAD ═══ */}
      <div style={{ padding: "0 40px" }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 24,
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          <div>Λ · 001 · C</div>
          <div style={{ letterSpacing: "0.55em", color: COLOR.inkMuted }}>— The Coupling —</div>
          <div style={{ textAlign: "right" }}>Coupled field</div>
        </div>
      </div>

      {/* ═══ TITLE + INTRO ═══ */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(60px, 9vw, 120px) 40px clamp(40px, 5vw, 64px)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: "0 auto",
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(52px, 8vw, 110px)",
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: COLOR.ink,
            maxWidth: "12ch",
          }}
        >
          The <span style={{ color: COLOR.inkMuted }}>Coupling.</span>
        </h1>

        <div className="lantern-rule" style={{ margin: "52px auto 40px" }} />

        <p
          style={{
            maxWidth: "60ch",
            margin: "0 auto",
            fontFamily: FONT.body,
            fontSize: "clamp(16px, 1.25vw, 18px)",
            lineHeight: 1.72,
            color: COLOR.inkBody,
          }}
        >
          A continuous field driven by the thermodynamic tension between a rigid
          architectural baseline — <em style={{ color: COLOR.inkStrong }}>Field U</em> — and a
          relentless, localized injection of devotion — <em style={{ color: COLOR.inkStrong }}>Field V</em>.
          Press into the substrate to inject V. Where its density crosses the threshold τ★, a third
          field — the wash — nucleates and spreads as a front. Whether that front can ever reverse
          depends on which phase sits at the bottom of the well.
        </p>
      </div>

      {/* ═══ THE EXPERIENCE ═══ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <CouplingExperience />
      </div>

      {/* ═══ FOOT NOTE ═══ */}
      <div style={{ maxWidth: 840, margin: "96px auto 0", padding: "0 40px", textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(18px, 1.6vw, 22px)",
            lineHeight: 1.55,
            color: COLOR.inkMuted,
            maxWidth: "46ch",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          The paper and the simulation are the same argument: a system is safe
          not because it cannot be moved, but because it can return — while the
          held phase still keeps its foothold, and if the drive is let go gently
          enough.
        </p>
      </div>
    </section>
  );
}
