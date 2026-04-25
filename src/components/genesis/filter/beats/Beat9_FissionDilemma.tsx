"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 9 — The fission dilemma
//  ─────────────────────────────────────────────────────────────────────────
//  THE CHINESE-ROOM MOMENT. The reader is presented with a forced choice:
//  after fission, are the daughters coordinated or not?
//
//    YES — they share an inter-fragment synchronization channel D = 2·L_d.
//          The envelope is invariant under L → D rescaling. The wall holds.
//          (The phase plot's architected trajectory shows D breaching.)
//
//    NO  — they expand independently. Each daughter respects the bound
//          locally, but the cloud has no shared expansion front, no
//          common signal speed, no joint signature. It fails Hanson's
//          grabby criteria by ceasing to be a civilization in the
//          relevant sense — it is now a heterogeneous distribution of
//          unrelated entities.
//
//  Both paths walked. There is no third option.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, Italic, Kicker, Mono, btnGhost, btnSanguine,
} from "../atoms";

type Branch = null | "coordinated" | "uncoordinated";

export function Beat9_FissionDilemma() {
  const [branch, setBranch] = useState<Branch>(null);

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
      <Kicker color={COLOR.ink}>beat 08·5 · the dilemma</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          After fission —
          <br />
          <Italic>are they coordinated?</Italic>
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          The naïve-fission objection says: split into daughters; each
          daughter respects the bound locally; problem solved. But this
          rests on an ambiguity. After fission, do the daughters maintain
          inter-fragment coordination, or not? The answer determines
          which physics applies.
        </Body>

        <Body muted>
          This is the Chinese-Room move. There is no third option. The
          architectural choice forces the question.
        </Body>

        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setBranch("coordinated")}
            style={btnGhost(branch === "coordinated"
              ? { background: COLOR.ghostFaint, color: COLOR.ink } : {})}
          >
            yes · coordinated
          </button>
          <button
            onClick={() => setBranch("uncoordinated")}
            style={btnSanguine(branch === "uncoordinated"
              ? { background: "rgba(154,43,43,0.15)", color: COLOR.sanguineWash } : {})}
          >
            no · uncoordinated
          </button>
        </div>

        {branch === "coordinated" && (
          <BranchPanel
            color={COLOR.ghost}
            kicker="branch a · coordinated daughters"
            heading="The wall rescales. The wall holds."
            body={
              <>
                <Body>
                  Coordinated daughters share an inter-fragment synchronization
                  channel <Mono>D = 2·L_d</Mono> — the round-trip distance
                  between farthest-separated daughters, which any shared
                  expansion front must traverse to remain shared.
                </Body>
                <Body>
                  The composed envelope is invariant under the variable
                  rescaling <Italic>L → D</Italic>: same teeth, same cusp,
                  same constants. The plot to your right shows D as a
                  dashed worldline, climbing at the same τ as the daughters
                  themselves. <Italic>It breaches.</Italic>
                </Body>
                <Body muted>
                  Architected fission inherits the wall rather than escaping
                  it. The bound is invariant under the architectural
                  reshuffle that motivated the move in the first place.
                </Body>
              </>
            }
          />
        )}

        {branch === "uncoordinated" && (
          <BranchPanel
            color={COLOR.sanguineWash}
            kicker="branch b · uncoordinated daughters"
            heading="No wall. No civilization."
            body={
              <>
                <Body>
                  Uncoordinated daughters share nothing. Each respects the
                  envelope locally; the cloud as a whole does not. But
                  Hanson's grabby criteria require: a shared expansion
                  front, a common expansion velocity, a joint visible
                  signature.
                </Body>
                <Body>
                  None of these survive uncoordinated fission. The cloud is
                  now a heterogeneous distribution of unrelated entities —
                  some expanding, some not, with no coupling between them.
                  It is no longer a civilization in the sense Hanson's
                  model assumes.
                </Body>
                <Body muted>
                  Stipulated. The cloud evades the envelope by ceasing to be
                  a civilization in the grabby sense. We do not formally
                  bound this case; we note only that it is not the case
                  Hanson's argument is about.
                </Body>
              </>
            }
          />
        )}

        {branch && (
          <div
            style={{
              marginTop: 24,
              padding: "14px 18px",
              borderTop: `1px solid ${COLOR.inkVeil}`,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontSize: 16,
              color: COLOR.ink,
              lineHeight: 1.55,
            }}
          >
            Try the other branch. The dilemma is exhausted by these two
            choices — that is the point.
          </div>
        )}
      </div>
    </div>
  );
}

function BranchPanel({
  color, kicker, heading, body,
}: {
  color: string; kicker: string; heading: string; body: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "22px 24px",
        background: COLOR.voidMid,
        border: `1px solid ${COLOR.inkVeil}`,
        borderLeft: `3px solid ${color}`,
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontSize: 26,
          color: COLOR.ink,
          lineHeight: 1.15,
        }}
      >
        {heading}
      </div>
      <div style={{ display: "grid", gap: 14 }}>{body}</div>
    </div>
  );
}
