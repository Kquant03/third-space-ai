// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Kinematics
//  ─────────────────────────────────────────────────────────────────────────
//  Every tick, each living koi's position integrates a sum of steering
//  forces:
//
//    1. Intent goal pull — weighted toward intent.target or intent.targetId
//    2. Boid flocking (separation + cohesion + alignment) — (§ V, § XIII)
//    3. Curl-noise flow field — ambient currents (§ XI)
//    4. Boundary pushback — keeps fish in the pond (gourd-SDF-based)
//    5. Depth restore — soft band around the stage's preferred depth
//    6. Arousal-modulated speed bias
//
//  The LLM never does kinematics. It picks an intent; we execute it.
//  This is § V: "The LLM is never given free execution."
//
//  Animation and render scale with PAD: higher arousal → faster tail,
//  lower valence → greater shoal distance. That modulation happens
//  client-side in the shader using the compact `m` field in KoiFrame.
//
//  The pond is a GOURD — two joined rounded basins with a waist — not a
//  circle. All containment, spawning, anchor, and threadway logic goes
//  through the canonical pondSDF in constants.ts so backend and client
//  agree on where water is. Any change to gourd geometry must happen
//  in ONE place (constants.ts POND.gourd) and be mirrored in the
//  client shader (LivingSubstrate.tsx pondSDF + usePond.ts gourdSDF).
// ═══════════════════════════════════════════════════════════════════════════

import {
  KINEMATICS,
  POND,
  SIM,
  pondSDF,
  pondSDFGradient,
  clampToPond,
  isInsidePond,
  samplePointOnShelf,
  samplePointInPond,
} from "./constants.js";
import type { KoiState, LifeStage } from "./types.js";
import { sampleCurlXZ } from "./curl-noise.js";

// ───────────────────────────────────────────────────────────────────
//  Stage → preferred swim depth
// ───────────────────────────────────────────────────────────────────

const DEPTH_BY_STAGE: Record<LifeStage, number> = {
  egg:        -0.4,   // eggs on reeds in the shallow shelf
  fry:        -0.6,   // fry hug the shallow vegetated shelves
  juvenile:   -0.9,
  adolescent: -1.1,
  adult:      -1.2,
  elder:      -1.5,
  dying:      -2.2,   // dying koi drift low
};

/** Stage → base speed multiplier. Fry dart, elders drift. */
const SPEED_MULT_BY_STAGE: Record<LifeStage, number> = {
  egg:        0.0,
  fry:        0.85,
  juvenile:   1.10,
  adolescent: 1.15,
  adult:      1.00,
  elder:      0.70,
  dying:      0.35,
};

/** Stage → body size for shader scale. (§ VII) */
export const SIZE_BY_STAGE: Record<LifeStage, number> = {
  egg:        0.15,
  fry:        0.35,
  juvenile:   0.55,
  adolescent: 0.80,
  adult:      1.00,
  elder:      1.05,
  dying:      1.00,
};

// ───────────────────────────────────────────────────────────────────
//  Vector helpers
// ───────────────────────────────────────────────────────────────────


function mag(x: number, z: number): number {
  return Math.sqrt(x * x + z * z);
}

function limitMag(
  x: number, z: number, maxMag: number,
): { x: number; z: number } {
  const m = mag(x, z);
  if (m > maxMag && m > 1e-9) {
    const s = maxMag / m;
    return { x: x * s, z: z * s };
  }
  return { x, z };
}

// ───────────────────────────────────────────────────────────────────
//  Flocking
// ───────────────────────────────────────────────────────────────────

/**
 * Classic Reynolds boid steering, but with sub-radii so the three
 * forces don't collide awkwardly. Only fish that are alive and at
 * compatible life stages flock together — a fry doesn't steer against
 * an elder's alignment, which would look weird.
 */
