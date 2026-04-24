// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Color Genetics
//  ─────────────────────────────────────────────────────────────────────────
//  Real koi varieties (kohaku, shusui, asagi, ogon, tancho, showa, goshiki,
//  ...) differ along a small number of axes: base body color, spot pattern
//  density and arrangement, presence/absence of blue scaling on the back,
//  presence of a single red head mark. This module represents a koi's
//  phenotype as continuous parameters along those axes, not as a discrete
//  variety name, so that offspring can land *between* parents in plausible
//  ways instead of rounding to one variety or the other.
//
//  Kinship becomes visually legible. A kohaku and a shusui have a fry whose
//  red patches are smaller than kohaku's and whose back is faintly blue.
//  An observer watching the pond can read family resemblance the same way
//  they read it from photographs of real koi: through the eye, without a
//  label, because the phenotype carries it.
//
//  This file is cosmetic only. No behavior depends on genetics beyond
//  rendering. The strict LoveFlowMechanism rules are untouched.
// ═══════════════════════════════════════════════════════════════════════════

import { Rng } from "./rng.js";

// ───────────────────────────────────────────────────────────────────
//  Phenotype
// ───────────────────────────────────────────────────────────────────

/**
 * Continuous-parameter phenotype. Each axis is [0,1] unless stated
 * otherwise, blendable via linear interpolation plus additive noise.
 *
 * baseColor: hex, the body's primary color. In practice mostly off-white
 *   for red-patterned koi, dark blue-grey for shusui lineage, gold for
 *   ogon descendants.
 *
 * markColor: hex, the patch/pattern color. Red for kohaku, black for
 *   showa, bright metallic for ogon variants.
 *
 * markCoverage: [0,1], how much of the body is marked. Kohaku high,
 *   tancho tiny (one circle only), ogon zero (solid metallic body).
 *
 * markDensity: [0,1], coarseness of the pattern. High density → many
 *   small patches (goshiki-like). Low density → a few large patches.
 *
 * backBlue: [0,1], how pronounced the blue scaling on the dorsal line
 *   is. 1 = full shusui, 0.5 = asagi-like, 0 = no blue at all.
 *
 * headDot: [0,1], probability-like parameter for a distinct round mark
 *   centered on the head. 1 = tancho. Independent of general coverage.
 *
 * metallic: [0,1], how metallic the scales read. 1 = ogon, 0 = matte.
 *
 * fin_accent: hex, color at the leading edge of dorsal + pectoral fins,
 *   often subtly different from markColor. Small accent that
 *   differentiates siblings.
 *
 * These parameters are stored with the koi and rendered by a shader
 * that consumes them directly. No palette lookup; no variety string.
 */
export interface KoiGenetics {
  baseColor: string;     // hex #rrggbb
  markColor: string;     // hex #rrggbb
  markCoverage: number;  // [0, 1]
  markDensity: number;   // [0, 1]
  backBlue: number;      // [0, 1]
  headDot: number;       // [0, 1]
  metallic: number;      // [0, 1]
  finAccent: string;     // hex #rrggbb
}

// ───────────────────────────────────────────────────────────────────
//  Archetype genetics — used for the seed cohort and as color-name
//  backward-compat. Each historical named variety maps to a
//  phenotype tuple. The names stay on `koi.color` for display; the
//  genetics live alongside as the rendering source of truth.
// ───────────────────────────────────────────────────────────────────

export type ColorArchetype =
  | "kohaku"     // red on white
  | "shusui"     // blue scales, red sides, no markings on back
  | "asagi"      // net-patterned blue back, red lower body
  | "ogon"       // solid metallic (gold or platinum)
  | "tancho"     // single red circle on head, otherwise white
  | "showa"      // black base with red and white patches
  | "goshiki";   // five-color; complex dense pattern

