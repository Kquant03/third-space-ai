"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  components/PaperBoundTrack.tsx
//  ─────────────────────────────────────────────────────────────────────────
//  When a paper has a track bound to it (declared in data/tracks.ts via
//  the boundPaper field), this component renders a small italic broadside
//  on the paper's reader page:
//
//      ↪ this paper is reading with
//        Erbarme dich, mein Gott
//        Johann Sebastian Bach · BWV 244 · 1727
//        [ begin listening ]
//
//  The "begin listening" action sets the track in the SiteAudio store and
//  starts playback. The visitor can then continue reading; the music
//  persists across navigation as always.
//
//  If a paper has no bound track, this component renders nothing.
//
//  Usage in /research/[slug]/page.tsx:
//
//      <PaperBoundTrack paperSlug={params.slug} />
//
//  Place it near the top of the reader, beneath the masthead, before
//  the PDF embed.
// ═══════════════════════════════════════════════════════════════════════════

import { useAudioStore } from "@/components/SiteAudio";
import { TRACKS, getBoundTrack } from "@/data/tracks";

const COLOR = {
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

export default function PaperBoundTrack({
  paperSlug,
}: {
  paperSlug: string;
}) {
  const track = getBoundTrack(paperSlug);
  const setTrackIndex = useAudioStore((s) => s.setTrackIndex);
  const setPlaying = useAudioStore((s) => s.setPlaying);
  const playing = useAudioStore((s) => s.playing);
  const currentIndex = useAudioStore((s) => s.trackIndex);

  if (!track) return null;
  const trackIdx = TRACKS.findIndex((t) => t.id === track.id);
  const isCurrentlyPlaying = playing && currentIndex === trackIdx;

  const begin = () => {
    if (trackIdx >= 0) {
      setTrackIndex(trackIdx);
      setPlaying(true);
    }
  };

  return (
    <aside
      aria-label="Bound listening track"
      style={{
        margin: "32px auto",
        maxWidth: 640,
        padding: "0 32px",
      }}
    >
      <div
        style={{
          padding: "20px 28px",
          background: "rgba(127,175,179,0.025)",
          border: "1px solid rgba(127,175,179,0.12)",
          borderLeft: `2px solid ${COLOR.ghost}`,
          borderRadius: 2,
        }}
      >
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 8,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: COLOR.ghostSoft,
            marginBottom: 10,
          }}
        >
          ↪ This paper reads with
        </div>
        <h4
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(20px, 2.4vw, 26px)",
            lineHeight: 1.18,
            letterSpacing: "-0.014em",
            color: COLOR.ink,
          }}
        >
          {track.title}
        </h4>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: COLOR.inkMuted,
          }}
        >
          {track.composer}
          <span aria-hidden style={{ color: COLOR.inkGhost, padding: "0 10px" }}>
            ·
          </span>
          {track.year}
          {track.opus && (
            <>
              <span
                aria-hidden
                style={{ color: COLOR.inkGhost, padding: "0 10px" }}
              >
                ·
              </span>
              <span style={{ color: COLOR.inkFaint }}>{track.opus}</span>
            </>
          )}
        </div>
        <p
          style={{
            margin: "12px 0 16px",
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 14,
            lineHeight: 1.55,
            color: COLOR.inkMuted,
            maxWidth: "44ch",
          }}
        >
          {track.gloss}
        </p>
        <button
          type="button"
          onClick={begin}
          disabled={isCurrentlyPlaying}
          className="bound-begin"
          style={{
            background: "transparent",
            border: "none",
            padding: "4px 0",
            margin: 0,
            cursor: isCurrentlyPlaying ? "default" : "pointer",
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 16,
            color: isCurrentlyPlaying ? COLOR.ghostSoft : COLOR.ghost,
            borderBottom: `1px solid ${
              isCurrentlyPlaying ? "transparent" : COLOR.ghost + "60"
            }`,
            transition: "color 0.3s ease, border-color 0.3s ease",
            letterSpacing: "-0.012em",
          }}
        >
          {isCurrentlyPlaying ? "now reading" : "begin listening"}
        </button>
      </div>
      <style>{`
        .bound-begin:hover:not(:disabled) {
          color: ${COLOR.ink} !important;
          border-color: ${COLOR.ink} !important;
        }
        .bound-begin:focus-visible {
          outline: 1px solid ${COLOR.ghost};
          outline-offset: 4px;
        }
      `}</style>
    </aside>
  );
}
