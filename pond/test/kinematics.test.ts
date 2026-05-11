import { describe, it, expect } from "vitest";
import { stepKoi, randomSpawn } from "../src/kinematics.js";
import { POND, SIM } from "../src/constants.js";
import { Rng } from "../src/rng.js";
import { createKoi } from "../src/koi.js";

function fresh(id: string, x: number, z: number) {
  const k = createKoi({
    id,
    name: id,
    ageTicks: 20_000,   // adult
    hatchedAtTick: 0,
    legendary: false,
    color: "kohaku",
    sex: "female",
    spawn: { x, y: -1.2, z, h: 0 },
  }, new Rng(42 + id.charCodeAt(0)));
  return k;
}

describe("kinematics", () => {
  it("keeps fish within the pond over 10 minutes", () => {
    const rng = new Rng(7);
    const fish = Array.from({ length: 5 }, (_, i) => {
      const s = randomSpawn(() => rng.float());
      return fresh(`k${i}`, s.x, s.z);
    });

    const totalTicks = 10 * 60 * SIM.tickHz; // 10 minutes at 2 Hz = 1200
    for (let t = 0; t < totalTicks; t++) {
      const simTime = t / SIM.tickHz;
      for (const f of fish) stepKoi(f, fish, simTime);
      // Invariant: every fish stays in the pond radius
      for (const f of fish) {
        const r = Math.hypot(f.x, f.z);
        expect(r).toBeLessThanOrEqual(POND.radius + 1e-3);
        expect(f.y).toBeLessThanOrEqual(-0.05);
        expect(f.y).toBeGreaterThanOrEqual(-POND.maxDepth - 0.01);
      }
    }
  });

  it("is deterministic given identical inputs", () => {
    const run = () => {
      const fish = [
        fresh("a", 1, 0),
        fresh("b", -1, 0),
      ];
      for (let t = 0; t < 200; t++) {
        for (const f of fish) stepKoi(f, fish, t / SIM.tickHz);
      }
      return fish.map((f) => [f.x, f.y, f.z, f.h]);
    };
    expect(run()).toEqual(run());
  });

  it("eggs do not drift", () => {
    const egg = createKoi({
      id: "egg1", name: "egg1",
      ageTicks: 0, hatchedAtTick: 0,
      legendary: false, color: "kohaku",
      sex: "male",
      spawn: { x: 3, y: -0.4, z: 0, h: 0 },
    }, new Rng(1));
    const start = { x: egg.x, z: egg.z };
    for (let t = 0; t < 100; t++) stepKoi(egg, [egg], t / SIM.tickHz);
    expect(Math.abs(egg.x - start.x)).toBeLessThan(1e-6);
    expect(Math.abs(egg.z - start.z)).toBeLessThan(1e-6);
  });
});
