// ═══════════════════════════════════════════════════════════════════════════
//  src/app/genesis/true-lenia-expanded/page.tsx
//  ─────────────────────────────────────────────────────────────────────────
//  The genuinely-four-dimensional counterpart to /genesis/lenia-expanded,
//  sitting beside it under /genesis. Same shim shape as every other
//  substrate page: pull the meta from the registry and wrap the experience
//  in the standard SubstrateFrame chrome.
//
//  A server component, like the sibling substrate pages — SubstrateFrame and
//  the experience are the "use client" boundaries. getSubstrate resolves the
//  "true-lenia-expanded" entry (path "/genesis/true-lenia-expanded") that
//  this change adds to @/data/substrates.
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { TrueLeniaExpandedExperience } from "@/components/genesis/true-lenia-expanded/TrueLeniaExpandedExperience";
import { getSubstrate } from "@/data/substrates";

export default function TrueLeniaExpandedPage() {
  const meta = getSubstrate("true-lenia-expanded");
  return (
    <SubstrateFrame meta={meta}>
      <TrueLeniaExpandedExperience />
    </SubstrateFrame>
  );
}