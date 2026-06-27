"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  FoodOverlay — SVG layer painting food items above the substrate canvas
//  ─────────────────────────────────────────────────────────────────────────
//  Food is broadcast by the worker in every tick (`state.food`), but the
//  LivingSubstrate WebGL pipeline only draws the substrate field and the
//  koi. This component sits on top of the canvas (zIndex 3, pointer-
//  events: none) and paints each food item as an SVG circle at the
//  correct projected screen position using `pondToScreen`.
//
//  Why imperative DOM updates instead of React reconciliation:
//
//    Food drifts continuously. To get smooth motion we need to update
//    positions on every animation frame (~60Hz). With 30 food items
//    that's 1800 keyed-element reconciliations per second through
//    React, which is wasteful when all we're doing is changing two
//    SVG attributes per circle. Direct DOM mutation via createElementNS
//    keeps the render path tight and the GC pressure low.
//
//  Visual rules:
//
//    pellet — visible warm amber, 6px radius. These are visitor gifts,
//             they should read as "the koi will want to eat that."
//    insect — dark earth, 3px. Natural food, subtle.
//    pollen — pale yellow, 2px. Ambient.
//    algae  — muted green, 3px. Ambient.
//
//  All at 0.85 opacity so they read as "in the water," not "on glass."
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { pondToScreen } from "@/lib/pondCamera";
import type { UsePondResult } from "@/lib/usePond";

interface Props {
  pond: UsePondResult;
}

const FOOD_STYLE: Record<string, { rx: string; ry: string; fill: string }> = {
  // Visitor gift — oblong pellet shape, warm amber. Slightly elongated
  // (rx > ry) so it reads as "fish food pellet from above" rather than
  // an abstract dot. Still visible enough that visitors can track
  // their drop, but no longer dominates the pond surface.
  pellet: { rx: "4", ry: "3", fill: "#e8c490" },
  // Natural food — small, mostly round, low-contrast. These are
  // ambient texture; the pellet is the focal point during a feeding.
  insect: { rx: "2.5", ry: "2", fill: "#5a4d3a" },
  pollen: { rx: "2", ry: "2", fill: "#e8d680" },
  algae:  { rx: "2.5", ry: "2", fill: "#6a8060" },
};

const FALLBACK_STYLE = { rx: "2.5", ry: "2.5", fill: "#9a9080" };

export default function FoodOverlay({ pond }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Keep a live ref so the RAF loop closes over the latest pond.
  const pondRef = useRef(pond);
  useEffect(() => { pondRef.current = pond; }, [pond]);

  useEffect(() => {
    let rafId = 0;
    let mounted = true;

    const tick = (): void => {
      if (!mounted) return;
      const svg = svgRef.current;
      if (!svg) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const W = window.innerWidth;
      const H = window.innerHeight;
      const food = pondRef.current.getFood();

      // Diff strategy: index existing ellipses by data-food-id, reuse
      // them for food still present, create new ones for arrivals,
      // remove anything no longer in the set. This is the same join
      // pattern D3 uses — minimal DOM churn.
      const existing = new Map<string, SVGEllipseElement>();
      for (let i = 0; i < svg.children.length; i++) {
        const node = svg.children[i] as SVGEllipseElement;
        const id = node.getAttribute("data-food-id");
        if (id) existing.set(id, node);
      }

      const seen = new Set<string>();
      for (const f of food) {
        const scr = pondToScreen(f.x, f.z, W, H, f.y);
        if (!scr) continue;
        seen.add(f.id);

        let c = existing.get(f.id);
        if (!c) {
          const style = FOOD_STYLE[f.kind] ?? FALLBACK_STYLE;
          c = document.createElementNS(
            "http://www.w3.org/2000/svg", "ellipse",
          );
          c.setAttribute("data-food-id", f.id);
          c.setAttribute("rx", style.rx);
          c.setAttribute("ry", style.ry);
          c.setAttribute("fill", style.fill);
          c.setAttribute("opacity", "0.85");
          // Subtle drop shadow for depth — soft 1px blur, low alpha.
          // SVG filters are expensive per-element but with N<50 food
          // items it's still inexpensive.
          c.style.filter = "drop-shadow(0 1px 1px rgba(0,0,0,0.25))";
          svg.appendChild(c);
        }
        c.setAttribute("cx", String(scr.sx));
        c.setAttribute("cy", String(scr.sy));
      }

      // Remove ellipses whose food has been consumed or has decayed.
      for (const [id, c] of existing) {
        if (!seen.has(id)) c.remove();
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
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        // Clicks pass through to the canvas underneath — food is
        // visual only, not interactive.
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}
