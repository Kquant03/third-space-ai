"use client";

import { useEffect, useRef, useState } from "react";
import { usePond, type MechanismEvent } from "../lib/usePond";
import { pondToScreen } from "../lib/pondCamera";

// ═══════════════════════════════════════════════════════════════════════════
//  Pond mechanism whispers — social-fabric overlay
//  ─────────────────────────────────────────────────────────────────────────
//  Sibling component to PondWhispers. Where PondWhispers renders koi
//  utterances (a koi speaking), this renders MECHANISM firings — the
//  state-detected events of bond + play + gift + witnessing. Visually
//  these read as environmental observation, not direct speech:
//
//    PondWhispers (speech)     : italic, seafoam, 14px, peak opacity 0.85
//    PondMechanismWhispers     : roman,  pale-teal, 11px, peak opacity 0.55
//
//  Positioning: at the midpoint of participating koi. A pair-mechanism
//  whisper hangs between the two fish, an N-party whisper hangs at the
//  centroid of all participants.
//
//  Voice: short, observational, in Stanley's voice. The shape is
//  "subject verb object" with minimal embellishment — the pond is
//  describing itself to itself. Names where available, color-descriptors
//  as fallback ("the violet one passes near the cobalt one's water").
// ═══════════════════════════════════════════════════════════════════════════

interface ActiveMechanism {
  id: string;
  centroidFishId: string;          // primary anchor (actor) for position
  participantIds: string[];        // all participants for centroid calc
  text: string;
  createdAtMs: number;
  deadAtMs: number;
}

const FADE_IN_MS  = 900;
const HOLD_MS     = 4000;
const FADE_OUT_MS = 1500;
const LIFETIME_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;
const DRIFT_PX    = 12;
const SCALE_START = 0.96;
const EASING      = "cubic-bezier(0.22, 1, 0.36, 1)";

// Active concurrent whispers — cap so we don't pile up on slow client
// or during burst-fire periods (the mechanism layer can fire several
// detectors in the same 15s window when koi cluster).
const MAX_ACTIVE = 4;

