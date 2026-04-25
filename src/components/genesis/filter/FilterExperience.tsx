"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · FilterExperience (v14 orchestrator)
//  ─────────────────────────────────────────────────────────────────────────
//  Top-level client component for /genesis/filter.
//
//    layout · two-column on desktop:
//      left  · scrolling prose + per-beat interactives
//      right · sticky PhasePlot that morphs with the current beat
//
//    chrome · fixed TOC sidebar, top progress bar
//
//    state · IntersectionObserver-driven activeBeat, shared parameter
//            store (Tangle-style), shared prediction curve persisted
//            via localStorage so Beats 5/6 can compare reader-vs-truth
//
//  The twelve beat components live in ./beats/. This file is the
//  sequencer; everything narrative lives there.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLOR, FONT } from "./styles";
import {
  BEATS,
  plotStateForBeat,
} from "./scenarios";
import { PhasePlot } from "./PhasePlot";
import {
  PredictionPoint,
  makeInitialPrediction,
} from "./PredictionCurve";
import {
  C_LIGHT, L_SUN, T_DEFAULT, LAMBDA_DEFAULT,
} from "./physics";

import { Beat0_Stakes }          from "./beats/Beat0_Stakes";
import { Beat1_ColdOpen }        from "./beats/Beat1_ColdOpen";
import { Beat2_SignalingTooth }  from "./beats/Beat2_SignalingTooth";
import { Beat3_EnergeticTooth }  from "./beats/Beat3_EnergeticTooth";
import { Beat4_SivakCrooks }     from "./beats/Beat4_SivakCrooks";
import { Beat5_YouDrawIt }       from "./beats/Beat5_YouDrawIt";
import { Beat6_Cusp }            from "./beats/Beat6_Cusp";
import { Beat7_SmallMultiples }  from "./beats/Beat7_SmallMultiples";
import { Beat8_Strategies }      from "./beats/Beat8_Strategies";
import { Beat9_FissionDilemma }  from "./beats/Beat9_FissionDilemma";
import { Beat10_Loopholes }      from "./beats/Beat10_Loopholes";
import { Beat11_CoherenceDepth } from "./beats/Beat11_CoherenceDepth";

// ───────────────────────────────────────────────────────────────────────────

