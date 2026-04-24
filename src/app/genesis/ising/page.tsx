// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/ising · page
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { IsingExperience } from "@/components/genesis/ising/IsingExperience";
import { getSubstrate } from "@/data/substrates";

export default function IsingPage() {
  const meta = getSubstrate("ising");
  return (
    <SubstrateFrame meta={meta}>
      <IsingExperience />
    </SubstrateFrame>
  );
}
