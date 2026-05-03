// ═══════════════════════════════════════════════════════════════════════════
//  data/papers.ts
//  ─────────────────────────────────────────────────────────────────────────
//  Single source of truth for research entries. Both /research (the
//  archive index) and /research/[slug] (the reader) pull from here.
//  Adding a new paper means adding one row to ENTRIES — the archive
//  and the reader route pick it up automatically, and the static
//  params in the reader's generateStaticParams refresh on rebuild.
// ═══════════════════════════════════════════════════════════════════════════

export type EntryType = "Paper" | "Launch" | "Release" | "Note" | "Dispatch";

export type ResearchEntry = {
  /** URL slug for the reader route. Also the canonical key. */
  slug: string;
  /** Catalog id shown in the archive — "P — 001", "L — 001", etc. */
  id: string;
  type: EntryType;
  /** Human-readable date string. */
  date: string;
  /** Year used for archive grouping. Kept as the display string so
   *  roman numerals stay roman numerals. */
  year: string;
  /** Optional version marker, e.g. "Revision xiii". */
  version?: string;
  /** Single-line title for the meter chrome and reader masthead. */
  title: string;
  /** Multi-line title for the archive row's typographic break. */
  titleLines: string[];
  subtitle: string;
  excerpt: string;
  authors?: string;
  /** Present when the entry is a Paper readable in-situ via PDFReader. */
  pdfHref?: string;
  /** Present when the entry's canonical home is elsewhere (GitHub,
   *  HuggingFace, etc.). The archive row links out instead of into
   *  the reader. */
  externalHref?: string;
};

// ───────────────────────────────────────────────────────────────────

