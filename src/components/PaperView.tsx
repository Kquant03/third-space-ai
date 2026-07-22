"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  PaperView
//  ─────────────────────────────────────────────────────────────────────────
//  The desktop/mobile fork for a paper. Desktop keeps the PDFReader — real
//  typesetting on a screen that can show it. Mobile (pointer: coarse) gets
//  PaperReflow — the reflowed, native-HTML edition compiled at build time.
//
//  Same fork the rest of the site uses (PondDiagnostic). `pointer: coarse`
//  rather than a width breakpoint: a narrow desktop window is still a
//  machine that renders the PDF well; a tablet is not.
//
//  The choice is deferred to an effect so SSR and first client render agree
//  (matchMedia reads a real client capability). Until it resolves we render
//  nothing — a blank beat is better than mounting the heavy PDFReader on a
//  phone only to swap it out.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import PDFReader from "@/components/PDFReaderClient";
import PaperReflow, { type PaperDoc } from "@/components/PaperReflow";

type Kind = "unknown" | "pdf" | "reflow";

export default function PaperView({
  doc,
  pdfHref,
  title,
  subtitle,
  authors,
  meta,
  downloadName,
}: {
  doc: PaperDoc | null;
  pdfHref: string;
  title: string;
  subtitle: string;
  authors?: string;
  meta: string;
  downloadName: string;
}) {
  const [kind, setKind] = useState<Kind>("unknown");

  useEffect(() => {
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    // Fall back to the PDF if the reflow doc is missing for this slug
    // (e.g. a paper whose .tex hasn't been compiled yet). The desktop
    // artifact always exists; the mobile one is best-effort per paper.
    setKind(coarse && doc ? "reflow" : "pdf");
  }, [doc]);

  if (kind === "unknown") return null;

  if (kind === "reflow" && doc) {
    return (
      <PaperReflow
        doc={doc}
        title={title}
        subtitle={subtitle}
        authors={authors}
        meta={meta}
      />
    );
  }

  return (
    <PDFReader
      src={pdfHref}
      title={title}
      subtitle={subtitle}
      authors={authors}
      meta={meta}
      downloadName={downloadName}
    />
  );
}
