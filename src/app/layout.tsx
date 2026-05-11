import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Source_Serif_4,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import LivingSubstrate from "@/components/LivingSubstrate";
import SiteChrome from "@/components/SiteChrome";
import LimenLoader from "@/components/LimenLoader";
import PondDiagnostic from "@/components/PondDiagnostic";
import SiteAudio from "@/components/SiteAudio";
import { MiniPlayer } from "@/components/AudioControl";
import PondWhispers from "@/components/PondWhispers";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Body reading serif — replaces DM Sans. Source Serif 4 is Adobe's
// open-source screen-reading serif, designed for exactly this kind of
// long-form academic prose. Pairs with Cormorant Garamond: same classical
// skeleton, different roles — display carries the drama, body does the
// patient work of paragraphs.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thirdspace.ai"),
  title: {
    default: "Third Space",
    template: "%s · Third Space",
  },
  description:
    "An independent research organization studying the architectural primitives of minds, artificial life, and alignment. Publications, platforms, and open data from Toledo, Ohio.",
  openGraph: {
    title: "Third Space",
    description:
      "Intelligence organizes around substrate coupling and integrative depth, not extraction and expansion.",
    url: "https://thirdspace.ai",
    siteName: "Third Space",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Third Space",
    description:
      "Intelligence organizes around substrate coupling and integrative depth, not extraction and expansion.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${sourceSerif.variable} ${jetbrains.variable}`}
    >
      <body
        style={{
          background: "#010106",
          color: "#c8cfe0",
          fontFamily:
            "var(--font-body), 'Source Serif 4', Georgia, 'Times New Roman', serif",
          fontWeight: 400,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <LimenLoader />

        <LivingSubstrate />

        <PondWhispers />

        <PondDiagnostic />

        {/* Audio engine — Consequences of Infinity. Sits at layout root so
            playback persists uninterrupted across every navigation, like
            the LivingSubstrate. The visible interface (AudioControl) lives
            in SiteHeader; this component is purely the engine. */}
        <SiteAudio />

        {/* Now-playing mini-player — viewport-fixed bottom-right. Visible
            whenever audio is loading, ready, or playing, hidden when the
            full programme drawer is open. */}
        <MiniPlayer />

        <div
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 110% 90% at 50% 40%, transparent 0%, rgba(1,1,6,0.55) 70%, #010106 100%)",
          }}
        />

        <div
          className="fixed inset-0 z-[1] pointer-events-none opacity-[0.025] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />

        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
