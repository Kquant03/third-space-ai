"use client";

import { useEffect, useRef, useState } from "react";
import { usePond, type SpeechEvent, SHADER_SCALE } from "../lib/usePond";

// ═══════════════════════════════════════════════════════════════════════════
//  Pond whispers — utterance overlay
//  ─────────────────────────────────────────────────────────────────────────
//  Subscribes to the pond's speech stream. When a koi utters, fades a
//  short italic-serif line into the water near that koi, holds it for
//  several seconds, fades it out.
//
//  Positioning: reads the koi's shader coordinates from pond.fish, maps
//  to screen pixels using the same SHADER_SCALE as LivingSubstrate. The
//  text floats slightly above the koi so the body doesn't obscure it.
//
//  Font: italic serif — continuation of the site's masthead type. Text
//  is small, off-white, feather-light. Meant to feel like overheard
//  water-thought, not subtitles.
//
//  Lifecycle per utterance:
//    - Appears with fade-in over 600ms
//    - Stays for 4.5s
//    - Fades out over 900ms
//    - Removed from DOM
//
//  If the same koi utters while its previous utterance is still
//  visible, both show — positioned vertically stacked. Real koi talk
//  rarely enough that this basically never overlaps.
// ═══════════════════════════════════════════════════════════════════════════

interface ActiveUtterance {
  id: string;              // uttId
  fishId: string;
  chunk: string;
  createdAtMs: number;
  deadAtMs: number;
}

const HOLD_MS = 4500;
const FADE_IN_MS = 600;
const FADE_OUT_MS = 900;
const LIFETIME_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;

export default function PondWhispers() {
  const pond = usePond({
    url: process.env.NEXT_PUBLIC_POND_WS_URL ?? "",
    fallback: { koiCount: 5, procedural: true },
  });

  const [active, setActive] = useState<ActiveUtterance[]>([]);
  const activeRef = useRef<ActiveUtterance[]>([]);
  activeRef.current = active;

  // Subscribe to incoming speech
  useEffect(() => {
    const unsub = pond.subscribeToSpeech((e: SpeechEvent) => {
      const now = performance.now();
      const entry: ActiveUtterance = {
        id: e.uttId,
        fishId: e.fishId,
        chunk: e.chunk,
        createdAtMs: now,
        deadAtMs: now + LIFETIME_MS,
      };
      setActive((prev) => [...prev, entry]);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sweep old entries on an animation frame. useState tick provokes
  // re-render for fade math.
  const [, setFrameTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const alive = activeRef.current.filter((u) => u.deadAtMs > now);
      if (alive.length !== activeRef.current.length) {
        setActive(alive);
      }
      if (activeRef.current.length > 0) {
        // Only trigger re-render for fade calculation when there's
        // something to animate.
        setFrameTick((n) => (n + 1) & 0xffff);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Build fish-by-id map for position lookup
  const fishById = new Map<string, { x: number; y: number }>();
  for (const f of pond.fish) {
    fishById.set(f.id, { x: f.x, y: f.z });  // pond.x, pond.z → shader plane
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {active.map((u) => {
        const pos = fishById.get(u.fishId);
        // Position in shader-viewport coordinates (±aspect × ±0.5)
        // → screen pixels. Shader y is top-down; CSS y is top-down.
        // Shader places fish with origin at screen center, y going up-positive,
        // but we're doing pond (x, z) → shader (x, y) with y going away from camera.
        // CSS: top-left origin, y down-positive. So CSS top = 50% - shader_y * H.
        let cssLeft = "50%";
        let cssTop  = "50%";
        let transformX = 0;
        let transformY = 0;

        if (pos) {
          const shaderX = pos.x * SHADER_SCALE;
          const shaderY = pos.y * SHADER_SCALE;
          const W = typeof window !== "undefined" ? window.innerWidth : 1920;
          const H = typeof window !== "undefined" ? window.innerHeight : 1080;
          // Shader frame maps y-axis to H vertically; x-axis is aspect-normalized
          transformX = shaderX * H;          // because shader units are viewport-y units
          transformY = -shaderY * H - stageYOffset(u.fishId, pond.fish);
        }

        const now = performance.now();
        const age = now - u.createdAtMs;
        let opacity: number;
        if (age < FADE_IN_MS) {
          opacity = age / FADE_IN_MS;
        } else if (age < FADE_IN_MS + HOLD_MS) {
          opacity = 1.0;
        } else {
          const fadeAge = age - FADE_IN_MS - HOLD_MS;
          opacity = Math.max(0, 1 - fadeAge / FADE_OUT_MS);
        }
        // Slight drift upward over lifetime
        const drift = (age / LIFETIME_MS) * -12;

        return (
          <div
            key={u.id}
            style={{
              position: "absolute",
              left: cssLeft,
              top: cssTop,
              transform: `translate(calc(-50% + ${transformX}px), calc(-50% + ${transformY + drift}px))`,
              opacity,
              transition: "opacity 120ms linear",
              color: "rgba(245, 242, 232, 0.92)",
              fontFamily: "var(--font-serif, 'EB Garamond', 'Cormorant Garamond', Georgia, serif)",
              fontStyle: "italic",
              fontSize: "15px",
              fontWeight: 400,
              letterSpacing: "0.015em",
              lineHeight: 1.3,
              textShadow: "0 0 8px rgba(0, 0, 0, 0.55), 0 0 16px rgba(0, 0, 0, 0.35)",
              whiteSpace: "nowrap",
              filter: "drop-shadow(0 0 6px rgba(127, 193, 176, 0.22))",
              mixBlendMode: "screen",
            }}
          >
            {u.chunk}
          </div>
        );
      })}
    </div>
  );
}

// Small vertical offset so the text floats above the fish body rather
// than dead-center on it. Scales with fish stage.
function stageYOffset(
  fishId: string, fish: { id: string; stage?: string }[]
): number {
  const f = fish.find((x) => x.id === fishId);
  switch (f?.stage) {
    case "egg":        return 10;
    case "fry":        return 22;
    case "juvenile":   return 36;
    case "adolescent": return 48;
    case "adult":      return 64;
    case "elder":      return 72;
    case "dying":      return 60;
    default:           return 56;
  }
}
