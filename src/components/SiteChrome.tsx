"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  SiteChrome
//  ─────────────────────────────────────────────────────────────────────────
//  Owns the top-level header + footer wrapper for the site. Reads the
//  current pathname via usePathname() — something a server-component
//  layout can't do — and elides the chrome on routes that supply their
//  own (currently just /limen-pond, which is a full-screen viewer of
//  the pond substrate).
//
//  Also owns the site-wide route transition: a brief dim-and-lift of a
//  void-colored veil over the whole viewport on every pathname change.
//  The pond substrate stays visible underneath (veil is semi-opaque),
//  so navigation reads as "the room dims, something rearranges, the
//  room returns" rather than "page swap." No component remounts — the
//  LivingSubstrate keeps its WebGL context intact across routes.
//
//  Design rule: anything that overlaps the pond substrate full-bleed
//  lives here, so the decision to show/hide it is in one place. If we
//  add another full-screen route later (replay, ghost-species lab,
//  the eventual shrine-inspector view), add its pathname to
//  CHROMELESS_ROUTES and be done.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";

const CHROMELESS_ROUTES = [
  "/limen-pond",
];

function isChromeless(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "") || "/";
  return CHROMELESS_ROUTES.some(
    (r) => p === r || p.startsWith(r + "/"),
  );
}

// ───────────────────────────────────────────────────────────────────
//  Transition tuning
//
//  On every pathname change the whole chrome + page stack fades in
//  from opacity 0. The substrate (below this component in the tree)
//  is never touched, so the pond keeps running smoothly across every
//  navigation.
//
//  Deliberately opacity-only — no transform. Applying a `transform`
//  to the wrapper would turn it into the containing block for any
//  `position: fixed` descendants (e.g. the pond page's top/bottom
//  bars), making them drift during the animation. Opacity keeps
//  fixed positioning relative to the viewport as intended.
//
//  - totalMs:         full animation duration
//  - holdAtStartPct:  fraction of the animation spent at opacity 0
//                     before the fade-in begins. Gives a brief moment
//                     of "substrate alone" between pages — a breath
//                     rather than an instant swap.
// ───────────────────────────────────────────────────────────────────

