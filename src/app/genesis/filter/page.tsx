// ═══════════════════════════════════════════════════════════════════════════
//  /genesis/filter · page
//  ─────────────────────────────────────────────────────────────────────────
//  Thin server component. Reads the substrate meta from the registry,
//  wraps <FilterExperience /> (client) in a <SubstrateFrame /> (masthead
//  + outer padding + ambient styles). Everything interactive lives inside
//  FilterExperience; this page stays a static shell so the site's route-
//  transition animation can render the masthead before the heavy client
//  bundle hydrates.
// ═══════════════════════════════════════════════════════════════════════════

import { SubstrateFrame } from "@/components/genesis/SubstrateFrame";
import { FilterExperience } from "@/components/genesis/filter/FilterExperience";
import { getSubstrate } from "@/data/substrates";

export default function FilterPage() {
  const meta = getSubstrate("filter");
  return (
    <SubstrateFrame meta={meta}>
      <FilterExperience />
    </SubstrateFrame>
  );
}
