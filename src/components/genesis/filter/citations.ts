// ═══════════════════════════════════════════════════════════════════════════
//  Filter · citations
//  ─────────────────────────────────────────────────────────────────────────
//  Master citation database for the §6.2 derivation, the loopholes panel,
//  and inline hover-cards. Each entry is keyed by a short slug and
//  carries enough metadata for both an inline citation and a popover.
//
//  Add entries here rather than inlining — keeps the bibliography auditable
//  and lets us render a unified References section for the audit path.
// ═══════════════════════════════════════════════════════════════════════════

export type Citation = {
  key: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  doi?: string;
  arxiv?: string;
  url?: string;
};

export const CITATIONS: Record<string, Citation> = {
  liebRobinson1972: {
    key: "liebRobinson1972",
    authors: "Lieb, E. H. & Robinson, D. W.",
    year: 1972,
    title: "The finite group velocity of quantum spin systems",
    venue: "Comm. Math. Phys. 28(3), 251–257",
    doi: "10.1007/BF01645779",
  },
  fossFeig2015: {
    key: "fossFeig2015",
    authors: "Foss-Feig, M., Gong, Z.-X., Clark, C. W. & Gorshkov, A. V.",
    year: 2015,
    title: "Nearly-linear light cones in long-range interacting systems",
    venue: "Phys. Rev. Lett. 114, 157201",
    doi: "10.1103/PhysRevLett.114.157201",
  },
  tran2021: {
    key: "tran2021",
    authors: "Tran, M. C. et al.",
    year: 2021,
    title: "Lieb–Robinson bounds and locality preserving operators",
    venue: "Phys. Rev. Lett. 127, 160401",
  },
  cheneau2012: {
    key: "cheneau2012",
    authors: "Cheneau, M. et al.",
    year: 2012,
    title:
      "Light-cone-like spreading of correlations in a quantum many-body system",
    venue: "Nature 481, 484–487",
    doi: "10.1038/nature10748",
  },
  lamport1978: {
    key: "lamport1978",
    authors: "Lamport, L.",
    year: 1978,
    title: "Time, clocks, and the ordering of events in a distributed system",
    venue: "Comm. ACM 21(7), 558–565",
    doi: "10.1145/359545.359563",
  },
  landauer1961: {
    key: "landauer1961",
    authors: "Landauer, R.",
    year: 1961,
    title: "Irreversibility and heat generation in the computing process",
    venue: "IBM J. Res. Dev. 5, 183",
  },
  bennett1982: {
    key: "bennett1982",
    authors: "Bennett, C. H.",
    year: 1982,
    title: "The thermodynamics of computation — a review",
    venue: "Int. J. Theor. Phys. 21, 905",
  },
  berut2012: {
    key: "berut2012",
    authors: "Bérut, A. et al.",
    year: 2012,
    title: "Experimental verification of Landauer's principle",
    venue: "Nature 483, 187–189",
    doi: "10.1038/nature10872",
  },
  sivakCrooks2012: {
    key: "sivakCrooks2012",
    authors: "Sivak, D. A. & Crooks, G. E.",
    year: 2012,
    title: "Thermodynamic metrics and optimal paths",
    venue: "Phys. Rev. Lett. 108, 190602",
    doi: "10.1103/PhysRevLett.108.190602",
  },
  boyd2022: {
    key: "boyd2022",
    authors: "Boyd, A. B., Patra, A., Jarzynski, C. & Crutchfield, J. P.",
    year: 2022,
    title: "Shortcuts to thermodynamic computing",
    venue: "J. Stat. Phys. 187, 17",
  },
  scandi2019: {
    key: "scandi2019",
    authors: "Scandi, M. & Perarnau-Llobet, M.",
    year: 2019,
    title: "Thermodynamic length in open quantum systems",
    venue: "Quantum 3, 197",
  },
  friston2013: {
    key: "friston2013",
    authors: "Friston, K.",
    year: 2013,
    title: "Life as we know it",
    venue: "J. R. Soc. Interface 10, 20130475",
  },
  bruineberg2022: {
    key: "bruineberg2022",
    authors: "Bruineberg, J., Dolega, K., Dewhurst, J. & Baltieri, M.",
    year: 2022,
    title: "The Emperor's new Markov blankets",
    venue: "Behavioral and Brain Sciences 45, e183",
  },
  aguilera2021: {
    key: "aguilera2021",
    authors: "Aguilera, M., Millidge, B., Tschantz, A. & Buckley, C. L.",
    year: 2021,
    title:
      "How particular is the physics of the free energy principle?",
    venue: "Physics of Life Reviews 39, 8–25",
  },
  hanson2021: {
    key: "hanson2021",
    authors: "Hanson, R., Martin, D., McCarter, C. & Paulson, J.",
    year: 2021,
    title:
      "If loud aliens explain human earliness, quiet aliens are also rare",
    venue: "Astrophys. J. 922, 182",
    arxiv: "2102.01522",
  },
  sandberg2018: {
    key: "sandberg2018",
    authors: "Sandberg, A., Drexler, E. & Ord, T.",
    year: 2018,
    title: "Dissolving the Fermi paradox",
    venue: "arXiv:1806.02404",
    arxiv: "1806.02404",
  },
  bennettHansonRiedel2019: {
    key: "bennettHansonRiedel2019",
    authors: "Bennett, C. H., Hanson, R. & Riedel, J.",
    year: 2019,
    title: "Comment on 'The aestivation hypothesis for resolving Fermi's paradox'",
    venue: "Foundations of Physics 49, 820–829",
  },
  hensen2015: {
    key: "hensen2015",
    authors: "Hensen, B. et al.",
    year: 2015,
    title:
      "Loophole-free Bell inequality violation using electron spins separated by 1.3 km",
    venue: "Nature 526, 682–686",
  },
};

export function citeShort(key: string): string {
  const c = CITATIONS[key];
  if (!c) return key;
  const lastName = c.authors.split(",")[0];
  return `${lastName} (${c.year})`;
}

export function citeFull(key: string): string {
  const c = CITATIONS[key];
  if (!c) return key;
  return `${c.authors} (${c.year}). ${c.title}. ${c.venue}.`;
}
