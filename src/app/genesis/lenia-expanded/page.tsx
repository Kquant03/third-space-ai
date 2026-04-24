// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/lenia-expanded · page
//  ─────────────────────────────────────────────────────────────────────────
//  Like /genesis/lenia, this page bypasses SubstrateFrame — the
//  LeniaExpandedExperience client component owns its own full-bleed
//  composition (fixed canvas, floating reading plate, fixed-bottom
//  drawer). Site chrome still floats over it naturally.
// ═══════════════════════════════════════════════════════════════════════════

import { LeniaExpandedExperience } from "@/components/genesis/lenia-expanded/LeniaExpandedExperience";

export default function LeniaExpandedPage() {
  return <LeniaExpandedExperience />;
}
