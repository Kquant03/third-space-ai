// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · presets + view/flow/channel enums
//  ─────────────────────────────────────────────────────────────────────────
//  Static configuration for the ecosystem substrate. The view-mode enum
//  is split into PRIMARY (Ecosystem, 4D — the two big-picture views) and
//  SECONDARY (Prey, Predator, Flow, Morphogen — channel-isolation debug
//  views) so the UI can surface primaries prominently and tuck secondaries
//  behind a disclosure.
// ═══════════════════════════════════════════════════════════════════════════

import type { EcosystemId } from "./ecosystem";

export type PresetId =
  | "duel"
  | "swarm"
  | "coexist"
  | "invasion"
  | "hyperseed";

export type Preset = {
  id: PresetId;
  name: string;
  desc: string;
  ecosystem: EcosystemId;
};

export const PRESETS: Record<PresetId, Preset> = {
  duel: {
    id: "duel",
    name: "Duel",
    desc: "Three prey, one predator. The simplest predation ecology — watch whether the prey find the population density to outrun the predator.",
    ecosystem: "duel",
  },
  swarm: {
    id: "swarm",
    name: "Swarm",
    desc: "Eight prey colonies and three predators, randomly distributed. An emergent arms race: prey scatter, predators chain.",
    ecosystem: "swarm",
  },
  coexist: {
    id: "coexist",
    name: "Coexist",
    desc: "Prey and predator seeded in separated bands. Morphogen diffuses between them — coexistence is possible until contact.",
    ecosystem: "coexist",
  },
  invasion: {
    id: "invasion",
    name: "Invasion",
    desc: "An established prey colony fills the left of the substrate; two predators arrive from the right. Colonisation dynamics.",
    ecosystem: "invasion",
  },
  hyperseed: {
    id: "hyperseed",
    name: "DV Seed",
    desc: "The Dihypersphaerome ventilans alone. Prey and predator emerge FROM the four-dimensional organism as its 2D shadow bleeds through the hyperMix coupling.",
    ecosystem: "hyperseed",
  },
};

export const PRESET_LIST: Preset[] = [
  PRESETS.duel,
  PRESETS.swarm,
  PRESETS.coexist,
  PRESETS.invasion,
  PRESETS.hyperseed,
];

// ─── View modes ───────────────────────────────────────────────────────────
// Primary = big-picture renderings readers want to see first.
// Secondary = channel-isolation debug views for tuning / understanding.

export type ViewModeId =
  | "ecosystem"
  | "4d"
  | "prey"
  | "predator"
  | "flow"
  | "morphogen";

// Integer indices that the DISPLAY_FRAG shader expects in u_viewMode.
export const VIEW_MODE_INDEX: Record<ViewModeId, number> = {
  ecosystem: 0,
  prey: 1,
  predator: 2,
  "4d": 3,
  flow: 4,
  morphogen: 5,
};

export type ViewMode = { id: ViewModeId; label: string };

export const PRIMARY_VIEW_MODES: ViewMode[] = [
  { id: "ecosystem", label: "Ecosystem" },
  { id: "4d", label: "4D" },
];

export const SECONDARY_VIEW_MODES: ViewMode[] = [
  { id: "prey", label: "Prey" },
  { id: "predator", label: "Predator" },
  { id: "flow", label: "Flow" },
  { id: "morphogen", label: "Morphogen" },
];

// ─── Flow modes ───────────────────────────────────────────────────────────

export type FlowModeId = "gradient" | "curl" | "spiral";

export const FLOW_MODE_INDEX: Record<FlowModeId, number> = {
  gradient: 0,
  curl: 1,
  spiral: 2,
};

export const FLOW_MODES: Array<{ id: FlowModeId; label: string }> = [
  { id: "gradient", label: "Gradient" },
  { id: "curl", label: "Curl" },
  { id: "spiral", label: "Spiral" },
];

// ─── Brush channels ───────────────────────────────────────────────────────
// The four targetable channels the brush can paint into. The "composite"
// option paints prey + predator at reduced strength — "seed an ecosystem".

export type BrushChannelId = "prey" | "predator" | "morphogen" | "composite";

export const BRUSH_CHANNEL_INDEX: Record<BrushChannelId, number> = {
  prey: 0,
  predator: 1,
  morphogen: 2,
  composite: 3,
};

export type BrushChannel = {
  id: BrushChannelId;
  label: string;
  // Hex color used for the channel chip in the UI.
  color: string;
};

export const BRUSH_CHANNELS: BrushChannel[] = [
  { id: "prey",      label: "Prey",      color: "#d4a550" }, // warm gold
  { id: "predator",  label: "Predator",  color: "#7fafb3" }, // ghost cyan
  { id: "morphogen", label: "Morphogen", color: "#5d8a8e" }, // ghost-soft
  { id: "composite", label: "Seed",      color: "#c9817a" }, // sanguine-wash
];
