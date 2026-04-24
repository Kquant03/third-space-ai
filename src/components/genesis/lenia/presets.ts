// ═══════════════════════════════════════════════════════════════════════════
//  Lenia · presets
//  ─────────────────────────────────────────────────────────────────────────
//  The species registry. Seven "classic" Lenia presets (Orbium and its
//  variants) plus six Ghost Species presets — the substrate for our
//  co-authored paper.
//
//  A Ghost preset differs from a classic preset by three flags:
//    ghost: true        — enable the σ-field lookup in the sim shader
//    landscape: <type>  — which σ-landscape to build
//    palette: 5         — default to the Lantern palette
// ═══════════════════════════════════════════════════════════════════════════

import type { SpeciesKey } from "./kernel";
import type { LandscapeType } from "./sigmaField";

export type PresetId =
  | "orbium"
  | "bicaudatus"
  | "ignis"
  | "ignis_bi"
  | "laxus"
  | "vagus"
  | "soup"
  | "ghost"
  | "ghost_radial"
  | "ghost_waves"
  | "ghost_islands"
  | "ghost_prism"
  | "ghost_orbium";

export type Preset = {
  id: PresetId;
  name: string;
  desc: string;
  R: number;
  T: number;          // time resolution — dt = 1/T
  mu: number;
  sigma: number;
  peaks: number[];
  count: number;      // how many seeds to place
  isSoup?: boolean;
  spf?: number;       // simulation-steps-per-frame override
  species?: SpeciesKey;

  // Ghost-only:
  ghost?: boolean;
  landscape?: LandscapeType;
  palette?: number;   // if set, auto-selects this palette on load
};