export const ARCHETYPE_GENETICS: Record<ColorArchetype, KoiGenetics> = {
  kohaku: {
    baseColor: "#f6f3ec",
    markColor: "#c9301f",
    markCoverage: 0.55,
    markDensity: 0.35,
    backBlue: 0.0,
    headDot: 0.2,
    metallic: 0.05,
    finAccent: "#f6f3ec",
  },
  shusui: {
    baseColor: "#d1cfc4",
    markColor: "#b63a28",
    markCoverage: 0.35,
    markDensity: 0.25,
    backBlue: 0.85,
    headDot: 0.0,
    metallic: 0.0,
    finAccent: "#80a4c0",
  },
  asagi: {
    baseColor: "#c0bfb5",
    markColor: "#a8341c",
    markCoverage: 0.3,
    markDensity: 0.55,
    backBlue: 0.70,
    headDot: 0.0,
    metallic: 0.0,
    finAccent: "#6e92ab",
  },
  ogon: {
    baseColor: "#d9b65c",
    markColor: "#d9b65c",
    markCoverage: 0.0,
    markDensity: 0.0,
    backBlue: 0.0,
    headDot: 0.0,
    metallic: 0.9,
    finAccent: "#e7cf87",
  },
  tancho: {
    baseColor: "#f6f3ec",
    markColor: "#c7291b",
    markCoverage: 0.06,
    markDensity: 0.0,   // single mark, not a pattern
    backBlue: 0.0,
    headDot: 1.0,
    metallic: 0.0,
    finAccent: "#f6f3ec",
  },
  showa: {
    baseColor: "#232129",
    markColor: "#c7291b",
    markCoverage: 0.55,
    markDensity: 0.45,
    backBlue: 0.0,
    headDot: 0.15,
    metallic: 0.15,
    finAccent: "#f6f3ec",
  },
  goshiki: {
    baseColor: "#a7a69a",
    markColor: "#8a2414",
    markCoverage: 0.65,
    markDensity: 0.75,
    backBlue: 0.45,
    headDot: 0.0,
    metallic: 0.1,
    finAccent: "#6f7b8e",
  },
};

/** Look up an archetype's phenotype by name. Falls back to kohaku. */
export function archetypeToGenetics(c: ColorArchetype | string): KoiGenetics {
  return ARCHETYPE_GENETICS[c as ColorArchetype] ?? ARCHETYPE_GENETICS.kohaku;
}

/**
 * Given a koi that has a legacy color-name field but no genetics,
 * produce the genetics it should have. Used during migration and
 * seed-cohort bootstrap.
 */
export function geneticsFromArchetype(archetype: string): KoiGenetics {
  return archetypeToGenetics(archetype);
}

// ───────────────────────────────────────────────────────────────────
//  Inheritance — the heart of the kinship-visibility story
// ───────────────────────────────────────────────────────────────────

/**
 * Cross two parent phenotypes and produce a child. Each continuous
 * parameter is blended (either by pure midpoint or by biased sampling)
 * with small additive Gaussian variance. Hex colors are blended in
 * RGB space, not parameter space, so a red-white × blue-grey cross
 * produces a believable muted-red-on-grey child.
 *
 * The `legendary` flag (inherited from reproduction.ts placement roll)
 * slightly pushes the metallic axis upward — legendary offspring
 * carry a faint sheen regardless of parent metallic values.
 */
