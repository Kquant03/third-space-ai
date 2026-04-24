// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Synthetic Context Generator
//  ─────────────────────────────────────────────────────────────────────────
//  Generates N unique pond situations by stratified sampling over six axes:
//    stage × sex × partner-config × season × weather × time × location × mood
//
//  We don't do full Cartesian — that's 250k+ combos, most impossible or
//  redundant. Instead:
//    1. Enumerate valid (stage, partner-config) pairs (elders don't shoal
//       like fry, dying fish don't lead threadways, etc.)
//    2. For each valid pair, stratify-sample across the other axes so every
//       season/weather/location gets approximate coverage
//    3. Assign perceptual descriptions to partners that match their stages
//       without label-leaking ("pale body with heavy red patches" not "koi-5")
//    4. Seed RNG for reproducibility — same seed → same 500 contexts
//
//  The output matches the SweepContext shape in sweep.ts exactly, so it
//  can be passed through the existing /cog/sweep/run pipeline unchanged.
//
//  Usage:
//    import { generateContexts } from "./context-generator.js";
//    const contexts = generateContexts({ count: 500, seed: 42 });
//    // pass to sweep as { contexts }
// ═══════════════════════════════════════════════════════════════════════════

import type { SweepContext } from "./sweep.js";
import { SWEEP_SYSTEM_PROMPT } from "./sweep-contexts.js";

// ───────────────────────────────────────────────────────────────────
//  Axis values
// ───────────────────────────────────────────────────────────────────

const STAGES = ["fry", "juvenile", "adolescent", "adult", "elder", "dying"] as const;
const SEXES  = ["female", "male"] as const;
const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
const WEATHERS = ["clear", "overcast", "rain", "storm", "mist"] as const;
const LOCATIONS = [
  "center water",
  "shelf, shallow water",
  "reed ring, moving along edge",
  "near shrine",
  "surface water, close to air",
  "deep floor",
  "reeds, sheltered water",
] as const;

type Stage = (typeof STAGES)[number];
type Sex = (typeof SEXES)[number];

// Partner configurations. Each describes who else is visible and how.
type PartnerConfig =
  | { kind: "alone" }
  | { kind: "pair_close";   partnerStage: Stage }
  | { kind: "pair_distant"; partnerStage: Stage }
  | { kind: "triad";        stages: [Stage, Stage] }
  | { kind: "group";        stages: Stage[] };

// Mood bins. Each samples a PAD triple from a region of the space.
const MOOD_BINS = [
  { name: "low-ar-low-val",    p: [-0.4, 0.0], a: [0.0, 0.3], d: [-0.3, 0.2] },
  { name: "low-ar-high-val",   p: [0.2, 0.7],  a: [0.0, 0.4], d: [0.0, 0.4] },
  { name: "high-ar-low-val",   p: [-0.3, 0.1], a: [0.5, 0.9], d: [-0.2, 0.4] },
  { name: "high-ar-high-val",  p: [0.3, 0.8],  a: [0.5, 0.9], d: [0.2, 0.6] },
  { name: "neutral",           p: [-0.1, 0.3], a: [0.2, 0.5], d: [-0.1, 0.3] },
] as const;

// Time-of-day buckets, as fractions 0-1 where 0=midnight.
const TIMES = [
  { label: "deep night",  range: [0.0, 0.15] as const },
  { label: "dawn",        range: [0.18, 0.28] as const },
  { label: "morning",     range: [0.30, 0.44] as const },
  { label: "midday",      range: [0.46, 0.54] as const },
  { label: "afternoon",   range: [0.56, 0.68] as const },
  { label: "dusk",        range: [0.72, 0.82] as const },
  { label: "night",       range: [0.86, 0.99] as const },
] as const;

// ───────────────────────────────────────────────────────────────────
//  Stage-specific perceptual descriptors — shuffled per koi to avoid
//  identical descriptions. These are the things a koi can actually see
//  about another koi: body shape, patches, sheen, size, movement.
// ───────────────────────────────────────────────────────────────────

