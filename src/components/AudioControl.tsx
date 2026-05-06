"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  components/AudioControl.tsx
//  ─────────────────────────────────────────────────────────────────────────
//  Two exports:
//
//    1. AudioControl (default)
//       The trigger button mounted in SiteHeader's right flank. A small
//       fermata glyph in a ghost-cyan circle. Clicking it toggles the
//       MiniPlayer's collapsed / expanded mode via the shared store.
//
//    2. MiniPlayer (named)
//       The viewport-fixed bottom-right panel. Always visible when audio
//       is loading, ready, or playing. Two modes:
//
//         · collapsed (default): masthead, now-reading row, progress
//           filament, transport. ~140px tall.
//         · expanded: masthead, programme (the four-movement catalogue,
//           scrollable), now-reading, progress, transport. ~520px tall,
//           grows upward from the pinned bottom edge.
//
//       Both modes are the same DOM element; only the height + content
//       visibility change. Smooth height transition. The bottom edge
//       stays pinned so the now-reading + transport never move.
//
//  No drawer. No popover. No header-anchored chrome. The mini-player IS
//  the interface. The trigger is just a remote.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useAudioStore, useCurrentTrack } from "@/components/SiteAudio";
import {
  TRACKS,
  MOVEMENTS,
  getTracksByMovement,
  type Track,
  type MovementId,
} from "@/data/tracks";

// ───────────────────────────────────────────────────────────────────
//  Tokens — match SiteHeader vocabulary exactly
// ───────────────────────────────────────────────────────────────────

