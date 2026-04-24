import { describe, it, expect } from "vitest";
import {
  combineGenetics, blendHex,
  archetypeToGenetics, geneticsFromArchetype, archetypeNameFor,
  geneticsToJSON, geneticsFromJSON,
  ARCHETYPE_GENETICS, type KoiGenetics,
} from "../src/genetics.js";
import { Rng } from "../src/rng.js";

// ─── Archetype lookup ───────────────────────────────────────────────

describe("genetics — archetype lookup", () => {
  it("archetypeToGenetics resolves all seven named varieties", () => {
    const names = ["kohaku", "shusui", "asagi", "ogon", "tancho", "showa", "goshiki"];
    for (const name of names) {
      const g = archetypeToGenetics(name);
      expect(g).toBeDefined();
      expect(g.baseColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("falls back to kohaku for unknown archetype strings", () => {
    const g = archetypeToGenetics("unknown_variety");
    expect(g).toEqual(ARCHETYPE_GENETICS.kohaku);
  });

  it("geneticsFromArchetype is an alias for archetypeToGenetics", () => {
    expect(geneticsFromArchetype("shusui")).toEqual(archetypeToGenetics("shusui"));
  });

  it("each archetype has distinctive parameters", () => {
    // Tancho has headDot = 1, nothing else does
    expect(ARCHETYPE_GENETICS.tancho.headDot).toBe(1.0);
    expect(ARCHETYPE_GENETICS.kohaku.headDot).toBeLessThan(0.5);

    // Ogon is metallic, nothing else is (> 0.5)
    expect(ARCHETYPE_GENETICS.ogon.metallic).toBeGreaterThan(0.5);
    expect(ARCHETYPE_GENETICS.kohaku.metallic).toBeLessThan(0.5);

    // Shusui and asagi have backBlue, others don't
    expect(ARCHETYPE_GENETICS.shusui.backBlue).toBeGreaterThan(0.5);
    expect(ARCHETYPE_GENETICS.kohaku.backBlue).toBe(0.0);
  });
});

// ─── blendHex — RGB-space color blending ────────────────────────────

describe("genetics — blendHex", () => {
  it("t=0 returns the first color (within noise tolerance)", () => {
    const blended = blendHex("#ff0000", "#0000ff", 0, 0);
    expect(blended).toBe("#ff0000");
  });

  it("t=1 returns the second color (within noise tolerance)", () => {
    const blended = blendHex("#ff0000", "#0000ff", 1, 0);
    expect(blended).toBe("#0000ff");
  });

  it("t=0.5 midpoints in RGB space", () => {
    const blended = blendHex("#ff0000", "#0000ff", 0.5, 0);
    // Mid red + mid blue with no noise = (128, 0, 128) — near enough
    expect(blended.startsWith("#80")).toBe(true);
    expect(blended.endsWith("80")).toBe(true);
  });

  it("clamps to valid hex range under strong noise", () => {
    // Even with extreme noise, channels stay in [0, 255]
    for (let i = 0; i < 200; i++) {
      const blended = blendHex("#808080", "#808080", 0.5, 200);
      expect(blended).toMatch(/^#[0-9a-f]{6}$/i);
      const r = parseInt(blended.slice(1, 3), 16);
      const g = parseInt(blended.slice(3, 5), 16);
      const b = parseInt(blended.slice(5, 7), 16);
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(255);
    }
  });

  it("returns the input when passed an invalid hex", () => {
    expect(blendHex("not-a-hex", "#ff0000", 0.5, 0)).toBe("not-a-hex");
  });
});

// ─── combineGenetics — the hatch-inheritance operation ──────────────

describe("genetics — combineGenetics", () => {
  it("produces valid KoiGenetics for a kohaku × shusui cross", () => {
    const rng = new Rng(42);
    const child = combineGenetics(
      ARCHETYPE_GENETICS.kohaku,
      ARCHETYPE_GENETICS.shusui,
      rng,
    );
    expect(child.markCoverage).toBeGreaterThanOrEqual(0);
    expect(child.markCoverage).toBeLessThanOrEqual(1);
    expect(child.markDensity).toBeGreaterThanOrEqual(0);
    expect(child.markDensity).toBeLessThanOrEqual(1);
    expect(child.backBlue).toBeGreaterThanOrEqual(0);
    expect(child.backBlue).toBeLessThanOrEqual(1);
    expect(child.metallic).toBeGreaterThanOrEqual(0);
    expect(child.metallic).toBeLessThanOrEqual(1);
    expect(child.baseColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(child.markColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("kohaku × shusui cross carries SOME blue signal from shusui", () => {
    // Kohaku backBlue = 0, shusui backBlue = 0.85. The child should
    // almost never be backBlue = 0 — the blending plus noise pulls it up.
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) {
      const rng = new Rng(i * 7 + 3);
      const child = combineGenetics(
        ARCHETYPE_GENETICS.kohaku,
        ARCHETYPE_GENETICS.shusui,
        rng,
      );
      samples.push(child.backBlue);
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Expected around 0.425 (midpoint) ± noise
    expect(mean).toBeGreaterThan(0.2);
    expect(mean).toBeLessThan(0.7);
  });

  it("legendary flag raises child metallic by ~0.1", () => {
    // Compare a non-legendary vs legendary cross of the same parents
    // with the same rng. Mean of many samples should show legendary
    // higher.
    let regularMean = 0;
    let legendaryMean = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const rng1 = new Rng(i);
      const rng2 = new Rng(i);  // same seed for reproducibility
      const regular = combineGenetics(
        ARCHETYPE_GENETICS.kohaku, ARCHETYPE_GENETICS.shusui, rng1, false,
      );
      const legendary = combineGenetics(
        ARCHETYPE_GENETICS.kohaku, ARCHETYPE_GENETICS.shusui, rng2, true,
      );
      regularMean += regular.metallic;
      legendaryMean += legendary.metallic;
    }
    regularMean /= N;
    legendaryMean /= N;
    expect(legendaryMean).toBeGreaterThan(regularMean);
    expect(legendaryMean - regularMean).toBeGreaterThan(0.05);
  });

  it("same-parent cross produces children very close to parent (with noise)", () => {
    // Kohaku × kohaku — children should almost always look kohaku
    const rng = new Rng(11);
    for (let i = 0; i < 20; i++) {
      const child = combineGenetics(
        ARCHETYPE_GENETICS.kohaku,
        ARCHETYPE_GENETICS.kohaku,
        rng,
      );
      // markCoverage should be near kohaku's 0.55, not wildly off
      expect(Math.abs(child.markCoverage - 0.55)).toBeLessThan(0.3);
      // backBlue should be near 0
      expect(child.backBlue).toBeLessThan(0.2);
    }
  });

  it("tancho × non-tancho produces visible head-dot variation across offspring", () => {
    // The headDot logic: ~55% of offspring get the inherited blend
    // (a visible dot), ~45% get the dropped value (faint or absent).
    // This is what makes kinship legible — a tancho's offspring
    // include both dot-bearing and non-dot-bearing siblings, so an
    // observer can read family resemblance without the trait being
    // monolithic.
    let withDot = 0;
    let withoutDot = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const rng = new Rng(i * 13);
      const child = combineGenetics(
        ARCHETYPE_GENETICS.tancho,   // headDot 1.0
        ARCHETYPE_GENETICS.kohaku,   // headDot 0.2
        rng,
      );
      if (child.headDot >= 0.4) withDot++;
      else withoutDot++;
    }
    // Both phenotypes should appear in meaningful numbers — kinship
    // is visible precisely because the trait segregates.
    expect(withDot).toBeGreaterThan(N * 0.3);
    expect(withoutDot).toBeGreaterThan(N * 0.3);
  });
});

// ─── archetypeNameFor — nearest-neighbor label assignment ───────────

describe("genetics — archetypeNameFor", () => {
  it("returns the exact archetype name for archetype input", () => {
    expect(archetypeNameFor(ARCHETYPE_GENETICS.kohaku)).toBe("kohaku");
    expect(archetypeNameFor(ARCHETYPE_GENETICS.shusui)).toBe("shusui");
    expect(archetypeNameFor(ARCHETYPE_GENETICS.tancho)).toBe("tancho");
    expect(archetypeNameFor(ARCHETYPE_GENETICS.ogon)).toBe("ogon");
  });

  it("assigns nearest archetype for a mixed genotype", () => {
    // A koi with strong backBlue + red marks should classify as shusui
    // (the only backBlue red-marked archetype)
    const phenotype: KoiGenetics = {
      baseColor: "#c8c8bb",
      markColor: "#b03020",
      markCoverage: 0.35,
      markDensity: 0.25,
      backBlue: 0.75,
      headDot: 0.0,
      metallic: 0.0,
      finAccent: "#80a0c0",
    };
    // nearest-neighbor should match shusui (which has high backBlue)
    expect(["shusui", "asagi"]).toContain(archetypeNameFor(phenotype));
  });

  it("tancho-like headDot phenotype classifies as tancho", () => {
    const phenotype: KoiGenetics = {
      ...ARCHETYPE_GENETICS.tancho,
      markCoverage: 0.08,  // small perturbation
    };
    expect(archetypeNameFor(phenotype)).toBe("tancho");
  });
});

// ─── Serialization roundtrip ────────────────────────────────────────

describe("genetics — JSON roundtrip", () => {
  it("geneticsToJSON / geneticsFromJSON preserves all fields", () => {
    const original: KoiGenetics = {
      baseColor: "#abcdef",
      markColor: "#123456",
      markCoverage: 0.37,
      markDensity: 0.62,
      backBlue: 0.15,
      headDot: 0.05,
      metallic: 0.22,
      finAccent: "#fedcba",
    };
    const encoded = geneticsToJSON(original);
    const decoded = geneticsFromJSON(encoded);
    expect(decoded).toEqual(original);
  });

  it("handles a combineGenetics output through JSON roundtrip", () => {
    const rng = new Rng(99);
    const child = combineGenetics(
      ARCHETYPE_GENETICS.shusui, ARCHETYPE_GENETICS.showa, rng,
    );
    const encoded = geneticsToJSON(child);
    const decoded = geneticsFromJSON(encoded);
    expect(decoded).toEqual(child);
  });
});
