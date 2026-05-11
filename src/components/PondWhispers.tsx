"use client";

import { useEffect, useRef, useState } from "react";
import { usePond, type SpeechEvent } from "../lib/usePond";
import { pondToScreen } from "../lib/pondCamera";

// ═══════════════════════════════════════════════════════════════════════════
//  Pond whispers — utterance overlay
//  ─────────────────────────────────────────────────────────────────────────
//  Subscribes to the pond's speech stream. When a koi utters, fades a
//  short italic line into the water above that koi, holds, drifts up,
//  fades out. Mounted globally (in app/layout.tsx alongside the
//  LivingSubstrate) so whispers appear over fish on every route.
//
//  Voice: text is meant to read as light filtering through water —
//  not subtitles, not a chat overlay. Pale seafoam against the dark
//  substrate, soft teal glow, italic display weight 300 (matching the
//  masthead). Slow fades on the site's cubic-bezier easing so the
//  motion language is continuous with the rest of the site chrome.
//
//  Positioning: the pond's perspective camera is in pondCamera.ts;
//  fish positions in pond meters are projected to screen pixels via
//  pondToScreen. The same camera used by the substrate paints the
//  pond and the field shader's fish vertex pass.
//
//  Lifetime per utterance: 1100ms fade-in + 5500ms hold + 1800ms
//  fade-out, plus a 16px upward drift and a subtle 0.94→1.0 scale on
//  entrance. Total visible window ~8.4s, of which ~5.5s is fully
//  legible. Utterances are rare per § IV — overlap is unusual.
// ═══════════════════════════════════════════════════════════════════════════

interface ActiveUtterance {
  id: string;
  fishId: string;
  chunk: string;
  createdAtMs: number;
  deadAtMs: number;
}

const FADE_IN_MS  = 1100;
const HOLD_MS     = 5500;
const FADE_OUT_MS = 1800;
const LIFETIME_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;
const DRIFT_PX    = 16;          // upward drift over lifetime
const SCALE_START = 0.94;        // entrance scale at age 0
const EASING      = "cubic-bezier(0.22, 1, 0.36, 1)";  // site standard

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
      setActive((prev) => {
        // Dedupe — same uttId can arrive twice via WS replay on reconnect
        // or via React strict-mode double-effect. Skip if we already have it.
        if (prev.some((u) => u.id === e.uttId)) return prev;
        return [...prev, {
          id: e.uttId,
          fishId: e.fishId,
          chunk: e.chunk,
          createdAtMs: now,
          deadAtMs: now + LIFETIME_MS,
        }];
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation frame loop — sweep dead entries, force re-render so
  // opacity/transform interpolation reads correctly per frame.
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
        setFrameTick((n) => (n + 1) & 0xffff);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fish position lookup in pond meters — pondToScreen handles the
  // perspective projection through the substrate's camera.
  const fishById = new Map<string, { x: number; z: number }>();
  for (const f of pond.fish) {
    fishById.set(f.id, { x: f.x, z: f.z });
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        // Above <main> (z2) so whispers are legible over body text;
        // below the header / popovers / modals which sit at z4+.
        zIndex: 3,
        overflow: "hidden",
      }}
    >
      {active.map((u) => {
        const pos = fishById.get(u.fishId);
        if (!pos) return null;

        const W = typeof window !== "undefined" ? window.innerWidth : 1920;
        const H = typeof window !== "undefined" ? window.innerHeight : 1080;
        const screen = pondToScreen(pos.x, pos.z, W, H);
        if (!screen) return null;  // behind camera (shouldn't happen)

        const age = performance.now() - u.createdAtMs;
        const ageFrac = age / LIFETIME_MS;

        // Opacity envelope — eased on each leg with cubic-out feel
        let opacity: number;
        if (age < FADE_IN_MS) {
          const t = age / FADE_IN_MS;
          opacity = easeOutCubic(t);
        } else if (age < FADE_IN_MS + HOLD_MS) {
          opacity = 1.0;
        } else {
          const t = (age - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS;
          opacity = 1 - easeInCubic(t);
        }

        // Entrance scale — 0.94 → 1.0 over fade-in
        const scale = age < FADE_IN_MS
          ? SCALE_START + (1 - SCALE_START) * easeOutCubic(age / FADE_IN_MS)
          : 1.0;

        // Slow upward drift across full lifetime
        const drift = -ageFrac * DRIFT_PX;

        // Position above the fish, accounting for stage size.
        const left = screen.sx;
        const top  = screen.sy - stageYOffset(u.fishId, pond.fish) + drift;

        return (
          <div
            key={u.id}
            style={{
              position: "absolute",
              left: `${left}px`,
              top:  `${top}px`,
              transform: `translate(-50%, -100%) scale(${scale})`,
              transformOrigin: "50% 100%",
              opacity: opacity * 0.85,            // peak < 1 for ambient quality
              willChange: "opacity, transform",

              fontFamily: "var(--font-display), 'EB Garamond', 'Cormorant Garamond', Georgia, serif",
              fontStyle:  "italic",
              fontWeight: 300,
              fontSize:   "14px",
              letterSpacing: "0.02em",
              lineHeight: 1.4,
              whiteSpace: "nowrap",

              color: "rgba(168, 188, 192, 1)",     // pale seafoam-grey; opacity controlled above
              // Single soft teal glow — keeps the text legible against
              // the dark substrate without the harsh dropshadow stack
              // the previous version used.
              filter: "drop-shadow(0 0 12px rgba(127, 175, 179, 0.32)) drop-shadow(0 0 4px rgba(127, 175, 179, 0.42))",

              // Easing applied via JS-driven opacity, but a short
              // CSS transition smooths frame-to-frame jitter from the
              // RAF loop's discrete updates.
              transition: `opacity 80ms linear`,
              transitionTimingFunction: EASING,
            }}
          >
            {u.chunk}
          </div>
        );
      })}
    </div>
  );
}

// ── Easing helpers ────────────────────────────────────────────────
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t: number): number {
  return t * t * t;
}

// ── Vertical offset per stage ────────────────────────────────────
//  Floats text above the fish body. Larger fish need more clearance.
//  These are screen-pixel offsets, applied directly (perspective is
//  already handled — this is fine-tuning the head-room above the
//  projected fish position).
function stageYOffset(
  fishId: string, fish: { id: string; stage?: string }[]
): number {
  const f = fish.find((x) => x.id === fishId);
  switch (f?.stage) {
    case "egg":        return 14;
    case "fry":        return 22;
    case "juvenile":   return 32;
    case "adolescent": return 42;
    case "adult":      return 54;
    case "elder":      return 60;
    case "dying":      return 50;
    default:           return 48;
  }
}
