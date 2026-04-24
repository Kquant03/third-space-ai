// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — World clock (§ XI)
//  ─────────────────────────────────────────────────────────────────────────
//  t_day ∈ [0, 1): position within the current sim-day.
//    0.00   golden morning
//    0.20   high noon
//    0.45   amber dusk
//    0.60   blue hour
//    0.70   full night
//    0.85   pre-dawn
//    0.95   dawn → 1.00 rolls over to next day
//
//  A sim-day compresses ~45 real minutes, so at 2 Hz a day is 5400 ticks.
//  Seasons cycle every 7 sim-days: spring (0-7), summer (7-15),
//  autumn (15-23), winter (23-30 → rolls to spring at 30).
//
//  Weather is a low-frequency Markov chain over {clear, breeze, rain,
//  storm} with parameters chosen so storms are rare (<5% of ticks
//  averaged over a week). Clarity darkens under storms and recovers
//  slowly after.
//
//  Solstice: once per 7 sim-days at a fixed phase (t_day = 0.12 on
//  sim_day mod 7 == 6), the shaft falls through the roof-box for a
//  brief window. Bonded fish attend.
// ═══════════════════════════════════════════════════════════════════════════

import { SIM } from "./constants.js";
import { Rng } from "./rng.js";
import type { Season, Weather, WorldState } from "./types.js";

// ───────────────────────────────────────────────────────────────────
//  Time arithmetic
// ───────────────────────────────────────────────────────────────────

export const TICKS_PER_SIM_DAY = SIM.tickHz * SIM.realSecondsPerSimDay;

/** Derive (simDay, tDay) from absolute tick count since pond birth. */
export function clockFromTick(tick: number): { simDay: number; tDay: number } {
  const days = tick / TICKS_PER_SIM_DAY;
  const simDay = Math.floor(days);
  const tDay = days - simDay;
  return { simDay, tDay };
}

/** Season for a given sim-day, lifecycle-compressed (30-day cycle). */
export function seasonFor(simDay: number): Season {
  const phase = simDay % 30;
  if (phase < 7)  return "spring";
  if (phase < 15) return "summer";
  if (phase < 23) return "autumn";
  return "winter";
}

/** Shifted-sinusoid temperature in [0, 1] peaking in summer. */
export function temperatureFor(simDay: number, tDay: number): number {
  const yearFrac = ((simDay % 30) + tDay) / 30;
  // Peak around summer midpoint (~sim-day 11).
  const seasonal = 0.5 + 0.35 * Math.cos((yearFrac - 11 / 30) * 2 * Math.PI);
  // Diurnal: warmer at midday.
  const diurnal = 0.15 * Math.cos((tDay - 0.20) * 2 * Math.PI);
  return Math.max(0, Math.min(1, seasonal + diurnal));
}

// ───────────────────────────────────────────────────────────────────
//  Markov weather
//
//  Transitions happen at most once per sim-hour (~112 ticks). Rows sum
//  to 1. Diagonal is high so weather is persistent. Storms are rare
//  regardless of which cell we're in.
// ───────────────────────────────────────────────────────────────────

const WEATHER_TRANSITION: Record<Weather, Record<Weather, number>> = {
  clear:  { clear: 0.74, breeze: 0.22, rain: 0.035, storm: 0.005 },
  breeze: { clear: 0.30, breeze: 0.55, rain: 0.13,  storm: 0.02  },
  rain:   { clear: 0.06, breeze: 0.30, rain: 0.58,  storm: 0.06  },
  storm:  { clear: 0.02, breeze: 0.15, rain: 0.40,  storm: 0.43  },
};

const SIM_HOUR_TICKS = Math.floor(TICKS_PER_SIM_DAY / 24);

/** Roll for a weather transition. Returns a new weather or the same. */
export function rollWeather(current: Weather, rng: Rng): Weather {
  const row = WEATHER_TRANSITION[current];
  const u = rng.float();
  let cum = 0;
  for (const w of ["clear", "breeze", "rain", "storm"] as const) {
    cum += row[w];
    if (u < cum) return w;
  }
  return current;
}

// ───────────────────────────────────────────────────────────────────
//  Clarity — darkens under storms, recovers slowly
// ───────────────────────────────────────────────────────────────────

export function clarityStep(
  prevClarity: number, weather: Weather, dt: number,
): number {
  const target = weather === "storm" ? 0.25
               : weather === "rain"  ? 0.55
               : weather === "breeze" ? 0.85
               : 0.95;
  // Approach target with halftime 2 sim-hours.
  const halftime = 2 * 3600;
  const k = Math.pow(0.5, dt / halftime);
  return prevClarity + (target - prevClarity) * (1 - k);
}

// ───────────────────────────────────────────────────────────────────
//  Solstice
//
//  Fires briefly once every 7 sim-days at t_day = 0.12 (golden morning
//  when the shaft comes through the roof-box). Window is ~2 sim-minutes.
// ───────────────────────────────────────────────────────────────────

const SOLSTICE_TDAY_CENTER = 0.12;
const SOLSTICE_TDAY_HALFWIDTH = 0.003;  // ~2 sim-minutes window
const SOLSTICE_DAY_MOD = 6;             // every 7 days, on day index 6

