"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 3 — The energetic tooth (Landauer)
//  ─────────────────────────────────────────────────────────────────────────
//  L_E = λ √(L⊙ τ / kT ln 2). The energetic envelope: a coordination
//  boundary of size L must dissipate kT ln 2 per cell per coordination
//  event. Multiplied across the surface of the boundary at granularity
//  λ, the heat exhaust scales as L²/λ². Demanding that the bath sustain
//  this at solar luminosity gives L ∝ √τ.
//
//  CRITICAL · Pearl/Friston distinction:
//  We use "Markov blanket" in the Pearl 1988 sense — a graph-theoretic
//  conditional independence — NOT in the Friston free-energy-principle
//  sense, which Bruineberg et al. (2022) showed conflates two distinct
//  notions. We require nothing of the boundary's representational status;
//  only that information crossing it is irreversibly registered.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, EquationCard, Italic, Kicker, Mono,
} from "../atoms";

export function Beat3_EnergeticTooth() {
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
      <Kicker color={COLOR.amber}>beat 03 · the second wall</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          Coordination dissipates heat.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          Coordination requires erasing a stale local model when the global
          state changes. Landauer (1961) proved every irreversible bit-erasure
          dissipates at least <Mono color={COLOR.amber}>kT ln 2</Mono> as
          heat. Bérut et al. (2012) verified it experimentally with single
          colloidal beads. The floor is real, not an idealization.
        </Body>

        <Body>
          A coordinated region of extent <Mono>L</Mono> presents a boundary
          whose area scales as <Mono>L²</Mono>; updating it at granularity{" "}
          <Mono>λ</Mono> requires <Mono>(L/λ)²</Mono> bit-erasures per
          coordination event. Setting the heat exhaust below the home star's
          luminosity <Mono>L⊙</Mono> and rearranging:
        </Body>

        <EquationCard
          eq="L_E  ≤  λ √( L⊙ τ / kT ln 2 )"
          sub="energetic envelope · a √τ growth law"
          accent={COLOR.amber}
        />

        <Body>
          The square root matters: doubling the available time only multiplies
          reachable extent by <Mono>√2</Mono>, while the signaling tooth
          rewards time linearly. <Italic>The two teeth grow at different
          rates, which is why they cross.</Italic>
        </Body>

        <div
          style={{
            padding: "16px 20px",
            background: COLOR.voidMid,
            border: `1px solid ${COLOR.inkVeil}`,
            borderLeft: `2px solid ${COLOR.amberSoft}`,
            display: "grid",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLOR.amber,
            }}
          >
            on Markov blankets
          </div>
          <div
            style={{
              fontFamily: FONT.body,
              fontSize: 14.5,
              lineHeight: 1.65,
              color: COLOR.inkBody,
            }}
          >
            We use "Markov blanket" in the Pearl 1988 graph-theoretic sense —
            a conditional independence shield around the coordinated
            region — <Italic>not</Italic> in the Friston free-energy sense.
            Bruineberg et al. (2022) showed the two are routinely conflated
            in the active-inference literature. Our argument requires
            nothing of the blanket's representational status; only that
            information crossing it is irreversibly registered.
          </div>
        </div>

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
            color: COLOR.amber,
          }}
        >
          {open ? "↑ close audit" : "↓ derivation audit"}
        </button>

        {open && (
          <div
            style={{
              borderLeft: `1px solid ${COLOR.amberSoft}`,
              padding: "0 0 0 22px",
              display: "grid",
              gap: 22,
            }}
          >
            <DerivStep
              tag="1 · landauer floor"
              text="Each irreversible bit-erasure dissipates at least kT ln 2 of heat. Verified experimentally with sub-percent agreement."
              cite="Landauer, IBM J. Res. Dev. 5, 183 (1961). Bérut et al., Nature 483, 187 (2012)."
            />
            <DerivStep
              tag="2 · boundary scaling"
              text="A coordinated region of extent L has surface area ~ L². Updating it at granularity λ requires (L/λ)² independent erasures per coordination event."
            />
            <DerivStep
              tag="3 · luminosity budget"
              text="Heat exhaust must not exceed home-star luminosity L⊙. (kT ln 2)(L/λ)² / τ ≤ L⊙. Solving for L gives L_E = λ √(L⊙ τ / kT ln 2)."
              cite="Sivak & Crooks, PRL 108, 190602 (2012) · counterdiabatic excess for finite-time protocols."
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
          color: COLOR.amber,
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
