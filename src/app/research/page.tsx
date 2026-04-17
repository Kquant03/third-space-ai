import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Research",
  description:
    "The archive of Limen Research — papers, launches, and releases.",
};

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS
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

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — only things that actually exist right now.
// Expand as new posts, papers, and projects come online.
// ═══════════════════════════════════════════════════════════════════════════

type EntryType = "Paper" | "Launch" | "Release" | "Note" | "Dispatch";

type ResearchEntry = {
  id: string;
  type: EntryType;
  date: string;
  year: string;
  version?: string;
  titleLines: string[];
  subtitle: string;
  excerpt: string;
  authors?: string;
  href: string;
  external?: boolean;
};

const ENTRIES: ResearchEntry[] = [
  {
    id: "P — 001",
    type: "Paper",
    date: "April mmxxvi",
    year: "mmxxvi",
    version: "Revision xi",
    titleLines: ["Against", "Grabby Expansion"],
    subtitle: "Psychology, alignment, and the design of homeostatic minds.",
    excerpt:
      "The dominant picture of advanced intelligence — instrumental convergence, resource acquisition, grabby expansion — is an economic projection onto a cosmological canvas rather than a prediction about minds. This paper develops a positive design for homeostatic minds organized around substrate coupling, and demonstrates persistence under selection pressure.",
    authors: "Stanley Sebastian",
    href: "/papers/against-grabby-expansion.pdf",
  },
  {
    id: "P — 002",
    type: "Paper",
    date: "April mmxxvi",
    year: "mmxxvi",
    titleLines: ["Orbium unicaudatus", "ignis var. phantasma"],
    subtitle: "A Lenia species engineered to inhabit the edge of chaos.",
    excerpt:
      "On the discovery of a Lenia organism whose parameters place it on the critical boundary between stable pattern and diffusive collapse. The species exhibits persistent structure under perturbation, extended correlation length, and a characteristic flickering morphology consistent with operation near a phase transition.",
    authors: "Stanley Sebastian & Claude",
    href: "/papers/ghost-species.pdf",
  },
  {
    id: "P — 003",
    type: "Paper",
    date: "April mmxxvi",
    year: "mmxxvi",
    titleLines: ["Dihypersphaerome", "ventilans"],
    subtitle:
      "A four-dimensional organism whose projection seeds its ecosystem.",
    excerpt:
      "A Lenia organism defined in four spatial dimensions whose projected 2D cross-section functions as generative seed material for a surrounding ecosystem of lower-dimensional species. A design pattern for artificial-life substrates in which organisms and environments are not separable categories.",
    authors: "Stanley Sebastian & Claude",
    href: "/papers/dihypersphaerome-ventilans.pdf",
  },
  {
    id: "L — 001",
    type: "Launch",
    date: "March mmxxvi",
    year: "mmxxvi",
    titleLines: ["Genesis"],
    subtitle: "An artificial-life laboratory for the browser.",
    excerpt:
      "Public release of Genesis: seven GPU-accelerated artificial-life substrates running in the browser. Ising; Lenia with Ghost species and σ-landscapes; Lenia Expanded Universe; Gray-Scott reaction-diffusion; Particle Life; Primordial Particles; The Filter.",
    href: "https://kquant03.github.io/genesis-phase-transition/",
    external: true,
  },
  {
    id: "R — 001",
    type: "Release",
    date: "mmxxv",
    year: "mmxxv",
    titleLines: ["Apocrypha", "· Sandevistan"],
    subtitle: "Two training corpora, released openly.",
    excerpt:
      "The release of two training corpora — Apocrypha and Sandevistan — comprising over one hundred million tokens of experiential and imaginative text. The synthetic-data methodology, the design of the generation pipeline, and the intended use for downstream fine-tuning.",
    href: "https://huggingface.co/Replete-AI",
    external: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function TaperedRule({ accent = false }: { accent?: boolean }) {
  return (
    <div
      style={{
        height: 1,
        background: accent
          ? "linear-gradient(90deg, transparent 0%, rgba(127,175,179,0.05) 12%, rgba(127,175,179,0.38) 50%, rgba(127,175,179,0.05) 88%, transparent 100%)"
          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)",
      }}
    />
  );
}

function SectionMark({
  roman,
  label,
  index,
}: {
  roman: string;
  label: string;
  index: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "baseline",
        gap: 32,
        paddingBottom: 18,
        marginBottom: 72,
        borderBottom: `1px solid ${COLOR.inkGhost}40`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
        }}
      >
        § {roman}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span
          aria-hidden
          style={{
            flex: 1,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.12))",
            transform: "translateY(-4px)",
          }}
        />
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 22,
            color: COLOR.inkStrong,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        <span
          aria-hidden
          style={{
            flex: 1,
            height: 1,
            background:
              "linear-gradient(-90deg, transparent, rgba(255,255,255,0.12))",
            transform: "translateY(-4px)",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          textAlign: "right",
        }}
      >
        {index}
      </div>
    </div>
  );
}

