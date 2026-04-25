"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 8 — Three strategies
//  ─────────────────────────────────────────────────────────────────────────
//  How could a civilization try to evade the envelope?
//
//    1 · Monolithic — single coordinated whole expanding outward.
//        Fails: hits L_E directly.
//    2 · Naïve fission — fragment into uncoordinated daughters.
//        Each daughter respects the bound, but the cloud is no longer
//        a coordinated civilization. Fails Hanson's grabby criteria.
//    3 · Architected fission — fragment but maintain coordination via
//        an inter-fragment channel. The channel is now the coordinated
//        variable. The envelope rescales: D = 2·L_d. The wall holds.
//
//  The plot animates strategy (2) here — naïve fission — so the reader
//  sees daughters breach. Strategy (3) is staged in beat 9 as the
//  Chinese-Room moment.
// ═══════════════════════════════════════════════════════════════════════════

import { COLOR } from "../styles";
import { Body, DisplayHeading, Italic, Kicker, Mono } from "../atoms";

export function Beat8_Strategies() {
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
      <Kicker color={COLOR.sanguineWash}>beat 07-08 · attempts to escape</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          Three breaches.
          <br />
          One wall.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          Confronted with the envelope, an aspiring grabby civilization has
          three architectural choices. Watch the trajectory on the plot
          climb at the galactic scenario's τ — and breach.
        </Body>

        <StrategyRow
          n="1"
          name="Monolithic"
          claim="A single coordinated civilization expands outward."
          failure="Hits L_E directly. The boundary's heat exhaust outruns the home star within centuries of any meaningful extent."
          color={COLOR.ghost}
        />
        <StrategyRow
          n="2"
          name="Naïve fission"
          claim="Civilization fragments into uncoordinated daughters."
          failure="Each daughter respects the bound. But the cloud is no longer a coordinated civilization — there is no shared expansion front, no common signal speed, no joint visible signature. It fails Hanson's grabby criteria by being something else entirely."
          color={COLOR.amber}
        />
        <StrategyRow
          n="3"
          name="Architected fission"
          claim="Fragment but maintain inter-fragment coordination via a synchronization channel."
          failure="The channel is now the coordinated variable. The envelope rescales: D = 2·L_daughter. The same composed bound applies to D, and a galactic D blows through the wall. (Beat 9.)"
          color={COLOR.sanguineWash}
        />

        <Body muted style={{ marginTop: 12 }}>
          The plot to your right is animating naïve fission right now. A
          parent civilization grows, fissures into two daughters at{" "}
          <Mono>L_fiss</Mono>, and the daughters resume expansion at half
          the original target — but the same agent τ, and the same envelope.{" "}
          <Italic>The daughters breach.</Italic>
        </Body>
      </div>
    </div>
  );
}

function StrategyRow({
  n, name, claim, failure, color,
}: {
  n: string; name: string; claim: string; failure: string; color: string;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: COLOR.voidMid,
        border: `1px solid ${COLOR.inkVeil}`,
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 11,
            color,
            letterSpacing: "0.16em",
          }}
        >
          {n}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontStyle: "italic",
            fontSize: 19,
            color: COLOR.ink,
          }}
        >
          {name}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-body), Georgia, serif",
          fontSize: 14.5,
          lineHeight: 1.65,
          color: COLOR.inkBody,
          marginBottom: 8,
        }}
      >
        {claim}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontStyle: "italic",
          fontSize: 14,
          lineHeight: 1.6,
          color: COLOR.inkMuted,
        }}
      >
        {failure}
      </div>
    </div>
  );
}