const DESCRIPTORS_BY_STAGE: Record<Stage, string[]> = {
  fry: [
    "very small, pale",
    "tiny, faint gold sheen",
    "very small, dark patches",
    "tiny, translucent, quick",
    "small, watching",
    "tiny, pale, trembling",
  ],
  juvenile: [
    "small, bright-gold, quick-moving",
    "small, pale with faint blue back",
    "small, matte, few patches",
    "small, dark body, bright sheen",
    "small, red patches emerging",
  ],
  adolescent: [
    "mid-size, still-softening patches",
    "mid-size, matte, pale body",
    "mid-size, darkening back",
    "mid-size, uneven coloration",
    "mid-size, growing into the shape",
  ],
  adult: [
    "pale body, heavy red patches, matte",
    "dark body, red patches, some sheen",
    "pale body, faint blue back, small patches",
    "bright-gold body, few patches",
    "dark body, no patches, bright sheen",
    "mottled pale and red, heavy shape",
  ],
  elder: [
    "large body, bright sheen, calm-moving",
    "large body, faded patches, slow",
    "large, still-moving, heavy shape",
    "large, pale, marks of many seasons",
  ],
  dying: [
    "still, faint movement, sinking",
    "drifting, fins slack, dim",
    "motionless on the floor, still breathing",
    "low, barely moving, heavy",
  ],
};

// ───────────────────────────────────────────────────────────────────
//  Valid (stage, partner-config) pairs
//  Rules:
//    - fry/juvenile rarely alone (they shoal); weight toward groups
//    - adults and elders can be in any config
//    - dying koi are almost always alone or with a single close witness
// ───────────────────────────────────────────────────────────────────

interface StagePartnerRule {
  stage: Stage;
  configs: Array<{
    kind: PartnerConfig["kind"];
    weight: number;
    partnerStages?: Stage[];       // distribution for paired configs
    groupSize?: [number, number];  // [min, max] for group
  }>;
}

const STAGE_RULES: StagePartnerRule[] = [
  { stage: "fry", configs: [
    { kind: "alone",        weight: 1 },
    { kind: "pair_close",   weight: 2, partnerStages: ["fry", "elder", "adult"] },
    { kind: "triad",        weight: 2, partnerStages: ["fry", "fry", "juvenile"] },
    { kind: "group",        weight: 4, partnerStages: ["fry", "fry", "juvenile", "adult"], groupSize: [3, 5] },
  ]},
  { stage: "juvenile", configs: [
    { kind: "alone",        weight: 1 },
    { kind: "pair_close",   weight: 2, partnerStages: ["juvenile", "fry", "adolescent"] },
    { kind: "pair_distant", weight: 1, partnerStages: ["adult", "elder"] },
    { kind: "triad",        weight: 3, partnerStages: ["juvenile", "juvenile", "adolescent"] },
    { kind: "group",        weight: 3, partnerStages: ["juvenile", "fry", "adolescent"], groupSize: [3, 6] },
  ]},
  { stage: "adolescent", configs: [
    { kind: "alone",        weight: 3 },
    { kind: "pair_close",   weight: 3, partnerStages: ["adolescent", "adult", "juvenile"] },
    { kind: "pair_distant", weight: 2, partnerStages: ["adult", "elder"] },
    { kind: "triad",        weight: 2, partnerStages: ["adolescent", "adult"] },
    { kind: "group",        weight: 2, partnerStages: ["adult", "adolescent", "juvenile"], groupSize: [3, 5] },
  ]},
  { stage: "adult", configs: [
    { kind: "alone",        weight: 3 },
    { kind: "pair_close",   weight: 4, partnerStages: ["adult", "adult", "adult", "elder", "adolescent"] },
    { kind: "pair_distant", weight: 2, partnerStages: ["adult", "elder"] },
    { kind: "triad",        weight: 2, partnerStages: ["adult", "adult"] },
    { kind: "group",        weight: 3, partnerStages: ["adult", "adolescent", "juvenile", "elder"], groupSize: [3, 6] },
  ]},
  { stage: "elder", configs: [
    { kind: "alone",        weight: 4 },
    { kind: "pair_close",   weight: 3, partnerStages: ["adult", "elder", "fry"] },
    { kind: "pair_distant", weight: 2, partnerStages: ["adult", "adolescent"] },
    { kind: "triad",        weight: 1, partnerStages: ["adult", "elder"] },
    { kind: "group",        weight: 2, partnerStages: ["adult", "adolescent", "juvenile"], groupSize: [3, 5] },
  ]},
  { stage: "dying", configs: [
    { kind: "alone",        weight: 4 },
    { kind: "pair_close",   weight: 5, partnerStages: ["adult", "elder"] },  // witnessing
  ]},
];