export default function PondMechanismWhispers() {
  const pond = usePond({
    url: process.env.NEXT_PUBLIC_POND_WS_URL ?? "",
    fallback: { koiCount: 5, procedural: true },
  });

  const [active, setActive] = useState<ActiveMechanism[]>([]);
  const activeRef = useRef<ActiveMechanism[]>([]);
  activeRef.current = active;

  // Subscribe to incoming mechanism events
  useEffect(() => {
    const unsub = pond.subscribeToMechanisms((e: MechanismEvent) => {
      const text = phraseFor(e, pond.fish);
      if (!text) return;             // mechanism we don't render

      const now = performance.now();
      const id = `${e.mechanism}-${e.actor}-${e.tick}`;
      setActive((prev) => {
        if (prev.some((u) => u.id === id)) return prev;
        // Cap concurrent whispers
        const next = [...prev, {
          id,
          centroidFishId: e.actor,
          participantIds: e.participants,
          text,
          createdAtMs: now,
          deadAtMs: now + LIFETIME_MS,
        }];
        if (next.length > MAX_ACTIVE) next.shift();
        return next;
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RAF loop — sweep dead, force re-render so opacity transitions
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

  // Lookup table for fish positions. y is included so pondToScreen
  // can use the actual rendered depth rather than projecting from
  // the y=0 surface point (which lands whispers above the water
  // instead of above the fish).
  const fishById = new Map<string, { x: number; y: number; z: number }>();
  for (const f of pond.fish) {
    fishById.set(f.id, { x: f.x, y: f.y, z: f.z });
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
        overflow: "hidden",
      }}
    >
      {active.map((u) => {
        // Centroid in pond meters across all participants we can locate.
        // Includes y (depth) so the projection uses real fish position
        // rather than the surface point above them.
        const positions = u.participantIds
          .map((id) => fishById.get(id))
          .filter((p): p is { x: number; y: number; z: number } => p !== undefined);
        if (positions.length === 0) return null;
        const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
        const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
        const cz = positions.reduce((s, p) => s + p.z, 0) / positions.length;

        const W = typeof window !== "undefined" ? window.innerWidth : 1920;
        const H = typeof window !== "undefined" ? window.innerHeight : 1080;
        const screen = pondToScreen(cx, cz, W, H, cy);
        if (!screen) return null;

        const age = performance.now() - u.createdAtMs;
        const ageFrac = age / LIFETIME_MS;

        let opacity: number;
        if (age < FADE_IN_MS) {
          opacity = easeOutCubic(age / FADE_IN_MS);
        } else if (age < FADE_IN_MS + HOLD_MS) {
          opacity = 1.0;
        } else {
          opacity = 1 - easeInCubic((age - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS);
        }

        const scale = age < FADE_IN_MS
          ? SCALE_START + (1 - SCALE_START) * easeOutCubic(age / FADE_IN_MS)
          : 1.0;

        const drift = -ageFrac * DRIFT_PX;
        const left = screen.sx;
        const top  = screen.sy - 70 + drift;   // float above centroid

        return (
          <div
            key={u.id}
            style={{
              position: "absolute",
              left: `${left}px`,
              top:  `${top}px`,
              transform: `translate(-50%, -100%) scale(${scale})`,
              transformOrigin: "50% 100%",
              opacity: opacity * 0.55,   // peak < speech whispers (0.85)
              willChange: "opacity, transform",

              fontFamily: "var(--font-display), 'EB Garamond', 'Cormorant Garamond', Georgia, serif",
              fontStyle:  "normal",      // roman, not italic — env voice
              fontWeight: 300,
              fontSize:   "11px",
              letterSpacing: "0.06em",
              lineHeight: 1.35,
              whiteSpace: "nowrap",

              color: "rgba(168, 188, 192, 1)",
              filter: "drop-shadow(0 0 8px rgba(127, 175, 179, 0.22))",

              transition: "opacity 80ms linear",
              transitionTimingFunction: EASING,
            }}
          >
            {u.text}
          </div>
        );
      })}
    </div>
  );
}

// ── Phrase templates ──────────────────────────────────────────────
//  Map mechanism + participants to a short observational line. Use
//  koi names where available; fall back to color-descriptor ("the
//  violet one") when a fish hasn't been given a name yet (eggs, fresh
//  fry between hatch and parent-authored naming).
//
//  Returns null for mechanisms we choose not to render (some are
//  internal-only or too subtle to verbalize). Stage 11 (post-launch)
//  expands this with conditioned variations per family.

function phraseFor(
  e: MechanismEvent,
  fish: { id: string; name?: string; color?: string; founder?: boolean }[],
): string | null {
  const naming = nameOf(fish);
  const actor = naming(e.actor);
  const others = e.participants.filter((p) => p !== e.actor).map(naming);
  const other = others[0] ?? "another";

  switch (e.mechanism) {
    // Witnessing family
    case "parallel_presence":
      return `${actor} swims alongside ${other}.`;
    case "witnessing":         // mutual_witnessing in detector
    case "mutual_witnessing":
      return `${actor} and ${other} see each other.`;
    case "shared_attention": {
      const poiKind = (e.payload?.["poi_kind"] as string | undefined) ?? "something";
      const count = (e.payload?.["count"] as number | undefined) ?? e.participants.length;
      return count >= 3
        ? `${count} gather around the ${poiKind}.`
        : `${actor} and ${other} attend the ${poiKind}.`;
    }
    case "bearing_witness":
      return `${actor} stays with ${other} in the dim hour.`;
    case "joyful_reunion":
      return `${actor} finds ${other} again.`;

    // Play family
    case "play_invitation":
      return `${actor} invites ${other} to play.`;
    case "tag":
      return `${actor} touches ${other} and darts.`;
    case "dance":
      return `${actor} and ${other} weave together.`;
    case "synchronized_swim":
      return others.length >= 2
        ? `Three swim in time.`
        : `${actor} and ${other} swim in time.`;
    case "shared_curiosity":
      return `${actor} and ${other} wonder at the same thing.`;

    // Gift family
    case "gift":
      return `${actor} gives ${other} something small.`;
    case "pass_it_forward":
      return `${actor} passes the gift onward.`;
    case "heirloom":
      return `${actor} keeps what was given.`;
    case "offering":
      return `${actor} sets down an offering.`;
    case "shared_food":
      return `${actor} and ${other} share the food.`;
    case "memory_gifting":
      return `${actor} gives ${other} a memory.`;

    // Repair family (claim-based)
    case "apology":
      return `${actor} returns to ${other}, softer.`;
    case "forgiveness":
      return `${actor} lets it go.`;

    // Ritual family
    case "greeting":
      return `${actor} greets ${other}.`;
    case "farewell":
      return `${actor} marks the parting from ${other}.`;
    case "solstice_attendance":
      return `${actor} attends the solstice light.`;
    case "seasonal_rite":
      return `${actor} marks the season.`;
    case "birth_witnessing":
      return `${actor} bears witness to new water.`;
    case "elder_naming":
      return `${actor} names what comes next.`;

    default:
      return null;
  }
}

// ── Name lookup ───────────────────────────────────────────────────
//  Returns a function that, given a koi id, returns either the koi's
//  name or a color-descriptor fallback ("the violet one", "the
//  cobalt one") for unnamed fish.

function nameOf(
  fish: { id: string; name?: string; color?: string; founder?: boolean }[],
): (id: string) => string {
  const byId = new Map<string, { name?: string; color?: string; founder?: boolean }>();
  for (const f of fish) byId.set(f.id, f);
  return (id: string) => {
    const f = byId.get(id);
    if (!f) return "another";
    if (f.name) return f.name;
    // Color-descriptor fallback. Founders use their archetype-color
    // mapped to a poetic descriptor; non-founders fall back to "young
    // koi" until parent-authored naming completes.
    if (f.founder) {
      if (f.color === "kohaku") return "the violet one";       // Shiki
      if (f.color === "asagi")  return "the cobalt one";       // Kokutou
    }
    return "young koi";
  };
}

// ── Easing helpers ────────────────────────────────────────────────
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t: number): number {
  return t * t * t;
}