function flock(
  self: KoiState, others: readonly KoiState[],
): { x: number; z: number } {
  const f = KINEMATICS.flocking;

  let sepX = 0, sepZ = 0;
  let cohX = 0, cohZ = 0, cohN = 0;
  let aliX = 0, aliZ = 0, aliN = 0;

  for (const o of others) {
    if (o.id === self.id) continue;
    if (o.stage === "egg" || o.stage === "dying") continue;

    const dx = self.x - o.x;
    const dz = self.z - o.z;
    const d = mag(dx, dz);
    if (d < 1e-6) continue;

    if (d < f.separationRadius) {
      // Separation — push away, stronger as we get closer.
      const strength = (f.separationRadius - d) / f.separationRadius;
      sepX += (dx / d) * strength;
      sepZ += (dz / d) * strength;
    }

    if (d < f.cohesionRadius) {
      cohX += o.x;
      cohZ += o.z;
      cohN += 1;
    }

    if (d < f.alignmentRadius) {
      aliX += o.vx;
      aliZ += o.vz;
      aliN += 1;
    }
  }

  let ax = 0, az = 0;

  // Separation
  ax += sepX * f.separationStrength;
  az += sepZ * f.separationStrength;

  // Cohesion toward center of nearby group
  if (cohN > 0) {
    const cx = cohX / cohN;
    const cz = cohZ / cohN;
    const toX = cx - self.x;
    const toZ = cz - self.z;
    const m = mag(toX, toZ);
    if (m > 1e-6) {
      ax += (toX / m) * f.cohesionStrength;
      az += (toZ / m) * f.cohesionStrength;
    }
  }

  // Alignment — match average heading
  if (aliN > 0) {
    const avx = aliX / aliN;
    const avz = aliZ / aliN;
    const m = mag(avx, avz);
    if (m > 1e-6) {
      ax += (avx / m) * f.alignmentStrength;
      az += (avz / m) * f.alignmentStrength;
    }
  }

  return { x: ax, z: az };
}

// ───────────────────────────────────────────────────────────────────
//  Intent goal pull
// ───────────────────────────────────────────────────────────────────

/**
 * Given an intent, compute a 2D goal-pull force. Some intents have no
 * pull (swim, solitary, bump) — they modulate parameters rather than
 * steer. Others (approach, follow, shelter, attend_solstice) steer
 * directly toward a point.
 */
