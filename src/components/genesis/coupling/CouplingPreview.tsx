"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/coupling · landing preview
//  ─────────────────────────────────────────────────────────────────────────
//  Non-interactive preview for the SubstrateCard on /genesis. Runs the same
//  coupling engine at a smaller lattice in autoSeed mode — devotion arrives
//  on a timer rather than from a pointer — and pauses when the card scrolls
//  off-screen (the card passes its IntersectionObserver state as `playing`).
// ═══════════════════════════════════════════════════════════════════════════

import { useRef } from "react";
import { useCouplingEngine } from "@/components/genesis/coupling/useCouplingEngine";

export function CouplingPreview({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCouplingEngine({
    canvas: canvasRef,
    devotion: 0.9,
    resistance: 0.38,
    threshold: 0.82,
    playing,
    autoSeed: true,
    simSize: 200,
  });

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
