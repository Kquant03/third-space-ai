// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Nutrition
//  ─────────────────────────────────────────────────────────────────────────
//  The pond produces its own food. Koi eat it. That's commit 3 in one line.
//
//  Three ambient food kinds rotate through seasons and time of day:
//
//    - Pollen: spring only, surface, drifts on the curl-noise field.
//      Clusters near the basins where the wind would pool pollen.
//      Low nutrition, long decay, frequent spawn.
//
//    - Algae: all seasons, shelf floor, stationary. Moderate nutrition,
//      longest decay. The reliable background food supply.
//
//    - Insects: summer/autumn only, dawn and dusk windows. Spawn at
//      surface, skitter randomly. High nutrition, short decay. The
//      Twice-a-sim-day highlight.
//
//  Visitor pellets (commit 4) are a fourth kind handled by the WS route,
//  not by this file's ambient spawner.
//
//  This module is deliberately small and pure. Given hot state + a tick,
//  it returns the updates needed and a list of events worth emitting.
//  The DO's alarm handler glues consumption events into its event stream
//  and PAD appraisal pipeline.
// ═══════════════════════════════════════════════════════════════════════════

import { FOOD, HUNGER, SIM, samplePointInPond, samplePointOnShelf, pondSDF, clampToPond } from "./constants.js";
import { Rng } from "./rng.js";
import type { FoodItem, FoodKind, KoiState, PondHotState, SimTick, Season } from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  ID generation — stable, sortable, unique per pond
// ───────────────────────────────────────────────────────────────────

let foodIdCounter = 0;
function nextFoodId(tick: SimTick, kind: FoodKind): string {
  foodIdCounter = (foodIdCounter + 1) & 0xfffff;
  return `f_${kind[0]}_${tick}_${foodIdCounter.toString(36)}`;
}

// ───────────────────────────────────────────────────────────────────
//  Time-of-day helpers
//
//  The manifesto's tDay is [0, 1) across a sim-day. Dawn ≈ 0.10-0.22,
//  dusk ≈ 0.80-0.92 (matches § XI's seven-moment diurnal palette).
// ───────────────────────────────────────────────────────────────────

function isDawnOrDusk(tDay: number): boolean {
  return (tDay >= 0.10 && tDay <= 0.22) ||
         (tDay >= 0.80 && tDay <= 0.92);
}

function isInsectSeason(season: Season): boolean {
  return season === "summer" || season === "autumn";
}

// ───────────────────────────────────────────────────────────────────
//  Spawn — ambient food
//
//  Each tick, for each food kind whose conditions match, we roll a
//  coin at rate pPerTick. If it lands, we create one food item.
//
//  Capped at FOOD.maxConcurrent total items — if the pond is already
//  saturated (no fish eating), we skip spawn until consumption catches up.
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
//  Spawn nodes — fixed coral/plant positions on the substrate that
//  periodically release food. LoL-jungle-camp pattern: each node has
//  a respawn period and a phase offset so spawns stagger across the
//  pond rather than firing all at once. At 2Hz, period 60 = 30 sim
//  seconds between insects per node; with 5 nodes phase-offset by 12
//  ticks, the pond always has fresh food appearing somewhere.
//
//  Positions chosen to spread across the gourd's two basins and the
//  narrow waist between them, so wherever a hungry koi happens to
//  be, there's usually a node within a short swim. Post-hackathon
//  visual treatment will render coral/plants at these same positions.
// ───────────────────────────────────────────────────────────────────

const FOOD_SPAWN_NODES: ReadonlyArray<{
  x: number; z: number; periodTicks: number; phaseTicks: number;
}> = [
  { x: -1.2, z: -0.5, periodTicks: 60, phaseTicks:  0 },
  { x:  1.4, z: -0.3, periodTicks: 60, phaseTicks: 12 },
  { x: -0.8, z:  1.0, periodTicks: 60, phaseTicks: 24 },
  { x:  1.1, z:  0.8, periodTicks: 60, phaseTicks: 36 },
  { x:  0.0, z: -1.2, periodTicks: 60, phaseTicks: 48 },
];