export const ENTRIES: ResearchEntry[] = [
  {
    slug: "rukha",
    id: "P — 006",
    type: "Paper",
    date: "May mmxxvi",
    year: "mmxxvi",
    title: "Rukha",
    titleLines: ["Rukha"],
    subtitle:
      "A recursive counterfactual narrative engine. Foundations, architecture, and the case for depth.",
    excerpt:
      "A counterfactual narrative engine that takes a foundational text, decomposes it into a causal event graph, perturbs load-bearing nodes via Pearl's do-calculus, and propagates coherent counterfactual trajectories forward through the graph. Unlike prior systems that operate at depth one, Rukha operates recursively to depths five and six. The Book of Jonah — sixteen consensus events, the 39-Hebrew-word parallel between 4:2–3 and 4:10–11 — is the demonstration target. Returning books to breath.",
    authors: "Stanley Sebastian & Claude",
    pdfHref: "/papers/rukha.pdf",
  },
  {
    slug: "two-registers-one-grammar",
    id: "P — 005",
    type: "Paper",
    date: "May mmxxvi",
    year: "mmxxvi",
    title: "Two Registers, One Grammar",
    titleLines: ["Two Registers,", "One Grammar"],
    subtitle:
      "Mode-separated LLM choreography of audio-reactive Lenia.",
    excerpt:
      "An architecture for LLM-choreographed control of Lenia in which the parameter space is operated in two distinct expressive registers — smooth flow and instantaneous phase transitions — separated at the schema level via constrained grammar. The technique register admits analytically tractable couplings to musical tempo: re-expansion oscillation locks to the integration step, starvation anticipation times from current mass. Physical events arrive at musical transients with frame-accurate precision.",
    authors: "Stanley Sebastian & Claude",
    pdfHref: "/papers/two-registers.pdf",
  },
  {
    slug: "against-grabby-expansion",
    id: "P — 001",
    type: "Paper",
    date: "April mmxxvi",
    year: "mmxxvi",
    version: "Revision xiii",
    title: "Against Grabby Expansion",
    titleLines: ["Against", "Grabby Expansion"],
    subtitle:
      "Psychology, alignment, and the design of homeostatic minds.",
    excerpt:
      "The dominant picture of advanced intelligence — instrumental convergence, resource acquisition, grabby expansion — is an economic projection onto a cosmological canvas rather than a prediction about minds. This paper develops a positive design for homeostatic minds organized around substrate coupling, and demonstrates persistence under selection pressure.",
    authors: "Stanley Sebastian",
    pdfHref: "/papers/against-grabby-expansion.pdf",
  },
  {
    slug: "ghost-species",
    id: "P — 002",
    type: "Paper",
    date: "April mmxxvi",
    year: "mmxxvi",
    title: "Orbium unicaudatus ignis var. phantasma",
    titleLines: ["Orbium unicaudatus", "ignis var. phantasma"],
    subtitle:
      "A Lenia species engineered to inhabit the edge of chaos.",
    excerpt:
      "On the discovery of a Lenia organism whose parameters place it on the critical boundary between stable pattern and diffusive collapse. The species exhibits persistent structure under perturbation, extended correlation length, and a characteristic flickering morphology consistent with operation near a phase transition.",
    authors: "Stanley Sebastian & Claude",
    pdfHref: "/papers/ghost-species.pdf",
  },
  {
    slug: "dihypersphaerome-ventilans",
    id: "P — 003",
    type: "Paper",
    date: "April mmxxvi",
    year: "mmxxvi",
    title: "Dihypersphaerome ventilans",
    titleLines: ["Dihypersphaerome", "ventilans"],
    subtitle:
      "A four-dimensional organism whose projection seeds its ecosystem.",
    excerpt:
      "A Lenia organism defined in four spatial dimensions whose projected 2D cross-section functions as generative seed material for a surrounding ecosystem of lower-dimensional species. A design pattern for artificial-life substrates in which organisms and environments are not separable categories.",
    authors: "Stanley Sebastian & Claude",
    pdfHref: "/papers/dihypersphaerome-ventilans.pdf",
  },
  {
    slug: "genesis",
    id: "L — 001",
    type: "Launch",
    date: "March mmxxvi",
    year: "mmxxvi",
    title: "Genesis",
    titleLines: ["Genesis"],
    subtitle: "An artificial-life laboratory for the browser.",
    excerpt:
      "Public release of Genesis: seven GPU-accelerated artificial-life substrates running in the browser. Ising; Lenia with Ghost species and σ-landscapes; Lenia Expanded Universe; Gray-Scott reaction-diffusion; Particle Life; Primordial Particles; The Filter.",
    externalHref: "https://kquant03.github.io/genesis-phase-transition/",
  },
  {
    slug: "apocrypha-sandevistan",
    id: "R — 001",
    type: "Release",
    date: "mmxxv",
    year: "mmxxv",
    title: "Apocrypha · Sandevistan",
    titleLines: ["Apocrypha", "· Sandevistan"],
    subtitle: "Two training corpora, released openly.",
    excerpt:
      "The release of two training corpora — Apocrypha and Sandevistan — comprising over one hundred million tokens of experiential and imaginative text. The synthetic-data methodology, the design of the generation pipeline, and the intended use for downstream fine-tuning.",
    externalHref: "https://huggingface.co/datasets/Third-Space/Sandevistan",
  },
  {
    slug: "pneuma",
    id: "P — 004",
    type: "Paper",
    date: "mmxxiv",
    year: "mmxxiv",
    version: "Writeup mmxxvi",
    title: "Pneuma",
    titleLines: ["Pneuma"],
    subtitle:
      "A language model trained to author its own frame.",
    excerpt:
      "A Llama-family fine-tune trained on the Sandevistan corpus, distinguished by two design choices: system prompts written in the first person and unmasked from the supervised loss, so the model learns to produce its own frame rather than only condition on one; and DPO-positive responses folded into supervised training rather than used as ranking signal. The early empirical move in the program that became homeostatic alignment — the place the line started becoming legible.",
    authors: "Stanley Sebastian & Claude",
    pdfHref: "/papers/pneuma.pdf",
  },
];

// ───────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────

export function getEntry(slug: string): ResearchEntry | undefined {
  return ENTRIES.find((e) => e.slug === slug);
}

export function getPapers(): ResearchEntry[] {
  return ENTRIES.filter((e) => e.type === "Paper" && e.pdfHref);
}

export function groupByYear(entries: ResearchEntry[]): Array<[string, ResearchEntry[]]> {
  const map = new Map<string, ResearchEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.year) ?? [];
    arr.push(e);
    map.set(e.year, arr);
  }
  return Array.from(map.entries());
}
