"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  PaperReflow
//  ─────────────────────────────────────────────────────────────────────────
//  Renders a build-time-compiled paper (scripts/build-papers.mjs → JSON) as
//  native, reflowed HTML in the site's octavo style. This is the mobile
//  path: on a phone the reader route serves THIS instead of the PDF, so a
//  reader with no desktop and a slow connection gets a few KB of finished
//  markup and one KaTeX stylesheet — never a PDF, never a parser.
//
//  It renders a `PaperDoc` (an ordered list of typed blocks). Each block
//  kind maps to exactly one piece of the design system. There is no LaTeX
//  logic here — all of that ran at build time. The block HTML is trusted
//  because WE generated it from OUR own .tex sources; it never contains
//  user input, so dangerouslySetInnerHTML is appropriate and safe here.
//
//  Unknown block kinds render a visible dev marker rather than vanishing —
//  the same principle as the build script's `unhandled` blocks. A gap you
//  can see is a gap you can fix; a silent drop is the bug that ships.
// ═══════════════════════════════════════════════════════════════════════════

import { FONT, COLOR, TaperedRule, Ornament } from "@/components/editorial";

// ── Block model (mirrors scripts/build-papers.mjs output) ────────────────

type Block =
  | { kind: "heading"; level: 2 | 3 | 4; html: string }
  | { kind: "para"; html: string }
  | { kind: "abstract"; html: string }
  | { kind: "quote"; html: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; lang?: string; caption?: string; text: string }
  | { kind: "figure"; src: string; caption?: string; alt?: string }
  | { kind: "table"; caption?: string; rows: string[][] }
  | { kind: "card"; label: string | null; html: string }
  | { kind: "bibliography"; items: { key: string; html: string }[] }
  | { kind: "rule"; variant?: "tapered" | "ornament" }
  | { kind: "unhandled"; note: string };

export type PaperDoc = { slug: string; blocks: Block[] };

