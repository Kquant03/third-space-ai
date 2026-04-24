// ═══════════════════════════════════════════════════════════════════════════
//  Filter · scenarios, strategies, and beat visibility
//  ─────────────────────────────────────────────────────────────────────────
//  Static configuration: the four scenarios (home-system → galactic), the
//  three strategies (monolithic / naïve fission / architected fission), and
//  the visibility flags that drive what the phase plot shows at each beat
//  of the Tier 1 scrollytelling.
// ═══════════════════════════════════════════════════════════════════════════

import { LY, AU } from "./physics";

// ─── Scenarios ────────────────────────────────────────────────────────────

export type ScenarioId = "home" | "solar" | "local" | "galactic";

export type Scenario = {
  id: ScenarioId;
  label: string;
  sub: string;              // τ + target, single line
  tau_yr: number;
  L_target_ly: number;
  note: string;             // longer sentence shown under the active plot
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  home: {
    id: "home",
    label: "Home-system agent",
    sub: "τ = 1 day · target = 100 AU",
    tau_yr: 1 / 365.25,
    L_target_ly: (100 * AU) / LY,
    note: "A civilization coordinating its home system. Fully inside the envelope.",
  },
  solar: {
    id: "solar",
    label: "Solar neighbourhood",
    sub: "τ = 10 yr · target = Proxima (4.2 ly)",
    tau_yr: 10,
    L_target_ly: 4.2,
    note: "Reaching the nearest star requires response times of ~decade. Just barely agent-scale.",
  },
  local: {
    id: "local",
    label: "Local cluster",
    sub: "τ = 100 yr · target = 100 ly",
    tau_yr: 100,
    L_target_ly: 100,
    note: "Multi-century response. Approaching the upper edge of agent-plausible responsiveness.",
  },
  galactic: {
    id: "galactic",
    label: "Galactic (ambitious)",
    sub: "τ = 10 yr · target = 100 kly",
    tau_yr: 10,
    L_target_ly: 1e5,
    note: "The grabby scenario: demand both agent-timescale responsiveness AND galactic reach. Watch where it lands.",
  },
};

export const SCENARIO_LIST: Scenario[] = [
  SCENARIOS.home,
  SCENARIOS.solar,
  SCENARIOS.local,
  SCENARIOS.galactic,
];

// ─── Strategies ───────────────────────────────────────────────────────────

export type StrategyId = "monolithic" | "naive" | "architected";

export type Strategy = {
  id: StrategyId;
  label: string;
  sub: string;
};

export const STRATEGIES: Record<StrategyId, Strategy> = {
  monolithic: {
    id: "monolithic",
    label: "Monolithic",
    sub: "Single civilization expanding L toward target.",
  },
  naive: {
    id: "naive",
    label: "Naïve fission",
    sub: "Parent splits at L_fiss. Daughters start from L = 0 with no shared infrastructure.",
  },
  architected: {
    id: "architected",
    label: "Architected fission",
    sub: "Parent splits at L_fiss. Daughters maintain inter-fragment coordination at τ_sync. Coordination channel D = 2·L_daughter tracks as its own worldline — and hits the same envelope.",
  },
};

export const STRATEGY_LIST: Strategy[] = [
  STRATEGIES.monolithic,
  STRATEGIES.naive,
  STRATEGIES.architected,
];

// ─── Scrollytelling beats ─────────────────────────────────────────────────
// What the sticky phase plot shows at each beat of the Tier 1 derivation.
// Each flag toggles a visual layer; the renderer in PhasePlot interprets
// them and cross-fades between states as the reader scrolls.

export type BeatVisibility = {
  axes: boolean;
  agentBand: boolean;
  infeasible: boolean;
  L_R: boolean;
  L_E: boolean;
  envelope: boolean;
  tauStar: boolean;
  L_R_label?: boolean;
  L_E_label?: boolean;
};

export const BEAT_VISIBILITY: Record<number, BeatVisibility> = {
  0: { axes: true, agentBand: false, infeasible: false, L_R: false, L_E: false, envelope: false, tauStar: false },
  1: { axes: true, agentBand: false, infeasible: false, L_R: false, L_E: false, envelope: false, tauStar: false },
  2: { axes: true, agentBand: true,  infeasible: false, L_R: false, L_E: true,  envelope: false, tauStar: false, L_E_label: true },
  3: { axes: true, agentBand: true,  infeasible: false, L_R: true,  L_E: true,  envelope: false, tauStar: false, L_R_label: true, L_E_label: true },
  4: { axes: true, agentBand: true,  infeasible: false, L_R: true,  L_E: true,  envelope: true,  tauStar: true },
  5: { axes: true, agentBand: true,  infeasible: true,  L_R: true,  L_E: true,  envelope: true,  tauStar: true },
  6: { axes: true, agentBand: true,  infeasible: true,  L_R: true,  L_E: true,  envelope: true,  tauStar: true },
};