// ───────────────────────────────────────────────────────────────────
//  Seeded RNG
// ───────────────────────────────────────────────────────────────────

class SeededRng {
  private state: number;
  constructor(seed: number) {
    // xorshift32 — small, fast, deterministic
    this.state = seed > 0 ? seed : 1;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0xffffffff;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }
  int(lo: number, hi: number): number {
    return Math.floor(this.range(lo, hi + 1));
  }
  pickWeighted<T extends { weight: number }>(items: T[]): T {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it;
    }
    return items[items.length - 1]!;
  }
}

// ───────────────────────────────────────────────────────────────────
//  Context composer — mirrors sweep-contexts.ts composeUser()
// ───────────────────────────────────────────────────────────────────

function timeLabelFor(t: number): string {
  for (const b of TIMES) if (t >= b.range[0] && t <= b.range[1]) return b.label;
  return "midday";
}

function composeContext(
  id: string,
  stage: Stage,
  sex: Sex,
  ageDays: number,
  pad: { p: number; a: number; d: number },
  season: string,
  weather: string,
  t: number,
  location: string,
  partners: Array<{ stage: Stage; distance: "close" | "near" | "far"; description: string; ref: string }>,
  memoryHint: string | null,
): SweepContext {
  const lines: string[] = [];
  lines.push(`your body: ${stage}, ${sex}, ${ageDays} days`);
  lines.push(`valence ${pad.p.toFixed(2)}, arousal ${pad.a.toFixed(2)}, dominance ${pad.d.toFixed(2)}`);
  lines.push(`water: ${season}, ${weather}, ${timeLabelFor(t)}`);
  lines.push(`where: ${location}`);

  if (partners.length === 0) {
    lines.push("alone, no others visible");
  } else {
    lines.push("others:");
    for (const p of partners) {
      lines.push(`  ${p.distance}, ${p.stage}: ${p.description}`);
    }
  }
  if (memoryHint) lines.push(`known: ${memoryHint}`);

  return {
    id,
    label: `${stage} ${sex} ${season} ${timeLabelFor(t)} — ${location.split(",")[0]}`,
    system: SWEEP_SYSTEM_PROMPT,
    user: lines.join("\n"),
    pond_context: { season, weather, t_day: t, location, copresent_ids: partners.map((p) => p.ref) },
    koi_state:    { stage, sex, age_days: ageDays, pad },
    perception:   { near: partners, memory_hint: memoryHint },
  };
}

// ───────────────────────────────────────────────────────────────────
//  Per-stage age ranges
// ───────────────────────────────────────────────────────────────────

const AGE_DAYS_BY_STAGE: Record<Stage, [number, number]> = {
  fry:        [0, 3],
  juvenile:   [4, 8],
  adolescent: [9, 12],
  adult:      [13, 28],
  elder:      [29, 45],
  dying:      [30, 60],
};

// ───────────────────────────────────────────────────────────────────
//  Partner-config → partners[] with distance + descriptors
// ───────────────────────────────────────────────────────────────────

