// ═══════════════════════════════════════════════════════════════════════════
//  Genesis · substrate registry
//  ─────────────────────────────────────────────────────────────────────────
//  One list of substrates — catalog IDs, titles, subtitles, descriptions,
//  citations, paths. Consumed by the /genesis browser and every individual
//  substrate page. No strings duplicated.
//
//  Order of the array is the order of appearance on /genesis. Filter is
//  first and `featured: true`; it gets a larger card treatment and appears
//  as the hero piece on the catalog page.
// ═══════════════════════════════════════════════════════════════════════════

export type SubstrateId =
  | "filter"
  | "ising"
  | "lenia"
  | "lenia-expanded"
  | "gray-scott"
  | "particle-life";

export type SubstrateMeta = {
  id: SubstrateId;
  catalog: string;        // "Λ — 001" style identifier
  title: string;
  subtitle: string;
  description: string;    // long-form card copy on /genesis
  citation: string;       // mono-uppercase line under the title
  path: string;
  featured?: boolean;     // filter gets this — top-tier treatment on /genesis
};

export const SUBSTRATES: SubstrateMeta[] = [
  {
    id: "filter",
    catalog: "Λ — 001",
    title: "The Filter Envelope",
    subtitle: "Coordination bounds in (τ, L) phase space",
    description:
      "Three information-theoretic bounds — Landauer, Lieb–Robinson, Sivak–Crooks — compose into a feasibility envelope. A civilization attempting to be both large and responsive crosses it. Architected cost-sharing fission inherits the envelope under L → D rather than escaping it. Companion artifact to §5.1 and §6.2.",
    citation: "Sebastian · Against Grabby Expansion · v14 · mmxxvi",
    path: "/genesis/filter",
    featured: true,
  },
  {
    id: "ising",
    catalog: "Λ — 002",
    title: "Ising",
    subtitle: "Phase transitions in a 2D lattice",
    description:
      "Metropolis–Hastings and Wolff cluster algorithms on the 2D Ising model. The transition at T_c ≈ 2.269 J/k_B. Spin correlations sharpen, domains braid, the lattice commits. Tsarev social mapping available.",
    citation: "Ising (1925) · Wolff (1989) · Tsarev et al. (2019)",
    path: "/genesis/ising",
  },
  {
    id: "lenia",
    catalog: "Λ — 003",
    title: "Lenia",
    subtitle: "Continuous cellular automata",
    description:
      "Smooth organic lifeforms from Gaussian ring kernels and growth functions. Ghost mode, σ-landscapes, seasonal oscillation. The species engineered to inhabit the edge of chaos lives here.",
    citation: "Chan (2018, 2020) · Sebastian & Claude (mmxxvi)",
    path: "/genesis/lenia",
  },
  {
    id: "lenia-expanded",
    catalog: "Λ — 004",
    title: "Lenia · Expanded Universe",
    subtitle: "Multi-channel ecosystem with a four-dimensional organism",
    description:
      "Prey, predator, morphogen, and the Dihypersphaerome ventilans — a 4D organism rotating in hyperspace and bleeding its two-dimensional shadow into the substrate as generative seed material.",
    citation: "Chan (2020) · Sebastian & Claude (mmxxvi)",
    path: "/genesis/lenia-expanded",
  },
  {
    id: "gray-scott",
    catalog: "Λ — 005",
    title: "Gray-Scott",
    subtitle: "Reaction-diffusion morphogenesis",
    description:
      "Mitosis, coral, spirals, solitons. Two partial differential equations, eight Pearson classifications, one pattern-forming substrate.",
    citation: "Pearson (1993) · Gray & Scott (1984)",
    path: "/genesis/gray-scott",
  },
  {
    id: "particle-life",
    catalog: "Λ — 006",
    title: "Particle Life",
    subtitle: "Asymmetric forces between particle types",
    description:
      "Emergent predation, symbiosis, membranes from a small asymmetric force matrix. Minimal rules, unbounded expressivity. Nothing agent-like, and yet everything agent-like.",
    citation: "Schmickl et al. (2016) · Mogas-Recalde (2020)",
    path: "/genesis/particle-life",
  },
];

export function getSubstrate(id: SubstrateId): SubstrateMeta {
  const s = SUBSTRATES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown substrate: ${id}`);
  return s;
}