export function combineGenetics(
  parentA: KoiGenetics,
  parentB: KoiGenetics,
  rng: Rng,
  legendary = false,
): KoiGenetics {
  // Per-parameter crossover: for each continuous trait, with probability
  // 0.5 we pure-midpoint-blend, and with 0.5 we bias toward one parent
  // (which parent chosen per-trait independently). Then we add Gaussian
  // noise. This avoids every cross producing a bland average while
  // preserving the family-resemblance signal.
  const blend = (a: number, b: number, noiseStd: number): number => {
    const mode = rng.float();
    let v: number;
    if (mode < 0.5) {
      v = (a + b) / 2;                          // pure midpoint
    } else if (mode < 0.75) {
      v = a * 0.75 + b * 0.25;                  // biased toward A
    } else {
      v = a * 0.25 + b * 0.75;                  // biased toward B
    }
    v += rng.normal() * noiseStd;
    return Math.max(0, Math.min(1, v));
  };

  const markCoverage = blend(parentA.markCoverage, parentB.markCoverage, 0.08);
  const markDensity  = blend(parentA.markDensity,  parentB.markDensity,  0.08);
  const backBlue     = blend(parentA.backBlue,     parentB.backBlue,     0.06);
  // headDot is largely inherited — tancho × non-tancho most often produces
  // non-tancho, but the dominant allele idea means ~25% get a faint dot.
  const headDot = rng.chance(Math.max(parentA.headDot, parentB.headDot) * 0.55)
    ? (parentA.headDot + parentB.headDot) / 2
    : Math.max(0, (parentA.headDot + parentB.headDot) / 2 - 0.4 + rng.normal() * 0.05);
  const metallic = blend(
    parentA.metallic, parentB.metallic,
    0.04,
  ) + (legendary ? 0.1 : 0);

  // Colors in RGB space
  const baseColor = blendHex(parentA.baseColor, parentB.baseColor, rng.float(), 6);
  const markColor = blendHex(parentA.markColor, parentB.markColor, rng.float(), 8);
  const finAccent = blendHex(parentA.finAccent, parentB.finAccent, rng.float(), 10);

  return {
    baseColor,
    markColor,
    markCoverage,
    markDensity,
    backBlue,
    headDot: Math.max(0, Math.min(1, headDot)),
    metallic: Math.max(0, Math.min(1, metallic)),
    finAccent,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Hex color blending in RGB with small per-channel variance
// ───────────────────────────────────────────────────────────────────

/** Blend two hex colors in RGB at parameter `t` (0 = pure A, 1 = pure B),
 *  then perturb each channel by Gaussian noise of standard deviation
 *  `noiseChannels` (0-255 scale). Clamp to [0,255]. */
export function blendHex(
  a: string, b: string, t: number, noiseChannels: number,
): string {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  if (!ar || !br) return a;
  const lerp = (x: number, y: number): number => {
    const v = x + (y - x) * t + (Math.random() - 0.5) * 2 * noiseChannels;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return rgbToHex(lerp(ar.r, br.r), lerp(ar.g, br.g), lerp(ar.b, br.b));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1]!, 16),
    g: parseInt(m[2]!, 16),
    b: parseInt(m[3]!, 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toH = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

// ───────────────────────────────────────────────────────────────────
//  Serialization — for persistence on koi rows
// ───────────────────────────────────────────────────────────────────

export function geneticsToJSON(g: KoiGenetics): string {
  return JSON.stringify(g);
}

export function geneticsFromJSON(s: string): KoiGenetics {
  return JSON.parse(s) as KoiGenetics;
}

/** Pick the closest matching archetype name for a given phenotype. Used
 *  to backfill the legacy `koi.color` field so upstream code that reads
 *  it still works; new offspring's `color` becomes a best-fit label. */
export function archetypeNameFor(g: KoiGenetics): ColorArchetype {
  // Simple nearest-neighbor in parameter space.
  let best: ColorArchetype = "kohaku";
  let bestDist = Infinity;
  for (const [name, arch] of Object.entries(ARCHETYPE_GENETICS)) {
    const d =
      Math.pow(g.markCoverage - arch.markCoverage, 2) * 2 +
      Math.pow(g.markDensity  - arch.markDensity,  2) +
      Math.pow(g.backBlue     - arch.backBlue,     2) * 1.5 +
      Math.pow(g.headDot      - arch.headDot,      2) * 3 +
      Math.pow(g.metallic     - arch.metallic,     2) * 2;
    if (d < bestDist) {
      bestDist = d;
      best = name as ColorArchetype;
    }
  }
  return best;
}
