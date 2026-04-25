// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/lenia · page
//  ─────────────────────────────────────────────────────────────────────────
//  Mirrors /genesis/ising: a thin shim that loads the substrate metadata
//  and hands it to SubstrateFrame, which centres the experience inside the
//  site's standard chrome. The full-bleed treatment we used previously is
//  gone — Lenia is now a normal contained substrate, with a square canvas
//  in the centre column of a three-column lab plate.
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { LeniaExperience } from "@/components/genesis/lenia/LeniaExperience";
import { getSubstrate } from "@/data/substrates";

export default function LeniaPage() {
  const meta = getSubstrate("lenia");
  return (
    <SubstrateFrame meta={meta}>
      <LeniaExperience />
    </SubstrateFrame>
  );
}
