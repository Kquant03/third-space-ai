import { describe, it, expect } from "vitest";
import {
  clockFromTick, seasonFor, isSolsticeActive, nextSolsticeTick,
  advanceWorld, initialWorld, dayMoment, TICKS_PER_SIM_DAY,
} from "../src/world.js";
import { Rng } from "../src/rng.js";

describe("world clock", () => {
  it("derives (simDay, tDay) correctly", () => {
    const c1 = clockFromTick(0);
    expect(c1.simDay).toBe(0);
    expect(c1.tDay).toBeCloseTo(0);

    const c2 = clockFromTick(TICKS_PER_SIM_DAY);
    expect(c2.simDay).toBe(1);
    expect(c2.tDay).toBeCloseTo(0);

    const c3 = clockFromTick(Math.floor(TICKS_PER_SIM_DAY * 2.5));
    expect(c3.simDay).toBe(2);
    expect(c3.tDay).toBeCloseTo(0.5, 2);
  });

  it("cycles through four seasons in 30 sim-days", () => {
    expect(seasonFor(0)).toBe("spring");
    expect(seasonFor(7)).toBe("summer");
    expect(seasonFor(15)).toBe("autumn");
    expect(seasonFor(23)).toBe("winter");
    // rolls over
    expect(seasonFor(30)).toBe("spring");
    expect(seasonFor(37)).toBe("summer");
  });

  it("fires the solstice exactly once per 7 sim-days", () => {
    let activations = 0;
    let prev = false;
    for (let d = 0; d < 14; d++) {
      for (let i = 0; i < 5400 * 2; i++) {
        const tick = Math.floor(d * TICKS_PER_SIM_DAY + i);
        const now = isSolsticeActive(d, tick / TICKS_PER_SIM_DAY - d);
        if (now && !prev) activations++;
        prev = now;
      }
    }
    // 14 sim-days → exactly 2 solstice activations
    expect(activations).toBe(2);
  });

  it("nextSolsticeTick looks forward, never backward", () => {
    for (let t = 0; t < TICKS_PER_SIM_DAY * 7; t += 1000) {
      const nxt = nextSolsticeTick(t);
      expect(nxt).toBeGreaterThanOrEqual(t);
    }
  });

  it("advanceWorld evolves monotonically in tick", () => {
    const rng = new Rng(42);
    let w = initialWorld(0);
    let lastDay = w.simDay;
    for (let t = 1; t < 2000; t++) {
      const next = advanceWorld(w, t, rng);
      w = next.world;
      expect(w.simDay).toBeGreaterThanOrEqual(lastDay);
      lastDay = w.simDay;
      // Weather is always one of the four valid values
      expect(["clear", "breeze", "rain", "storm"]).toContain(w.weather);
      expect(w.clarity).toBeGreaterThanOrEqual(0);
      expect(w.clarity).toBeLessThanOrEqual(1);
    }
  });

  it("classifies the day's moment across [0, 1)", () => {
    expect(dayMoment(0.0)).toBe("golden_morning");
    expect(dayMoment(0.3)).toBe("high_noon");
    expect(dayMoment(0.5)).toBe("amber_dusk");
    expect(dayMoment(0.7)).toBe("full_night");
    expect(dayMoment(0.95)).toBe("dawn");
  });
});
