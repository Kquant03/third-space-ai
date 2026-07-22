"use client";

import { useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// Tokens
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
  void: "#010106",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

type Phase = "initial" | "visible" | "exiting" | "done";

// ═══════════════════════════════════════════════════════════════════════════
// Helper — sets data-loader attribute on <html>
// ═══════════════════════════════════════════════════════════════════════════

function setLoaderAttr(value: string | null) {
  if (typeof document === "undefined") return;
  if (value === null) delete document.documentElement.dataset.loader;
  else document.documentElement.dataset.loader = value;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function LimenLoader() {
  const [phase, setPhase] = useState<Phase>("initial");

  useEffect(() => {
    // Scroll-snap on entry
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    // Initial attr — hero elements will read this and hide themselves
    setLoaderAttr("entering");

    const enterRaf = requestAnimationFrame(() => {
      setPhase("visible");
      setLoaderAttr("visible");
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;

      window.scrollTo(0, 0);

      setPhase("exiting");
      // This is the symbiosis moment — CSS on [data-reveal] elements
      // picks this up and begins its reveal transitions in sync with the
      // loader's exit animation.
      setLoaderAttr("exiting");

      setTimeout(() => {
        setPhase("done");
        setLoaderAttr(null);
      }, 1500);
    };

    const MIN_DELAY = 1400;
    const SAFETY = 5500;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fontsReady = (document as any).fonts?.ready ?? Promise.resolve();

    Promise.all([
      new Promise((r) => setTimeout(r, MIN_DELAY)),
      fontsReady,
    ]).then(dismiss);

    const safetyTimer = setTimeout(dismiss, SAFETY);

    return () => {
      cancelAnimationFrame(enterRaf);
      clearTimeout(safetyTimer);
      setLoaderAttr(null);
    };
  }, []);

  const isVisible = phase !== "initial";
  const isExiting = phase === "exiting";

  // Plateau, not peak — see the note on TaperedRule in page.tsx. The
  // loader's rules bracket the same word the hero's do; they have to be
  // the same object.
  const ruleGradient =
    "linear-gradient(90deg, transparent 0, rgba(127,175,179,0.34) clamp(20px, 8%, 112px), " +
    "rgba(127,175,179,0.34) calc(100% - clamp(20px, 8%, 112px)), transparent 100%)";

  const limenTransform = isExiting
    ? "translateZ(80px) scale(1.06)"
    : isVisible
    ? "translateZ(0) scale(1)"
    : "translateZ(-400px) scale(0.7)";

  const ruleTransform = isExiting
    ? "translateZ(-100px)"
    : isVisible
    ? "translateZ(0)"
    : "translateZ(-250px)";

  const limenFilter = isExiting
    ? "brightness(1.35) blur(1.5px)"
    : "brightness(1) blur(0)";

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
           GLOBAL CSS — hero reveal choreography
           ───────────────────────────────────────────────────────────────
           These rules target [data-reveal] attributes on any hero element.
           They watch [data-loader] on <html> to know when to hide, hold,
           and reveal. The reveal transitions run DURING the loader's exit
           animation — not after it — so the hero elements rise from depth
           while the loader's Limen flies forward. That's the symbiosis.
         ═══════════════════════════════════════════════════════════════════ */}
      <style>{`
        /* Default — no loader attr present: elements fully visible. */
        [data-reveal] {
          opacity: 1;
        }

        /* Loader is mounted and hasn't begun exit yet — hero elements
           hidden at their entry positions. No transition during this
           phase: we want them to appear hidden instantly, not animate. */
        html[data-loader="entering"] [data-reveal],
        html[data-loader="visible"] [data-reveal] {
          opacity: 0;
          transition: none;
        }

        /* The word (hero h1) rises from depth */
        html[data-loader="entering"] [data-reveal="word"],
        html[data-loader="visible"] [data-reveal="word"] {
          transform: perspective(1500px) translateZ(-80px) scale(0.94);
        }

        /* The rules emerge from slightly behind */
        html[data-loader="entering"] [data-reveal="rule"],
        html[data-loader="visible"] [data-reveal="rule"] {
          transform: perspective(1500px) translateZ(-50px);
        }

        /* Sub-elements lift up gently */
        html[data-loader="entering"] [data-reveal="lift"],
        html[data-loader="visible"] [data-reveal="lift"] {
          transform: translateY(10px);
        }

        /* Deep-lift elements (standfirst, scroll hint) rise from further */
        html[data-loader="entering"] [data-reveal="deep-lift"],
        html[data-loader="visible"] [data-reveal="deep-lift"] {
          transform: translateY(16px);
        }

        /* Exit phase — the reveal. All elements animate to their resting
           position. Word and rules move in sync with the loader's exit
           (no delay). Lift and deep-lift are staggered behind, arriving
           as the loader finishes dissolving. */
        html[data-loader="exiting"] [data-reveal] {
          opacity: 1;
          transform: none;
          transition:
            opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1),
            transform 1.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        html[data-loader="exiting"] [data-reveal="word"],
        html[data-loader="exiting"] [data-reveal="rule"] {
          transform: perspective(1500px) translateZ(0) scale(1);
          transition-delay: 0s;
        }

        html[data-loader="exiting"] [data-reveal="lift"] {
          transform: translateY(0);
          transition-delay: 0.30s;
        }

        html[data-loader="exiting"] [data-reveal="deep-lift"] {
          transform: translateY(0);
          transition-delay: 0.55s;
        }

        @keyframes limenLoaderHalo {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1.00; }
        }

        /* ── loader, small viewports ─────────────────────────────
           The wordmark's clamp() floor was 100px, so on anything
           under ~500px wide the min won and "Third Space" ran off
           both edges — body { overflow-x: hidden } just cropped it
           rather than fixing it. Below 720px the type scales by
           viewport with a floor small enough to actually fit, and
           the 200px top padding (sized for the desktop masthead)
           comes down to something a 667px-tall phone can hold. */
        @media (max-width: 720px) {
          /* Vertical budget. The loader lives in a position:fixed,
             overflow:hidden box, so anything past the viewport is CLIPPED
             rather than scrolled. The desktop composition totals ~763px of
             content, which overflows a 667px phone outright and, on taller
             phones, pins ~210px of dead space at the foot so the wordmark
             floats well above centre. Reclaiming that space is what makes
             the loader read as a title page instead of a mis-sized one. */
          .limen-loader-section { padding-top: 56px !important; }
          .limen-loader-stage { padding: 16px 20px !important; }
          .limen-loader-titleblock { padding: clamp(20px, 5vw, 44px) 0 !important; }
          /* The foot spacer reserves room for the HOME page's scroll hint.
             The loader has no scroll hint, so on a phone it is pure dead
             space competing with the wordmark. */
          .limen-loader-foot { display: none !important; }
          .limen-loader-gutter {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          /* Deliberately duplicated from globals.css's .hero-title
             rule rather than shared: the loader is unmounted by the
             time the hero is read, so the two are never on screen at
             once — but they ARE on screen consecutively, mid-animation,
             and any divergence shows as a jump. Keep in sync by hand. */
          .limen-loader-title {
            font-size: clamp(58px, 22vw, 92px) !important;
            line-height: 0.82 !important;
            letter-spacing: -0.03em !important;
          }
          .limen-loader-title .hero-word { display: block; }
          /* Stack the rail rather than dropping its flanks — same
             call as the hero's .hero-meta, and it has to be the same
             call, because this rail hands off to that one. */
          .limen-loader-meta {
            grid-template-columns: minmax(0, 1fr) !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 4px !important;
            font-size: 10px !important;
            letter-spacing: 0.24em !important;
            line-height: 2 !important;
          }
          .limen-loader-meta > * {
            text-align: center !important;
            /* Was 0.3em here and 0.24em on the parent — the child rule won
               and quietly undid the tracking reduction. One value. */
            letter-spacing: 0.24em !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .limen-loader-title { transition-duration: 0.001ms !important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
           The loader itself — only rendered while phase !== "done"
         ═══════════════════════════════════════════════════════════════════ */}
      {phase !== "done" && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            // `inset: 0` sizes against the containing block, which is the
            // viewport ONLY if no ancestor has a transform, filter,
            // perspective, will-change or contain. If one does — anywhere
            // up the tree, including a route-specific wrapper — the fixed
            // root silently inherits that wider box and its centred
            // contents slide off to the right, which is exactly the
            // failure seen on the grabby route: rules visible, wordmark
            // parked past the right edge. Clamping to the viewport makes
            // the loader immune to that regardless of cause.
            maxWidth: "100vw",
            maxHeight: "100dvh",
            zIndex: 100,
            background: COLOR.void,
            pointerEvents: "none",
            opacity: isExiting ? 0 : 1,
            transition: "opacity 1.0s cubic-bezier(0.22,1,0.36,1) 0.35s",
            perspective: "1800px",
            perspectiveOrigin: "50% 42%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 55% 45% at 50% 42%, rgba(127,175,179,0.055), transparent)",
              pointerEvents: "none",
              animation: "limenLoaderHalo 5s ease-in-out infinite",
            }}
          />

          <section
            className="limen-loader-section"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "100%",
              overflowX: "hidden",
              minHeight: "100svh",
              display: "flex",
              flexDirection: "column",
              paddingTop: 200,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="limen-loader-gutter"
              style={{
                padding: "0 40px",
                opacity: isExiting ? 0 : isVisible ? 1 : 0,
                transition: "opacity 0.9s ease 0.45s",
              }}
            >
              <div
                className="limen-loader-meta"
                style={{
                  maxWidth: 1440,
                  margin: "0 auto",
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: 24,
                  fontFamily: FONT.mono,
                  fontSize: 9,
                  letterSpacing: "0.42em",
                  textTransform: "uppercase",
                  color: COLOR.inkFaint,
                }}
              >
                <div>April · mmxxvi</div>
                <div style={{ letterSpacing: "0.55em", color: COLOR.inkMuted }}>
                  — Annual Bulletin · Vol. i —
                </div>
                <div style={{ textAlign: "right" }}>
                  Toledo ·{" "}
                  <span style={{ color: COLOR.inkMuted }}>Ohio</span>
                </div>
              </div>
            </div>

            <div
              className="limen-loader-gutter limen-loader-stage"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 40px",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 1440,
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  style={{
                    height: 1,
                    background: ruleGradient,
                    opacity: isVisible ? 1 : 0,
                    transform: ruleTransform,
                    transition:
                      "transform 1.4s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease",
                  }}
                />

                <div
                  className="limen-loader-titleblock"
                  style={{
                    padding: "clamp(40px, 7vw, 92px) 0",
                    position: "relative",
                    textAlign: "center",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <h1
                    className="limen-loader-title"
                    style={{
                      margin: 0,
                      fontFamily: FONT.display,
                      fontStyle: "italic",
                      fontWeight: 300,
                      fontSize: "clamp(100px, 20vw, 300px)",
                      lineHeight: 0.85,
                      letterSpacing: "-0.035em",
                      color: COLOR.ink,
                      maxWidth: "100%",
                      overflowWrap: "break-word",
                      textShadow: isExiting
                        ? "0 0 200px rgba(127,175,179,0.45), 0 0 70px rgba(244,246,251,0.18)"
                        : "0 0 140px rgba(127,175,179,0.10), 0 0 40px rgba(244,246,251,0.05)",
                      opacity: isVisible ? 1 : 0,
                      transform: limenTransform,
                      filter: limenFilter,
                      transformOrigin: "center center",
                      transition:
                        "transform 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s, " +
                        "opacity 1.2s cubic-bezier(0.22,1,0.36,1) 0.15s, " +
                        "filter 1.0s ease, " +
                        "text-shadow 1.2s ease",
                    }}
                  >
                    {/* Locked to page.tsx's hero h1 — identical spans,
                        identical class, identical clamp. The exit
                        animation flies this word forward while the hero's
                        word rises to meet it; if they stack differently
                        the handoff jumps. Change one, change both. */}
                    <span className="hero-word">Third</span>{" "}
                    <span className="hero-word">Space</span>
                  </h1>
                </div>

                <div
                  style={{
                    height: 1,
                    background: ruleGradient,
                    opacity: isVisible ? 1 : 0,
                    transform: ruleTransform,
                    transition:
                      "transform 1.4s cubic-bezier(0.22,1,0.36,1) 0.08s, opacity 0.9s ease 0.08s",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 22,
                    marginTop: 44,
                    opacity: isExiting ? 0 : isVisible ? 1 : 0,
                    transition: "opacity 0.9s ease 0.35s",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: 72,
                      height: 1,
                      background: `linear-gradient(90deg, transparent, ${COLOR.ghost}55)`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 12,
                      letterSpacing: "0.7em",
                      textTransform: "uppercase",
                      color: COLOR.ghost,
                    }}
                  >
                    AI
                  </span>
                  <span
                    style={{
                      display: "block",
                      width: 72,
                      height: 1,
                      background: `linear-gradient(-90deg, transparent, ${COLOR.ghost}55)`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              className="limen-loader-gutter limen-loader-foot"
              style={{ padding: "0 40px 72px" }}
            >
              <div
                style={{
                  maxWidth: 1440,
                  margin: "0 auto",
                  minHeight: "clamp(140px, 18vh, 200px)",
                }}
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
