// ═══════════════════════════════════════════════════════════════════════════
//  Lenia Expanded · ecosystem builder
//  ─────────────────────────────────────────────────────────────────────────
//  Five pre-arranged starting configurations for the four-channel field:
//
//    duel       — 3 prey vs 1 predator, dense cluster
//    swarm      — 8 prey vs 3 predators randomly placed with min-distance
//    coexist    — two horizontal bands, prey above, predator below
//    invasion   — prey colony fills left half, predator arrives from right
//    hyperseed  — only the 4D channel carries initial mass (ring structure);
//                 prey and predator emerge FROM the Dihypersphaerome as its
//                 shadow bleeds through the u_hyperMix coupling
//
//  The `hyperseed` layout is the one most directly tied to the
//  Dihypersphaerome research content — it demonstrates the paper's claim
//  that 4D organism dynamics can seed a 3D ecosystem.
//
//  `seed` (optional) makes the `swarm` placement deterministic via a
//  mulberry32 PRNG. Use this for reproducible paper figures; omit for
//  the default non-deterministic behaviour. The other four ecosystems
//  are deterministic anyway — `seed` is a no-op for them.
// ═══════════════════════════════════════════════════════════════════════════

import { N } from "./shaders";
import {
  ORBIUM_RLE,
  IGNIS_RLE,
  decodeRLE,
  scaleSeed,
  placeSeed,
} from "./kernel";

export type EcosystemId =
  | "duel"
  | "swarm"
  | "coexist"
  | "invasion"
  | "hyperseed";

// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────────
function makeRng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildEcosystem(
  presetName: EcosystemId,
  seed?: number,
): Float32Array {
  const data = new Float32Array(N * N * 4);
  const rng = makeRng(seed);

  const preySeed = scaleSeed(decodeRLE(ORBIUM_RLE), 13, 13);
  const predSeed = scaleSeed(decodeRLE(IGNIS_RLE), 13, 15);

  if (presetName === "duel") {
    placeSeed(data, preySeed, 80, 80, 0);
    placeSeed(data, preySeed, 180, 150, 0);
    placeSeed(data, preySeed, 120, 190, 0);
    placeSeed(data, predSeed, 130, 120, 1);
    return data;
  }

  if (presetName === "swarm") {
    const minD = 50;
    const preyPts: Array<[number, number]> = [];
    const predPts: Array<[number, number]> = [];
    let att = 0;
    while (preyPts.length < 8 && att < 300) {
      const cx = 30 + Math.floor(rng() * (N - 60));
      const cy = 30 + Math.floor(rng() * (N - 60));
      if (preyPts.every(([px, py]) => Math.hypot(cx - px, cy - py) > minD)) {
        preyPts.push([cx, cy]);
      }
      att++;
    }
    att = 0;
    while (predPts.length < 3 && att < 200) {
      const cx = 30 + Math.floor(rng() * (N - 60));
      const cy = 30 + Math.floor(rng() * (N - 60));
      if (
        [...preyPts, ...predPts].every(
          ([px, py]) => Math.hypot(cx - px, cy - py) > minD,
        )
      ) {
        predPts.push([cx, cy]);
      }
      att++;
    }
    for (const [cx, cy] of preyPts) placeSeed(data, preySeed, cx, cy, 0);
    for (const [cx, cy] of predPts) placeSeed(data, predSeed, cx, cy, 1);
    return data;
  }

  if (presetName === "coexist") {
    for (let i = 0; i < 4; i++) placeSeed(data, preySeed, 50 + i * 50, 80, 0);
    for (let i = 0; i < 2; i++) placeSeed(data, predSeed, 90 + i * 80, 180, 1);
    return data;
  }

  if (presetName === "invasion") {
    for (let i = 0; i < 5; i++) {
      placeSeed(data, preySeed, 30 + i * 35, 80 + (i % 2) * 80, 0);
    }
    for (let i = 0; i < 5; i++) {
      placeSeed(data, preySeed, 40 + i * 30, 160 + (i % 3) * 30, 0);
    }
    placeSeed(data, predSeed, 210, 128, 1);
    placeSeed(data, predSeed, 230, 90, 1);
    return data;
  }

  if (presetName === "hyperseed") {
    // The Dihypersphaerome ring structure written directly into the 4D
    // channel. The `u_hyperMix` coupling in the sim shader makes the 4D
    // organism seed prey activity wherever its shadow falls, so an
    // ecosystem spontaneously emerges from the initial 4D mass. β=[1/12,
    // 1/6, 1] reflected here as three rings of decreasing intensity.
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const nx = (x / N - 0.5) * 2.2;
        const ny = (y / N - 0.5) * 2.2;
        const r = Math.sqrt(nx * nx + ny * ny);
        const ring =
          Math.exp(-Math.pow((r - 0.85) / 0.08, 2)) +
          Math.exp(-Math.pow((r - 0.55) / 0.1, 2)) / 6;
        data[(y * N + x) * 4 + 3] = ring;
      }
    }
    return data;
  }

  // Fallback — shouldn't be reached, but keeps TypeScript happy and gives
  // a sane default if someone passes an unknown id.
  placeSeed(data, preySeed, 100, 100, 0);
  placeSeed(data, preySeed, 160, 160, 0);
  placeSeed(data, predSeed, 140, 110, 1);
  return data;
}
