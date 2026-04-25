"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 10 — Loopholes
//  ─────────────────────────────────────────────────────────────────────────
//  Every escape attempt we know how to state, with the rebuttal. Modeled
//  after the Bell-test loopholes literature: locality, fair-sampling,
//  freedom-of-choice, etc. We close seven; we honestly mark the eighth
//  (acausal/superdeterministic) as a residual that abandons agentic
//  coordination as a meaningful concept.
//
//  Hensen et al. (2015) is the loophole-free Bell experiment that informs
//  this style: name every escape, address every escape, mark the residual.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COLOR, FONT } from "../styles";
import { Body, DisplayHeading, Italic, Kicker } from "../atoms";

const LOOPHOLES = [
  {
    name: "Wormholes / superluminal physics",
    threat: "If signals can outrun c, the relativistic tooth dissolves.",
    rebut: "Known physics provides no such channel. Traversable wormholes require exotic matter (NEC violation), none observed. The relativistic tooth survives every experimentally accessible regime.",
    closed: true,
  },
  {
    name: "Sub-Landauer reversible computation",
    threat: "If all updates are logically reversible, the kT ln 2 floor disappears.",
    rebut: "Coordination requires erasing the local model when the global state changes — this is the irreversible step. Even Bennett's reversible-computing constructions require eventual erasure of garbage bits at the boundary. The bound applies to the boundary, where it cannot be reversed.",
    closed: true,
  },
  {
    name: "Cold reservoir (T → 0)",
    threat: "If T can be lowered arbitrarily, kT ln 2 scales down with it.",
    rebut: "Any cooling protocol must reject heat to a colder reservoir. The CMB at 2.7 K is the practical floor; quantum-limited refrigerators below that pay the same Sivak–Crooks cost in their own protocols. The bound shifts, but does not vanish.",
    closed: true,
  },
  {
    name: "Quantum compression (smaller λ)",
    threat: "If granularity λ shrinks below a nanometre, the energetic tooth softens (L_E ∝ λ).",
    rebut: "τ* ∝ λ². Halving λ shifts the cusp by a factor of four; reaching agent-scale galactic expansion would require λ ~ 10⁻¹⁵ m (nuclear scale) and femtokelvin baths. No physically realizable substrate.",
    closed: true,
  },
  {
    name: "Relativistic time dilation",
    threat: "A frontier moving at γ ≫ 1 sees its own τ stretched.",
    rebut: "But coordination is an inertial-frame property of the home substrate; the frontier's lab-frame τ is shrunk, not stretched. Time dilation tightens the bound on coordinated extent rather than relaxing it.",
    closed: true,
  },
  {
    name: "Uncoordinated fission",
    threat: "A civilization fragments into uncoordinated daughters; each respects the bound; the cloud as a whole exceeds it.",
    rebut: "Stipulated. But this fails Hanson's grabby criteria: no single coherent expansion front, no common speed, no common visible signature. The cloud evades the envelope by ceasing to be a civilization in the grabby sense. (See §8.5.)",
    closed: true,
  },
  {
    name: "Non-Markovian reservoirs",
    threat: "Sivak–Crooks assumes a memoryless bath. Highly non-Markovian baths can show transient violations.",
    rebut: "The time-averaged bound is restored — and any genuinely persistent non-Markovian bath is itself part of the system requiring a Markov boundary at some larger λ. The argument simply re-inserts at the next scale.",
    closed: true,
  },
  {
    name: "Acausal / superdeterministic coordination",
    threat: "Coordinated outcomes without exchanged signals (cosmological initial conditions, retrocausality).",
    rebut: "Honest residual. We do not formally close this loophole. We note only that any such mechanism abandons agentic coordination as a meaningful concept — the agent did not choose anything. Hanson's grabby model presupposes choice.",
    closed: false,
  },
];

export function Beat10_Loopholes() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

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
      <Kicker>beat 09 · loopholes</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          Where this could fail.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          Modeled on the Bell-test loophole literature: we name every
          escape, address every escape, and mark the one residual that
          we cannot formally close. Seven are dispatched; the eighth is
          honestly conceded — it abandons agentic coordination as a
          meaningful concept.
        </Body>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {LOOPHOLES.map((l, i) => {
            const open = openIdx === i;
            return (
              <div
                key={i}
                style={{
                  background: COLOR.voidMid,
                  border: `1px solid ${COLOR.inkVeil}`,
                  borderLeft: `2px solid ${l.closed ? COLOR.ghostFaint : COLOR.amberSoft}`,
                }}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "14px 18px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      color: l.closed ? COLOR.ghost : COLOR.amber,
                      letterSpacing: "0.16em",
                      width: 56,
                    }}
                  >
                    {l.closed ? "✓ closed" : "○ open"}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT.display,
                      fontStyle: "italic",
                      fontSize: 16,
                      color: COLOR.ink,
                    }}
                  >
                    {l.name}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 12,
                      color: COLOR.inkFaint,
                    }}
                  >
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open && (
                  <div
                    style={{
                      padding: "0 18px 18px",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: FONT.mono,
                          fontSize: 9.5,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: COLOR.amberSoft,
                          marginBottom: 6,
                        }}
                      >
                        threat
                      </div>
                      <div
                        style={{
                          fontFamily: FONT.body,
                          fontSize: 14.5,
                          lineHeight: 1.65,
                          color: COLOR.inkBody,
                        }}
                      >
                        {l.threat}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: FONT.mono,
                          fontSize: 9.5,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: l.closed ? COLOR.ghost : COLOR.sanguineWash,
                          marginBottom: 6,
                        }}
                      >
                        {l.closed ? "rebuttal" : "honest residual"}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT.body,
                          fontSize: 14.5,
                          lineHeight: 1.65,
                          color: COLOR.inkBody,
                        }}
                      >
                        {l.rebut}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Body muted style={{ marginTop: 18 }}>
          <Italic>One residual. We name it.</Italic> If you want to escape
          this argument, this is where you go — but the cost is abandoning
          agentic coordination as a meaningful concept. The grabby model
          presupposes choice. Without it, the model dissolves on its own
          terms before our envelope ever applies.
        </Body>
      </div>
    </div>
  );
}
