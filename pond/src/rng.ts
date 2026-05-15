// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Deterministic RNG
//  ─────────────────────────────────────────────────────────────────────────
//  Every random draw in the simulation flows through this — SplitMix64
//  stepping a 32-bit state persisted on world.rng_state. Research
//  hygiene (§ XV) requires seed determinism: every event's payload that
//  depended on randomness can be re-derived if we know the starting seed
//  and the ordered sequence of calls.
//
//  The DO SQLite column is INTEGER, so we store the low 32 bits of the
//  SplitMix64 state and accept that we're using a 32-bit period. At
//  2 Hz with a few dozen random draws per tick, the period of 2^32 is
//  roughly 7 sim-years — longer than the whole project's horizon, so
//  this is fine.
//
//  Important: consumers pass the RNG as an explicit parameter. Nothing
//  in the simulation uses Math.random() — anything that does is a bug.
// ═══════════════════════════════════════════════════════════════════════════

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed | 0) >>> 0;
    if (this.state === 0) this.state = 1;
  }

  /** Advance the state and return a Uint32. */
  private nextU32(): number {
    // xorshift32 — simple, fast, good enough for gameplay RNG.
    let x = this.state;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.state = x >>> 0;
    return this.state;
  }

  /** Uniform float in [0, 1). */
  float(): number {
    // 24 high bits → [0, 1) via division, avoids fraction bias.
    return (this.nextU32() >>> 8) / 0x1000000;
  }

  /** Alias for float() — uniform [0, 1). Provided so callers can write
   *  `rng.next()` for the common "give me a unit float" case, matching
   *  the conventional name in most RNG APIs. The float() name is kept
   *  for existing call sites and reads more clearly in code that
   *  enumerates draw types. */
  next(): number {
    return this.float();
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.float();
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(min + (max - min + 1) * this.float());
  }

  /** Sample ~N(0,1) via Box-Muller. */
  normal(): number {
    const u1 = Math.max(1e-9, this.float());
    const u2 = this.float();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Bernoulli trial with success probability p. */
  chance(p: number): boolean {
    return this.float() < p;
  }

  /** Pick an element of an array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("pick(): empty array");
    return arr[this.int(0, arr.length - 1)]!;
  }

  /** Snapshot the current state for persistence. */
  snapshot(): number {
    return this.state;
  }
}
