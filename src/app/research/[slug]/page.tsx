import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PaperView from "@/components/PaperView";
import type { PaperDoc } from "@/components/PaperReflow";
import PaperBindingTrigger from "@/components/PaperBindingTrigger";
import { getEntry, getPapers } from "@/data/papers";

// ═══════════════════════════════════════════════════════════════════════════
//  /research/[slug]
//  ─────────────────────────────────────────────────────────────────────────
//  Desktop serves the PDF (real typesetting on a big screen); mobile serves
//  the reflowed edition compiled by scripts/build-papers.mjs. The fork lives
//  in PaperView (client, reads pointer: coarse). This server component loads
//  the compiled JSON if it exists and hands both artifacts down — the PDF
//  href always, the reflow doc when a compiled edition is present.
// ═══════════════════════════════════════════════════════════════════════════

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPapers().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return { title: "Not found" };
  return { title: entry.title, description: entry.subtitle };
}

// Load the compiled reflow doc for a slug, or null if this paper hasn't
// been compiled yet (missing .tex, or not in the build script's SOURCES).
//
// Deliberately a dynamic import rather than fs.readFileSync. The read
// version worked, but Next's watcher only tracks the MODULE GRAPH — an
// arbitrary fs read is invisible to it, so regenerating a paper's JSON
// changed nothing on screen until the dev server restarted or .next was
// cleared. That produced a genuinely confusing failure mode: the file on
// disk was correct, the page was stale, and nothing indicated which you
// were looking at.
//
// Importing puts the JSON in the module graph, so `npm run dev` picks up
// a rebuild immediately and production bundles it at build time. The
// template literal makes Turbopack create a context module over the whole
// directory, which is what allows the per-slug lookup.
async function loadReflow(slug: string): Promise<PaperDoc | null> {
  try {
    const mod = await import(`@/data/papers-rendered/${slug}.json`);
    return ((mod as { default?: PaperDoc }).default ?? mod) as PaperDoc;
  } catch {
    return null; // no compiled edition for this paper — PDF only
  }
}

export default async function PaperReader({ params }: Props) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry || !entry.pdfHref) notFound();

  const doc = await loadReflow(slug);
  const metaLine = [entry.id, entry.date, entry.version].filter(Boolean).join(" · ");

  return (
    <>
      <PaperBindingTrigger slug={slug} />

      {/* Return link. Keyed to the measured header like everything else —
          the old hardcoded top:160 is gone. */}
      <nav
        className="reader-return-nav"
        style={{
          position: "fixed",
          top: "calc(var(--header-height, 128px) + 20px)",
          left: 20,
          zIndex: 5,
        }}
      >
        <Link
          href="/research"
          className="reader-return"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            color: "#8a9bba",
            textDecoration: "none",
            padding: "10px 14px",
            background: "rgba(6, 9, 18, 0.55)",
            backdropFilter: "blur(18px) saturate(1.2)",
            WebkitBackdropFilter: "blur(18px) saturate(1.2)",
            border: "1px solid rgba(127,175,179,0.08)",
            borderRadius: 2,
            transition: "color 0.3s ease, border-color 0.3s ease",
          }}
        >
          <span aria-hidden>←</span>
          <span>The Archive</span>
        </Link>
      </nav>

      <PaperView
        doc={doc}
        pdfHref={entry.pdfHref}
        title={entry.title}
        subtitle={entry.subtitle}
        authors={entry.authors}
        meta={metaLine}
        downloadName={`${entry.slug}.pdf`}
      />

      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .reader-return:hover {
            color: #eaeef7 !important;
            border-color: rgba(127,175,179,0.3) !important;
          }
        }
        /* The return chip is removed on small screens. It floats over the
           paper's masthead, and the header's own RESEARCH link already
           goes to the archive — so on a phone it was a redundant control
           occupying the top-left of every paper, overlapping the title it
           sits on top of. Desktop keeps it: there's room, and it's the
           faster path back when the header is scrolled away. */
        @media (pointer: coarse), (max-width: 820px) {
          .reader-return-nav { display: none !important; }
        }
      `}</style>
    </>
  );
}
