import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PDFReader from "@/components/PDFReaderClient";
import PaperBindingTrigger from "@/components/PaperBindingTrigger";
import { getEntry, getPapers } from "@/data/papers";

// ═══════════════════════════════════════════════════════════════════════════
//  /research/[slug]
//  ─────────────────────────────────────────────────────────────────────────
//  The reader route. Floats a continuous-scroll PDFReader over the
//  pond substrate. A thin "return to archive" link anchors to the
//  upper-left; everything else is the paper itself and its own
//  masthead.
//
//  Static params come from getPapers() so every entry in papers.ts
//  with type "Paper" and a pdfHref becomes a pre-rendered route at
//  build time. Add a paper → rebuild → route appears. No config in
//  this file needs touching.
// ═══════════════════════════════════════════════════════════════════════════

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPapers().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return { title: "Not found" };
  return {
    title: entry.title,
    description: entry.subtitle,
  };
}

export default async function PaperReader({ params }: Props) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry || !entry.pdfHref) notFound();

  const metaLine = [
    entry.id,
    entry.date,
    entry.version,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* Paper binding: if any track has boundPaper === slug, switch
          to it on entry — only if audio is already playing. The reader
          who has chosen to listen gets the right music; the reader who
          has chosen silence is not ambushed. Sticky at entry — the
          user is in control until they navigate to another bound paper. */}
      <PaperBindingTrigger slug={slug} />

      {/* ─── Return link ─────────────────────────────────── */}
      <nav
        style={{
          // Sits below SiteHeader's rule band (headerRuleTopPx = 140
          // in SiteChrome). Tune here if the header height changes.
          position: "fixed",
          top: 160,
          left: 32,
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

      <PDFReader
        src={entry.pdfHref}
        title={entry.title}
        subtitle={entry.subtitle}
        authors={entry.authors}
        meta={metaLine}
        downloadName={`${entry.slug}.pdf`}
      />

      <style>{`
        .reader-return:hover {
          color: #eaeef7 !important;
          border-color: rgba(127,175,179,0.3) !important;
        }
      `}</style>
    </>
  );
}