export function FilterExperience() {
  // ─── Beat state ─────────────────────────────────────────────────
  const [activeBeat, setActiveBeat] = useState(0);

  // ─── Parameter store (Tangle-style) ─────────────────────────────
  const [params, setParams] = useState({
    lam: LAMBDA_DEFAULT,
    T: T_DEFAULT,
    v: C_LIGHT,
    L_star: L_SUN,
  });

  // ─── Prediction curve ───────────────────────────────────────────
  const [prediction, setPrediction] = useState<PredictionPoint[]>(() =>
    makeInitialPrediction(9),
  );

  // ─── Trajectory animation clock — driven only when beat 9/10/11 active
  const [trajClock, setTrajClock] = useState(0);
  const beatRef = useRef(activeBeat);
  beatRef.current = activeBeat;

  useEffect(() => {
    if (activeBeat < 9 || activeBeat > 11) {
      setTrajClock(0);
      return;
    }
    let raf: number;
    let start: number | null = null;
    const loop = (t: number) => {
      if (start === null) start = t;
      const elapsed = (t - start) / 5500;
      const clamped = Math.min(1, elapsed);
      setTrajClock(clamped);
      if (elapsed < 1.05 && beatRef.current >= 9 && beatRef.current <= 11) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [activeBeat]);

  // ─── IntersectionObserver wiring ───────────────────────────────
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
  const setSectionRef = useCallback((id: number) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
    else sectionRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const opts: IntersectionObserverInit = {
      rootMargin: "-30% 0px -55% 0px",
      threshold: 0,
    };
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .map((e) => parseInt((e.target as HTMLElement).dataset.beat || "0", 10));
      if (visible.length > 0) {
        setActiveBeat(Math.min(...visible));
      }
    }, opts);
    sectionRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ─── Manual TOC navigation ─────────────────────────────────────
  const goToBeat = useCallback((id: number) => {
    const el = sectionRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ─── Progress fraction for top bar ─────────────────────────────
  const progressFrac = useMemo(
    () => activeBeat / Math.max(1, BEATS.length - 1),
    [activeBeat],
  );

  // ─── Sticky-plot visibility: hide on hero (beat 0) ─────────────
  const showStickyPlot = activeBeat >= 1;

  return (
    <div
      style={{
        background: COLOR.void,
        color: COLOR.ink,
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Top progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: COLOR.inkVeil,
          zIndex: 50,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressFrac * 100}%`,
            background: COLOR.ghost,
            transition: "width 480ms ease-out",
          }}
        />
      </div>

      {/* Fixed left TOC */}
      <FixedTOC
        activeBeat={activeBeat}
        goToBeat={goToBeat}
      />

      {/* Layout: left scroll column + right sticky plot column */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showStickyPlot
            ? "minmax(0, 1fr) minmax(0, 0.95fr)"
            : "minmax(0, 1fr)",
          paddingLeft: "clamp(64px, 8vw, 200px)",
          gap: 0,
        }}
      >
        {/* Left column · the scrolling beats */}
        <main style={{ minWidth: 0 }}>
          <Wrap refSetter={setSectionRef(0)} beatId={0}>
            <Beat0_Stakes goToBeat={goToBeat} />
          </Wrap>
          <Wrap refSetter={setSectionRef(1)} beatId={1}>
            <Beat1_ColdOpen />
          </Wrap>
          <Wrap refSetter={setSectionRef(2)} beatId={2}>
            <Beat2_SignalingTooth />
          </Wrap>
          <Wrap refSetter={setSectionRef(3)} beatId={3}>
            <Beat3_EnergeticTooth />
          </Wrap>
          <Wrap refSetter={setSectionRef(4)} beatId={4}>
            <Beat4_SivakCrooks />
          </Wrap>
          <Wrap refSetter={setSectionRef(5)} beatId={5}>
            <Beat5_YouDrawIt
              prediction={prediction}
              onPredictionChange={setPrediction}
            />
          </Wrap>
          <Wrap refSetter={setSectionRef(6)} beatId={6}>
            <Beat6_Cusp params={params} />
          </Wrap>
          <Wrap refSetter={setSectionRef(7)} beatId={7}>
            <Beat7_SmallMultiples />
          </Wrap>
          <Wrap refSetter={setSectionRef(8)} beatId={8}>
            <Beat8_Strategies />
          </Wrap>
          <Wrap refSetter={setSectionRef(9)} beatId={9}>
            <Beat9_FissionDilemma />
          </Wrap>
          <Wrap refSetter={setSectionRef(10)} beatId={10}>
            <Beat10_Loopholes />
          </Wrap>
          <Wrap refSetter={setSectionRef(11)} beatId={11}>
            <Beat11_CoherenceDepth />
          </Wrap>
        </main>

        {/* Right column · sticky phase plot */}
        {showStickyPlot && (
          <aside
            style={{
              position: "sticky",
              top: 0,
              height: "100vh",
              padding: "clamp(28px, 4vw, 60px) clamp(20px, 3vw, 48px)",
              borderLeft: `1px solid ${COLOR.inkVeil}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              background: COLOR.void,
            }}
          >
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                marginBottom: 14,
              }}
            >
              the coordination ceiling · L vs τ
            </div>
            <PhasePlot
              beatId={activeBeat}
              params={params}
              prediction={prediction}
              onPredictionChange={setPrediction}
              trajectoryProgress={trajClock}
            />
            <div
              style={{
                marginTop: 18,
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontSize: 14,
                color: COLOR.inkMuted,
                lineHeight: 1.5,
              }}
            >
              {plotCaptionForBeat(activeBeat)}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Section wrapper — attaches the IntersectionObserver target
// ───────────────────────────────────────────────────────────────────────────

function Wrap({
  beatId,
  refSetter,
  children,
}: {
  beatId: number;
  refSetter: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={refSetter}
      data-beat={beatId}
      style={{ minHeight: "100vh" }}
    >
      {children}
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Fixed TOC — left rail, always visible. Click to jump.
// ───────────────────────────────────────────────────────────────────────────

function FixedTOC({
  activeBeat,
  goToBeat,
}: {
  activeBeat: number;
  goToBeat: (id: number) => void;
}) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "clamp(56px, 6vw, 180px)",
        padding: "clamp(28px, 4vw, 56px) clamp(14px, 2vw, 28px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: 10,
        zIndex: 40,
        borderRight: `1px solid ${COLOR.inkVeil}`,
        background: COLOR.void,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          marginBottom: 24,
        }}
      >
        limen
      </div>
      {BEATS.map((b) => {
        const active = b.id === activeBeat;
        return (
          <button
            key={b.id}
            onClick={() => goToBeat(b.id)}
            style={{
              background: "transparent",
              border: "none",
              padding: "4px 0",
              cursor: "pointer",
              display: "grid",
              gridTemplateColumns: "28px 1fr",
              gap: 8,
              alignItems: "baseline",
              textAlign: "left",
              opacity: active ? 1 : 0.55,
              transition: "opacity 200ms",
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 9,
                color: active ? COLOR.ghost : COLOR.inkFaint,
                letterSpacing: "0.06em",
              }}
            >
              {b.kicker}
            </span>
            <span
              style={{
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontSize: 12,
                lineHeight: 1.25,
                color: active ? COLOR.ink : COLOR.inkMuted,
                display: "var(--toc-label-display, block)",
              }}
              className="toc-label"
            >
              {b.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Per-beat plot caption — rendered under the sticky plot
// ───────────────────────────────────────────────────────────────────────────

function plotCaptionForBeat(beatId: number): string {
  switch (beatId) {
    case 1:  return "Empty axes. The civilization will move here in a moment.";
    case 2:  return "L_R — what light allows. Round-trip signalling, plotted.";
    case 3:  return "L_E — what heat allows. The Landauer floor, multiplied across the blanket.";
    case 4:  return "Both walls, separately. Watch where they cross.";
    case 5:  return "Now you draw what reach is possible. Drag the points; lock when ready.";
    case 6:  return "The cusp τ* — the moment two unrelated areas of physics conspire.";
    case 7:  return "Same wall, four scales. The argument is invariant under choice of scenario.";
    case 8:  return "Naïve fission — the daughters start fresh and hit the same wall.";
    case 9:  return "Architected fission — and the coordination channel D = 2·L_d inherits the wall.";
    case 10: return "Sweep λ and T. The wall shifts. It does not vanish.";
    case 11: return "What real advanced civilizations should look like instead.";
    default: return "";
  }
}
