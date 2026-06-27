"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  PebbleOverlay — SVG layer painting visitor-placed pebbles
//  ─────────────────────────────────────────────────────────────────────────
//  Pebbles are persistent inscriptions left by visitors. Unlike food,
//  they don't drift or expire — they sit in the pond as permanent
//  marks. This component renders each pebble as a small grey ellipse
//  at its world position (projected via pondToScreen), and shows the
//  inscription as a hover label.
//
//  RAF loop is light: only re-projects positions when the window
//  resizes. Pebble positions are static, so DOM mutation per frame
//  is wasted work — we update positions only when needed.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { pondToScreen } from "@/lib/pondCamera";
import type { UsePondResult } from "@/lib/usePond";

interface Props {
  pond: UsePondResult;
}

interface Pebble {
  id: string;
  x: number;
  z: number;
  inscription: string;
  placedAt: number;
  donorHandle: string;
}

interface PebbleScreenPos {
  pebble: Pebble;
  sx: number;
  sy: number;
}

export default function PebbleOverlay({ pond }: Props) {
  const [hovered, setHovered] = useState<Pebble | null>(null);
  const [screenPositions, setScreenPositions] = useState<PebbleScreenPos[]>([]);
  const pondRef = useRef(pond);
  useEffect(() => { pondRef.current = pond; }, [pond]);

  useEffect(() => {
    let rafId = 0;
    let mounted = true;
    let lastW = 0, lastH = 0, lastCount = 0;

    const tick = (): void => {
      if (!mounted) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const pebbles = (pondRef.current.getPebbles?.() ?? []) as Pebble[];

      // Only recompute screen positions when geometry changes or the
      // pebble list grows/shrinks. Avoids 60Hz state churn for a
      // fundamentally static scene element.
      if (W !== lastW || H !== lastH || pebbles.length !== lastCount) {
        lastW = W; lastH = H; lastCount = pebbles.length;
        const positions: PebbleScreenPos[] = [];
        for (const p of pebbles) {
          const scr = pondToScreen(p.x, p.z, W, H, 0);
          if (scr) positions.push({ pebble: p, sx: scr.sx, sy: scr.sy });
        }
        setScreenPositions(positions);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          // Pebbles are clickable for inspection, so this layer needs
          // pointer events. Crosshair/click overlays sit above at z=3+.
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {screenPositions.map(({ pebble, sx, sy }) => (
          <ellipse
            key={pebble.id}
            cx={sx}
            cy={sy}
            rx={5}
            ry={3.5}
            fill="#3a3833"
            stroke="#5a5048"
            strokeWidth={0.8}
            opacity={0.92}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
            }}
            onMouseEnter={() => setHovered(pebble)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* Inscription label — frosted glass card above the hovered pebble */}
      {hovered && (() => {
        const pos = screenPositions.find((p) => p.pebble.id === hovered.id);
        if (!pos) return null;
        return (
          <div
            style={{
              position: "fixed",
              left: pos.sx,
              top: pos.sy - 18,
              transform: "translate(-50%, -100%)",
              zIndex: 5,
              pointerEvents: "none",
              padding: "10px 14px",
              maxWidth: 320,
              background: "rgba(10, 14, 18, 0.75)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(127, 175, 179, 0.25)",
              borderRadius: 4,
              color: "#cfd6d4",
              fontFamily: "'Source Serif 4', 'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: 15,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ marginBottom: 6 }}>{hovered.inscription}</div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.55,
                fontStyle: "normal",
                letterSpacing: "0.05em",
              }}
            >
              — {hovered.donorHandle}
            </div>
          </div>
        );
      })()}
    </>
  );
}
