// ═══════════════════════════════════════════════════════════════════════════
//  Filter · physics
//  ─────────────────────────────────────────────────────────────────────────
//  Pure functions implementing §6.2 of Against Grabby Expansion (v14).
//  No React; consumed by every filter component that needs to evaluate
//  a bound or project (τ, L) onto plot coordinates.
//
//  The composed bound:
//    L_R(τ) = v τ / 2                          (Lieb-Robinson — relativistic)
//    L_E(τ) = λ √(L⊙ τ / (kT ln 2))            (Landauer — energetic)
//    L_env(τ) = min(L_R, L_E)                  (the feasibility envelope)
//    τ*     = 4 λ² L⊙ / (kT ln 2 · v²)         (cusp — where teeth meet)
//
//  All quantities in SI: τ in seconds, L in metres, T in Kelvin.
//
//  v14 additions (for the Sivak–Crooks beat 4 explorable):
//    sivakCrooksDissipation(τ, ℒ², T) — the ⟨W_ex⟩ ≥ kT ℒ²/τ floor
//    simulateBeadProtocol(...) — overdamped colloidal-bead trajectory
// ═══════════════════════════════════════════════════════════════════════════

// ─── Physical constants ───────────────────────────────────────────────────
export const K_B = 1.380649e-23;              // J/K
export const T_ROOM = 300;                     // K
export const LN2 = Math.log(2);
export const C_LIGHT = 2.998e8;                // m/s
export const L_SUN = 3.828e26;                 // W
export const LY = 9.461e15;                    // m
export const AU = 1.496e11;                    // m
export const SEC_PER_YR = 365.25 * 86400;

export const LAMBDA_DEFAULT = 1e-9;
export const T_DEFAULT = 300;
export const V_DEFAULT = C_LIGHT;

export const TAU_AGENT_MAX = 1000 * SEC_PER_YR;

// ─── Derivation functions ─────────────────────────────────────────────────

export const kTln2 = (T: number = T_DEFAULT): number => K_B * T * LN2;

export const L_R = (tau_sec: number, v: number = V_DEFAULT): number =>
  (v * tau_sec) / 2;

export const L_E = (
  tau_sec: number,
  lam: number = LAMBDA_DEFAULT,
  T: number = T_DEFAULT,
  L_star: number = L_SUN,
): number => lam * Math.sqrt((L_star * tau_sec) / (K_B * T * LN2));

export const L_env = (
  tau_sec: number,
  lam: number = LAMBDA_DEFAULT,
  T: number = T_DEFAULT,
  v: number = V_DEFAULT,
  L_star: number = L_SUN,
): number => Math.min(L_R(tau_sec, v), L_E(tau_sec, lam, T, L_star));

export const tau_star = (
  lam: number = LAMBDA_DEFAULT,
  T: number = T_DEFAULT,
  v: number = V_DEFAULT,
  L_star: number = L_SUN,
): number => (4 * lam * lam * L_star) / (K_B * T * LN2 * v * v);

// ─── Sivak–Crooks (Beat 4) ────────────────────────────────────────────────
// Counterdiabatic excess for finite-time protocols:
//    ⟨W_ex⟩ ≥ kT ℒ² / τ
// where ℒ is the thermodynamic (Fisher) length of the protocol.
// For the bead explorable we set ℒ² = 1 in dimensionless units and
// expose τ as the only knob — the 1/τ scaling is the pedagogical
// content. Real units restored by the caller.

export const sivakCrooksDissipation = (
  tau: number,
  L_squared: number = 1,
  T: number = T_DEFAULT,
): number => (K_B * T * L_squared) / tau;

/**
 * Simulate an overdamped colloidal bead in a moving harmonic trap.
 *
 * @param protocol  Array of (t, x_trap) waypoints over the protocol duration.
 *                  Trap stiffness is held constant.
 * @param tauTotal  Protocol duration in dimensionless units.
 * @param dt        Integration step (smaller → smoother but slower).
 * @param friction  Damping coefficient.
 * @param stiffness Harmonic trap spring constant.
 * @param noiseAmp  Amplitude of stochastic noise term.
 * @param seed      PRNG seed. Same seed → same trajectory. This is essential
 *                  for SSR consistency: identical seed on server and client
 *                  produces identical samples and avoids hydration mismatch.
 * @returns         Array of (t, x_bead, x_trap, dissipated) samples.
 */
export type BeadSample = {
  t: number;
  x_bead: number;
  x_trap: number;
  dissipated: number;
};

