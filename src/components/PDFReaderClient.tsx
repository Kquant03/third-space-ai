"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  PDFReaderClient
//  ─────────────────────────────────────────────────────────────────────────
//  Bridges the server-rendered reader route to the client-only PDFReader.
//
//  pdfjs-dist references DOMMatrix at module-eval time, which Node
//  doesn't have. Next.js 16 + Turbopack still evaluates the module
//  graph during SSR / generateStaticParams even when the component
//  itself is marked "use client", so we need an actual client-side
//  dynamic import ({ ssr: false }) to keep pdfjs out of Node entirely.
//
//  This file is the client boundary. Import this from the [slug] page
//  server component instead of PDFReader directly.
// ═══════════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type PDFReaderComponent from "./PDFReader";

const PDFReader = dynamic(() => import("./PDFReader"), {
  ssr: false,
  loading: () => <InitialLoading />,
});

function InitialLoading() {
  return (
    <div
      style={{
        padding: "220px 0 260px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
      }}
    >
      <div
        className="animate-breathe"
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.55em",
          textTransform: "uppercase",
          color: "#7fafb3",
        }}
      >
        Unfolding
      </div>
      <div
        style={{
          width: 240,
          height: 1,
          background: "rgba(127,175,179,0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="animate-breathe"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "40%",
            background:
              "linear-gradient(90deg, transparent, rgba(127,175,179,0.75), transparent)",
            boxShadow: "0 0 12px rgba(127,175,179,0.5)",
          }}
        />
      </div>
    </div>
  );
}

export default function PDFReaderClient(
  props: ComponentProps<typeof PDFReaderComponent>,
) {
  return <PDFReader {...props} />;
}
