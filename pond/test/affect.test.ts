import { describe, it, expect } from "vitest";
import {
  decayPad, clampPad, appraise, applyDelta, baselineFor,
} from "../src/affect.js";

describe("affect", () => {
  it("decays toward baseline over time", () => {
    // Start with an elevated PAD and let a few hours pass.
    let pad = { p: 0.9, a: 0.95, d: 0.8 };
    const oneHour = 3600;
    for (let h = 0; h < 10; h++) {
      pad = decayPad(pad, "adult", oneHour);
    }
    const base = baselineFor("adult");
    // After 10 hours of decay, arousal (2h half-life) should be very close.
    expect(Math.abs(pad.a - base.a)).toBeLessThan(0.02);
    // Pleasure (6h half-life) — 10h is ~1.67 half-lives, so remaining
    // delta is ~0.85 × 0.5^1.67 ≈ 0.27 from a starting delta of 0.85.
    expect(Math.abs(pad.p - base.p)).toBeLessThan(0.35);
    // Dominance (24h half-life) still drifting — barely moved.
    expect(Math.abs(pad.d - base.d)).toBeLessThan(0.75);
  });

  it("clamps to legal ranges", () => {
    const c = clampPad({ p: 2, a: 1.5, d: -3 });
    expect(c.p).toBe(1);
    expect(c.a).toBe(1);
    expect(c.d).toBe(-1);
  });

  it("applies a mood delta and clamps", () => {
    const pad = { p: 0.9, a: 0.5, d: 0 };
    const out = applyDelta(pad, { p: 0.3, a: -0.2 });
    expect(out.p).toBe(1);              // clamped upper
    expect(out.a).toBeCloseTo(0.3);
    expect(out.d).toBe(0);
  });

  it("applies § VIII appraisals verbatim", () => {
    // § VIII: witnessed_by_familiar → Δp +0.2, Δd +0.05
    const d1 = appraise({ kind: "witnessed_by_familiar" }, "self");
    expect(d1.p).toBeCloseTo(0.20);
    expect(d1.d).toBeCloseTo(0.05);

    // § VIII: bumped_by_unfamiliar → Δa +0.3, Δp -0.1
    const d2 = appraise({ kind: "bumped_by_unfamiliar" }, "self");
    expect(d2.a).toBeCloseTo(0.30);
    expect(d2.p).toBeCloseTo(-0.10);

    // § VIII: elder_died → bonded -0.4; pond-wide -0.1
    const d3a = appraise({ kind: "elder_died" }, "bonded_witness");
    const d3b = appraise({ kind: "elder_died" }, "pond_witness");
    expect(d3a.p).toBeCloseTo(-0.40);
    expect(d3b.p).toBeCloseTo(-0.10);

    // § VIII: storm_began → Δa +0.5, Δp -0.3
    const d4 = appraise({ kind: "storm_began" }, "self");
    expect(d4.a).toBeCloseTo(0.50);
    expect(d4.p).toBeCloseTo(-0.30);

    // § VIII: solstice_shaft_entered_with_bonded → Δp +0.3
    const d5 = appraise(
      { kind: "solstice_shaft_entered_with_bonded" }, "self",
    );
    expect(d5.p).toBeCloseTo(0.30);
  });
});