function spawnAmbient(
  hot: PondHotState, newTick: SimTick, rng: Rng,
): FoodItem[] {
  if (hot.food.length >= FOOD.maxConcurrent) return [];
  const out: FoodItem[] = [];
  const ticksPerSec = SIM.tickHz;

  // Walk each spawn node — if its phase aligns with this tick AND
  // global cap permits, emerge one insect. The fixed positions read
  // visually as food "coming from the substrate," matching the
  // post-hackathon coral/plant rendering plan.
  for (const node of FOOD_SPAWN_NODES) {
    if ((newTick - node.phaseTicks) % node.periodTicks !== 0) continue;
    if (hot.food.length + out.length >= FOOD.maxConcurrent) break;
    out.push({
      id: nextFoodId(newTick, "insect"),
      kind: "insect",
      x: node.x, y: FOOD.insect.y, z: node.z,
      spawnedAtTick: newTick,
      decayAtTick: newTick + Math.floor(FOOD.insect.decaySec * ticksPerSec),
      nutrition: FOOD.insect.nutrition,
      // Mild scatter — insect emerges and skitters a little
      vx: (rng.float() - 0.5) * 0.06,
      vz: (rng.float() - 0.5) * 0.06,
    });
  }

  return out;
}

// ───────────────────────────────────────────────────────────────────
//  Drift — moves drifting food on the surface per tick
//
//  Surface food (pollen, insects) integrates a simple Euler step of
//  its own drift velocity. We clamp to gourd interior with a margin
//  so food doesn't escape onto land. Drifting food slowly decelerates
//  so it eventually comes to rest — otherwise insects would ping-pong
//  the walls forever.
// ───────────────────────────────────────────────────────────────────

function driftFood(food: FoodItem, dt: number): void {
  if (food.vx === undefined || food.vz === undefined) return;
  // Damping so drift decays over ~10s
  food.vx *= 0.98;
  food.vz *= 0.98;
  const nx = food.x + food.vx * dt;
  const nz = food.z + food.vz * dt;
  // Clamp into gourd — if drift would push food outside, bounce velocity
  if (pondSDF(nx, nz) > -0.05) {
    food.vx *= -0.5;
    food.vz *= -0.5;
    return;
  }
  food.x = nx;
  food.z = nz;
}

// ───────────────────────────────────────────────────────────────────
//  Consumption — check each food against each fish
//
//  O(N_koi × N_food). Both sides are small (<10 koi, <30 food) so the
//  nested loop is cheap. First koi to touch a food item claims it;
//  food is removed, koi's hunger drops, koi's PAD nudges positive.
//
//  Returns a list of consumption events for the DO to turn into:
//    - event log entries (type: "interaction", subtype: "food_eaten")
//    - an optional ambient broadcast so the client can render a soft
//      ripple at the consumption point
// ───────────────────────────────────────────────────────────────────

export interface FoodConsumption {
  foodId: string;
  foodKind: FoodKind;
  koiId: string;
  koiName: string;
  nutrition: number;
  x: number;
  z: number;
  atTick: SimTick;
}