function intentPull(
  self: KoiState, others: readonly KoiState[],
): { x: number; z: number; strength: number } {
  const kind = self.intent.kind;

  const toward = (tx: number, tz: number, s: number) => {
    const dx = tx - self.x;
    const dz = tz - self.z;
    const d = mag(dx, dz);
    if (d < 1e-4) return { x: 0, z: 0, strength: 0 };
    return { x: dx / d, z: dz / d, strength: s };
  };

  // A stable per-koi "territory anchor" — deterministic from id. Used by
  // solitary so the koi has somewhere to *go* when it's being alone,
  // rather than just pushing away from the centroid.
  //
  // Gourd-aware: the anchor is sampled deterministically from the hash,
  // then clamped into the gourd interior so it's always reachable.
  const territoryAnchor = (id: string): { x: number; z: number } => {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = ((h << 5) - h) + id.charCodeAt(i);
      h |= 0;
    }
    const ang = ((Math.abs(h) % 1000) / 1000) * Math.PI * 2;
    // Sample a radius biased toward the outer mid-band of the pond;
    // the gourd has max extent ~4.5m in x, so 0.55-0.85× that range.
    const rNorm = 0.55 + 0.28 * ((Math.abs(h) >> 10) % 100) / 100;
    const r = 4.0 * rNorm;  // 2.2-3.3 meters from origin
    const raw = { x: r * Math.cos(ang), z: r * Math.sin(ang) };
    // Clamp into gourd — if the hashed point landed outside the gourd
    // (e.g., pointing into the waist), project inward so the anchor is
    // always reachable in-pond. Margin 0.8 keeps anchors off the rim.
    return clampToPond(raw.x, raw.z, 0.8);
  };

  // Nearest point on the gourd's rim-threadway — where koi prefer to
  // swim along the edge vegetation. Follows the gourd's perimeter
  // (not a circle) by walking outward from the koi's current position
  // along the SDF gradient until hitting the threadway band.
  //
  // Threadway band sits at SDF ≈ -0.55 (about 0.55m in from the rim),
  // a comfortable "along the reeds" depth that won't trigger boundary
  // pushback.
  const threadwayPoint = (): { x: number; z: number } => {
    // Ray-march from self outward along the outward normal until we
    // hit SDF ≈ -0.55. Bounded iterations for safety.
    const THREADWAY_SDF = -0.55;
    let x = self.x, z = self.z;
    for (let i = 0; i < 12; i++) {
      const s = pondSDF(x, z);
      if (s >= THREADWAY_SDF - 0.05) break;
      const { gx, gz } = pondSDFGradient(x, z);
      const gmag = mag(gx, gz) + 1e-6;
      const step = Math.max(0.05, (THREADWAY_SDF - s) * 0.8);
      x += (gx / gmag) * step;
      z += (gz / gmag) * step;
    }
    return { x, z };
  };

  switch (kind) {
    case "swim":
    case "bump":
    case "surface_breach":
      return { x: 0, z: 0, strength: 0 };

    case "shoal": {
      // Pull toward the mean position of similar-stage *neighbors at
      // shoaling distance* — not the global centroid. If the neighbors
      // are already close, reduce pull so the shoal breathes rather
      // than compressing to a point.
      const nearby: KoiState[] = [];
      for (const o of others) {
        if (o.id === self.id) continue;
        if (o.stage === "egg" || o.stage === "dying") continue;
        const d = mag(o.x - self.x, o.z - self.z);
        if (d < POND.radius * 0.5) nearby.push(o);
      }
      if (nearby.length === 0) {
        // No neighbors to shoal with — drift toward territory anchor
        // instead so solitude emerges if the shoal is empty.
        const anchor = territoryAnchor(self.id);
        return toward(anchor.x, anchor.z, 0.3);
      }
      let cx = 0, cz = 0;
      for (const o of nearby) { cx += o.x; cz += o.z; }
      cx /= nearby.length; cz /= nearby.length;
      // Clamp the centroid itself in case the shoal happens to center
      // on a gourd-exterior point (geometrically rare but possible if
      // the fish are on opposite ends of the waist).
      const { x: tx, z: tz } = clampToPond(cx, cz, 0.3);
      const dToCentroid = mag(tx - self.x, tz - self.z);
      if (dToCentroid < 0.8) {
        // Already in the shoal — soft pull only, mostly hold station.
        return toward(tx, tz, 0.15);
      }
      return toward(tx, tz, 0.5);
    }

    case "solitary": {
      // Go to this koi's personal territory anchor. Deterministic per id.
      // Eliminates the centroid-equilibrium bug where everyone stops
      // at the same distance from everyone else.
      const anchor = territoryAnchor(self.id);
      const d = mag(anchor.x - self.x, anchor.z - self.z);
      if (d < 0.5) return { x: 0, z: 0, strength: 0 };  // arrived
      return toward(anchor.x, anchor.z, 0.5);
    }

    case "rest": {
      // Find a calm pocket — 70% of the way to territory anchor from
      // origin. Drift there slowly. Clamp into gourd for safety.
      const anchor = territoryAnchor(self.id);
      const { x: rx, z: rz } = clampToPond(
        anchor.x * 0.7, anchor.z * 0.7, 0.3,
      );
      return toward(rx, rz, 0.2);
    }

    case "feed_approach": {
      // Steer toward an intent.target position — meditation or cognition
      // is responsible for identifying food and pointing intent.target
      // at it. Kinematics just pulls. If neither a target point nor a
      // target koi is set, drift gently: the fish is looking but
      // hasn't found anything yet.
      if (self.intent.target) {
        const d = mag(self.intent.target.x - self.x, self.intent.target.z - self.z);
        // Stop distance slightly smaller than consumption radius so the
        // fish arrives at the food and triggers the consumption check.
        if (d <= 0.15) return { x: 0, z: 0, strength: 0 };
        return toward(self.intent.target.x, self.intent.target.z, 0.7);
      }
      // No target — searching. Soft drift toward territory anchor so
      // the fish moves somewhere rather than freezing in place.
      const anchor = territoryAnchor(self.id);
      return toward(anchor.x, anchor.z, 0.2);
    }

    case "approach":
    case "linger":
    case "follow":
    case "play_invite": {
      const target = self.intent.targetId
        ? others.find((o) => o.id === self.intent.targetId)
        : undefined;
      if (!target) {
        // No target identified — LLM said "approach" but didn't name
        // whom. Pick the nearest living koi and drift toward it
        // gently so the intent still reads behaviorally.
        let nearest: KoiState | null = null;
        let nearestD = Infinity;
        for (const o of others) {
          if (o.id === self.id) continue;
          if (o.stage === "egg" || o.stage === "dying") continue;
          const d = mag(o.x - self.x, o.z - self.z);
          if (d < nearestD) { nearest = o; nearestD = d; }
        }
        if (!nearest) return { x: 0, z: 0, strength: 0 };
        return toward(nearest.x, nearest.z, 0.3);
      }
      const d = mag(target.x - self.x, target.z - self.z);
      const stopDist = kind === "linger" ? 0.70
                     : kind === "approach" ? 0.40
                     : kind === "play_invite" ? 0.50
                     : 0.25;
      if (d <= stopDist) {
        // At stop distance — for linger, add a small orbit push so
        // they don't just freeze next to the target.
        if (kind === "linger") {
          const perpX = -(target.z - self.z);
          const perpZ =  (target.x - self.x);
          const pm = mag(perpX, perpZ);
          if (pm > 1e-4) {
            return { x: perpX / pm, z: perpZ / pm, strength: 0.15 };
          }
        }
        return { x: 0, z: 0, strength: 0 };
      }
      const s = kind === "follow" ? 0.7
              : kind === "linger" ? 0.35
              : kind === "play_invite" ? 0.65
              : 0.55;
      return toward(target.x, target.z, s);
    }

    case "feed_leave":
    case "retreat": {
      // Retreat toward personal territory anchor, not just "away from
      // centroid" — gives retreat a destination so it doesn't become
      // another equilibrium standoff.
      const anchor = territoryAnchor(self.id);
      return toward(anchor.x, anchor.z, 0.7);
    }

    case "shelter": {
      // Find the nearest reed edge point along the gourd perimeter.
      const t = threadwayPoint();
      return toward(t.x, t.z, 0.6);
    }

    case "threadway": {
      // Swim along the gourd's perimeter threadway. Compute the nearest
      // perimeter point, then step forward along the perimeter tangent
      // so the koi actually circulates rather than parking at one point.
      //
      // Tangent: rotate the outward normal by 90° (perpendicular along
      // rim). Step forward ~0.6m along that tangent, then project back
      // onto the threadway band so we stay along the rim shape.
      const { gx, gz } = pondSDFGradient(self.x, self.z);
      const gmag = mag(gx, gz) + 1e-6;
      const nx = gx / gmag;
      const nz = gz / gmag;
      // Tangent — counterclockwise along perimeter
      const tx = -nz;
      const tz =  nx;
      // Step forward along tangent from current position
      const forwardX = self.x + tx * 0.6;
      const forwardZ = self.z + tz * 0.6;
      // Project the forward point onto the threadway band (SDF ≈ -0.55)
      let px = forwardX, pz = forwardZ;
      const THREADWAY_SDF = -0.55;
      for (let i = 0; i < 8; i++) {
        const s = pondSDF(px, pz);
        if (Math.abs(s - THREADWAY_SDF) < 0.08) break;
        const g = pondSDFGradient(px, pz);
        const m = mag(g.gx, g.gz) + 1e-6;
        const step = (THREADWAY_SDF - s) * 0.6;
        px += (g.gx / m) * step;
        pz += (g.gz / m) * step;
      }
      return toward(px, pz, 0.55);
    }

    case "attend_solstice": {
      // Go to the shrine at the gourd's waist. The shrine's x/z now
      // reflect the gourd position (0.2, -0.2) per constants.ts.
      return toward(POND.shrine.x, POND.shrine.z, 0.25);
    }

    default: {
      return { x: 0, z: 0, strength: 0 };
    }
  }
}

