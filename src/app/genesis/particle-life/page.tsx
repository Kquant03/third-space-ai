// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/particle-life · page
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { ParticleLifeExperience } from "@/components/genesis/particle-life/ParticleLifeExperience";
import { getSubstrate } from "@/data/substrates";

export default function ParticleLifePage() {
  const meta = getSubstrate("particle-life");
  return (
    <SubstrateFrame meta={meta}>
      <ParticleLifeExperience />
    </SubstrateFrame>
  );
}