// Mulberry32 — small, fast, deterministic PRNG. Stateful closure.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateBeadProtocol(
  protocol: { t: number; x: number }[],
  tauTotal: number,
  dt: number = 0.005,
  friction: number = 1.0,
  stiffness: number = 4.0,
  noiseAmp: number = 0.02,
  seed: number = 1,
): BeadSample[] {
  const samples: BeadSample[] = [];
  const rand = mulberry32(seed);
  let x = protocol[0].x;
  let dissipated = 0;
  const N = Math.ceil(tauTotal / dt);

  // Linear interpolator for trap position from protocol waypoints.
  const trapAt = (t: number): number => {
    if (t <= protocol[0].t) return protocol[0].x;
    if (t >= protocol[protocol.length - 1].t)
      return protocol[protocol.length - 1].x;
    for (let i = 0; i < protocol.length - 1; i++) {
      const a = protocol[i];
      const b = protocol[i + 1];
      if (t >= a.t && t <= b.t) {
        const u = (t - a.t) / (b.t - a.t);
        return a.x + u * (b.x - a.x);
      }
    }
    return protocol[protocol.length - 1].x;
  };

  for (let i = 0; i <= N; i++) {
    const t = i * dt;
    const x_trap = trapAt(t);
    // Force on bead from harmonic trap.
    const F = stiffness * (x_trap - x);
    // Overdamped Langevin step with seeded noise — deterministic across
    // server/client renders for a given seed, eliminating SSR mismatch.
    const noise = noiseAmp * (rand() - 0.5) * 2 * Math.sqrt(dt);
    const dx = (F / friction) * dt + noise;
    x += dx;
    // Dissipated work increment: ΔW = F · (x_trap_dot · dt) approx
    // ≈ stiffness * (x_trap - x) * (x_trap_next - x_trap)
    const x_trap_next = trapAt(t + dt);
    dissipated += stiffness * (x_trap - x) * (x_trap_next - x_trap);

    samples.push({ t, x_bead: x, x_trap, dissipated: Math.max(0, dissipated) });
  }
  return samples;
}

// ─── Log-log axis projection ──────────────────────────────────────────────

export const PLOT = {
  W: 900,
  H: 600,
  mL: 90,
  mR: 40,
  mT: 60,
  mB: 80,
  get plotW() {
    return this.W - this.mL - this.mR;
  },
  get plotH() {
    return this.H - this.mT - this.mB;
  },
} as const;

export const TAU_MIN_YR = (1 / 365.25) * 0.25;
export const TAU_MAX_YR = 1e9;
export const L_MIN_LY = 0.5 * (AU / LY);
export const L_MAX_LY = 1e8;

export const logT_MIN = Math.log10(TAU_MIN_YR);
export const logT_MAX = Math.log10(TAU_MAX_YR);
export const logL_MIN = Math.log10(L_MIN_LY);
export const logL_MAX = Math.log10(L_MAX_LY);

export function tauYrToX(tau_yr: number): number {
  return (
    PLOT.mL +
    (PLOT.plotW * (Math.log10(tau_yr) - logT_MIN)) / (logT_MAX - logT_MIN)
  );
}

export function lLyToY(L_ly: number): number {
  const c = Math.max(L_MIN_LY, Math.min(L_MAX_LY * 100, L_ly));
  return (
    PLOT.mT +
    PLOT.plotH * (1 - (Math.log10(c) - logL_MIN) / (logL_MAX - logL_MIN))
  );
}

export function xToTauYr(x: number): number {
  return Math.pow(
    10,
    logT_MIN + ((x - PLOT.mL) / PLOT.plotW) * (logT_MAX - logT_MIN),
  );
}

