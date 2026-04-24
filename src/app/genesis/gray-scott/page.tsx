// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/gray-scott · page
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { GrayScottExperience } from "@/components/genesis/gray-scott/GrayScottExperience";
import { getSubstrate } from "@/data/substrates";

export default function GrayScottPage() {
  const meta = getSubstrate("gray-scott");
  return (
    <SubstrateFrame meta={meta}>
      <GrayScottExperience />
    </SubstrateFrame>
  );
}
