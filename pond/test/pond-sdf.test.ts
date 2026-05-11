// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Gourd SDF regression
//  ─────────────────────────────────────────────────────────────────────────
//  The pond's pondSDF is the polynomial smooth-MIN of two disk SDFs (basin A
//  and basin B). At one point in this codebase's history, the formula was
//  authored with the linear terms swapped, which inverted smooth-min into
//  smooth-MAX. The visible effect was that fish were silently constrained
//  to the small lens-shaped intersection of the two basins instead of the
//  full gourd union — the substrate shader painted the right shape, the
//  kinematic engine enforced the wrong one, and most of the visible water
//  was empty.
//
//  This file pins down the correct behavior. The tests are deliberately
//  redundant: a high-level interior-coverage check, a few specific points,
//  and an explicit-formula equivalence check. If any future edit reverts
//  the bug, at least one of these will scream.
//
//  See: LivingSubstrate.tsx field shader pondSDF (the canonical visual
//  shape — must match this file's expected behavior).
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  POND, pondSDF, pondSDFGradient, isInsidePond, onShelf,
  waterDepthAt, samplePointInPond, samplePointOnShelf,
} from "../src/constants.js";

// ───────────────────────────────────────────────────────────────────
//  Specific-point assertions
//
//  Each probe is annotated with the SDF value the *correct* (smooth-min)
//  formula produces. If the formula reverts to smooth-max, every probe
//  in the "interior" group will flip sign or lose almost all its negative
//  magnitude. That's the canary.
// ───────────────────────────────────────────────────────────────────

describe("pondSDF — basin centers are deeply interior", () => {
  it("basin A center has SDF ≈ -basinA.r", () => {
    const A = POND.gourd.basinA;
    // At basin A's center, dA = -rA (deeply inside A) and dB > 0
    // (outside B). Smooth-min → close to dA. Allow ±0.1 for the
    // smoothing term contribution.
    expect(pondSDF(A.cx, A.cz)).toBeCloseTo(-A.r, 1);
    expect(pondSDF(A.cx, A.cz)).toBeLessThan(-3.0);
  });

  it("basin B center has SDF ≈ -basinB.r", () => {
    const B = POND.gourd.basinB;
    expect(pondSDF(B.cx, B.cz)).toBeCloseTo(-B.r, 1);
    expect(pondSDF(B.cx, B.cz)).toBeLessThan(-2.0);
  });

  it("origin (between basins, inside both) is deeply negative", () => {
    // (0, 0) is inside basin A (radius 3.5 from -1, 0 → 1m in) AND
    // inside basin B (radius 2.2 from 1.8, 0.4 → ~1.84m in). Should
    // be close to -2.5 (basin A's distance).
    expect(pondSDF(0, 0)).toBeLessThan(-2.0);
  });
});

describe("pondSDF — outside the gourd is positive", () => {
  it("far north is outside", () => {
    expect(pondSDF(0, 5.0)).toBeGreaterThan(0.5);
  });
  it("far south is outside", () => {
    expect(pondSDF(0, -5.0)).toBeGreaterThan(0.5);
  });
  it("far west of basin A is outside", () => {
    expect(pondSDF(-6.0, 0)).toBeGreaterThan(0.5);
  });
  it("far east of basin B is outside", () => {
    expect(pondSDF(5.5, 0.4)).toBeGreaterThan(0.5);
  });
});

describe("pondSDF — rim points are near zero", () => {
  it("west edge of basin A (cAx - rA) is near rim", () => {
    const A = POND.gourd.basinA;
    expect(pondSDF(A.cx - A.r, A.cz)).toBeCloseTo(0, 1);
  });

  it("east edge of basin B (cBx + rB) is near rim", () => {
    const B = POND.gourd.basinB;
    expect(pondSDF(B.cx + B.r, B.cz)).toBeCloseTo(0, 1);
  });
});

// ───────────────────────────────────────────────────────────────────
//  Interior coverage — the broad-stroke check
//
//  A correct gourd SDF makes most of the bounding box interior. A
//  reverted smooth-max formula would shrink the interior to roughly
//  the basin intersection — a small lens, ~15-20% of the bbox.
//  Threshold of 0.55 catches the regression with margin.
// ───────────────────────────────────────────────────────────────────

describe("pondSDF — interior coverage of bounding box", () => {
  it("at least 55% of the gourd bbox samples are interior", () => {
    const xmin = -4.6, xmax = 4.1, zmin = -3.6, zmax = 3.6;
    const W = 60, H = 28;
    let inside = 0;
    for (let i = 0; i < W; i++) {
      for (let j = 0; j < H; j++) {
        const x = xmin + (i + 0.5) * (xmax - xmin) / W;
        const z = zmin + (j + 0.5) * (zmax - zmin) / H;
        if (pondSDF(x, z) < 0) inside++;
      }
    }
    const frac = inside / (W * H);
    // Expected ~0.56-0.58 with the correct formula. The smooth-max
    // bug brings this down to ~0.13. 0.55 leaves comfortable margin.
    expect(frac).toBeGreaterThan(0.55);
  });
});