/** Is the solstice active at (simDay, tDay)? */
export function isSolsticeActive(simDay: number, tDay: number): boolean {
  if (simDay % 7 !== SOLSTICE_DAY_MOD) return false;
  return Math.abs(tDay - SOLSTICE_TDAY_CENTER) < SOLSTICE_TDAY_HALFWIDTH;
}

/** Next tick at which solstice becomes active. */
export function nextSolsticeTick(fromTick: number): number {
  const { simDay, tDay } = clockFromTick(fromTick);
  const startTDay = SOLSTICE_TDAY_CENTER - SOLSTICE_TDAY_HALFWIDTH;
  // How many days until the next SOLSTICE_DAY_MOD?
  let daysAhead = (SOLSTICE_DAY_MOD - (simDay % 7) + 7) % 7;
  if (daysAhead === 0 && tDay >= SOLSTICE_TDAY_CENTER + SOLSTICE_TDAY_HALFWIDTH) {
    daysAhead = 7;
  }
  const targetDay = simDay + daysAhead;
  const targetTick = (targetDay + startTDay) * TICKS_PER_SIM_DAY;
  return Math.floor(targetTick);
}

// ───────────────────────────────────────────────────────────────────
//  Advance world by one tick
// ───────────────────────────────────────────────────────────────────

export function advanceWorld(
  prev: WorldState,
  newTick: number,
  rng: Rng,
): { world: WorldState; transitions: WorldTransition[] } {
  const { simDay, tDay } = clockFromTick(newTick);
  const prevSimDay = Math.floor(
    prev.simDay + prev.tDay + (0 /* exact prev */),
  );
  const season = seasonFor(simDay);
  const transitions: WorldTransition[] = [];

  // Roll weather once per sim-hour.
  let weather = prev.weather;
  if (newTick % SIM_HOUR_TICKS === 0) {
    const next = rollWeather(weather, rng);
    if (next !== weather) {
      transitions.push({ kind: "weather_changed", from: weather, to: next });
      weather = next;
    }
  }

  // Season transition?
  if (season !== prev.season) {
    transitions.push({ kind: "season_changed", from: prev.season, to: season });
  }

  // Day rollover?
  if (simDay !== prev.simDay) {
    transitions.push({ kind: "day_advanced", from: prev.simDay, to: simDay });
  }
  void prevSimDay;

  const dt = SIM.tickIntervalMs / 1000;
  const clarity = clarityStep(prev.clarity, weather, dt);
  const temperature = temperatureFor(simDay, tDay);

  const solsticeActive = isSolsticeActive(simDay, tDay);
  if (solsticeActive && !prev.solsticeActive) {
    transitions.push({ kind: "solstice_began" });
  } else if (!solsticeActive && prev.solsticeActive) {
    transitions.push({ kind: "solstice_ended" });
  }

  const next: WorldState = {
    tDay,
    simDay,
    season,
    weather,
    clarity,
    temperature,
    solsticeActive,
    nextSolsticeTick: solsticeActive
      ? prev.nextSolsticeTick
      : nextSolsticeTick(newTick),
  };

  return { world: next, transitions };
}

export type WorldTransition =
  | { kind: "day_advanced"; from: number; to: number }
  | { kind: "season_changed"; from: Season; to: Season }
  | { kind: "weather_changed"; from: Weather; to: Weather }
  | { kind: "solstice_began" }
  | { kind: "solstice_ended" };

// ───────────────────────────────────────────────────────────────────
//  Fresh world at pond birth
// ───────────────────────────────────────────────────────────────────

export function initialWorld(bornAtTick: number): WorldState {
  const { simDay, tDay } = clockFromTick(bornAtTick);
  return {
    tDay,
    simDay,
    season: seasonFor(simDay),
    weather: "clear",
    clarity: 0.92,
    temperature: temperatureFor(simDay, tDay),
    solsticeActive: isSolsticeActive(simDay, tDay),
    nextSolsticeTick: nextSolsticeTick(bornAtTick),
  };
}

// ───────────────────────────────────────────────────────────────────
//  Qualitative descriptors — used by the meditation-mode intent picker
//  and by the prompt composer when cognition is online
// ───────────────────────────────────────────────────────────────────

export type DayMoment =
  | "golden_morning" | "high_noon" | "amber_dusk" | "blue_hour"
  | "full_night"     | "pre_dawn"  | "dawn";

export function dayMoment(tDay: number): DayMoment {
  if (tDay < 0.12) return "golden_morning";
  if (tDay < 0.36) return "high_noon";
  if (tDay < 0.52) return "amber_dusk";
  if (tDay < 0.62) return "blue_hour";
  if (tDay < 0.80) return "full_night";
  if (tDay < 0.92) return "pre_dawn";
  return "dawn";
}

/** Storm stress in [0, 1] — passed to death probability and meditation. */
export function stormStress(weather: Weather): number {
  return weather === "storm" ? 1.0
       : weather === "rain"  ? 0.3
       : weather === "breeze" ? 0.05
       : 0.0;
}
