// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Hyper · presets
//  ─────────────────────────────────────────────────────────────────────────
//  Growth regimes here are not guesses — they came out of a CPU parameter
//  sweep of the actual 4D rule (a 2D Orbium's μ/σ merely kills a 4D field,
//  because the neighbourhood integral lands in a different place). The band
//  that self-maintains without dying or saturating sits around μ≈0.30,
//  σ≈0.06 for the single-shell 4-ball kernel; the presets pick points across
//  that band paired with the seed that shows each regime off best.
// ═══════════════════════════════════════════════════════════════════════════

import type { SeedId } from "./hyperfield";
import type { KernelProfileId } from "./hyperkernel";

export type PresetId =
  | "genesis"
  | "glome"
  | "clifford"
  | "hopf"
  | "duo"
  | "condense";

export type Preset = {
  id: PresetId;
  name: string;
  desc: string;
  seed: SeedId;
  profile: KernelProfileId;
  mu: number;
  sigma: number;
  dt: number;
  R: number;
};

export const PRESETS: Record<PresetId, Preset> = {
  genesis: {
    id: "genesis",
    name: "Genesis",
    desc: "A single 4-ball dropped into the homeostatic band. It neither dies nor floods — it settles into a self-maintaining lump of four-dimensional structure and drifts. The proof the engine is alive.",
    seed: "point",
    profile: "ball",
    mu: 0.3,
    sigma: 0.06,
    dt: 0.1,
    R: 4,
  },
  glome: {
    id: "glome",
    name: "Glome",
    desc: "A 3-sphere — the surface of the 4-ball. Rotate any plane touching w and watch its 3-slice inflate and deflate: a 2-sphere whose radius is really the height of the slice through four-space.",
    seed: "glome",
    profile: "shell",
    mu: 0.28,
    sigma: 0.065,
    dt: 0.1,
    R: 4,
  },
  clifford: {
    id: "clifford",
    name: "Clifford Torus",
    desc: "The flat 2-torus that lives inside the 3-sphere where |xy| = |zw|. It has no flat home in three dimensions; under rotation the slice shows two tori exchanging identities.",
    seed: "clifford",
    profile: "shell",
    mu: 0.3,
    sigma: 0.06,
    dt: 0.1,
    R: 4,
  },
  hopf: {
    id: "hopf",
    name: "Hopf Link",
    desc: "Two rings, one in the xy-plane and one in the zw-plane, linked in four-space. They pass through one another in the 3-slice and never touch — a link you could never tie in three dimensions.",
    seed: "hopf",
    profile: "ball",
    mu: 0.3,
    sigma: 0.06,
    dt: 0.1,
    R: 4,
  },
  duo: {
    id: "duo",
    name: "Hidden Twin",
    desc: "Two lumps separated along w only. In the w=0 slice they read as one; the moment you rotate into the fourth axis they pull apart. The empty space between them is space you cannot see without turning.",
    seed: "duo",
    profile: "ball",
    mu: 0.3,
    sigma: 0.06,
    dt: 0.1,
    R: 4,
  },
  condense: {
    id: "condense",
    name: "Condensation",
    desc: "Four-dimensional noise under a slightly hungrier rule. Organisms nucleate out of chaos and compete for the lattice — abiogenesis with an extra axis to hide in.",
    seed: "noise",
    profile: "ball",
    mu: 0.26,
    sigma: 0.065,
    dt: 0.1,
    R: 4,
  },
};

export const PRESET_LIST: Preset[] = [
  PRESETS.genesis,
  PRESETS.glome,
  PRESETS.clifford,
  PRESETS.hopf,
  PRESETS.duo,
  PRESETS.condense,
];

// ─── Palettes ──────────────────────────────────────────────────────────────
//  Indices consumed by the DISPLAY shader's u_palette. Kept in the lantern
//  family so Lenia Hyper sits beside its siblings in the gallery.

export type PaletteId = "lantern" | "ember" | "ghost";

export const PALETTE_INDEX: Record<PaletteId, number> = {
  lantern: 0,
  ember: 1,
  ghost: 2,
};

export const PALETTES: Array<{ id: PaletteId; label: string }> = [
  { id: "lantern", label: "Lantern" },
  { id: "ember", label: "Ember" },
  { id: "ghost", label: "Ghost" },
];

// ─── Rotation plane metadata ───────────────────────────────────────────────
//  The six planes of SO(4). xw / yw / zw are the ones that sweep the fourth
//  axis through the visible 3-slice — the "impossible" rotations. xy / xz /
//  yz are the familiar 3D turns of the slice itself.

export type PlaneId = "xy" | "xz" | "xw" | "yz" | "yw" | "zw";

export const ROTATION_PLANES: Array<{
  id: PlaneId;
  label: string;
  fourth: boolean; // true if the plane touches the hidden w axis
}> = [
  { id: "xy", label: "XY", fourth: false },
  { id: "xz", label: "XZ", fourth: false },
  { id: "yz", label: "YZ", fourth: false },
  { id: "xw", label: "XW", fourth: true },
  { id: "yw", label: "YW", fourth: true },
  { id: "zw", label: "ZW", fourth: true },
];
