// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/lenia-expanded · page
//  ─────────────────────────────────────────────────────────────────────────
//  Mirrors /genesis/lenia and /genesis/ising: a thin shim that wraps the
//  experience in SubstrateFrame so the substrate sits inside the site's
//  standard chrome instead of taking the page over with a fixed canvas.
//  The full-bleed treatment that used to live here is gone — Lenia
//  Expanded is now a normal contained substrate, with its canvas in the
//  centre column of a lab plate and its tuning controls in a second plate
//  below.
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { LeniaExpandedExperience } from "@/components/genesis/lenia-expanded/LeniaExpandedExperience";
import { getSubstrate } from "@/data/substrates";

export default function LeniaExpandedPage() {
  const meta = getSubstrate("lenia-expanded");
  return (
    <SubstrateFrame meta={meta}>
      <LeniaExpandedExperience />
    </SubstrateFrame>
  );
}