export function yToLLy(y: number): number {
  return Math.pow(
    10,
    logL_MIN + (1 - (y - PLOT.mT) / PLOT.plotH) * (logL_MAX - logL_MIN),
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────

export function fmtTau(yr: number): string {
  if (!isFinite(yr) || yr <= 0) return "—";
  if (yr < 1 / 365.25) return `${(yr * 365.25 * 24).toFixed(1)} hr`;
  if (yr < 1) return `${(yr * 365.25).toFixed(1)} d`;
  if (yr < 1e3) return `${yr.toFixed(1)} yr`;
  if (yr < 1e6) return `${(yr / 1e3).toFixed(1)} kyr`;
  if (yr < 1e9) return `${(yr / 1e6).toFixed(1)} Myr`;
  return `${(yr / 1e9).toFixed(2)} Gyr`;
}

export function fmtL_m(L_m: number): string {
  const L_ly = L_m / LY;
  if (L_ly < 1e-5) return `${(L_m / AU).toFixed(2)} AU`;
  if (L_ly < 1e-3) return `${(L_m / AU).toFixed(0)} AU`;
  if (L_ly < 1) return `${L_ly.toFixed(3)} ly`;
  if (L_ly < 1e3) return `${L_ly.toFixed(1)} ly`;
  if (L_ly < 1e6) return `${(L_ly / 1e3).toFixed(1)} kly`;
  return `${(L_ly / 1e6).toFixed(2)} Mly`;
}

export function fmtL_ly(L_ly: number): string {
  return fmtL_m(L_ly * LY);
}

export function fmtSci(x: number, digits: number = 2): string {
  if (!isFinite(x)) return "—";
  if (x === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const mant = x / Math.pow(10, exp);
  return `${mant.toFixed(digits)} × 10${supExp(exp)}`;
}

function supExp(n: number): string {
  const map: Record<string, string> = {
    "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³",
    "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  };
  return String(n)
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

export function fmtDecades(logT: number): string {
  const v = Math.pow(10, logT);
  if (v < 1 / 365.25) {
    const hr = v * 365.25 * 24;
    return hr < 1 ? `${(hr * 60).toFixed(0)}m` : `${hr.toFixed(0)}h`;
  }
  if (v < 1) return `${(v * 365.25).toFixed(0)}d`;
  if (v < 1e3) return `${v.toFixed(0)} yr`;
  if (v < 1e6) return `${(v / 1e3).toFixed(0)} kyr`;
  if (v < 1e9) return `${(v / 1e6).toFixed(0)} Myr`;
  return `${(v / 1e9).toFixed(0)} Gyr`;
}

export function fmtDecadesL(logL: number): string {
  const v = Math.pow(10, logL);
  const AU_in_LY = AU / LY;
  if (v < AU_in_LY * 10) {
    const au = v / AU_in_LY;
    return au < 10 ? `${au.toFixed(1)} AU` : `${au.toFixed(0)} AU`;
  }
  if (v < 1) return `${(v / AU_in_LY).toFixed(0)} AU`;
  if (v < 1e3) return `${v.toFixed(0)} ly`;
  if (v < 1e6) return `${(v / 1e3).toFixed(0)} kly`;
  return `${(v / 1e6).toFixed(0)} Mly`;
}

// ─── SVG path generators ──────────────────────────────────────────────────

export function generateEnvelopePath(
  lam: number, T: number, v: number, L_star: number, N: number = 400,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const logT = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
    const tau_sec = Math.pow(10, logT) * SEC_PER_YR;
    const L_m = L_env(tau_sec, lam, T, v, L_star);
    const L_ly_v = L_m / LY;
    if (L_ly_v <= L_MIN_LY) continue;
    pts.push(
      `${tauYrToX(Math.pow(10, logT)).toFixed(2)},${lLyToY(L_ly_v).toFixed(2)}`,
    );
  }
  if (pts.length < 2) return "";
  return `M ${pts.join(" L ")}`;
}

export function generateSplitToothPath(
  tooth: "L_R" | "L_E",
  lam: number, T: number, v: number, L_star: number, N: number = 400,
): { bindingPath: string; nonBindingPath: string } {
  const binding: string[] = [];
  const nonBinding: string[] = [];
  let currentBinding: boolean | null = null;
  let segment: string[] = [];

  const flush = () => {
    if (segment.length >= 2) {
      (currentBinding ? binding : nonBinding).push(`M ${segment.join(" L ")}`);
    }
    segment = [];
  };

  for (let i = 0; i <= N; i++) {
    const logT = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
    const tau_sec = Math.pow(10, logT) * SEC_PER_YR;
    const L_this = tooth === "L_R" ? L_R(tau_sec, v) : L_E(tau_sec, lam, T, L_star);
    const L_other = tooth === "L_R" ? L_E(tau_sec, lam, T, L_star) : L_R(tau_sec, v);
    const isBinding = L_this <= L_other;
    const L_ly_v = L_this / LY;
    if (L_ly_v <= L_MIN_LY || L_ly_v > L_MAX_LY * 100) continue;
    const pt = `${tauYrToX(Math.pow(10, logT)).toFixed(2)},${lLyToY(L_ly_v).toFixed(2)}`;

    if (currentBinding === null) {
      currentBinding = isBinding;
      segment = [pt];
    } else if (isBinding === currentBinding) {
      segment.push(pt);
    } else {
      flush();
      currentBinding = isBinding;
      segment = [pt];
    }
  }
  flush();

  return {
    bindingPath: binding.join(" "),
    nonBindingPath: nonBinding.join(" "),
  };
}

export function generateInfeasiblePath(
  lam: number, T: number, v: number, L_star: number, N: number = 400,
): string {
  const pts: string[] = [`${tauYrToX(TAU_MIN_YR).toFixed(2)},${PLOT.mT}`];
  for (let i = 0; i <= N; i++) {
    const logT = logT_MIN + ((logT_MAX - logT_MIN) * i) / N;
    const tau_sec = Math.pow(10, logT) * SEC_PER_YR;
    const L_m = L_env(tau_sec, lam, T, v, L_star);
    const L_ly_v = Math.max(L_MIN_LY, L_m / LY);
    pts.push(
      `${tauYrToX(Math.pow(10, logT)).toFixed(2)},${lLyToY(L_ly_v).toFixed(2)}`,
    );
  }
  pts.push(`${tauYrToX(TAU_MAX_YR).toFixed(2)},${PLOT.mT}`);
  return `M ${pts.join(" L ")} Z`;
}