const TRANSITION = {
  totalMs: 860,
  // holdAtStart is hardcoded to 32% in the static keyframe string
  // below (inside the component). Change both if you tune this.

  // Vertical position of the header-rule, measured in pixels from the
  // top of the viewport. Should land just beneath the masthead +
  // secondary nav band. Tune by eye — the right value depends on
  // SiteHeader's exact layout. 140 is a best guess from screenshots.
  headerRuleTopPx: 140,
} as const;

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const chromeless = isChromeless(pathname);

  // ── Route transition ──────────────────────────────────────
  // On pathname change, the whole chrome+page stack fades in from
  // opacity 0 with a small upward drift. Keyed to pathname so every
  // navigation triggers a fresh animation. The LivingSubstrate —
  // which lives in layout.tsx OUTSIDE this component — is never
  // touched, so fish motion is continuous across navigations.
  //
  // The previous approach dropped a void-colored veil over the
  // whole viewport including the substrate; that caused two
  // issues: (1) no fade-out, since new content materialized fully
  // before the veil lifted, and (2) fish appeared to teleport
  // because 500+ ms of continuous motion was dimmed past legibility
  // then revealed at a different phase. Content-only fade solves
  // both — the substrate stays crisp, and the new content visibly
  // assembles itself on top of it.
  //
  // First mount is suppressed via the initialPath/hasNavigated
  // pair so initial page load feels like arrival.
  const [initialPath] = useState<string | null>(() => pathname ?? null);
  const [hasNavigated, setHasNavigated] = useState(false);
  if (!hasNavigated && pathname && pathname !== initialPath) {
    setHasNavigated(true);
  }

  // The animation plays on the wrapping container, keyed to pathname.
  // `animationKey` controls remount; on first mount it's null, so no
  // animation. After first navigation, it matches pathname.
  const animationKey = hasNavigated ? pathname : null;

  const transitionStyle: React.CSSProperties = hasNavigated
    ? {
        animation: `limen-content-in ${TRANSITION.totalMs}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
      }
    : {};

  // Static keyframe rules. We previously templated values into these
  // CSS strings, but Turbopack occasionally panics parsing template-
  // literal CSS with ${...} substitutions. Keeping the CSS fully
  // static dodges that. If you want to tune the stops, edit the
  // values below directly.
  //
  // Two animations:
  //   - limen-content-in:  opacity fade-up for the main content stack
  //   - limen-header-rule: the gossamer ghost-rule that draws across
  //                        beneath the header on every navigation —
  //                        a conductor's downbeat signaling that new
  //                        content has arrived below
  const transitionKeyframes = (
    <style>{
      "@keyframes limen-content-in { 0% { opacity: 0; } 32% { opacity: 0; } 100% { opacity: 1; } }" +
      " @keyframes limen-header-rule {" +
      " 0% { transform: scaleX(0); opacity: 0; }" +
      " 18% { opacity: 1; }" +
      " 45% { transform: scaleX(1); opacity: 1; }" +
      " 70% { opacity: 1; }" +
      " 100% { transform: scaleX(1); opacity: 0; }" +
      " }"
    }</style>
  );

  // The header rule — a horizontal ghost line positioned below the
  // masthead. Keyed to pathname so every navigation replays the
  // draw-and-fade animation. Only renders when the site has
  // navigated at least once (not on initial page load).
  const headerRule = hasNavigated ? (
    <div
      key={`rule-${pathname}`}
      aria-hidden
      style={{
        position: "fixed",
        top: TRANSITION.headerRuleTopPx,
        left: 0,
        right: 0,
        height: 1,
        zIndex: 3,
        pointerEvents: "none",
        background:
          "linear-gradient(90deg, transparent 0%, rgba(127,175,179,0.05) 15%, rgba(127,175,179,0.55) 50%, rgba(127,175,179,0.05) 85%, transparent 100%)",
        transformOrigin: "center",
        animation: "limen-header-rule 1100ms cubic-bezier(0.22, 1, 0.36, 1) both",
        // A gentle soft glow under the line itself — very subtle, reads
        // as light rather than a separate effect.
        boxShadow:
          "0 0 14px rgba(127,175,179,0.25), 0 0 40px rgba(127,175,179,0.08)",
      }}
    />
  ) : null;

  if (chromeless) {
    // Full-bleed viewer routes: just pass the page through. No header,
    // no footer, no main wrapper margins. The page owns the whole
    // viewport and renders its own edge chrome if it needs any.
    // Wrapped in an animated keyed div so navigations to/from this
    // route fade in like everywhere else.
    return (
      <>
        {transitionKeyframes}
        <div key={animationKey ?? "init"} style={transitionStyle}>
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      {transitionKeyframes}

      {/* SiteHeader sits OUTSIDE the animated wrapper so it renders
          once and persists across every navigation. The chrome is
          the frame; only the content inside it transitions. */}
      <SiteHeader />

      {/* A ghost-rule that draws across beneath the header on every
          navigation. The header stays still; the rule marks the
          downbeat of new content arriving below. */}
      {headerRule}

      <div key={animationKey ?? "init"} style={transitionStyle}>
        <main style={{ position: "relative", zIndex: 2 }}>{children}</main>

        <footer
          style={{
            position: "relative",
            zIndex: 2,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            marginTop: 96,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "80px 32px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 40,
          }}
        >
          <div style={{ gridColumn: "span 5" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontWeight: 300,
                  fontStyle: "italic",
                  fontSize: 34,
                  color: "#eaeef7",
                }}
              >
                Third
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.48em",
                  textTransform: "uppercase",
                  color: "#7fafb3",
                }}
              >
                Space
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--font-display), serif",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: 18,
                lineHeight: 1.5,
                color: "#8a9bba",
                maxWidth: "36ch",
              }}
            >
              An independent research organization studying what persists,
              what couples, and what passes through.
            </p>
            <div
              style={{
                marginTop: 32,
                fontFamily: "var(--font-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#5a6780",
                lineHeight: 2.2,
              }}
            >
              Toledo · Ohio
              <br />
              Est. <span style={{ color: "#8a9bba" }}>mmxxiv</span>
            </div>
          </div>

          <FooterCol title="Organization">
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/research">Research</FooterLink>
            <FooterLink href="mailto:stanley@thirdspace.ai" raw>
              Contact
            </FooterLink>
          </FooterCol>

          <FooterCol title="Elsewhere">
            <FooterLink href="https://github.com/Kquant03" raw external>
              GitHub
            </FooterLink>
            <FooterLink
              href="https://huggingface.co/Third-Space"
              raw
              external
            >
              Hugging Face
            </FooterLink>
          </FooterCol>
        </div>

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px" }}>
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
            }}
          />
        </div>

        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "22px 32px 28px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "#3a4560",
          }}
        >
          <div>© mmxxvi Third Space</div>
          <div style={{ textAlign: "center" }}>
            Sicut Vita Sum
          </div>
          <div>Replete AI</div>
        </div>
      </footer>
      </div>

      <style>{`
        .footer-link:hover { color: #7fafb3 !important; }
      `}</style>
    </>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ gridColumn: "span 3" }}>
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: "#3a4560",
          paddingBottom: 12,
          marginBottom: 20,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {title}
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "#8a9bba",
        }}
      >
        {children}
      </ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  raw,
  external,
}: {
  href: string;
  children: React.ReactNode;
  raw?: boolean;
  external?: boolean;
}) {
  const Cls = "footer-link";
  const style = { color: "inherit", textDecoration: "none" } as const;

  const content = (
    <>
      {children}
      {external && (
        <span style={{ color: "#3a4560", marginLeft: 8 }} aria-hidden>
          ↗
        </span>
      )}
    </>
  );

  return (
    <li>
      {raw ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={Cls}
          style={style}
        >
          {content}
        </a>
      ) : (
        <Link href={href} className={Cls} style={style}>
          {content}
        </Link>
      )}
    </li>
  );
}
