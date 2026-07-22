"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  PaperView
//  ─────────────────────────────────────────────────────────────────────────
//  The desktop/mobile fork for a paper. Desktop keeps the PDFReader — real
//  typesetting on a screen that can show it. Mobile (pointer: coarse) gets
//  PaperReflow — the reflowed, native-HTML edition compiled at build time.
//
//  The fork is `pointer: coarse` OR `max-width: 820px`. Pointer alone was
//  the original rule and it fails under every browser's device-emulation
//  mode, which resizes the viewport but keeps reporting a fine pointer —
//  so testing on a phone-sized window silently served the desktop PDF.
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
    if (typeof window.matchMedia !== "function") {
      setKind("pdf");
      return;
    }

    // Coarse pointer OR narrow viewport.
    //
    // This used to test `pointer: coarse` alone, which is correct for real
    // hardware and wrong for every way anyone actually tests. Firefox's
    // Responsive Design Mode (and Chrome's device toolbar without touch
    // emulation) resizes the viewport but leaves `pointer` reporting
    // `fine` — so a phone-sized test window fell through to the PDF branch
    // and rendered the full desktop PDF viewer, which overflows a narrow
    // window and pushes the page sideways. Every other page on the site
    // keys off width, which RDM does emulate, so the paper viewer was the
    // only thing that looked broken — and it looked broken in the one way
    // that reads as "the mobile CSS isn't loading."
    //
    // 820px matches the site's own first real mobile breakpoint. A narrow
    // desktop window now gets the reflowed edition too, which is the right
    // answer anyway: the PDF is unreadable at that width.
    const mq = window.matchMedia("(pointer: coarse), (max-width: 820px)");
    const apply = () => setKind(mq.matches && doc ? "reflow" : "pdf");
    apply();

    // Live, so resizing in devtools swaps the reader instead of needing a
    // reload to re-evaluate.
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
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