function materializePartners(
  rng: SeededRng,
  config: PartnerConfig,
): Array<{ stage: Stage; distance: "close" | "near" | "far"; description: string; ref: string }> {
  const out: Array<{ stage: Stage; distance: "close" | "near" | "far"; description: string; ref: string }> = [];
  const pick = (stage: Stage, dist: "close" | "near" | "far", idx: number) => ({
    stage,
    distance: dist,
    description: rng.pick(DESCRIPTORS_BY_STAGE[stage]),
    ref: `k_${idx}`,
  });

  switch (config.kind) {
    case "alone":
      return [];
    case "pair_close":
      out.push(pick(config.partnerStage, "close", 1));
      break;
    case "pair_distant":
      out.push(pick(config.partnerStage, "far", 1));
      break;
    case "triad":
      out.push(pick(config.stages[0], "close", 1));
      out.push(pick(config.stages[1], "near", 2));
      break;
    case "group":
      for (let i = 0; i < config.stages.length; i++) {
        const dist: "close" | "near" | "far" = i < 2 ? "close" : i < 4 ? "near" : "far";
        out.push(pick(config.stages[i]!, dist, i + 1));
      }
      break;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
//  Main generator
// ───────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  count: number;
  seed?: number;
}

export function generateSyntheticContexts(opts: GenerateOptions): SweepContext[] {
  const rng = new SeededRng(opts.seed ?? 42);
  const contexts: SweepContext[] = [];
  const seenIds = new Set<string>();

  let attempts = 0;
  const MAX_ATTEMPTS = opts.count * 10;

  while (contexts.length < opts.count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const stage = rng.pick(STAGES);
    const sex = rng.pick(SEXES);
    const rule = STAGE_RULES.find((r) => r.stage === stage)!;
    const cfgChoice = rng.pickWeighted(rule.configs);

    let config: PartnerConfig;
    switch (cfgChoice.kind) {
      case "alone":
        config = { kind: "alone" };
        break;
      case "pair_close":
        config = { kind: "pair_close", partnerStage: rng.pick(cfgChoice.partnerStages!) };
        break;
      case "pair_distant":
        config = { kind: "pair_distant", partnerStage: rng.pick(cfgChoice.partnerStages!) };
        break;
      case "triad":
        config = {
          kind: "triad",
          stages: [rng.pick(cfgChoice.partnerStages!), rng.pick(cfgChoice.partnerStages!)],
        };
        break;
      case "group": {
        const [gmin, gmax] = cfgChoice.groupSize ?? [3, 5];
        const size = rng.int(gmin, gmax);
        const stages: Stage[] = [];
        for (let i = 0; i < size; i++) stages.push(rng.pick(cfgChoice.partnerStages!));
        config = { kind: "group", stages };
        break;
      }
    }

    const season = rng.pick(SEASONS);
    const weather = rng.pick(WEATHERS);
    const time = TIMES[rng.int(0, TIMES.length - 1)]!;
    const t = rng.range(time.range[0], time.range[1]);
    const location = rng.pick(LOCATIONS);
    const moodBin = rng.pick(MOOD_BINS);
    const pad = {
      p: rng.range(moodBin.p[0], moodBin.p[1]),
      a: rng.range(moodBin.a[0], moodBin.a[1]),
      d: rng.range(moodBin.d[0], moodBin.d[1]),
    };
    const [ageMin, ageMax] = AGE_DAYS_BY_STAGE[stage];
    const ageDays = rng.int(ageMin, ageMax);

    const partners = materializePartners(rng, config);

    // 20% of contexts get a memory hint — gives the model something to react to
    const memoryHint = rng.next() < 0.2
      ? rng.pick([
          "known shape, warm days past",
          "familiar shape, faint",
          "many seasons with this one",
          "close body, known well",
          "the small shape, close often",
          "strange shape, never seen",
        ])
      : null;

    const id = `syn_${stage}_${config.kind}_${season}_${time.label.replace(" ", "")}_${contexts.length}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    contexts.push(composeContext(
      id, stage, sex, ageDays, pad,
      season, weather, t, location,
      partners, memoryHint,
    ));
  }

  return contexts;
}

// ───────────────────────────────────────────────────────────────────
//  Distribution report — for sanity-checking coverage before harvest
// ───────────────────────────────────────────────────────────────────

export function distributionReport(contexts: SweepContext[]): string {
  const count = <K extends string>(field: (c: SweepContext) => K): Record<K, number> => {
    const acc = {} as Record<K, number>;
    for (const c of contexts) {
      const k = field(c);
      acc[k] = (acc[k] ?? 0) + 1;
    }
    return acc;
  };

  const lines: string[] = [];
  lines.push(`total contexts: ${contexts.length}`);
  lines.push("");
  lines.push("by stage:");
  for (const [k, v] of Object.entries(count((c) => String(c.koi_state.stage)))) {
    lines.push(`  ${k.padEnd(12)} ${v}`);
  }
  lines.push("");
  lines.push("by season:");
  for (const [k, v] of Object.entries(count((c) => String(c.pond_context.season)))) {
    lines.push(`  ${k.padEnd(12)} ${v}`);
  }
  lines.push("");
  lines.push("by partners present:");
  const partnerCounts: Record<string, number> = {};
  for (const c of contexts) {
    const n = (c.perception.near as unknown[])?.length ?? 0;
    const bucket = n === 0 ? "alone" : n === 1 ? "pair" : n === 2 ? "triad" : "group";
    partnerCounts[bucket] = (partnerCounts[bucket] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(partnerCounts)) {
    lines.push(`  ${k.padEnd(12)} ${v}`);
  }
  return lines.join("\n");
}
