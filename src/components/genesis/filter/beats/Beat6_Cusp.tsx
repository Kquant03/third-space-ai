"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 6 — The cusp reveal
//  ─────────────────────────────────────────────────────────────────────────
//  The phase plot now shows the true envelope (ink) alongside the
//  reader's locked prediction (dashed ghost). The cusp τ* is marked and
//  named. We frame the cusp as a conspiracy of two physics regimes:
//  Lieb–Robinson information velocity (general-relativistic regime) and
//  Sivak–Crooks counterdiabatic excess (stochastic-thermodynamic regime)
//  meet at a single point. Neither regime knows the other exists.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, EquationCard, Italic, Kicker, Mono,
} from "../atoms";
import {
  tau_star, fmtTau, SEC_PER_YR, LAMBDA_DEFAULT, T_DEFAULT, C_LIGHT, L_SUN,
} from "../physics";

export function Beat6_Cusp({
  params,
}: {
  params?: { lam: number; T: number; v: number; L_star: number };
}) {
  const p = params ?? {
    lam: LAMBDA_DEFAULT, T: T_DEFAULT, v: C_LIGHT, L_star: L_SUN,
  };
  const tauStarYr = tau_star(p.lam, p.T, p.v, p.L_star) / SEC_PER_YR;

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
      <Kicker color={COLOR.ink}>beat 05 · the cusp</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          Two unrelated theories,
          <br />
          one point of contact.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          The envelope you see now on the plot is <Italic>nothing more</Italic>{" "}
          than the pointwise minimum of the two teeth — the constraint each
          would impose if the other did not exist. Light says no faster than{" "}
          <Mono>L_R = vτ/2</Mono>; heat says no faster than{" "}
          <Mono>L_E = λ√(L⊙τ/kT ln 2)</Mono>. Both must hold. Compose them
          and you get the cusp.
        </Body>

        <EquationCard
          eq={`τ*  =  4 λ² L⊙ / ( kT ln 2 · v² )  ≈  ${fmtTau(tauStarYr)}`}
          sub="where the relativistic and energetic envelopes cross — for nm-scale λ at room T"
          accent={COLOR.ink}
        />

        <Body>
          To the left of <Mono>τ*</Mono>, light is the binding wall: you can
          dissipate as much heat as you like, but no signal will arrive in
          time. To the right, heat is the binding wall: you can take all the
          time you want, but the boundary's heat exhaust outruns the bath's
          ability to absorb it. <Italic>The cusp is not a feature of either
          theory alone</Italic> — neither Lieb–Robinson nor Sivak–Crooks
          contains it. It exists only when both apply.
        </Body>

        <Body muted>
          This is what physicists call <Italic>regime composition</Italic>:
          two unrelated areas of physics (special relativity and stochastic
          thermodynamics) impose constraints on the same variable, and the
          binding constraint switches at some scale. The cusp is the switch
          point. Above it: heat-bound. Below it: light-bound. Across it:
          a single envelope you cannot escape with refinement on either side.
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
            color: COLOR.ink,
          }}
        >
          {open ? "↑ close audit" : "↓ derivation of τ*"}
        </button>

        {open && (
          <div
            style={{
              borderLeft: `1px solid ${COLOR.inkGhost}`,
              padding: "0 0 0 22px",
              display: "grid",
              gap: 22,
            }}
          >
            <DerivStep
              tag="1 · set the teeth equal"
              text="At the cusp the two envelopes are tangent in log-log: L_R(τ*) = L_E(τ*). vτ*/2 = λ√(L⊙ τ*/kT ln 2)."
            />
            <DerivStep
              tag="2 · square and isolate τ*"
              text="(vτ*/2)² = λ² L⊙ τ* / (kT ln 2). τ* = 4λ² L⊙ / (v² kT ln 2)."
            />
            <DerivStep
              tag="3 · evaluate at fiducials"
              text={`λ = 1 nm, T = 300 K, v = c, L⊙ = 3.8 × 10²⁶ W. Substituting yields τ* ≈ ${fmtTau(tauStarYr)}.`}
              cite="See §6.2 of the paper for the symbolic derivation, with units."
            />
            <DerivStep
              tag="4 · sensitivity"
              text="τ* ∝ λ² T⁻¹ v⁻². Doubling λ shifts τ* by 4×; halving T shifts by 2×. None of these moves get a galactic civilization inside the envelope at agent timescales."
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
          color: COLOR.ink,
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