// ───────────────────────────────────────────────────────────────────
//  Boundary + depth
// ───────────────────────────────────────────────────────────────────

/** Soft pushback from the gourd wall. The field is non-zero only
 *  within `KINEMATICS.boundaryBuffer` meters of the rim (SDF ≈ 0).
 *  Strength ramps quadratically toward the wall. Uses the SDF's
 *  outward gradient as the push-away-from normal. */
function boundaryPushback(
  self: KoiState,
): { x: number; z: number } {
  const sdfHere = pondSDF(self.x, self.z);
  if (sdfHere <= -KINEMATICS.boundaryBuffer) return { x: 0, z: 0 };
  const { gx, gz } = pondSDFGradient(self.x, self.z);
  const gmag = mag(gx, gz) + 1e-6;
  const nx = gx / gmag;  // outward normal
  const nz = gz / gmag;
  // Proximity 0..1: 0 at boundary-buffer distance, 1 at the wall.
  const proximity = (sdfHere + KINEMATICS.boundaryBuffer) /
                    KINEMATICS.boundaryBuffer;
  const push = KINEMATICS.boundaryStrength * proximity * proximity;
  // Return force pointing INWARD (opposite of outward normal)
  return { x: -nx * push, z: -nz * push };
}

function depthRestore(self: KoiState): number {
  const pref = DEPTH_BY_STAGE[self.stage];
  return (pref - self.y) * KINEMATICS.depthRestore;
}

// ───────────────────────────────────────────────────────────────────
//  Integration step
// ───────────────────────────────────────────────────────────────────

/**
 * Advance one koi by one tick. Modifies koi in place. The caller is
 * responsible for persistence; this is a pure-ish numerical step.
 *
 * `others` must contain all currently living koi (including `self`;
 * the flocking code skips self).
 * `simTime` is in seconds since pond birth; used by curl noise.
 */
