"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════
// Tokens
// ═══════════════════════════════════════════════════════════════════════════

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
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'DM Sans', system-ui, sans-serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

type NavItem = {
  href: string;
  label: string;
  roman: string;
  external?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Index", roman: "I" },
  { href: "/research", label: "Research", roman: "II" },
  {
    href: "https://kquant03.github.io/genesis-phase-transition/",
    label: "Genesis",
    roman: "III",
    external: true,
  },
  { href: "/about", label: "About", roman: "IV" },
];

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 64);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compact = mounted && scrolled;

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: compact ? "rgba(1,1,6,0.86)" : "rgba(1,1,6,0.38)",
          backdropFilter: "blur(36px) saturate(1.35)",
          WebkitBackdropFilter: "blur(36px) saturate(1.35)",
          borderBottom: `1px solid rgba(255,255,255,${compact ? 0.06 : 0.035})`,
          transition:
            "background 0.7s cubic-bezier(0.22,1,0.36,1), border-color 0.5s ease",
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════
             UPPER MASTHEAD — collapses on scroll
             ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            maxHeight: compact ? 0 : 180,
            opacity: compact ? 0 : 1,
            overflow: "hidden",
            transform: compact ? "translateY(-6px)" : "translateY(0)",
            transition:
              "max-height 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.45s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            className="masthead-row"
            style={{
              maxWidth: 1440,
              margin: "0 auto",
              padding: "30px 40px 22px",
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 40,
            }}
          >
            {/* LEFT FLANK — Est. date */}
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 24,
                  height: 1,
                  background: "rgba(255,255,255,0.10)",
                }}
              />
              <span>
                Est.{" "}
                <span style={{ color: COLOR.inkMuted, letterSpacing: "0.3em" }}>
                  mmxxiv
                </span>
              </span>
            </div>

            {/* CENTER — wordmark with favicon */}
            <Link
              href="/"
              className="masthead-wordmark"
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 16,
                textDecoration: "none",
                position: "relative",
              }}
            >
              {/* FAVICON — organization mark */}
              <img
                src="/favicon.ico"
                alt=""
                aria-hidden
                style={{
                  alignSelf: "center",
                  height: "clamp(30px, 3.4vw, 42px)",
                  width: "auto",
                  objectFit: "contain",
                  marginBottom: "-0.06em",
                  filter: "drop-shadow(0 0 18px rgba(127,175,179,0.18))",
                }}
              />
              <span
                style={{
                  fontFamily: FONT.display,
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: "clamp(32px, 3.6vw, 46px)",
                  lineHeight: 1,
                  color: COLOR.ink,
                  letterSpacing: "-0.012em",
                  textShadow: "0 0 36px rgba(127,175,179,0.08)",
                }}
              >
                Limen
              </span>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  letterSpacing: "0.55em",
                  textTransform: "uppercase",
                  color: COLOR.ghost,
                  transform: "translateY(-2px)",
                }}
              >
                Research
              </span>
            </Link>

            {/* RIGHT FLANK — edition */}
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 14,
              }}
            >
              <span>
                № 001 /{" "}
                <span style={{ color: COLOR.inkMuted, letterSpacing: "0.3em" }}>
                  mmxxvi
                </span>
              </span>
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 24,
                  height: 1,
                  background: "rgba(255,255,255,0.10)",
                }}
              />
            </div>
          </div>

          {/* Signature rule */}
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 40px" }}>
            <div
              aria-hidden
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(127,175,179,0.04) 10%, rgba(127,175,179,0.32) 50%, rgba(127,175,179,0.04) 90%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
             NAV BAR
             ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: compact ? "15px 40px" : "18px 40px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: compact ? "space-between" : "center",
            gap: 40,
            transition:
              "padding 0.6s cubic-bezier(0.22,1,0.36,1), justify-content 0.6s ease",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              opacity: compact ? 1 : 0,
              maxWidth: compact ? 300 : 0,
              overflow: "hidden",
              transition:
                "opacity 0.5s ease 0.15s, max-width 0.6s cubic-bezier(0.22,1,0.36,1)",
              whiteSpace: "nowrap",
            }}
            aria-hidden={!compact}
            tabIndex={compact ? 0 : -1}
          >
            {/* FAVICON — compact */}
            <img
              src="/favicon.ico"
              alt=""
              aria-hidden
              style={{
                height: 20,
                width: "auto",
                objectFit: "contain",
              }}
            />
            <span
              style={{
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: 20,
                color: COLOR.ink,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              Limen
            </span>
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.48em",
                textTransform: "uppercase",
                color: COLOR.ghost,
              }}
            >
              Research
            </span>
          </Link>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: compact ? 34 : 56,
              transition: "gap 0.55s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {NAV.map((item) => {
              const isActive =
                item.href === pathname ||
                (item.href === "/" && pathname === "/");
              return (
                <NavLink
                  key={item.label}
                  item={item}
                  isActive={!!isActive}
                  showRoman={!compact}
                />
              );
            })}
          </nav>

          <div
            aria-hidden
            style={{
              opacity: 0,
              maxWidth: compact ? 300 : 0,
              overflow: "hidden",
              transition: "max-width 0.6s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
      </header>

      <style>{`
        .nav-item { position: relative; display: inline-flex; align-items: baseline; gap: 10px; text-decoration: none; transition: color 0.3s ease; }
        .nav-item .nav-roman { transition: color 0.3s ease, transform 0.3s ease; }
        .nav-item .nav-label { transition: letter-spacing 0.35s ease, color 0.3s ease; }
        .nav-item .nav-underline {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -9px;
          height: 1px;
          background: ${COLOR.ghost};
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.45s cubic-bezier(0.22,1,0.36,1);
        }
        .nav-item.is-active .nav-underline { transform: scaleX(1); }
        .nav-item:hover { color: ${COLOR.ghost} !important; }
        .nav-item:hover .nav-roman { color: ${COLOR.ghost} !important; transform: translateY(-1px); }
        .nav-item:hover .nav-underline { transform: scaleX(1); }

        .masthead-wordmark:hover span:nth-child(3) { color: ${COLOR.ghost} !important; transition: color 0.35s ease; }

        @media (max-width: 820px) {
          .masthead-row { grid-template-columns: 1fr !important; gap: 10px !important; text-align: center !important; }
          .masthead-row > *:first-child,
          .masthead-row > *:last-child { justify-content: center !important; font-size: 8px !important; }
        }
        @media (max-width: 640px) {
          .nav-item .nav-roman { display: none !important; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function NavLink({
  item,
  isActive,
  showRoman,
}: {
  item: NavItem;
  isActive: boolean;
  showRoman: boolean;
}) {
  const inner = (
    <>
      {showRoman && (
        <span
          className="nav-roman"
          style={{
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.2em",
            color: isActive ? COLOR.ghost : COLOR.inkGhost,
          }}
        >
          {item.roman}.
        </span>
      )}
      <span
        className="nav-label"
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
        }}
      >
        {item.label}
      </span>
      {item.external && (
        <span
          aria-hidden
          style={{
            fontSize: 9,
            color: isActive ? COLOR.ghost : COLOR.inkGhost,
            marginLeft: -4,
          }}
        >
          ↗
        </span>
      )}
      <span className="nav-underline" aria-hidden />
    </>
  );

  const sharedStyle: React.CSSProperties = {
    color: isActive ? COLOR.ghost : COLOR.inkMuted,
  };

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`nav-item${isActive ? " is-active" : ""}`}
        style={sharedStyle}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={`nav-item${isActive ? " is-active" : ""}`}
      style={sharedStyle}
    >
      {inner}
    </Link>
  );
}