// ── One block → one component ────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      // Explicit rather than a dynamic `h${level}` tag: React 19 moved the
      // JSX namespace and `keyof JSX.IntrinsicElements` casts are brittle
      // across the transition. A switch is dull and correct.
      const html = { __html: block.html };
      if (block.level === 2) return <h2 dangerouslySetInnerHTML={html} />;
      if (block.level === 3) return <h3 dangerouslySetInnerHTML={html} />;
      return <h4 dangerouslySetInnerHTML={html} />;
    }

    case "para":
      return <p dangerouslySetInnerHTML={{ __html: block.html }} />;

    case "abstract":
      // The versal treatment — .abstract triggers the raised/dropped
      // initial in globals.css (raised below 720px, dropped on desktop).
      // The label sits above as a mono stamp, matching the section marks.
      return (
        <div style={{ margin: "0 0 8px" }}>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              marginBottom: 18,
            }}
          >
            Abstract
          </div>
          <p className="abstract" dangerouslySetInnerHTML={{ __html: block.html }} />
        </div>
      );

    case "quote":
      return <blockquote dangerouslySetInnerHTML={{ __html: block.html }} />;

    case "list":
      return block.ordered ? (
        <ol>
          {block.items.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ol>
      ) : (
        <ul>
          {block.items.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ul>
      );

    case "code":
      // .prose-lantern pre already styles this; the wrapper scrolls
      // horizontally rather than reflowing, which is correct for code.
      return (
        <figure style={{ margin: "1.5rem 0" }}>
          <pre>
            <code dangerouslySetInnerHTML={{ __html: block.text }} />
          </pre>
          {block.caption && (
            <figcaption
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
                marginTop: 10,
              }}
              dangerouslySetInnerHTML={{ __html: block.caption }}
            />
          )}
        </figure>
      );

    case "figure":
      return (
        <figure style={{ margin: "2rem 0" }}>
          {/* A missing figure shouldn't be a broken-image glyph mid-paper.
              onError swaps the img for a labelled placeholder that names
              the file — informative in dev (tells you which PNG to add or
              rename), dignified in prod. The figure src is committed data,
              never user input, so this is safe. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt || block.caption?.replace(/<[^>]+>/g, "") || ""}
            loading="lazy"
            style={{ width: "100%", height: "auto", borderRadius: 2, display: "block" }}
            onError={(e) => {
              const img = e.currentTarget;
              const ph = img.nextElementSibling as HTMLElement | null;
              img.style.display = "none";
              if (ph) ph.style.display = "flex";
            }}
          />
          <div
            aria-hidden
            style={{
              display: "none",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 160,
              padding: "32px 20px",
              border: `1px dashed ${COLOR.inkGhost}`,
              borderRadius: 2,
              background: "rgba(127,175,179,0.02)",
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: COLOR.inkFaint,
              }}
            >
              Figure unavailable
            </span>
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                color: COLOR.ghostSoft,
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {block.src.replace("/papers/", "")}
            </span>
          </div>
          {block.caption && (
            <figcaption
              style={{
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontSize: 14,
                color: COLOR.inkMuted,
                marginTop: 12,
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{ __html: block.caption }}
            />
          )}
        </figure>
      );

    case "table":
      return (
        <figure style={{ margin: "2rem 0" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "0.9rem",
                fontFamily: FONT.body,
              }}
            >
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri} style={ri === 0 ? { borderBottom: `1px solid ${COLOR.ghost}40` } : undefined}>
                    {row.map((cell, ci) => {
                      const headStyle: React.CSSProperties = {
                        textAlign: "left",
                        padding: "8px 16px 8px 0",
                        color: COLOR.inkStrong,
                        fontWeight: 500,
                        fontFamily: FONT.mono,
                        fontSize: "0.7rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${COLOR.inkGhost}20`,
                        verticalAlign: "top",
                      };
                      const bodyStyle: React.CSSProperties = {
                        textAlign: "left",
                        padding: "8px 16px 8px 0",
                        color: COLOR.inkBody,
                        fontFamily: FONT.body,
                        fontSize: "0.9rem",
                        borderBottom: `1px solid ${COLOR.inkGhost}20`,
                        verticalAlign: "top",
                      };
                      return ri === 0 ? (
                        <th key={ci} style={headStyle} dangerouslySetInnerHTML={{ __html: cell }} />
                      ) : (
                        <td key={ci} style={bodyStyle} dangerouslySetInnerHTML={{ __html: cell }} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && (
            <figcaption
              style={{
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontSize: 14,
                color: COLOR.inkMuted,
                marginTop: 12,
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{ __html: block.caption }}
            />
          )}
        </figure>
      );

    case "card":
      // callout / specimenbox / proposition / claim → a labelled plate,
      // inset from the body. Not a reading-plate (no backdrop cost stacking
      // inside one); a bordered inset that reads as a set-off aside.
      return (
        <div
          style={{
            margin: "2rem 0",
            padding: "24px 26px",
            borderLeft: `2px solid ${COLOR.ghost}55`,
            background: "rgba(127,175,179,0.03)",
            borderRadius: 2,
          }}
        >
          {block.label && (
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: COLOR.ghost,
                marginBottom: 12,
              }}
            >
              {block.label}
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: block.html }} />
        </div>
      );

    case "bibliography":
      return (
        <section style={{ marginTop: "3rem" }}>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              marginBottom: 24,
            }}
          >
            References
          </div>
          <ol className="reflow-bib" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {block.items.map((ref, i) => (
              <li
                key={ref.key || i}
                id={ref.key ? `ref-${ref.key}` : undefined}
                style={{
                  position: "relative",
                  paddingLeft: "2.4rem",
                  marginBottom: "0.9rem",
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  color: COLOR.inkMuted,
                  // Tapping a citation jumps here; offset so the entry
                  // lands below the fixed header instead of under it.
                  scrollMarginTop: "calc(var(--header-height, 128px) + 24px)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "0.15rem",
                    fontFamily: FONT.mono,
                    fontSize: "0.64rem",
                    color: COLOR.inkFaint,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span dangerouslySetInnerHTML={{ __html: ref.html }} />
              </li>
            ))}
          </ol>
        </section>
      );

    case "rule":
      return block.variant === "ornament" ? <Ornament /> : <div style={{ margin: "2.5rem 0" }}><TaperedRule accent /></div>;

    case "unhandled":
      // Loud in dev, quiet-ish in prod. Never silent.
      return (
        <div
          style={{
            margin: "1rem 0",
            padding: "10px 14px",
            border: `1px dashed ${COLOR.ghost}55`,
            borderRadius: 2,
            fontFamily: FONT.mono,
            fontSize: 11,
            letterSpacing: "0.1em",
            color: COLOR.ghostSoft,
          }}
        >
          ⟨ unhandled: {block.note} ⟩
        </div>
      );

    default:
      return null;
  }
}

// ── The reader ───────────────────────────────────────────────────────────

export default function PaperReflow({
  doc,
  title,
  subtitle,
  authors,
  meta,
}: {
  doc: PaperDoc;
  title: string;
  subtitle: string;
  authors?: string;
  meta?: string;
}) {
  return (
    <article
      className="paper-reflow"
      style={{
        position: "relative",
        // Above the substrate (canvas is z:0, layout veils z:1). Without
        // this the koi render over the masthead and Fin., which sit
        // outside the plate.
        zIndex: 2,
        maxWidth: 720,
        margin: "0 auto",
        padding: "calc(var(--header-height, 128px) + 32px) 20px 96px",
      }}
    >
      {/* Masthead — from papers.ts, not the .tex. The build step drops the
          in-body LaTeX title block for exactly this reason: the site owns
          the masthead so it's consistent across every paper. */}
      <header style={{ marginBottom: 8 }}>
        {meta && (
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              marginBottom: 24,
            }}
          >
            {meta}
          </div>
        )}
        <h1
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(38px, 10vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: COLOR.ink,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            marginTop: 20,
            marginBottom: 0,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(17px, 4.6vw, 22px)",
            lineHeight: 1.5,
            color: COLOR.inkBody,
          }}
        >
          {subtitle}
        </p>
        {authors && (
          <div
            style={{
              marginTop: 20,
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
            }}
          >
            {authors}
          </div>
        )}
      </header>

      <div style={{ margin: "2.5rem 0" }}>
        <TaperedRule accent />
      </div>

      {/* The body sits on a reading-plate — the site's chromatic-lens
          surface — so the koi swim BEHIND the paper, not through it. A
          bare .prose-lantern is transparent, which is fine on an opaque
          PDF but not over the live substrate: on the reflow path the pond
          showed through every gap between paragraphs.

          The --reader variant is a hair more opaque than a stock plate on
          mobile (a paper is read slowly, so a bright koi drifting under a
          line is more distracting than on a page you scroll past) and
          keeps the full lens on desktop. Crucially it inherits the 900px
          frost-off, so there's NO live backdrop-blur over the canvas on
          phones — the same perf trade the octavo pass made everywhere
          else. The surface is a flat wash there, not a per-frame re-blur. */}
      <div className="reading-plate reading-plate--reader prose-lantern">
        {doc.blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
      </div>

      <Ornament />
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT.display,
          fontStyle: "italic",
          fontSize: 20,
          color: COLOR.inkFaint,
        }}
      >
        Fin.
      </div>
    </article>
  );
}
