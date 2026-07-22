import type { Metadata } from "next";
import Link from "next/link";
import { ENTRIES, groupByYear } from "@/data/papers";
import type { ResearchEntry } from "@/data/papers";
import { COLOR, FONT } from "@/components/editorial";

export const metadata: Metadata = {
  title: "Research",
  description:
    "The archive of Third Space — papers, launches, and releases.",
};

// ═══════════════════════════════════════════════════════════════════════════
//  /research
//  ─────────────────────────────────────────────────────────────────────────
//  Simplified archive. The magazine-cover hero is gone; the page now
//  reads as a card catalog. Masthead line → archive list grouped by
//  year → end marker. Paper entries link into /research/[slug] for
//  the in-situ PDFReader; everything else (launches, releases) links
//  out to its canonical home. Colophon lives in SiteChrome's footer.
// ═══════════════════════════════════════════════════════════════════════════

export default function Research() {
  const byYear = groupByYear(ENTRIES);

  return (
    <>
      {/* ─── Masthead ────────────────────────────────────── */}
      <section
        className="archive-masthead"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "200px 40px 80px",
        }}
      >
        <div
          className="archive-rail"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 24,
            marginBottom: 80,
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          <div>Third Space</div>
          <div style={{ letterSpacing: "0.55em", color: COLOR.inkMuted }}>
            — The Archive —
          </div>
          <div style={{ textAlign: "right" }}>
            Toledo · <span style={{ color: COLOR.inkMuted }}>Ohio</span>
          </div>
        </div>

        <div style={{ maxWidth: 720 }}>
          <h1
            className="archive-h1"
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(56px, 7vw, 96px)",
              lineHeight: 0.95,
              letterSpacing: "-0.025em",
              color: COLOR.ink,
            }}
          >
            Research.
          </h1>
          <p
            style={{
              marginTop: 32,
              marginBottom: 0,
              maxWidth: "52ch",
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(18px, 1.8vw, 22px)",
              lineHeight: 1.55,
              color: COLOR.inkBody,
            }}
          >
            Papers, launches, and open releases, in reverse chronological
            order. Papers open in a reader here on site; everything else
            links to its canonical home.
          </p>
        </div>

        <div
          aria-hidden
          style={{
            marginTop: 72,
            height: 1,
            background:
              // Plateau, not peak — matches TaperedRule(accent). The old
              // 15/50/85 stops made a lens that only read as a rule at
              // desktop width; see editorial.tsx.
              "linear-gradient(90deg, transparent 0, rgba(127,175,179,0.34) clamp(20px, 8%, 112px), rgba(127,175,179,0.34) calc(100% - clamp(20px, 8%, 112px)), transparent 100%)",
          }}
        />
      </section>

      {/* ─── Archive ─────────────────────────────────────── */}
      <section
        className="archive-list"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 40px 96px",
        }}
      >
        {byYear.map(([year, entries]) => (
          <YearGroup key={year} year={year} entries={entries} />
        ))}

        <div
          className="archive-endcap"
          style={{
            marginTop: 72,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.42em",
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

      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .archive-row:hover .archive-title { color: ${COLOR.ghost} !important; }
          .archive-row:hover .archive-read {
            color: ${COLOR.ghost} !important;
            border-color: ${COLOR.ghost} !important;
          }
        }
        @media (hover: none) {
          .archive-row:active .archive-title { color: ${COLOR.ghost} !important; }
        }

        /* ── octavo ─────────────────────────────────────────────────
           This page owns its own responsive rules rather than adding to
           globals.css — same reasoning as SectionShell (editorial.tsx):
           the hook and the rule ship together and can't desync. */
        @media (max-width: 720px) {
          .archive-masthead { padding: calc(var(--header-height, 128px) + 28px) 20px 56px !important; }
          .archive-list     { padding: 32px 20px 72px !important; }

          /* Masthead rail: Third Space ── The Archive ── Toledo · Ohio.
             The flanks are structural noise on a phone; the centre plate
             carries it, stacked and centred like every other rail. */
          .archive-rail {
            grid-template-columns: minmax(0, 1fr) !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 4px !important;
            margin-bottom: 48px !important;
            font-size: 10px !important;
            letter-spacing: 0.24em !important;
            line-height: 2 !important;
          }
          .archive-rail > *:first-child,
          .archive-rail > *:last-child { display: none !important; }

          .archive-h1 { font-size: clamp(52px, 15vw, 96px) !important; }

          /* The row is the whole point of the page. minmax(150px,1fr) 4fr
             starves the title to ~80px at phone width — the metadata rail
             becomes a run-in header line above the entry instead, exactly
             like the open-data manifest on the home page. */
          .archive-row {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 14px !important;
            padding: 32px 0 !important;
          }
          .archive-aside {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: baseline !important;
            gap: 6px 16px !important;
            padding-top: 0 !important;
          }
          .archive-aside > div {
            display: flex;
            align-items: baseline;
            gap: 10px;
          }
          /* The date block uses <br> for version; in a run-in row that
             forces an unwanted wrap. Neutralise it. */
          .archive-aside br { display: none; }

          .archive-title { font-size: clamp(26px, 7vw, 48px) !important; overflow-wrap: anywhere; }

          /* space-between strands "NN entries" alone on a phone. Stack. */
          .archive-endcap {
            flex-direction: column !important;
            align-items: center !important;
            gap: 10px !important;
            text-align: center !important;
            letter-spacing: 0.24em !important;
          }
        }
      `}</style>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
//  YearGroup
// ───────────────────────────────────────────────────────────────────

function YearGroup({
  year,
  entries,
}: {
  year: string;
  entries: ResearchEntry[];
}) {
  return (
    <div style={{ marginBottom: 64 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 24,
          marginBottom: 24,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(36px, 4vw, 56px)",
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
            fontSize: 9,
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
          <ArchiveRow key={e.slug} entry={e} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
//  ArchiveRow
//  ──────────────────────────────────────────────────────────────────
//  Papers link to /research/[slug] (in-site reader).
//  Launches / releases link out via externalHref.
// ───────────────────────────────────────────────────────────────────

function ArchiveRow({ entry }: { entry: ResearchEntry }) {
  const isExternal = Boolean(entry.externalHref);
  const href = isExternal ? entry.externalHref! : `/research/${entry.slug}`;

  const inner = (
    <article
      className="archive-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(150px, 1fr) 4fr",
        gap: "clamp(24px, 4vw, 64px)",
        padding: "44px 0",
        borderBottom: `1px solid ${COLOR.inkGhost}30`,
      }}
    >
      <aside
        className="archive-aside"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          paddingTop: 6,
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
            fontSize: "clamp(28px, 3.4vw, 48px)",
            lineHeight: 1,
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
            marginTop: 18,
            marginBottom: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(15px, 1.3vw, 18px)",
            lineHeight: 1.4,
            color: COLOR.inkMuted,
            maxWidth: "52ch",
          }}
        >
          {entry.subtitle}
        </p>

        <p
          style={{
            marginTop: 22,
            marginBottom: 0,
            fontFamily: FONT.body,
            fontSize: 14,
            lineHeight: 1.8,
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
              marginTop: 22,
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            <span style={{ color: COLOR.inkStrong }}>{entry.authors}</span>
            <span style={{ color: COLOR.inkGhost, padding: "0 10px" }}>·</span>
            Third Space
          </div>
        )}

        <div
          className="archive-read"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            marginTop: 28,
            paddingBottom: 4,
            fontFamily: FONT.mono,
            fontSize: 10,
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
              width: 20,
              height: 1,
              background: COLOR.ghost,
            }}
          />
          <span>{isExternal ? "Visit" : "Read"}</span>
          <span aria-hidden>{isExternal ? "↗" : "→"}</span>
        </div>
      </div>
    </article>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={href}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      {inner}
    </Link>
  );
}
