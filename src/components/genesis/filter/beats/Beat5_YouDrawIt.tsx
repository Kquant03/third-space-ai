"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · Beat 5 — You-Draw-It
//  ─────────────────────────────────────────────────────────────────────────
//  The gestalt-shift beat. The reader has just seen L_R and L_E plotted
//  separately on the sticky phase plot (they're still visible from beat 3).
//  Now the reader is asked to predict where the actual reachable envelope
//  goes — by dragging nine control points on the prediction curve.
//
//  The prediction curve itself lives inside PhasePlot (as a child SVG g).
//  This component just frames the task in prose and offers the lock-in
//  affordance. Locking advances the plot state at beat 6 to reveal the
//  true envelope and the cusp τ*.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COLOR, FONT } from "../styles";
import {
  Body, DisplayHeading, Italic, Kicker, Mono,
  btnGhost, btnFaint,
} from "../atoms";
import {
  PredictionPoint,
  makeInitialPrediction,
} from "../PredictionCurve";

export function Beat5_YouDrawIt({
  prediction,
  onPredictionChange,
}: {
  prediction: PredictionPoint[];
  onPredictionChange: (pts: PredictionPoint[]) => void;
}) {
  const [hint, setHint] = useState(false);

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
      <Kicker color={COLOR.ghost}>beat 04 · prediction</Kicker>
      <div style={{ marginTop: 18 }}>
        <DisplayHeading size={56}>
          Now <span style={{ color: COLOR.ghost }}>you</span> draw the wall.
        </DisplayHeading>
      </div>

      <div style={{ marginTop: 32, display: "grid", gap: 22, maxWidth: "60ch" }}>
        <Body>
          You have both teeth on the plot. <Mono>L_R</Mono> in ghost-cyan;{" "}
          <Mono>L_E</Mono> in amber. The reachable envelope must respect
          both. Drag the nine control points on the prediction curve to
          show what you think the actual <Italic>composed</Italic> bound
          looks like across all τ — from a day to a billion years.
        </Body>

        <Body muted>
          Don't overthink this. Trust the visual reasoning. The next beat
          will reveal the true envelope, and you'll see how close your
          intuition came — and where it doesn't.
        </Body>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setHint(!hint)}
            style={btnFaint()}
          >
            {hint ? "↑ hide hint" : "↓ stuck? hint"}
          </button>
          <button
            onClick={() => onPredictionChange(makeInitialPrediction(9))}
            style={btnFaint()}
          >
            reset curve
          </button>
        </div>

        {hint && (
          <div
            style={{
              padding: "16px 20px",
              background: COLOR.voidMid,
              borderLeft: `2px solid ${COLOR.ghostFaint}`,
              fontFamily: FONT.body,
              fontSize: 14.5,
              lineHeight: 1.65,
              color: COLOR.inkBody,
            }}
          >
            The reachable region is bounded by{" "}
            <Italic>whichever wall is lower at each τ</Italic>. At very
            short τ, light wins (almost any heat budget suffices); at very
            long τ, heat wins (almost any signal speed suffices). They
            cross somewhere in the middle. <Italic>That crossing is the
            point.</Italic>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            padding: "14px 18px",
            border: `1px dashed ${COLOR.inkGhost}`,
            fontFamily: FONT.mono,
            fontSize: 11,
            lineHeight: 1.6,
            color: COLOR.inkMuted,
            letterSpacing: "0.04em",
          }}
        >
          → drag the nine ghost-cyan dots on the plot
          <br />
          → scroll to beat 5 when you're satisfied with your guess
          <br />
          → the true envelope will appear; your curve will lock in for comparison
        </div>
      </div>
    </div>
  );
}