function Ornament() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        padding: "72px 0",
        opacity: 0.5,
      }}
      aria-hidden
    >
      <span
        style={{
          display: "block",
          width: 60,
          height: 1,
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <span
        style={{ fontSize: 10, letterSpacing: "0.5em", color: COLOR.inkFaint }}
      >
        ◇
      </span>
      <span
        style={{
          display: "block",
          width: 60,
          height: 1,
          background: "rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Research() {
  const byYear: Map<string, ResearchEntry[]> = new Map();
  for (const e of ENTRIES) {
    const arr = byYear.get(e.year) ?? [];
    arr.push(e);
    byYear.set(e.year, arr);
  }
  const years = Array.from(byYear.keys());

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
           HERO
         ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "72vh",
          display: "flex",
          flexDirection: "column",
          paddingTop: 200,
          paddingBottom: 60,
        }}
      >
        <div style={{ padding: "0 40px" }}>
          <div
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
              — The Record · Vol. i —
            </div>
            <div style={{ textAlign: "right" }}>
              Toledo ·{" "}
              <span style={{ color: COLOR.inkMuted }}>Ohio</span>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 40px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 1280 }}>
            <TaperedRule accent />
            <div style={{ padding: "clamp(40px, 6vw, 80px) 0" }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: FONT.display,
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: "clamp(64px, 11vw, 160px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.028em",
                  color: COLOR.ink,
                  textShadow: "0 0 120px rgba(127,175,179,0.07)",
                }}
              >
                <span style={{ display: "block" }}>The</span>
                <span style={{ display: "block" }}>record.</span>
              </h1>
            </div>
            <TaperedRule accent />
          </div>
        </div>

        <div
          style={{
            padding: "0 40px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 760,
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              paddingLeft: "clamp(20px, 3vw, 36px)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(20px, 2.4vw, 28px)",
                lineHeight: 1.45,
                color: COLOR.inkBody,
              }}
            >
              Papers, launches, and open releases. The archive of the
              organization's published work, in reverse chronological order.
            </p>
            <div
              style={{
                marginTop: 18,
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.45em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
              }}
            >
              ── Standfirst
            </div>
          </div>
        </div>
      </section>

      <Ornament />

      {/* ══════════════════════════════════════════════════════════════════
           § ARCHIVE
         ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "72px 40px 96px",
        }}
      >
        <SectionMark
          roman="·"
          label="The Archive"
          index={`${ENTRIES.length.toString().padStart(2, "0")} entries`}
        />

        {years.map((year) => (
          <YearGroup
            key={year}
            year={year}
            entries={byYear.get(year) ?? []}
          />
        ))}

        <div
          style={{
            marginTop: 56,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: COLOR.inkGhost,
          }}
        >
          <span>— End of Archive —</span>
          <span>
            {ENTRIES.length.toString().padStart(2, "0")} entries
          </span>
        </div>
      </section>

      <Ornament />

      {/* ══════════════════════════════════════════════════════════════════
           COLOPHON
         ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "72px 40px 120px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "baseline",
            gap: 32,
            paddingBottom: 18,
            marginBottom: 64,
            borderBottom: `1px solid ${COLOR.inkGhost}40`,
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            §
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.12))",
                transform: "translateY(-4px)",
              }}
            />
            <span
              style={{
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 22,
                color: COLOR.inkStrong,
                letterSpacing: "0.02em",
              }}
            >
              Colophon
            </span>
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(-90deg, transparent, rgba(255,255,255,0.12))",
                transform: "translateY(-4px)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            Fin.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 72,
            alignItems: "start",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(24px, 2.8vw, 34px)",
                lineHeight: 1.4,
                color: COLOR.inkStrong,
                maxWidth: "26ch",
              }}
            >
              The archive is the organization's memory. Everything it
              remembers is here.
            </p>
            <p
              style={{
                marginTop: 32,
                fontFamily: FONT.body,
                fontSize: 13,
                lineHeight: 1.9,
                color: COLOR.inkMuted,
                maxWidth: "60ch",
                fontWeight: 300,
              }}
            >
              Older work from the Replete AI period remains available via{" "}
              <em style={{ color: COLOR.inkStrong }}>
                huggingface.co/Replete-AI
              </em>{" "}
              and{" "}
              <em style={{ color: COLOR.inkStrong }}>github.com/Kquant03</em>.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              alignItems: "flex-end",
              textAlign: "right",
            }}
          >
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkStrong,
                textDecoration: "none",
              }}
              className="colophon-link"
            >
              <span aria-hidden>←</span>
              <span>Return to Index</span>
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 28,
                  height: 1,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </Link>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                lineHeight: 2.2,
              }}
            >
              Limen Research
              <br />
              Est. mmxxiv · Toledo, Ohio
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .archive-row:hover .archive-title { color: ${COLOR.ghost} !important; }
        .archive-row:hover .archive-read { color: ${COLOR.ghost} !important; border-color: ${COLOR.ghost} !important; }
        .colophon-link:hover { color: ${COLOR.ghost} !important; }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// YEAR GROUP
// ═══════════════════════════════════════════════════════════════════════════

function YearGroup({
  year,
  entries,
}: {
  year: string;
  entries: ResearchEntry[];
}) {
  return (
    <div style={{ marginBottom: 72 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 24,
          marginBottom: 36,
          paddingBottom: 18,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(44px, 5vw, 72px)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: COLOR.ink,
          }}
        >
          {year}
        </h2>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          · {entries.length.toString().padStart(2, "0")}{" "}
          {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div>
        {entries.map((e) => (
          <ArchiveRow key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHIVE ROW
// ═══════════════════════════════════════════════════════════════════════════

function ArchiveRow({ entry }: { entry: ResearchEntry }) {
  const inner = (
    <article
      className="archive-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(160px, 1fr) 4fr",
        gap: "clamp(24px, 4vw, 72px)",
        padding: "52px 0",
        borderBottom: `1px solid ${COLOR.inkGhost}30`,
        transition: "background 0.25s ease",
      }}
    >
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          paddingTop: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: COLOR.inkMuted,
            }}
          >
            {entry.id}
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            {entry.type}
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.inkMuted,
            lineHeight: 1.9,
          }}
        >
          {entry.date}
          {entry.version && (
            <>
              <br />
              <span style={{ color: COLOR.inkFaint }}>{entry.version}</span>
            </>
          )}
        </div>
      </aside>

      <div>
        <h3
          className="archive-title"
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(34px, 4vw, 60px)",
            lineHeight: 0.98,
            letterSpacing: "-0.022em",
            color: COLOR.ink,
            transition: "color 0.35s ease",
          }}
        >
          {entry.titleLines.map((line, i) => (
            <span key={i} style={{ display: "block" }}>
              {line}
            </span>
          ))}
        </h3>

        <p
          style={{
            marginTop: 20,
            marginBottom: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(16px, 1.4vw, 19px)",
            lineHeight: 1.4,
            color: COLOR.inkMuted,
            maxWidth: "52ch",
          }}
        >
          {entry.subtitle}
        </p>

        <p
          style={{
            marginTop: 28,
            marginBottom: 0,
            fontFamily: FONT.body,
            fontSize: 14,
            lineHeight: 1.85,
            color: COLOR.inkMuted,
            maxWidth: "68ch",
            fontWeight: 300,
          }}
        >
          {entry.excerpt}
        </p>

        {entry.authors && (
          <div
            style={{
              marginTop: 28,
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            <span style={{ color: COLOR.inkStrong }}>{entry.authors}</span>
            <span style={{ color: COLOR.inkGhost, padding: "0 10px" }}>·</span>
            Limen Research
          </div>
        )}

        <div
          className="archive-read"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            marginTop: 36,
            paddingBottom: 6,
            fontFamily: FONT.mono,
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: COLOR.ghost,
            borderBottom: `1px solid ${COLOR.ghost}40`,
            transition: "color 0.3s ease, border-color 0.3s ease",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "block",
              width: 24,
              height: 1,
              background: COLOR.ghost,
            }}
          />
          <span>{entry.external ? "Read externally" : "Read"}</span>
          <span aria-hidden>{entry.external ? "↗" : "→"}</span>
        </div>
      </div>
    </article>
  );

  if (entry.external) {
    return (
      <a
        href={entry.href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={entry.href}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      {inner}
    </Link>
  );
}