const COLOR = {
  void: "#010106",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
  ghostDeep: "#3f6267",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  AudioControl — the SiteHeader trigger. Toggles the MiniPlayer's expanded
//  state via the shared store.
// ═══════════════════════════════════════════════════════════════════════════

export default function AudioControl({
  compact = false,
}: {
  compact?: boolean;
}) {
  const playing = useAudioStore((s) => s.playing);
  const loading = useAudioStore((s) => s.loading);
  const loadProgress = useAudioStore((s) => s.loadProgress);
  const setPlaying = useAudioStore((s) => s.setPlaying);
  const expanded = useAudioStore((s) => s.programmeOpen);
  const setExpanded = useAudioStore((s) => s.setProgrammeOpen);
  const dismissed = useAudioStore((s) => s.programmeDismissed);
  const setDismissed = useAudioStore((s) => s.setProgrammeDismissed);

  // Pulse only when the player is dismissed AND audio is playing — there's
  // nothing to "return to" if the engine has never started. A slow,
  // meditative breath signalling that this fermata is the way back to
  // the listening programme.
  const shouldPulse = dismissed && playing;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        aria-label={
          loading
            ? "Loading the programme"
            : !playing
              ? "Begin Consequences of Infinity"
              : dismissed
                ? "Open the listening programme"
                : "Hide the listening programme"
        }
        aria-expanded={!dismissed}
        onClick={() => {
          if (loading) return;

          // First-ever click: start audio AND open the drawer.
          if (!playing) {
            setPlaying(true);
            setExpanded(true);
            if (dismissed) setDismissed(false);
            return;
          }

          // Audio already playing — toggle full visibility of the drawer.
          // Music continues either way; only the UI surface comes and goes.
          if (dismissed) {
            setDismissed(false);
            setExpanded(true);
          } else {
            setDismissed(true);
          }
        }}
        className={`programme-trigger${playing ? " is-playing" : ""}${loading ? " is-loading" : ""}${shouldPulse ? " is-pulsing" : ""}`}
        style={{
          width: compact ? 24 : 28,
          height: compact ? 24 : 28,
          borderRadius: "50%",
          padding: 0,
          margin: 0,
          background: "transparent",
          border: `1px solid ${expanded || playing ? COLOR.ghost : COLOR.inkGhost}`,
          color: expanded || playing ? COLOR.ghost : COLOR.inkMuted,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: loading ? "wait" : "pointer",
          transition:
            "border-color 0.5s ease, color 0.5s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          flex: "0 0 auto",
          position: "relative",
        }}
      >
        {/* A fermata — the musical instruction to hold a note as long as
            the conductor wishes. The music that makes time pause. */}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          width={compact ? 12 : 14}
          height={compact ? 12 : 14}
          style={{
            display: "block",
            filter: playing
              ? `drop-shadow(0 0 5px ${COLOR.ghost})`
              : "none",
            transition: "filter 0.6s ease",
          }}
        >
          <path
            d="M3 9 Q3 4 8 4 Q13 4 13 9"
            stroke="currentColor"
            strokeWidth="1.1"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11" r="1" fill="currentColor" />
        </svg>

        {loading && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "12%",
              right: "12%",
              bottom: "18%",
              height: 1,
              background: COLOR.inkGhost,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${loadProgress * 100}%`,
                background: COLOR.ghost,
                boxShadow: `0 0 4px ${COLOR.ghost}`,
                transition: "width 0.4s ease",
              }}
            />
          </span>
        )}
      </button>

      <style>{`
        .programme-trigger:hover {
          border-color: ${COLOR.ghost} !important;
          color: ${COLOR.ghost} !important;
          transform: translateY(-1px);
        }
        .programme-trigger:focus-visible {
          outline: 1px solid ${COLOR.ghost};
          outline-offset: 5px;
        }
        @keyframes programme-trigger-breathe {
          0%, 100% {
            border-color: ${COLOR.ghost};
            box-shadow: 0 0 0 0 rgba(127, 175, 179, 0);
          }
          50% {
            border-color: ${COLOR.ghost};
            box-shadow: 0 0 0 6px rgba(127, 175, 179, 0.18);
          }
        }
        .programme-trigger.is-pulsing {
          animation: programme-trigger-breathe 3s ease-in-out infinite;
          border-color: ${COLOR.ghost} !important;
          color: ${COLOR.ghost} !important;
        }
        .programme-trigger.is-pulsing:hover {
          animation: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .programme-trigger.is-pulsing {
            animation: none;
            box-shadow: 0 0 0 3px rgba(127, 175, 179, 0.14);
          }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MiniPlayer — the only audio surface
//  ─────────────────────────────────────────────────────────────────────────
//  Always-visible viewport-fixed panel at bottom-right. Two modes,
//  same DOM element:
//
//    · collapsed: ~140px tall, masthead + now-reading + progress + transport
//    · expanded:  ~520px tall, masthead + scrollable programme + everything
//                 above. Grows upward from the pinned bottom-right corner.
//
//  Driven by the store's programmeOpen flag — set by either the SiteHeader
//  fermata trigger or the mini-player's own expand/collapse text-link.
// ═══════════════════════════════════════════════════════════════════════════

export function MiniPlayer() {
  const ready = useAudioStore((s) => s.ready);
  const loading = useAudioStore((s) => s.loading);
  const playing = useAudioStore((s) => s.playing);
  const progress = useAudioStore((s) => s.progress);
  const position = useAudioStore((s) => s.position);
  const trackIndex = useAudioStore((s) => s.trackIndex);
  const setPlaying = useAudioStore((s) => s.setPlaying);
  const setTrackIndex = useAudioStore((s) => s.setTrackIndex);
  const next = useAudioStore((s) => s.next);
  const prev = useAudioStore((s) => s.prev);
  const expanded = useAudioStore((s) => s.programmeOpen);
  const setExpanded = useAudioStore((s) => s.setProgrammeOpen);
  const track = useCurrentTrack();

  // Force re-render on track change so displayed metadata stays current.
  void trackIndex;
  void ready;
  void loading;

  // ── Dismiss & visibility:
  //
  // The fermata trigger in the SiteHeader is the user's full-show/full-hide
  // toggle for this drawer. When dismissed=true the drawer plays its exit
  // animation and then unmounts; the music keeps playing underneath.
  //
  // dismissed lives in the shared store (so both this component and the
  // header trigger see the same source of truth). It's mirrored to
  // sessionStorage so a one-tab dismiss survives navigation but resets
  // on next visit — we don't want a one-time hide to mute the site forever.
  //
  // For the exit animation we keep the component mounted for ~600ms after
  // dismissed flips to true, just long enough for `mini-out` to finish.
  const dismissed = useAudioStore((s) => s.programmeDismissed);
  const setDismissed = useAudioStore((s) => s.setProgrammeDismissed);

  // Read sessionStorage on mount.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("third-space-audio-dismissed");
      if (stored === "1") setDismissed(true);
    } catch {
      // sessionStorage might be unavailable (incognito, sandboxed iframe)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror dismissed → sessionStorage on every change.
  useEffect(() => {
    try {
      if (dismissed) {
        sessionStorage.setItem("third-space-audio-dismissed", "1");
      } else {
        sessionStorage.removeItem("third-space-audio-dismissed");
      }
    } catch {
      /* noop */
    }
  }, [dismissed]);

  // Delayed unmount so the exit animation has time to play.
  const [isMounted, setIsMounted] = useState(!dismissed);
  useEffect(() => {
    if (!dismissed) {
      setIsMounted(true);
      return;
    }
    const id = window.setTimeout(() => setIsMounted(false), 600);
    return () => window.clearTimeout(id);
  }, [dismissed]);

  // ── Availability probing: which tracks have MIDI files on disk?
  //
  // When the programme expands for the first time, we HEAD-request each
  // track's MIDI URL to discover what's actually fetched. Tracks whose
  // MIDI is missing get rendered dimmed and disabled in the catalogue.
  // The probe only runs once per session and caches the result.
  const [availability, setAvailability] = useState<Record<string, boolean>>(
    {},
  );
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    if (!expanded || probed) return;
    setProbed(true);
    (async () => {
      const results: Record<string, boolean> = {};
      await Promise.all(
        TRACKS.map(async (t) => {
          try {
            const r = await fetch(t.midi, { method: "HEAD" });
            results[t.id] = r.ok;
          } catch {
            results[t.id] = false;
          }
        }),
      );
      setAvailability(results);
    })();
  }, [expanded, probed]);

  if (!isMounted) return null;

  return (
    <div
      data-programme-mini
      role="region"
      aria-label="Consequences of Infinity"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        width: "min(420px, calc(100vw - 48px))",
        // The panel grows upward. We set a max-height for both modes
        // and let the content drive layout. Overflow is hidden on the
        // outer container; the programme list inside has its own scroll.
        maxHeight: expanded
          ? "min(640px, calc(100vh - 48px))"
          : "200px",
        background: "rgba(1, 1, 6, 0.92)",
        backdropFilter: "blur(36px) saturate(1.45)",
        WebkitBackdropFilter: "blur(36px) saturate(1.45)",
        border: `1px solid rgba(127,175,179,0.16)`,
        borderRadius: 4,
        zIndex: 55,
        boxShadow:
          "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(127,175,179,0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: dismissed
          ? "mini-out 0.55s cubic-bezier(0.4,0.2,0.6,1) forwards"
          : "mini-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
        transition:
          "max-height 0.55s cubic-bezier(0.22,1,0.36,1), border-color 0.4s ease",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
           MASTHEAD — italic title + edition + expand/collapse text-link
           Same in both modes. The hairline rule beneath separates it
           from whatever follows.
           ═══════════════════════════════════════════════════════════════ */}
      <header
        style={{
          padding: "14px 18px 10px",
          borderBottom: `1px solid ${COLOR.inkGhost}40`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flex: "0 0 auto",
        }}
      >
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 14,
            lineHeight: 1,
            color: COLOR.inkBody,
            letterSpacing: "-0.008em",
          }}
        >
          Consequences of Infinity
        </span>
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 14,
            flex: "0 0 auto",
          }}
        >
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse programme" : "Expand programme"}
            className="mini-toggle"
            style={{
              background: "transparent",
              border: "none",
              padding: "2px 4px",
              margin: 0,
              cursor: "pointer",
              fontFamily: FONT.mono,
              fontSize: 7.5,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: expanded ? COLOR.ghost : COLOR.inkFaint,
              transition: "color 0.3s ease",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            <span>{expanded ? "Close" : "Programme"}</span>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                fontSize: 9,
              }}
            >
              ↑
            </span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
           PROGRAMME (expanded mode only) — the scrollable catalogue
           Lives between the masthead and the now-reading section.
           Scrolls internally when content exceeds available height.
           ═══════════════════════════════════════════════════════════════ */}
      {expanded && (
        <div
          style={{
            flex: "1 1 auto",
            overflow: "hidden auto",
            padding: "14px 18px 10px",
            animation: "mini-list-fade 0.5s ease 0.1s both",
          }}
        >
          {MOVEMENTS.map((m) => (
            <Movement
              key={m.id}
              movement={m}
              activeTrackId={track.id}
              availability={availability}
              onSelectTrack={(t) => {
                const i = TRACKS.findIndex((x) => x.id === t.id);
                if (i >= 0) {
                  setTrackIndex(i);
                  if (!playing) setPlaying(true);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           NOW READING — track meta + progress + transport
           Always visible. In expanded mode this sits beneath the
           programme list. In collapsed mode it's the only content.
           ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: "12px 18px 14px",
          borderTop: expanded ? `1px solid ${COLOR.inkGhost}40` : "none",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 7.5,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: COLOR.ghostSoft,
            }}
          >
            ♫ Now reading
          </span>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 7.5,
              letterSpacing: "0.32em",
              color: COLOR.inkFaint,
            }}
          >
            {track.mark}
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 17,
            lineHeight: 1.18,
            letterSpacing: "-0.012em",
            color: COLOR.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: FONT.mono,
            fontSize: 8,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: COLOR.inkMuted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.composer}
          <span aria-hidden style={{ color: COLOR.inkGhost, padding: "0 8px" }}>
            ·
          </span>
          {track.year}
        </div>

        {/* Transport row — play/pause + prev/next + progress filament */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <TransportLink onClick={prev} ariaLabel="Previous track">
            ‹
          </TransportLink>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause" : "Play"}
            className="mini-play"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              padding: 0,
              margin: 0,
              background: "transparent",
              border: `1px solid ${playing ? COLOR.ghost : COLOR.inkGhost}`,
              color: playing ? COLOR.ghost : COLOR.inkMuted,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "border-color 0.3s ease, color 0.3s ease",
              flex: "0 0 auto",
            }}
          >
            {playing ? (
              <svg viewBox="0 0 12 12" width="9" height="9">
                <rect x="3" y="2.5" width="2" height="7" fill="currentColor" />
                <rect x="7" y="2.5" width="2" height="7" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12" width="9" height="9">
                <path d="M3.5 2 L9.5 6 L3.5 10 Z" fill="currentColor" />
              </svg>
            )}
          </button>
          <TransportLink onClick={next} ariaLabel="Next track">
            ›
          </TransportLink>

          <div
            style={{
              flex: 1,
              position: "relative",
              height: 1,
              background: `${COLOR.inkGhost}55`,
              overflow: "hidden",
              marginLeft: 4,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${COLOR.ghostSoft}, ${COLOR.ghost})`,
                boxShadow: `0 0 6px ${COLOR.ghost}`,
                transition: "width 0.25s linear",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 8,
              letterSpacing: "0.18em",
              color: COLOR.inkFaint,
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {fmt(position)}
          </span>
        </div>
      </section>

      <style>{`
        @keyframes mini-in {
          0%   { opacity: 0; transform: translateY(12px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0);    filter: blur(0);  }
        }
        @keyframes mini-out {
          0%   { opacity: 1; transform: translateY(0);    filter: blur(0);  }
          100% { opacity: 0; transform: translateY(12px); filter: blur(4px); }
        }
        @keyframes mini-list-fade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        .mini-toggle:hover {
          color: ${COLOR.ghost} !important;
        }
        .mini-toggle:focus-visible {
          outline: 1px solid ${COLOR.ghost};
          outline-offset: 3px;
        }
        .mini-play:hover {
          border-color: ${COLOR.ghost} !important;
          color: ${COLOR.ghost} !important;
        }
        .mini-play:focus-visible {
          outline: 1px solid ${COLOR.ghost};
          outline-offset: 3px;
        }
        .mini-trans:hover {
          color: ${COLOR.ghost} !important;
        }
        .mini-row:hover {
          background: rgba(127,175,179,0.04);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Movement — one of four sections in the expanded programme
//  Header always visible; tracks below as catalogue rows.
// ═══════════════════════════════════════════════════════════════════════════

function Movement({
  movement,
  activeTrackId,
  availability,
  onSelectTrack,
}: {
  movement: { id: MovementId; roman: string; title: string; description: string };
  activeTrackId: string;
  availability: Record<string, boolean>;
  onSelectTrack: (t: Track) => void;
}) {
  const tracks = getTracksByMovement(movement.id);
  const isCurrent = tracks.some((t) => t.id === activeTrackId);
  const [open, setOpen] = useState(isCurrent);

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mini-mvt"
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "6px 0",
          margin: 0,
          textAlign: "left",
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "baseline",
          gap: 12,
          borderBottom: open
            ? "1px solid transparent"
            : `1px solid ${COLOR.inkGhost}25`,
          transition: "border-color 0.3s ease",
        }}
      >
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 18,
            lineHeight: 1,
            color: open ? COLOR.ghost : COLOR.inkMuted,
            transition: "color 0.3s ease",
            minWidth: 22,
          }}
        >
          {movement.roman}.
        </span>
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 14,
            lineHeight: 1.2,
            color: open ? COLOR.ink : COLOR.inkBody,
            letterSpacing: "-0.008em",
            transition: "color 0.3s ease",
          }}
        >
          {movement.title}
        </span>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 7,
            letterSpacing: "0.32em",
            color: COLOR.inkFaint,
          }}
        >
          {tracks.length.toString().padStart(2, "0")}
        </span>
      </button>

      {open && (
        <ol
          style={{
            listStyle: "none",
            margin: "4px 0 8px",
            padding: 0,
          }}
        >
          {tracks.map((t) => (
            <li key={t.id}>
              <Row
                track={t}
                active={t.id === activeTrackId}
                available={availability[t.id] !== false}
                onSelect={() => onSelectTrack(t)}
              />
            </li>
          ))}
        </ol>
      )}

      <style>{`
        .mini-mvt:hover span:nth-child(1),
        .mini-mvt:hover span:nth-child(2) {
          color: ${COLOR.ghost} !important;
        }
        .mini-mvt:focus-visible {
          outline: 1px solid ${COLOR.ghost};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Row — one track in the catalogue
// ═══════════════════════════════════════════════════════════════════════════

function Row({
  track,
  active,
  available,
  onSelect,
}: {
  track: Track;
  active: boolean;
  available: boolean;
  onSelect: () => void;
}) {
  // Dimmed + disabled when the MIDI file isn't on disk yet.
  // Background, border, font color, and click-handler all respond.
  const dimmed = !available;
  const baseAlpha = dimmed ? 0.42 : 1;

  return (
    <button
      type="button"
      onClick={dimmed ? undefined : onSelect}
      disabled={dimmed}
      aria-disabled={dimmed}
      title={dimmed ? "Not yet vendored — fetch with scripts/music/fetch_midi.py" : undefined}
      className={`mini-row${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
      style={{
        width: "100%",
        background: active ? "rgba(127,175,179,0.05)" : "transparent",
        border: "none",
        borderLeft: `2px solid ${active ? COLOR.ghost : "transparent"}`,
        padding: "6px 0 6px 10px",
        margin: 0,
        textAlign: "left",
        cursor: dimmed ? "not-allowed" : "pointer",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "baseline",
        gap: 10,
        opacity: baseAlpha,
        transition:
          "background 0.3s ease, border-color 0.3s ease, opacity 0.3s ease",
      }}
    >
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 7,
          letterSpacing: "0.28em",
          color: active ? COLOR.ghost : COLOR.inkFaint,
          minWidth: 28,
        }}
      >
        {track.mark}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 13,
            lineHeight: 1.2,
            color: active ? COLOR.ink : COLOR.inkBody,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.3s ease",
          }}
        >
          {track.title}
        </span>
        <span
          style={{
            marginTop: 1,
            fontFamily: FONT.mono,
            fontSize: 7,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.composer}
        </span>
      </span>
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 7,
          letterSpacing: "0.18em",
          color: COLOR.inkFaint,
        }}
      >
        {dimmed ? "—" : fmtSec(track.duration)}
      </span>
    </button>
  );
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TransportLink — italic Cormorant arrow link for prev/next
// ═══════════════════════════════════════════════════════════════════════════

function TransportLink({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="mini-trans"
      style={{
        background: "transparent",
        border: "none",
        padding: "0 4px",
        margin: 0,
        cursor: "pointer",
        fontFamily: FONT.display,
        fontStyle: "italic",
        fontWeight: 300,
        fontSize: 18,
        lineHeight: 1,
        color: COLOR.inkMuted,
        transition: "color 0.3s ease",
      }}
    >
      {children}
    </button>
  );
}