export const PRESETS: Record<PresetId, Preset> = {
  orbium: {
    id: "orbium",
    name: "Orbium",
    desc: "The classic glider soliton — stable directed locomotion (μ=0.15, σ=0.017).",
    R: 13,
    T: 10,
    mu: 0.15,
    sigma: 0.017,
    peaks: [1],
    count: 3,
    species: "orbium",
  },
  bicaudatus: {
    id: "bicaudatus",
    name: "Bicaudatus",
    desc: "Two-tailed variant — tighter growth band splits the wake (μ=0.15, σ=0.014).",
    R: 13,
    T: 10,
    mu: 0.15,
    sigma: 0.014,
    peaks: [1],
    count: 3,
    species: "bicaudatus",
  },
  ignis: {
    id: "ignis",
    name: "Ignis",
    desc: "Fire form — narrow growth band, fine timestep (μ=0.11, σ=0.012, T=20).",
    R: 13,
    T: 20,
    mu: 0.11,
    sigma: 0.012,
    peaks: [1],
    count: 4,
    spf: 4,
    species: "ignis",
  },
  ignis_bi: {
    id: "ignis_bi",
    name: "Ignis ×2",
    desc: "Fire two-tailed — widened σ for GPU stability (μ=0.1, σ=0.01, T=40).",
    R: 13,
    T: 40,
    mu: 0.1,
    sigma: 0.01,
    peaks: [1],
    count: 3,
    spf: 6,
    species: "bicaudatus_ignis",
  },
  laxus: {
    id: "laxus",
    name: "Laxus",
    desc: "Loose Orbium — wide tolerance, wobbly oscillating gait (μ=0.156, σ=0.024).",
    R: 13,
    T: 10,
    mu: 0.156,
    sigma: 0.024,
    peaks: [1],
    count: 3,
    species: "orbium",
  },
  vagus: {
    id: "vagus",
    name: "Vagus",
    desc: "Large-field wanderer — R=20 neighbourhood, different spatial scale.",
    R: 20,
    T: 10,
    mu: 0.2,
    sigma: 0.031,
    peaks: [1],
    count: 2,
    species: "orbium",
  },
  soup: {
    id: "soup",
    name: "Soup",
    desc: "Ecosystem — many Orbium seeds compete, watch natural selection.",
    R: 13,
    T: 10,
    mu: 0.15,
    sigma: 0.017,
    peaks: [1],
    count: 8,
    isSoup: true,
    species: "orbium",
  },

  // ── Ghost Species ──────────────────────────────────────────────────
  // Beings defined by the tension between memory and physics. Ignis
  // seeds placed in loosened or heterogeneous σ-landscapes. They
  // remember shapes they can never hold.

  ghost: {
    id: "ghost",
    name: "Ghost",
    desc: "Ignis seeds in wrong physics — they remember shapes they can never hold.",
    R: 15,
    T: 12,
    mu: 0.11,
    sigma: 0.015,
    peaks: [1],
    count: 12,
    spf: 4,
    species: "ignis",
    ghost: true,
    landscape: "uniform",
    palette: 5,
  },
  ghost_radial: {
    id: "ghost_radial",
    name: "Lanterns",
    desc: "Ghosts in a radial σ-well — drifting toward the centre where coherence glows gold.",
    R: 15,
    T: 12,
    mu: 0.11,
    sigma: 0.015,
    peaks: [1],
    count: 10,
    spf: 4,
    species: "ignis",
    ghost: true,
    landscape: "radial",
    palette: 5,
  },
  ghost_waves: {
    id: "ghost_waves",
    name: "Rivers",
    desc: "σ-waves create currents — ghosts migrate along rivers of kinder physics.",
    R: 15,
    T: 12,
    mu: 0.11,
    sigma: 0.015,
    peaks: [1],
    count: 10,
    spf: 4,
    species: "ignis",
    ghost: true,
    landscape: "waves",
    palette: 5,
  },
  ghost_islands: {
    id: "ghost_islands",
    name: "Archipelago",
    desc: "Tight-σ islands in a dissolving sea — ghosts seek safe harbors.",
    R: 15,
    T: 12,
    mu: 0.11,
    sigma: 0.015,
    peaks: [1],
    count: 14,
    spf: 4,
    species: "ignis",
    ghost: true,
    landscape: "islands",
    palette: 5,
  },
  ghost_prism: {
    id: "ghost_prism",
    name: "Prism",
    desc: "Full spectral rainbow — each ghost's colour comes from its own density.",
    R: 15,
    T: 12,
    mu: 0.11,
    sigma: 0.015,
    peaks: [1],
    count: 12,
    spf: 4,
    species: "ignis",
    ghost: true,
    landscape: "waves",
    palette: 6,
  },
  ghost_orbium: {
    id: "ghost_orbium",
    name: "Orbium Ghost",
    desc: "Orbium seeds in loosened physics — larger, slower, more mournful ghosts.",
    R: 13,
    T: 10,
    mu: 0.15,
    sigma: 0.022,
    peaks: [1],
    count: 6,
    spf: 2,
    species: "orbium",
    ghost: true,
    landscape: "radial",
    palette: 5,
  },
};

export const CLASSIC_PRESET_IDS: PresetId[] = [
  "orbium",
  "bicaudatus",
  "ignis",
  "ignis_bi",
  "laxus",
  "vagus",
  "soup",
];

export const GHOST_PRESET_IDS: PresetId[] = [
  "ghost",
  "ghost_radial",
  "ghost_waves",
  "ghost_islands",
  "ghost_prism",
  "ghost_orbium",
];

// ─── Display palette labels (palette index → metadata) ───────────────────
export type PaletteInfo = { name: string; color: string };

export const PALETTES: PaletteInfo[] = [
  { name: "Bio", color: "#4ecdc4" },
  { name: "Inferno", color: "#f59e0b" },
  { name: "Emerald", color: "#34d399" },
  { name: "Plasma", color: "#a78bfa" },
  { name: "Ocean", color: "#22d3ee" },
  { name: "Lantern", color: "#d4a550" },   // the default site palette
  { name: "Spectral", color: "#ff6b9d" },
];

// ─── View modes (palette-agnostic field selectors) ───────────────────────
export const VIEW_MODES = ["state", "potential", "growth", "composite"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