export function stepKoi(
  self: KoiState,
  others: readonly KoiState[],
  simTime: number,
  dt: number = SIM.tickIntervalMs / 1000,
): void {
  // Eggs do not move.
  if (self.stage === "egg") {
    self.vx = 0; self.vz = 0;
    return;
  }

  // 1. Intent pull
  const goal = intentPull(self, others);

  // 2. Flocking — only for shoaling stages (eggs already returned above)
  const canFlock = self.stage !== "dying";
  const fl = canFlock ? flock(self, others) : { x: 0, z: 0 };

  // 3. Curl-noise ambient current
  const curl = sampleCurlXZ(self.x, self.z, simTime, KINEMATICS.flowStrength);

  // 4. Boundary pushback (gourd SDF)
  const bd = boundaryPushback(self);

  // 5. Sum accelerations
  let ax = goal.x * goal.strength + fl.x + curl.vx + bd.x;
  let az = goal.z * goal.strength + fl.z + curl.vz + bd.z;

  // PAD modulation: higher arousal → stronger drive; lower valence →
  // separation stronger (handled in flocking radii indirectly, but we
  // also scale overall accel slightly).
  const arousalBoost = 0.8 + 0.4 * self.pad.a;
  ax *= arousalBoost;
  az *= arousalBoost;

  // 6. Integrate velocity
  const accel = limitMag(ax, az, KINEMATICS.maxTurnRate);
  self.vx += accel.x * dt;
  self.vz += accel.z * dt;

  // 7. Clamp to stage-scaled speed
  const vMax = KINEMATICS.baseSpeed * SPEED_MULT_BY_STAGE[self.stage] *
               (0.7 + 0.5 * self.pad.a);
  const v = limitMag(self.vx, self.vz, vMax);
  self.vx = v.x; self.vz = v.z;

  // 8. Light damping — prevents velocity runaway in still water
  self.vx *= 0.985;
  self.vz *= 0.985;

  // 9. Position integrate
  self.x += self.vx * dt;
  self.z += self.vz * dt;

  // 10. Depth restore — slight y drift toward the stage preference
  self.y += depthRestore(self) * dt * 0.4;

  // 11. Heading from velocity
  const sp = mag(self.vx, self.vz);
  if (sp > 0.01) {
    self.h = Math.atan2(self.vz, self.vx);
  }

  // 12. Hard clamp — gourd SDF. Nothing ever leaves the gourd.
  // If the step pushed the koi across the rim, project back inside
  // along the outward normal and zero any outward velocity so the
  // fish doesn't grind into the wall next tick.
  if (!isInsidePond(self.x, self.z, 0.12)) {
    const { x: cx, z: cz } = clampToPond(self.x, self.z, 0.12);
    self.x = cx;
    self.z = cz;
    const { gx, gz } = pondSDFGradient(self.x, self.z);
    const gmag = mag(gx, gz) + 1e-6;
    const nx = gx / gmag;
    const nz = gz / gmag;
    const vn = self.vx * nx + self.vz * nz;
    if (vn > 0) {
      self.vx -= nx * vn;
      self.vz -= nz * vn;
    }
  }

  // Depth clamps
  const sdfNow = pondSDF(self.x, self.z);
  const sdfClamped = Math.max(0, Math.min(1, -sdfNow / 3.5));
  const localFloorDepth = 0.2 + (3.0 - 0.2) * sdfClamped;
  if (self.y > -0.1) self.y = -0.1;
  if (self.y < -localFloorDepth + 0.1) self.y = -localFloorDepth + 0.1;

  self.ageTicks += 1;
}

// ───────────────────────────────────────────────────────────────────
//  Initialization
// ───────────────────────────────────────────────────────────────────

/** Sample a spawn position on the shelf of the gourd-shaped pond.
 *  Used for egg placement by default. Eggs sit on the shelf floor
 *  with y ≈ -0.5; callers can override y as needed. */
export function randomSpawn(
  rand: () => number,
): { x: number; y: number; z: number; h: number } {
  const { x, z } = samplePointOnShelf(rand);
  return {
    x,
    y: -0.5 - rand() * 0.4,
    z,
    h: rand() * Math.PI * 2,
  };
}

/** Sample a spawn position anywhere in the pond interior. Used for
 *  seeding adults and relocating fish that need to appear in open
 *  water rather than on the shelf. */
export function randomInteriorSpawn(
  rand: () => number,
): { x: number; y: number; z: number; h: number } {
  const { x, z } = samplePointInPond(rand);
  return {
    x,
    y: POND.adultSwimDepth + (rand() - 0.5) * 0.4,
    z,
    h: rand() * Math.PI * 2,
  };
}
