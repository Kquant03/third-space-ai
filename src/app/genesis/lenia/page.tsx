// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/lenia · page
//  ─────────────────────────────────────────────────────────────────────────
//  Unlike other substrate pages, Lenia's canvas fills the viewport behind
//  the content — so the SubstrateFrame wrapper's max-width + padding would
//  fight with the full-bleed composition. Instead, the LeniaExperience
//  client component owns the whole layout (fixed full-bleed canvas,
//  floating reading plate, fixed-bottom drawer) and we let the site
//  chrome (SiteHeader, footer) float over it naturally.
//
//  The substrate-registry metadata is still read here and passed into the
//  experience so the reading plate can title itself correctly.
// ═══════════════════════════════════════════════════════════════════════════

import { LeniaExperience } from "@/components/genesis/lenia/LeniaExperience";

export default function LeniaPage() {
  // No SubstrateFrame — Lenia's experience is its own full-bleed composition.
  // SiteChrome/SiteHeader above still render; they'll float over the canvas
  // and benefit from the backdrop-filter as another lens.
  return <LeniaExperience />;
}
