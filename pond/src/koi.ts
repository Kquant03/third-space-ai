// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Koi lifecycle
//  ─────────────────────────────────────────────────────────────────────────
//  Creation, stage advancement, death.
//
//  Life stages advance monotonically through the table in § VII. Age is
//  tracked in ticks, and at each tick-boundary we check whether the fish
//  has crossed into the next stage. The 'dying' stage is terminal: once
//  entered, the fish can only die (or — rarely — hold on past 30 days,
//  in which case we just keep it there until it goes).
//
//  Variance on lifespan: draw a lifespanDays ~ N(30, 1.8²) at hatch. Fish
//  with rich bond history at weekly deep-sleep time may have their
//  lifespan extended (§ VII) — wired when memory comes online. For now,
//  the N(30, 1.8²) draw is what sets death.
// ═══════════════════════════════════════════════════════════════════════════

import { HUNGER, LIFE, SIM } from "./constants.js";
import { baselineFor } from "./affect.js";
import { SIZE_BY_STAGE, randomSpawn } from "./kinematics.js";
import { Rng } from "./rng.js";
import type {
  KoiColor, KoiId, KoiState, LifeStage, SimTick,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Stage derivation
// ───────────────────────────────────────────────────────────────────

/** Derive the stage for a given age in sim-days. */
export function stageAtSimDay(day: number): LifeStage {
  if (day < LIFE.stages.fry.min)         return "egg";
  if (day < LIFE.stages.juvenile.min)    return "fry";
  if (day < LIFE.stages.adolescent.min)  return "juvenile";
  if (day < LIFE.stages.adult.min)       return "adolescent";
  if (day < LIFE.stages.elder.min)       return "adult";
  if (day < LIFE.stages.dying.min)       return "elder";
  return "dying";
}

/** Derive sim-days from ageTicks. */
export function ageSimDays(ageTicks: SimTick): number {
  return (ageTicks / SIM.tickHz) / SIM.realSecondsPerSimDay;
}

/** Convenience: stage at current age. */
export function currentStage(ageTicks: SimTick): LifeStage {
  return stageAtSimDay(ageSimDays(ageTicks));
}

// ───────────────────────────────────────────────────────────────────
//  Creation
// ───────────────────────────────────────────────────────────────────

export interface CreateKoiInit {
  id: KoiId;
  name: string;
  ageTicks: SimTick;          // usually 0 for a new hatch
  hatchedAtTick: SimTick;
  legendary: boolean;
  color: KoiColor;
  /** Biological sex. Assigned at egg creation via the rng coin-flip
   *  (50/50 unless environmentally influenced, which we do not model).
   *  Required — no default, because a sexless koi cannot participate
   *  in the reproduction gate and we want that to be impossible to
   *  forget. */
  sex: "female" | "male";
  /** Optional spawn override. Defaults to randomSpawn on the shelf. */
  spawn?: { x: number; y: number; z: number; h: number };
}

export function createKoi(init: CreateKoiInit, rng: Rng): KoiState {
  const stage = currentStage(init.ageTicks);
  const spawn = init.spawn ?? randomSpawn(() => rng.float());
  const pad = baselineFor(stage);

  return {
    id: init.id,
    name: init.name,
    stage,
    sex: init.sex,
    ageTicks: init.ageTicks,
    hatchedAtTick: init.hatchedAtTick,
    legendary: init.legendary,
    color: init.color,
    x: spawn.x, y: spawn.y, z: spawn.z,
    vx: 0, vz: 0,
    h: spawn.h,
    size: SIZE_BY_STAGE[stage],
    pad,
    hunger: HUNGER.initial,
    intent: { kind: "swim", atTick: init.hatchedAtTick },
    nextCognitionTick: init.hatchedAtTick + 60, // ~30 s after hatch
    lastTwilightTick: 0,
    lastDeepSleepTick: 0,
    microImportanceAccum: 0,
    drawnTo: null,
    lastUtterance: null,
    lastUtteranceTick: 0,
    lastSpawningTick: 0,
    recentHeadings: [],
    tagState: null,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Stage advancement — called on every tick, cheap no-op when the
//  stage hasn't changed. Returns the new stage when a transition
//  happens (so the caller can emit a koi_stage_advanced event and
//  adjust size + baseline PAD).
// ───────────────────────────────────────────────────────────────────

export function advanceStage(k: KoiState): LifeStage | null {
  const next = currentStage(k.ageTicks);
  if (next === k.stage) return null;
  k.stage = next;
  k.size = SIZE_BY_STAGE[next];
  // PAD nudges toward new baseline but keeps any recent deviation.
  const b = baselineFor(next);
  k.pad = {
    p: (k.pad.p + b.p) / 2,
    a: (k.pad.a + b.a) / 2,
    d: (k.pad.d + b.d) / 2,
  };
  return next;
}

// ───────────────────────────────────────────────────────────────────
//  Death
//
//  Death probability per tick is computed from:
//    - age vs. lifespanDays (draw-at-hatch; stable for this fish)
//    - current PAD (very low pleasure → slight elevation)
//    - current weather (storm contributes a tiny elevation)
//    - fry mortality bump (§ VII — "crushing predation mortality"
//      on fry after yolk absorption). Small but real: a meaningful
//      fraction of fry do not reach adolescence.
//
//  Variance is intentional. Some fish go at 28, some at 32. A fish
//  that dies at 38 is rare enough to matter. (§ VII)
// ───────────────────────────────────────────────────────────────────

export interface LifespanDraw {
  /** Days at which this koi's mortality curve peaks. */
  lifespanDays: number;
  /** How spread the mortality curve is. */
  scaleDays: number;
}

export function drawLifespan(rng: Rng): LifespanDraw {
  const days = 30 + rng.normal() * LIFE.longTailDeathStdDevDays;
  return {
    // Clamp widened from [20, 42] to [22, 48] (April 2026 tuning with
    // stddev 2.4). The upper bound allows rare outliers — a fish at
    // 46-48 sim-days would be deeply memorable. The lower bound at 22
    // is just past the elder boundary, so a short-lived fish still
    // reaches elderhood briefly rather than skipping it.
    lifespanDays: Math.max(22, Math.min(48, days)),
    scaleDays: 1.6,
  };
}

/**
 * Compute the per-tick death probability for a koi. Non-dying fish are
 * effectively immortal unless (a) an acute cause elevates the
 * probability directly, (b) the fish is in the fry stage — fry face
 * predation mortality worth about 2% cumulative through the stage,
 * or (c) the fish's hunger has exceeded the starvation threshold.
 */
export function deathProbabilityPerTick(
  k: KoiState,
  lifespan: LifespanDraw,
  stormStress: number,   // 0..1
): number {
  const ticksPerDay = SIM.tickHz * SIM.realSecondsPerSimDay;

  // Starvation term — applies to any fish past egg, at any stage.
  // Scales linearly from 0 at the starvation threshold to the max
  // per-tick probability at hunger = 1.0.
  let starvation = 0;
  if (k.stage !== "egg" && k.hunger > HUNGER.starvationThreshold) {
    const t = Math.min(
      1,
      (k.hunger - HUNGER.starvationThreshold) /
      (1 - HUNGER.starvationThreshold),
    );
    starvation = HUNGER.starvationMaxPDeathPerTick * t;
  }

  // Fry mortality — small constant rate across the ~1 sim-day fry stage.
  // Plus starvation if applicable.
  if (k.stage === "fry") {
    return (0.02 / ticksPerDay) + starvation;
  }

  // Non-dying, non-fry koi: starvation is the only path to death.
  if (k.stage !== "dying") return starvation;

  // Dying-stage death probability curve.
  const d = ageSimDays(k.ageTicks);
  const x = (d - lifespan.lifespanDays) / lifespan.scaleDays;
  const dailyPDeath = 1 / (1 + Math.exp(-x));

  const valenceBoost = k.pad.p < -0.3 ? 1.15 : 1.0;
  const stormBoost = 1.0 + stormStress * 0.25;

  return (dailyPDeath / ticksPerDay) * valenceBoost * stormBoost + starvation;
}

/**
 * Advance hunger for one koi by `dt` sim-seconds. Called every tick
 * from alarmBody. Stage-dependent rise rate (fry burn fastest, elders
 * slowest, eggs and dying do not rise). Hunger is clamped to [0, 1].
 *
 * Food consumption reduces hunger elsewhere (nutrition.ts, once wired).
 * For now, without any food source, fish will rise to starvation and
 * begin dying — which is exactly what we want to observe in this
 * commit before wiring ambient food in the next.
 */
export function stepHunger(k: KoiState, dtSimSec: number): void {
  const rate = HUNGER.risePerSimSec[k.stage] ?? 0;
  if (rate <= 0) return;
  k.hunger = Math.max(0, Math.min(1, k.hunger + rate * dtSimSec));
}

// ───────────────────────────────────────────────────────────────────
//  Egg constructor — used by reproduction.fireSpawning()
// ───────────────────────────────────────────────────────────────────

export function createEgg(init: {
  id: KoiId;
  parentAId: KoiId;
  parentBId: KoiId;
  x: number; y: number; z: number;
  legendary: boolean;
  color: KoiColor;
  atTick: SimTick;
  /** Biological sex of this egg. Assigned by the caller (fireSpawning)
   *  from the rng coin-flip at egg placement. 50/50 independent of
   *  parent sex combination — koi are gonochoristic, not XY-mammalian,
   *  but we approximate sex determination as random per fertilization. */
  sex: "female" | "male";
}, rng: Rng): KoiState {
  void rng;
  const pad = baselineFor("egg");
  return {
    id: init.id,
    name: placeholderEggName(init.id),
    stage: "egg",
    sex: init.sex,
    ageTicks: 0,
    hatchedAtTick: init.atTick,
    legendary: init.legendary,
    color: init.color,
    x: init.x, y: init.y, z: init.z,
    vx: 0, vz: 0,
    h: 0,
    size: SIZE_BY_STAGE["egg"],
    pad,
    hunger: 0,   // eggs do not hunger
    intent: { kind: "rest", atTick: init.atTick },
    nextCognitionTick: Number.MAX_SAFE_INTEGER,   // eggs never cognize
    lastTwilightTick: 0,
    lastDeepSleepTick: 0,
    microImportanceAccum: 0,
    drawnTo: null,
    lastUtterance: null,
    lastUtteranceTick: 0,
    lastSpawningTick: 0,
    recentHeadings: [],
    tagState: null,
  };
}

/** Placeholder until first-hour observations are collected at fry stage. */
function placeholderEggName(eggId: KoiId): string {
  const tail = eggId.slice(-4);
  return `Egg-${tail}`;
}

/** Heuristic: returns true if this name is still the hatch placeholder,
 *  meaning we should re-run composeName once observations are in. */
export function isUnnamed(name: string): boolean {
  return name.startsWith("Egg-") || name.startsWith("Fry-Newborn-");
}

// ───────────────────────────────────────────────────────────────────
//  Initial cohort seeding
//
//  When the DO is first constructed, there are zero koi. The pond is
//  created with a deterministic initial cohort so the first visitor
//  sees a populated pond rather than empty water. The manifesto says
//  steady state is 5-6 koi, so we seed 5 of mixed stages.
//
//  Deterministic seeding matters for research hygiene — a fresh DO
//  produces the same starting cohort every time (§ XV).
// ───────────────────────────────────────────────────────────────────

const COLOR_ROTATION: KoiColor[] = [
  "kohaku", "shusui", "ogon", "asagi", "tancho", "utsuri", "bekko",
];

/** Seed a brand-new pond with 5 koi. Returns ready-to-persist KoiState.
 *
 *  Sex assignment: 3 female, 2 male. Distributed so at least one
 *  pairing of any stage is viable. Deterministic — the seed cohort
 *  is identical across restarts.
 *
 *  Age distribution: [14, 10, 6, 3, 1] sim-days. Spans late-adolescent
 *  to fresh fry. This gives the pond generational texture from day one
 *  (fry, juvenile, adolescent, adult, late-adult all present) while
 *  reserving 16+ sim-days of remaining life for every fish. No seed
 *  fish starts within striking distance of the dying stage — the
 *  earlier distribution [18, 14, 9, 4, 2] caused a cohort die-off
 *  cascade visible in April 2026 debug sessions. */
export function seedInitialCohort(tick: SimTick, rng: Rng): KoiState[] {
  // Target ages in sim-days so the pond has a mix of stages with runway.
  const AGES_DAYS = [14, 10, 6, 3, 1];
  const NAMES = [
    "Kishi",              // late-adult, quiet veteran
    "The One Who Waits",  // adult with patience
    "Bronze-Fin",         // adolescent
    "Reed-Follower",      // juvenile
    "Third-of-Five",      // fry
  ];
  // Seed cohort sex assignment. Distributed so any cross-stage pairing
  // has at least one viable sex combination when both reach adulthood.
  // 3F (indices 0, 2, 4) / 2M (indices 1, 3).
  const SEX: Array<"female" | "male"> =
    ["female", "male", "female", "male", "female"];

  const out: KoiState[] = [];
  for (let i = 0; i < AGES_DAYS.length; i++) {
    const day = AGES_DAYS[i]!;
    const ageTicks = Math.floor(day * SIM.realSecondsPerSimDay * SIM.tickHz);
    const id = `koi_${String(i).padStart(2, "0")}_seed`;
    const color = COLOR_ROTATION[i % COLOR_ROTATION.length]!;
    const legendary = rng.chance(LIFE.legendaryRate);
    const hatchedAt = tick - ageTicks;
    out.push(createKoi({
      id, name: NAMES[i]!, ageTicks,
      hatchedAtTick: hatchedAt,
      legendary, color,
      sex: SEX[i]!,
    }, rng));
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
//  Wire conversion — KoiState → KoiFrame (what goes on the WS)
// ───────────────────────────────────────────────────────────────────

import type { KoiFrame } from "./protocol.js";

export function toFrame(k: KoiState): KoiFrame {
  return {
    id: k.id,
    name: k.name,
    stage: k.stage,
    x: k.x, y: k.y, z: k.z,
    h: k.h,
    s: k.size,
    c: k.color,
    m: { v: k.pad.p, a: k.pad.a },
    hu: k.hunger,
    i: k.intent.kind,
    t: k.intent.targetId ?? null,
    mech: k.intent.mechanism,
  };
}
