"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 7 — Four scenarios, small multiples
//  ─────────────────────────────────────────────────────────────────────────
//  The phase plot itself becomes a 2×2 grid (handled by PhasePlot when
//  state.smallMultiples is true). Each cell is the same envelope, with
//  one of the four scenarios marked: home-system, solar neighbourhood,
//  local cluster, galactic. Same wall; different reach.
//
//  Tufte's rule: build the mental model on one example first, then show
//  the model surviving translation to the next scale. The reader has
//  spent five beats with a single envelope; now they see it work
//  everywhere.
// ═══════════════════════════════════════════════════════════════════════════

import { COLOR } from "../styles";
import { Body, DisplayHeading, Italic, Kicker, Mono } from "../atoms";
import { SCENARIO_LIST } from "../scenarios";

export function Beat7_SmallMultiples() {
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
      <Kicker>beat 06 · same wall, four scales</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          The wall is invariant.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          Same envelope, four scenarios. Each cell on the plot to your right
          is the same plot you've been reading — just zoomed to a different
          target. The argument doesn't depend on which scale you care about;
          it depends on whether the target falls inside or outside the
          envelope.
        </Body>

        <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
          {SCENARIO_LIST.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 18,
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 16,
                  color: COLOR.ink,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body), Georgia, serif",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: COLOR.inkMuted,
                }}
              >
                <Mono color={COLOR.ghost}>{s.sub}</Mono>
                <span style={{ marginLeft: 8 }}>{s.note}</span>
              </div>
            </div>
          ))}
        </div>

        <Body muted>
          Three of the four scenarios — home, solar, local — sit comfortably
          inside the envelope. The fourth — <Italic>galactic at agent
          timescales</Italic> — is outside by orders of magnitude. This is
          not because we picked unfriendly numbers; it's because the
          envelope is steep at large τ, and grabby expansion needs
          short τ at large L.
        </Body>
      </div>
    </div>
  );
}
