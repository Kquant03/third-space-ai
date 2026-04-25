"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 2 — The signaling tooth (Lieb–Robinson)
//  ─────────────────────────────────────────────────────────────────────────
//  L ≤ vτ/2. The relativistic envelope. Round-trip closure:
//  to remain coordinated across an extent L over an epoch τ, every cell
//  must hear from every other cell, so 2L/v ≤ τ.
//
//  Pedagogical hook: Lamport's "happens-before" partial order in
//  distributed systems is the same shape as the relativistic causal cone.
//  Every distributed-systems engineer already understands this; we just
//  rename it.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, EquationCard, Italic, Kicker, Mono,
} from "../atoms";

export function Beat2_SignalingTooth() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "12vh clamp(28px, 6vw, 80px) 8vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Kicker color={COLOR.ghost}>beat 02 · the first wall</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          Light has the only vote.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          A civilization of extent <Mono>L</Mono> can only stay coordinated
          across an epoch <Mono>τ</Mono> if every cell has heard from every
          other cell within that epoch. Round-trip signalling demands{" "}
          <Mono>2L/v ≤ τ</Mono>. Rearranging:
        </Body>

        <EquationCard
          eq="L  ≤  v τ / 2"
          sub="Lieb–Robinson bound, relativistically saturated (v ≤ c)"
          accent={COLOR.ghost}
        />

        <Body>
          This is the same constraint Leslie Lamport identified in distributed
          systems half a century ago: events have a partial causal order set
          by a message-passing graph. In a many-body quantum system, the
          message-passing graph is set by the Hamiltonian's range — and the
          fastest signal it admits is the Lieb–Robinson velocity. In the
          relativistic limit, that velocity is <Italic>c</Italic>, exactly.
        </Body>

        <Body muted>
          Power-law interactions soften the cone to a polynomial; quantum
          information scrambling propagates a butterfly-cone with the same
          asymptotic shape. We use the relativistic ceiling as the optimistic
          case: any real coordination respects something tighter than this.
        </Body>

        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "transparent",
            border: "none",
            padding: "8px 0",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: FONT.mono,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.ghost,
          }}
        >
          {open ? "↑ close audit" : "↓ derivation audit"}
        </button>

        {open && (
          <div
            style={{
              borderLeft: `1px solid ${COLOR.ghostFaint}`,
              padding: "0 0 0 22px",
              display: "grid",
              gap: 22,
            }}
          >
            <DerivStep
              tag="1 · information velocity"
              text="Lieb & Robinson 1972 proved that any quantum system with finite-range local interactions has a bounded information velocity. In the relativistic limit, v ≤ c."
              cite="Lieb & Robinson, Comm. Math. Phys. 28, 251 (1972)."
            />
            <DerivStep
              tag="2 · round-trip closure"
              text="Coordination across L over τ requires every cell to see every other within τ. Round-trip signalling requires 2L/v ≤ τ."
            />
            <DerivStep
              tag="3 · rearranging"
              text="L ≤ vτ/2. Refining couplings or substrates cannot move v above c. Power-law interactions preserve the bound up to logarithmic corrections."
              cite="Foss-Feig et al., Phys. Rev. Lett. 114, 157201 (2015). Tran et al., PRL 127, 160401 (2021)."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DerivStep({ tag, text, cite }: { tag: string; text: string; cite?: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: COLOR.ghost,
          marginBottom: 10,
          fontWeight: 500,
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: 15.5,
          lineHeight: 1.7,
          color: COLOR.inkBody,
        }}
      >
        {text}
      </div>
      {cite && (
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT.mono,
            fontSize: 10.5,
            lineHeight: 1.55,
            color: COLOR.inkFaint,
            fontStyle: "italic",
          }}
        >
          ↳ {cite}
        </div>
      )}
    </div>
  );
}
