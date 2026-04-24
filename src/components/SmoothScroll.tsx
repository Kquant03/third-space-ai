"use client";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "@/lib/gsapConfig";
import { gsap } from "gsap";

// ═══════════════════════════════════════════════════════════════════════════
//  SmoothScroll
//  ─────────────────────────────────────────────────────────────────────────
//  Owns the Lenis instance. In addition to driving the site-wide smooth
//  scroll, it exposes the instance on `window.__lenis` so downstream
//  components (notably PDFReader) can hand Lenis programmatic scroll
//  targets — e.g. "jump to page 14" — instead of fighting it with
//  element.scrollIntoView(), which Lenis would otherwise smooth-over
//  at the wrong cadence.
// ═══════════════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1.2,
    });
    lenisRef.current = lenis;
    // Expose for programmatic scroll from other components.
    window.__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      if (window.__lenis === lenis) {
        delete window.__lenis;
      }
    };
  }, []);

  return <>{children}</>;
}