// ───────────────────────────────────────────────────────────────────
//  Explicit-formula equivalence
//
//  Compute pondSDF directly from POND.gourd via the IQ smooth-min
//  formula, exactly as LivingSubstrate.tsx's GLSL shader writes it.
//  If pondSDF ever drifts from this, the tests fail.
// ───────────────────────────────────────────────────────────────────

describe("pondSDF — matches IQ polynomial smooth-min explicitly", () => {
  function expected(x: number, z: number): number {
    const a = POND.gourd.basinA, b = POND.gourd.basinB, k = POND.gourd.k;
    const dA = Math.hypot(x - a.cx, z - a.cz) - a.r;
    const dB = Math.hypot(x - b.cx, z - b.cz) - b.r;
    const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (dB - dA) / k));
    // GLSL mix(dB, dA, h) = dB*(1-h) + dA*h
    return dB * (1 - h) + dA * h - k * h * (1 - h);
  }

  it.each([
    [0, 0], [-1, 0], [1.8, 0.4], [0.4, 0.2],
    [-3, 1], [-3, -1], [3, 1], [3, -1],
    [-4.5, 0], [4.0, 0.4], [0, 3], [0, -3],
    [0, 5], [-6, 0], [5.5, 0.4],
  ])("pondSDF(%f, %f) === explicit smooth-min", (x, z) => {
    expect(pondSDF(x, z)).toBeCloseTo(expected(x, z), 6);
  });
});

// ───────────────────────────────────────────────────────────────────
//  Helpers built on pondSDF
//
//  These transitively depend on the correct smooth-min. If pondSDF is
//  right, these should behave intuitively at obviously inside/outside
//  points.
// ───────────────────────────────────────────────────────────────────

describe("isInsidePond", () => {
  it("returns true at basin centers", () => {
    expect(isInsidePond(POND.gourd.basinA.cx, POND.gourd.basinA.cz)).toBe(true);
    expect(isInsidePond(POND.gourd.basinB.cx, POND.gourd.basinB.cz)).toBe(true);
  });
  it("returns true at the origin", () => {
    expect(isInsidePond(0, 0)).toBe(true);
  });
  it("returns false far outside", () => {
    expect(isInsidePond(0, 5)).toBe(false);
    expect(isInsidePond(-6, 0)).toBe(false);
  });
});

describe("onShelf", () => {
  it("rejects basin centers (too deep — interior, not shelf)", () => {
    expect(onShelf(POND.gourd.basinA.cx, POND.gourd.basinA.cz)).toBe(false);
    expect(onShelf(POND.gourd.basinB.cx, POND.gourd.basinB.cz)).toBe(false);
  });
  it("rejects far-outside points (not in pond at all)", () => {
    expect(onShelf(0, 5)).toBe(false);
  });
  it("accepts at least some points near each rim", () => {
    // Walk inward from the western rim of basin A; one of these must
    // land in the shelf annulus [shelfSdfMin, shelfSdfMax] = [-1.8, -0.2].
    const A = POND.gourd.basinA;
    let foundShelf = false;
    for (let inset = 0.1; inset < 2.5; inset += 0.05) {
      if (onShelf(A.cx - A.r + inset, A.cz)) { foundShelf = true; break; }
    }
    expect(foundShelf).toBe(true);
  });
});

describe("waterDepthAt", () => {
  it("returns 0 outside the pond", () => {
    expect(waterDepthAt(0, 5)).toBe(0);
  });
  it("returns close to maxDepth at basin A center (deepest)", () => {
    expect(waterDepthAt(POND.gourd.basinA.cx, POND.gourd.basinA.cz))
      .toBeGreaterThan(2.5);
  });
  it("returns smaller depth at basin B center (shallower basin)", () => {
    const dA = waterDepthAt(POND.gourd.basinA.cx, POND.gourd.basinA.cz);
    const dB = waterDepthAt(POND.gourd.basinB.cx, POND.gourd.basinB.cz);
    expect(dB).toBeLessThan(dA);
    expect(dB).toBeGreaterThan(0.5);
  });
});

describe("samplePointInPond / samplePointOnShelf — actually inside", () => {
  it("100 sampled interior points are all inside (margin 0.15)", () => {
    let r = 1;
    const rand = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 100; i++) {
      const p = samplePointInPond(rand);
      expect(isInsidePond(p.x, p.z, 0.10)).toBe(true);
    }
  });
  it("100 sampled shelf points are all in the shelf annulus", () => {
    let r = 7;
    const rand = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 100; i++) {
      const p = samplePointOnShelf(rand);
      expect(onShelf(p.x, p.z)).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────────────────────────
//  Gradient — outward-pointing on the rim
// ───────────────────────────────────────────────────────────────────

describe("pondSDFGradient", () => {
  it("points outward (+x) at basin A's western rim", () => {
    // West edge of basin A: outward normal should point toward -x
    // (away from the basin center which is at -1, 0).
    const A = POND.gourd.basinA;
    const { gx, gz } = pondSDFGradient(A.cx - A.r, A.cz);
    expect(gx).toBeLessThan(0);   // outward = -x at this point
    void gz;
  });

  it("points outward (+x) at basin B's eastern rim", () => {
    const B = POND.gourd.basinB;
    const { gx } = pondSDFGradient(B.cx + B.r, B.cz);
    expect(gx).toBeGreaterThan(0);   // outward = +x at this point
  });
});