function checkConsumption(
  hot: PondHotState, newTick: SimTick,
): FoodConsumption[] {
  const consumed: FoodConsumption[] = [];
  const r2 = FOOD.consumptionRadius * FOOD.consumptionRadius;

  // Iterate food, find the nearest eligible fish for each one.
  // Sort food indexes descending so we can splice safely.
  const indexesToRemove: number[] = [];
  for (let i = 0; i < hot.food.length; i++) {
    const f = hot.food[i]!;
    // Find closest koi within radius that is hungry enough to eat
    // (hunger > 0 — sated fish ignore food, preserving it for others).
    let best: KoiState | null = null;
    let bestD2 = r2;
    for (const k of hot.koi) {
      if (k.stage === "egg" || k.stage === "dying") continue;
      if (k.hunger <= 0.01) continue;   // basically full, skip
      const dx = k.x - f.x;
      const dz = k.z - f.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { best = k; bestD2 = d2; }
    }
    if (best) {
      // Consume.
      best.hunger = Math.max(0, best.hunger - f.nutrition);
      // Small positive PAD nudge — finding food is a minor relief.
      best.pad.p = Math.max(-1, Math.min(1, best.pad.p + 0.08));
      best.pad.a = Math.max(0, Math.min(1, best.pad.a - 0.04));
      consumed.push({
        foodId: f.id,
        foodKind: f.kind,
        koiId: best.id,
        koiName: best.name,
        nutrition: f.nutrition,
        x: f.x, z: f.z,
        atTick: newTick,
      });
      indexesToRemove.push(i);
    }
  }

  // Splice in reverse so indexes stay valid.
  for (let j = indexesToRemove.length - 1; j >= 0; j--) {
    hot.food.splice(indexesToRemove[j]!, 1);
  }

  return consumed;
}

// ───────────────────────────────────────────────────────────────────
//  Decay — remove food whose time has come
// ───────────────────────────────────────────────────────────────────

function expireFood(hot: PondHotState, newTick: SimTick): void {
  hot.food = hot.food.filter((f) => f.decayAtTick > newTick);
}

// ───────────────────────────────────────────────────────────────────
//  stepNutrition — the single entry point the DO's alarm calls
//
//  Order:
//    1. Decay expired food (clean up before spawning, so maxConcurrent
//       reflects reality).
//    2. Drift surface food (pollen, insects drift on the current).
//    3. Spawn new ambient food if conditions permit and cap allows.
//    4. Check consumption (koi-food proximity → eat).
// ───────────────────────────────────────────────────────────────────

export function stepNutrition(
  hot: PondHotState,
  newTick: SimTick,
  rng: Rng,
  dt: number,
): FoodConsumption[] {
  expireFood(hot, newTick);
  for (const f of hot.food) driftFood(f, dt);
  const spawned = spawnAmbient(hot, newTick, rng);
  for (const f of spawned) hot.food.push(f);
  return checkConsumption(hot, newTick);
}

// ───────────────────────────────────────────────────────────────────
//  nearestFood — used by intent-pull and meditation
//
//  Returns the closest food item to `self`, or null. Optional hungerMin
//  means we only consider food if the fish is hungry enough to care.
// ───────────────────────────────────────────────────────────────────

export function nearestFood(
  self: KoiState,
  food: readonly FoodItem[],
  maxDist: number = 8.0,
): FoodItem | null {
  if (self.hunger <= 0.05) return null;
  let best: FoodItem | null = null;
  let bestD2 = maxDist * maxDist;
  for (const f of food) {
    const dx = f.x - self.x;
    const dz = f.z - self.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) { best = f; bestD2 = d2; }
  }
  return best;
}

// ───────────────────────────────────────────────────────────────────
//  makeVisitorPellet — used by the WS route in commit 4
//
//  Creates a visitor pellet at the given pond-XZ. Clamps to inside
//  the gourd so rogue clicks don't drop pellets on land.
// ───────────────────────────────────────────────────────────────────

export function makeVisitorPellet(
  x: number, z: number, newTick: SimTick,
): FoodItem {
  const clamped = clampToPond(x, z, 0.15);
  const ticksPerSec = SIM.tickHz;
  // Hash for id uniqueness without needing rng state threading
  const idSuffix = (Math.floor(Math.random() * 0xfffff)).toString(36);
  return {
    id: `p_${newTick}_${idSuffix}`,
    kind: "pellet",
    x: clamped.x,
    y: FOOD.pellet.y,
    z: clamped.z,
    spawnedAtTick: newTick,
    decayAtTick: newTick + Math.floor(FOOD.pellet.decaySec * ticksPerSec),
    nutrition: FOOD.pellet.nutrition,
  };
}

// void HUNGER to note we import HUNGER transitively for future use
void HUNGER;
