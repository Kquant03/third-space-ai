"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { pondSDF as gourdSDF } from "./pondGeometry";

// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — client integration · v4 · continuous kinematic
//  ─────────────────────────────────────────────────────────────────────────
//  WebSocket bridge to the pond Durable Object.
//
//  v4 changes (fluidity pass):
//    - Fish now move CONTINUOUSLY at render rate, not in snapshot steps.
//      The client maintains a per-fish kinematic state (position, velocity,
//      heading, angular velocity) and integrates it every frame. Backend
//      snapshots become *correction targets*, not render-visible jumps.
//    - Snapshot corrections blend gently: when a tick arrives, the target
//      position shifts; the kinematic integrator steers toward it over
//      the next ~800ms without teleporting.
//    - Intent-aware micro-behavior: linger holds station, swim cruises
//      forward, shoal aligns heading with neighbors, retreat accelerates
//      away from the last known stressor. These are CLIENT-SIDE
//      refinements layered on server authority.
//    - Motion constants mirror the backend (baseSpeed 0.18 m/s,
//      maxTurnRate 1.4 rad/s) so client and server agree on what a fish
//      physically can do.
//
//  Architecture, single frame:
//    1. WS snapshots update `targetState` per fish (authoritative).
//    2. Render-rate tick (requestAnimationFrame) integrates kinematic
//       state toward targetState, respecting speed/turn limits.
//    3. getAllShaderFish() reads kinematic state (not snapshot state)
//       and converts to shader coords.
//
//  Coordinate bridge: pond is 3D meters, top-down viewed. The shader is
//  2D viewport-normalized (±aspect horizontal, ±0.5 vertical). We map:
//
//      shader_x  ←  pond_x  × SHADER_SCALE
//      shader_y  ←  pond_z  × SHADER_SCALE
//      shader_h  =  pond_h
//
//  SHADER_SCALE is chosen so a fish at its typical swimming radius
//  (POND.radius × 0.45 ≈ 4.5 m) lands at ~0.27 viewport units.
//
//  Procedural fallback: when the WS isn't connected, returns a Lissajous
//  positioning for 5 fish so the site never looks empty during dev or
//  brief network drops. Fallback uses the same kinematic integrator.
// ═══════════════════════════════════════════════════════════════════════════

export const SHADER_SCALE = 0.1;
const SPEECH_BUFFER_MAX = 40;

// ───────────────────────────────────────────────────────────────────
//  Stage tuning (minimal — interpolator is pure)
// ───────────────────────────────────────────────────────────────────

/** Stage speed multipliers — used only for visual tail-cycle speed. */
const STAGE_SPEED_MULT: Record<string, number> = {
  egg: 0.0, fry: 0.55, juvenile: 0.80, adolescent: 0.95,
  adult: 1.0, elder: 0.88, dying: 0.55,
};

// ───────────────────────────────────────────────────────────────────
//  Types
// ───────────────────────────────────────────────────────────────────

export type IntentKind =
  | "swim" | "shoal" | "solitary" | "rest"
  | "feed_approach" | "feed_leave" | "retreat"
  | "approach" | "linger" | "bump"
  | "shelter" | "surface_breach" | "play_invite"
  | "follow" | "threadway" | "attend_solstice";

export interface KoiFrame {
  id: string;
  name?: string;
  stage?: string;
  x: number;
  y: number;
  z: number;
  h: number;
  s?: number;
  c?: string;
  m?: { v: number; a: number };
  /** Hunger 0..1. Optional for backward compatibility with pre-commit-3 servers. */
  hu?: number;
  /** Founder flag — true for koi spawned at pond instantiation
   *  (Shiki, Kokutou). Absent on all naturally-hatched koi. The
   *  renderer reads this for distinct visual treatment. */
  founder?: boolean;
  // v3 action-state fields
  i?: IntentKind;
  t?: string | null;
  mech?: string;
}

/** Food items from the server, rendered on the motion-trace plot
 *  and (in a later commit) in the WebGL surface layer. */
export interface FoodFrame {
  id: string;
  kind: "pollen" | "algae" | "insect" | "pellet";
  x: number;
  y: number;
  z: number;
}

export interface PondMeta {
  version: string;
  created_at: number;
  tick_interval_ms: number;
  t_day: number;
  season: "spring" | "summer" | "autumn" | "winter";
}

export interface ShaderFish {
  id: string;
  x: number;                                 // shader viewport units
  y: number;                                 // shader viewport units
  h: number;                                 // radians
  depth: number;                             // pond_y, reserved
  stage?: string;
  name?: string;
  color?: string;
  mood?: { v: number; a: number };
  /** Founder flag — surfaced from the wire so LivingSubstrate can
   *  apply distinct treatment to Shiki and Kokutou. */
  founder?: boolean;
  // v3 action-state fields — renderers use these to animate intent.
  intent?: IntentKind;
  target?: string | null;
  mechanism?: string;
}

/** A body-point sample for wake-field injection. Each moving koi
 *  contributes several body points per frame; the renderer reads them
 *  to additively write Gaussian disturbance blobs into the persistent
 *  wake field (see WAKE_INJECT shaders in LivingSubstrate).
 *
 *  Coordinates are in pond-meters (NOT shader viewport units), matching
 *  the field shader's pondXZ space so injection aligns with the map.
 *
 *  Strength is already scaled for the body point's contribution, and
 *  includes depth-to-surface coupling — near-surface koi contribute
 *  fully, deep koi contribute little. Renderer doesn't need to apply
 *  additional scaling.
 *
 *  Radius is in wake-field UV units (same space as the injection quad
 *  offsets). Tail-tip blobs are smaller-and-sharper; head bow waves
 *  are larger-and-softer. */
export interface BodyPoint {
  fishId: string;
  kind: "tail" | "pectoralL" | "pectoralR" | "head" | "flank";
  x: number;        // pond meters, lateral
  z: number;        // pond meters, depth-axis (top-down)
  strength: number; // 0..1 typical, clamped
  radius: number;   // wake-UV units
}

export interface SpeechEvent {
  fishId: string;
  uttId: string;
  chunk: string;
  receivedAtMs: number;
}

/** A mechanism firing received over the WS. The frontend uses these to
 *  trigger mechanism-specific choreography (dance rhythm, tag flash,
 *  surface-breach splash, gift orientation) at the exact moment of
 *  firing, rather than inferring them from frame-by-frame intent deltas.
 *
 *  `participants` always includes the actor. Payload carries
 *  mechanism-specific data — chain_length for tag, correlation for
 *  dance, etc. Treat unknown fields permissively. */
export interface MechanismEvent {
  tick: number;
  now: number;
  mechanism: string;
  family: string;
  actor: string;
  participants: string[];
  payload?: Record<string, unknown>;
  receivedAtMs: number;
}

interface PondState {
  connected: boolean;
  tick: number;
  now: number;
  fish: KoiFrame[];
  fishPrev: KoiFrame[];
  fishPrevTime: number;
  fishCurrTime: number;
  /** Current food items in the pond. Updated from snapshot and tick
   *  messages. No interpolation needed — food is positional, mostly
   *  static; the diagnostic HUD and (future) shader just read the
   *  latest values. */
  food: FoodFrame[];
  meta: PondMeta | null;

  // ─── chat surface (§ XIV) ──────────────────────────────────────
  /** Ring buffer of chat messages — both visitor sends and pond-voice
   *  utterances. Dedup'd by id on insert. Capped at the worker's ring
   *  buffer size by trimming the front when an applyChatMessage push
   *  exceeds the threshold; in practice the worker delivers messages
   *  faster than the cap matters. */
  chat: ChatMessage[];
  /** The visitor handle the worker assigned to this session for the
   *  chat surface. Null until the first snapshot carrying yourHandle
   *  arrives; null thereafter means the worker is on a pre-chat
   *  code path and chat is unavailable for this session. */
  yourHandle: string | null;
  /** Cumulative chat-message counter across the pond's entire history.
   *  Visitor-attributable messages only — pond-voice does NOT bump it.
   *  Surfaces as the "chat · 1.2k" pill in the UI. */
  chatTotal: number;
  /** Count of chat messages this session has had broadcast. Increments
   *  when a chat_message arrives whose handle matches yourHandle.
   *  Resets only on page reload. */
  sessionChatCount: number;
  /** Most recent classifier or rate-limit rejection. Cleared when the
   *  visitor edits the input or explicitly dismisses. */
  lastChatRejection: ChatRejection | null;
}

// ───────────────────────────────────────────────────────────────────
//  Store
// ───────────────────────────────────────────────────────────────────

type Listener = () => void;
type SpeechListener = (e: SpeechEvent) => void;
type MechanismListener = (e: MechanismEvent) => void;

/** A single visitor-or-pond chat message held in the client's ring
 *  buffer. The server-side ChatMessage type lives in the worker's
 *  protocol.ts; this is the client mirror, including the local
 *  receivedAtMs for animation timing. */
export interface ChatMessage {
  id: string;
  handle: string;
  text: string;
  at: number;
  kind: "visitor" | "pond";
  /** performance.now() at the moment we received the broadcast. Used
   *  by the renderer to fade new messages in. */
  receivedAtMs?: number;
}

/** A classifier or rate-limit rejection of an attempted chat send.
 *  Mirrors the chat_rejected envelope from the worker. */
export interface ChatRejection {
  text: string;
  reason: string;
  at: number;
}

/** Chat lifecycle listener. The event arg is optional — chat_message
 *  and chat_rejected broadcasts carry payloads, but lifecycle changes
 *  like rejection-cleared fire the listener with no arg. Subscribers
 *  should re-pull state via the accessors rather than relying on the
 *  event payload. */
type ChatListener = (e?: ChatMessage | ChatRejection) => void;

const MECHANISM_BUFFER_MAX = 40;

/** Render delay, in ms. Sampling position at (now - INTERP_DELAY_MS)
 *  ensures we always have multiple future snapshots buffered ahead
 *  of render time, so cubic interpolation has real points to work
 *  with instead of extrapolating.
 *
 *  At backend 2 Hz (500ms between snapshots), 600ms delay means we're
 *  always looking at a render time that has 1-2 full snapshots ahead
 *  of it. The 600ms lag behind real-time is invisible for ambient
 *  pond motion — the fish don't mind, and neither will the viewer. */
const INTERP_DELAY_MS = 600;

/** How many snapshots to keep per fish. Cubic interpolation needs 4
 *  points (one before the render time, two after) so ring must hold
 *  at least 4. We keep 6 for generous packet-jitter cushion. */
const SNAPSHOT_RING_SIZE = 6;

/** A snapshot captured from the WS wire with its arrival time. The
 *  interpolator finds the bracketing pair of these around the current
 *  render time (minus INTERP_DELAY_MS) and interpolates. */
interface KineSnapshot {
  t: number;        // performance.now() at arrival
  x: number;
  y: number;
  z: number;
  h: number;
}

/** Per-fish kinematic state. Everything is purely rendered from the
 *  snapshot ring — no client-side physics simulation. The backend is
 *  the authority on where fish are; the client just smooths between
 *  the backend's decisions.
 *
 *  x/y/z/h are the RENDERED interpolated position this frame.
 *  vx/vz are computed from position delta (for visual flourishes like
 *      tail frequency, renderYaw, wake strength) — NOT used as
 *      physics state.
 *  ring[] is the authoritative snapshot history. */
interface KineState {
  id: string;

  // Rendered position this frame (result of interpolation)
  x: number;
  y: number;
  z: number;
  h: number;

  // Visual velocity (computed from frame-to-frame position delta)
  vx: number;
  vz: number;

  // Snapshot ring — most recent snapshots from the wire, newest last
  ring: KineSnapshot[];

  // Categorical state from most recent snapshot
  intent?: IntentKind;
  target?: string | null;
  mechanism?: string;
  stage?: string;
  name?: string;
  color?: string;
  mood?: { v: number; a: number };

  // Stage-derived speed multiplier (used by visual flourishes)
  speedMult: number;

  // Transient visual animation state
  breachPhase: number;
  lingerPhase: number;
  thrustPhase: number;
  renderYaw: number;

  // Per-fish personality (seeded from id, for visual flourish variety)
  personalityThrustMult: number;
  personalityTurnMult:   number;
  personalityBrakeMult:  number;

  // For tab-return handling: timestamp of last render sample
  lastRenderMs: number;
}

/** Tiny deterministic hash → [0, 1), used to seed per-fish personality
 *  from the fish id. Same fish always gets same personality. */
function hashToUnit(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 0xffffffff;
}

function makeKineState(f: KoiFrame, nowMs: number): KineState {
  const p1 = hashToUnit(f.id + ":thrust");
  const p2 = hashToUnit(f.id + ":turn");
  const p3 = hashToUnit(f.id + ":brake");
  // Clamp initial position — only when clearly on land. Spawn
  // positions very close to the wall are fine.
  let ix = f.x, iz = f.z;
  const isdf = gourdSDF(ix, iz);
  if (isdf > 0.3) {
    const eps = 0.05;
    const gx = (gourdSDF(ix + eps, iz) - gourdSDF(ix - eps, iz)) / (2 * eps);
    const gz = (gourdSDF(ix, iz + eps) - gourdSDF(ix, iz - eps)) / (2 * eps);
    const gmag = Math.hypot(gx, gz) + 1e-6;
    const pushIn = isdf + 0.15;
    ix -= (gx / gmag) * pushIn;
    iz -= (gz / gmag) * pushIn;
  }
  // Seed the ring with two copies of the first snapshot, offset slightly
  // in time — the interpolator needs at least two points to bracket
  // the render time. Both copies at the same position mean the fish
  // renders stationary at this spot until the next real snapshot
  // arrives, then interpolates naturally from there.
  const initialSnap: KineSnapshot = { t: nowMs, x: ix, y: f.y, z: iz, h: f.h };
  const seedSnap: KineSnapshot = { t: nowMs - 500, x: ix, y: f.y, z: iz, h: f.h };
  return {
    id: f.id,
    x: ix,
    y: f.y,
    z: iz,
    h: f.h,
    vx: 0,
    vz: 0,
    ring: [seedSnap, initialSnap],
    intent: f.i,
    target: f.t,
    mechanism: f.mech,
    stage: f.stage,
    name: f.name,
    color: f.c,
    mood: f.m,
    speedMult: STAGE_SPEED_MULT[f.stage ?? "adult"] ?? 1.0,
    breachPhase: 0,
    lingerPhase: hashToUnit(f.id + ":lp") * Math.PI * 2,
    thrustPhase: hashToUnit(f.id + ":tp") * Math.PI * 2,
    renderYaw: 0,
    personalityThrustMult: 0.85 + p1 * 0.30,
    personalityTurnMult:   0.85 + p2 * 0.30,
    personalityBrakeMult:  0.85 + p3 * 0.30,
    lastRenderMs: nowMs,
  };
}

/** Ingest a new snapshot for this fish. Pushes onto the ring, rotates
 *  the oldest out if the ring is full, and updates categorical state.
 *  Does NOT directly update rendered position — interpolation handles
 *  that at render time. */
function updateKineTarget(k: KineState, f: KoiFrame, nowMs: number): void {
  // Backend should provide gourd-valid positions. Clamp only if the
  // snapshot is clearly on land — a target within the safety band
  // (between gourd wall and 0.3m outside) is accepted as-is to
  // prevent spring-vs-clamp oscillation.
  let tx = f.x, tz = f.z;
  const tsdf = gourdSDF(tx, tz);
  if (tsdf > 0.3) {
    const eps = 0.05;
    const gx = (gourdSDF(tx + eps, tz) - gourdSDF(tx - eps, tz)) / (2 * eps);
    const gz = (gourdSDF(tx, tz + eps) - gourdSDF(tx, tz - eps)) / (2 * eps);
    const gmag = Math.hypot(gx, gz) + 1e-6;
    const pushIn = tsdf + 0.15;
    tx -= (gx / gmag) * pushIn;
    tz -= (gz / gmag) * pushIn;
  }

  // Push onto the ring
  k.ring.push({ t: nowMs, x: tx, y: f.y, z: tz, h: f.h });
  while (k.ring.length > SNAPSHOT_RING_SIZE) k.ring.shift();

  // Categorical state — always update
  k.intent = f.i;
  k.target = f.t;
  k.mechanism = f.mech;
  k.stage = f.stage ?? k.stage;
  k.color = f.c ?? k.color;
  k.mood = f.m ?? k.mood;
  if (f.stage) k.speedMult = STAGE_SPEED_MULT[f.stage] ?? 1.0;
}

class PondStore {
  private state: PondState = {
    connected: false,
    tick: 0,
    now: 0,
    fish: [],
    fishPrev: [],
    fishPrevTime: 0,
    fishCurrTime: 0,
    food: [],
    meta: null,
    chat: [],
    yourHandle: null,
    chatTotal: 0,
    sessionChatCount: 0,
    lastChatRejection: null,
  };
  private listeners = new Set<Listener>();
  private speechListeners = new Set<SpeechListener>();
  private speechBuffer: SpeechEvent[] = [];
  private mechanismListeners = new Set<MechanismListener>();
  private mechanismBuffer: MechanismEvent[] = [];
  private chatListeners = new Set<ChatListener>();

  /** Continuous kinematic state per fish, keyed by id. This is what
   *  the renderer ultimately reads — it moves smoothly every frame
   *  regardless of backend snapshot cadence. */
  private kineMap = new Map<string, KineState>();

  /** Expose the kine map so render hooks can read it. */
  getKine = (): Map<string, KineState> => this.kineMap;

  /** Advance all fish for this render frame using Catmull-Rom cubic
   *  interpolation on the snapshot ring.
   *
   *  For each fish: find the two bracketing snapshots (p1, p2) such
   *  that p1.t <= renderTime <= p2.t. Then take the snapshots before
   *  p1 (call it p0) and after p2 (call it p3). Compute a Catmull-Rom
   *  cubic curve through these four points and evaluate at alpha =
   *  (renderTime - p1.t) / (p2.t - p1.t). The result is a smooth
   *  curve that respects the fish's momentum at the tick boundaries
   *  instead of abruptly changing direction.
   *
   *  Catmull-Rom formulation (uniform):
   *    q(α) = 0.5 * (
   *      (2*p1) +
   *      (-p0 + p2) * α +
   *      (2*p0 - 5*p1 + 4*p2 - p3) * α² +
   *      (-p0 + 3*p1 - 3*p2 + p3) * α³
   *    )
   *
   *  This keeps the curve passing through every snapshot (C¹
   *  continuous) while giving the illusion of smooth momentum-aware
   *  motion between them. No physics, no steering, just math.
   *
   *  Visual flourishes (tail frequency, renderYaw) are computed from
   *  frame-to-frame position delta — they decorate interpolated
   *  motion rather than driving it. */
  /** Advance all fish for this render frame using critically-damped
   *  spring smoothing.
   *
   *  For each fish, we maintain a rendered position (k.x, k.y, k.z, k.h)
   *  and a rendered velocity (implicit in the spring: k.vx, k.vz are
   *  the spring velocity for x and z axes). Each frame, we spring
   *  toward the most-recent snapshot position.
   *
   *  Critical damping means: the position converges to target as fast
   *  as possible WITHOUT OVERSHOOTING. No oscillation, no wobble, no
   *  curve artifacts. A noisy input produces a smooth output that
   *  tracks the signal's slow-moving component and ignores the
   *  tick-level jitter.
   *
   *  The spring's natural frequency (TIGHTNESS_HZ) controls how fast
   *  it responds — higher = fish tracks target snappier but shows more
   *  input noise; lower = smoother but more lag. 2.0 Hz is a comfortable
   *  middle: fish visibly responds to new snapshots within ~150ms, but
   *  per-snapshot sub-cm noise is fully absorbed. */
  stepKinematics = (nowMs: number): void => {
    // Spring frequency in Hz. Period = 1/freq. At 2.0 Hz, response
    // settles over ~500ms — matches one backend tick interval.
    const TIGHTNESS_HZ = 2.0;
    const omega = 2 * Math.PI * TIGHTNESS_HZ;

    for (const k of this.kineMap.values()) {
      const ring = k.ring;
      if (ring.length < 1) continue;

      // Target = most recent snapshot. No bracketing, no renderTime,
      // no interpolation windowing — we're a critically-damped
      // servo tracking the latest authoritative position.
      const target = ring[ring.length - 1]!;

      // Frame dt — clamped so pauses and tab-switches don't produce
      // huge accumulated impulses.
      const dtRaw = (nowMs - k.lastRenderMs) / 1000;
      const dt = Math.max(0, Math.min(0.05, dtRaw));
      k.lastRenderMs = nowMs;
      if (dt <= 0) continue;

      const prevX = k.x, prevZ = k.z;

      // Critically-damped spring integrator. Per-axis.
      //
      // Continuous form: x'' + 2ω x' + ω² (x - target) = 0
      //
      // Semi-implicit Euler step (stable for any dt):
      //   a = -2ω v - ω² (x - target)
      //   v += a * dt
      //   x += v * dt
      const stepAxis = (
        cur: number, vel: number, tgt: number,
      ): { p: number; v: number } => {
        const ax = -2 * omega * vel - omega * omega * (cur - tgt);
        const nv = vel + ax * dt;
        const np = cur + nv * dt;
        return { p: np, v: nv };
      };

      const sx = stepAxis(k.x, k.vx, target.x);
      const sz = stepAxis(k.z, k.vz, target.z);
      k.x = sx.p; k.vx = sx.v;
      k.z = sz.p; k.vz = sz.v;

      // Y (depth) springs too but less critical — linear-ish is fine.
      k.y = k.y + (target.y - k.y) * Math.min(1, dt * 4.0);

      // Heading — critically-damped angular spring (shortest arc).
      let dh = target.h - k.h;
      while (dh > Math.PI) dh -= 2 * Math.PI;
      while (dh < -Math.PI) dh += 2 * Math.PI;
      // Angular spring: reuse same omega. Maintain angular velocity
      // implicitly (body-led turning).
      const hAccel = -2 * omega * ((k as KineState & { _hv?: number })._hv ?? 0)
                     + omega * omega * dh;
      const hv0 = (k as KineState & { _hv?: number })._hv ?? 0;
      const hv1 = hv0 + hAccel * dt;
      (k as KineState & { _hv?: number })._hv = hv1;
      k.h += hv1 * dt;

      // Post-spring gourd clamp — LAST-RESORT SAFETY NET.
      // Only fires when the fish is clearly outside the gourd (sdf >
      // +0.3m, i.e. visibly on land). Positions inside or near the
      // wall are accepted verbatim from backend — fighting the
      // backend's authoritative position produces spring-vs-clamp
      // limit-cycle oscillation (jitter).
      //
      // Once the backend's kinematics uses the gourd SDF directly,
      // this clamp should never fire. It exists only to prevent a
      // visibly-wrong frame during the brief window before the
      // backend is deployed with the gourd migration.
      const cSdf = gourdSDF(k.x, k.z);
      if (cSdf > 0.3) {
        const eps = 0.05;
        const gx = (gourdSDF(k.x + eps, k.z) - gourdSDF(k.x - eps, k.z)) / (2 * eps);
        const gz = (gourdSDF(k.x, k.z + eps) - gourdSDF(k.x, k.z - eps)) / (2 * eps);
        const gmag = Math.hypot(gx, gz) + 1e-6;
        const nx = gx / gmag;
        const nz = gz / gmag;
        const pushIn = cSdf + 0.15;
        k.x -= nx * pushIn;
        k.z -= nz * pushIn;
        const vOut = k.vx * nx + k.vz * nz;
        if (vOut > 0) {
          k.vx -= nx * vOut;
          k.vz -= nz * vOut;
        }
      }

      // Visual velocity for shader effects — the actual per-frame
      // position delta. Already smooth because spring is smooth.
      const visVx = (k.x - prevX) / dt;
      const visVz = (k.z - prevZ) / dt;
      // Store as the spring velocities (they already are)
      // But use low-pass for tail-cycle and wake strength reads.
      const sp = Math.hypot(visVx, visVz);

      // Thrust-glide tail phase — speed-dependent
      const tailFreq = (2.0 + 8.0 * Math.min(1, sp / 0.3)) *
                       k.personalityThrustMult;
      k.thrustPhase += tailFreq * dt;

      // Render yaw — slight body sway from angular velocity
      const yawTarget = Math.max(-0.20, Math.min(0.20, hv1 * 0.05));
      k.renderYaw = k.renderYaw * 0.88 + yawTarget * 0.12;
    }
  };

  /** Sync the kine map against a fresh snapshot/tick fish list. New
   *  fish are created, removed fish are deleted, existing fish have
   *  their target state updated. */
  private syncKine(fish: KoiFrame[], nowMs: number): void {
    const seen = new Set<string>();
    for (const f of fish) {
      seen.add(f.id);
      const existing = this.kineMap.get(f.id);
      if (existing) {
        updateKineTarget(existing, f, nowMs);
      } else {
        // First time seeing this fish — initialize kine at the server
        // position so it doesn't animate in from origin.
        this.kineMap.set(f.id, makeKineState(f, nowMs));
      }
    }
    // Remove fish no longer present (died, or connection reset)
    for (const id of this.kineMap.keys()) {
      if (!seen.has(id)) this.kineMap.delete(id);
    }
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  subscribeToSpeech = (l: SpeechListener): (() => void) => {
    this.speechListeners.add(l);
    return () => this.speechListeners.delete(l);
  };

  subscribeToMechanisms = (l: MechanismListener): (() => void) => {
    this.mechanismListeners.add(l);
    return () => this.mechanismListeners.delete(l);
  };

  subscribeToChat = (l: ChatListener): (() => void) => {
    this.chatListeners.add(l);
    return () => this.chatListeners.delete(l);
  };

  // ─────────────────────────────────────────────────────────────
  //  Chat-surface mutators
  //
  //  applyChatMessage dedups by id. The store is a module-level
  //  singleton but the app has multiple usePond callers (page.tsx,
  //  PondWhispers in layout.tsx, the diagnostic). Each call opens
  //  its own WebSocket; the worker broadcasts to all of them; the
  //  same chat_message would otherwise be inserted N times. Cheap
  //  O(buffer) check, runs only on chat broadcasts (rare).
  // ─────────────────────────────────────────────────────────────

  applyChatMessage(msg: {
    id: string; handle: string; text: string; at: number;
    chatTotal?: number;
    kind?: "visitor" | "pond";
  }): void {
    if (this.state.chat.some((m) => m.id === msg.id)) {
      // Already delivered. Still update chatTotal if this delivery
      // carried a higher value (usually identical, but late deliveries
      // can have fresher totals from the worker).
      if (
        typeof msg.chatTotal === "number" &&
        msg.chatTotal > this.state.chatTotal
      ) {
        this.state = { ...this.state, chatTotal: msg.chatTotal };
        this.notify();
      }
      return;
    }

    const ev: ChatMessage = {
      id: msg.id,
      handle: msg.handle,
      text: msg.text,
      at: msg.at,
      kind: msg.kind ?? "visitor",
      receivedAtMs: Date.now(),
    };

    // Bump sessionChatCount only when the broadcast handle matches
    // ours. yourHandle is set sticky for the session by snapshot.
    const isOurs =
      this.state.yourHandle !== null && msg.handle === this.state.yourHandle;

    this.state = {
      ...this.state,
      chat: [...this.state.chat, ev],
      chatTotal:
        typeof msg.chatTotal === "number"
          ? Math.max(this.state.chatTotal, msg.chatTotal)
          : this.state.chatTotal,
      sessionChatCount: isOurs
        ? this.state.sessionChatCount + 1
        : this.state.sessionChatCount,
    };
    this.notify();
    for (const l of this.chatListeners) l(ev);
  }

  applyChatRejected(msg: { text: string; reason: string; at: number }): void {
    const ev: ChatRejection = {
      text: msg.text,
      reason: msg.reason,
      at: msg.at,
    };
    this.state = { ...this.state, lastChatRejection: ev };
    this.notify();
    for (const l of this.chatListeners) l(ev);
  }

  clearChatRejection(): void {
    if (this.state.lastChatRejection === null) return;
    this.state = { ...this.state, lastChatRejection: null };
    this.notify();
    // Fire chat listeners so the dismiss-X button actually closes the
    // banner in PondChat. The store-level notify is general; the chat
    // listener is what PondChat re-pulls state on.
    for (const l of this.chatListeners) l();
  }

  getSnapshot = (): PondState => this.state;
  peek = (): PondState => this.state;

  recentSpeech = (sinceMs: number): SpeechEvent[] =>
    this.speechBuffer.filter((e) => e.receivedAtMs >= sinceMs);

  recentMechanisms = (sinceMs: number): MechanismEvent[] =>
    this.mechanismBuffer.filter((e) => e.receivedAtMs >= sinceMs);

  applySnapshot(msg: {
    tick: number; now: number; fish: KoiFrame[];
    food?: FoodFrame[]; pondMeta?: PondMeta;
    chat?: Array<{
      id: string; handle: string; text: string; at: number;
      kind?: "visitor" | "pond";
    }>;
    yourHandle?: string;
    chatTotal?: number;
  }): void {
    // NB: use performance.now() (matches interpolator clock), not
    // Date.now() (wall-clock epoch, vastly different magnitude).
    const nowMs = performance.now();
    this.syncKine(msg.fish, nowMs);

    // Hydrate chat-surface fields. The worker sends each independently
    // as optional, so we only overwrite present fields and degrade
    // gracefully on pre-chat snapshots.
    const hydratedChat: ChatMessage[] | undefined = msg.chat?.map((m) => ({
      id: m.id,
      handle: m.handle,
      text: m.text,
      at: m.at,
      kind: m.kind ?? "visitor",
      receivedAtMs: Date.now(),
    }));

    this.state = {
      ...this.state,
      connected: true,
      tick: msg.tick,
      now: msg.now,
      fish: msg.fish,
      fishPrev: msg.fish,
      fishPrevTime: msg.now,
      fishCurrTime: msg.now,
      food: msg.food ?? [],
      meta: msg.pondMeta ?? this.state.meta,
      chat: hydratedChat ?? this.state.chat,
      yourHandle: msg.yourHandle ?? this.state.yourHandle,
      chatTotal:
        typeof msg.chatTotal === "number" ? msg.chatTotal : this.state.chatTotal,
    };
    this.notify();
    // Fire chat listeners so consumers re-pull on snapshot-driven
    // hydration (e.g., initial yourHandle arrival enables the input).
    if (msg.chat !== undefined || msg.yourHandle !== undefined) {
      for (const l of this.chatListeners) l();
    }
  }

  applyTick(msg: {
    tick: number; now: number; fish: KoiFrame[]; food?: FoodFrame[];
  }): void {
    const merged = mergeFrames(this.state.fish, msg.fish);
    this.syncKine(merged, performance.now());
    this.state = {
      ...this.state,
      connected: true,
      tick: msg.tick,
      now: msg.now,
      fishPrev: this.state.fish,
      fish: merged,
      fishPrevTime: this.state.fishCurrTime,
      fishCurrTime: msg.now,
      // Food: replace wholesale on each tick. Server is authoritative;
      // items appear and disappear, no client-side interpolation needed.
      food: msg.food ?? this.state.food,
    };
    this.notify();
  }

  applySpeech(msg: { fishId: string; uttId: string; chunk: string }): void {
    const ev: SpeechEvent = {
      fishId: msg.fishId,
      uttId: msg.uttId,
      chunk: msg.chunk,
      receivedAtMs: Date.now(),
    };
    this.speechBuffer.push(ev);
    if (this.speechBuffer.length > SPEECH_BUFFER_MAX) {
      this.speechBuffer.shift();
    }
    for (const l of this.speechListeners) l(ev);
  }

  applyMechanism(msg: {
    tick: number; now: number;
    mechanism: string; family: string;
    actor: string; participants: string[];
    payload?: Record<string, unknown>;
  }): void {
    const ev: MechanismEvent = {
      tick: msg.tick,
      now: msg.now,
      mechanism: msg.mechanism,
      family: msg.family,
      actor: msg.actor,
      participants: msg.participants,
      payload: msg.payload,
      receivedAtMs: Date.now(),
    };
    this.mechanismBuffer.push(ev);
    if (this.mechanismBuffer.length > MECHANISM_BUFFER_MAX) {
      this.mechanismBuffer.shift();
    }
    for (const l of this.mechanismListeners) l(ev);
  }

  setConnected(connected: boolean): void {
    if (this.state.connected !== connected) {
      this.state = { ...this.state, connected };
      this.notify();
    }
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

function mergeFrames(prev: KoiFrame[], next: KoiFrame[]): KoiFrame[] {
  const byId = new Map<string, KoiFrame>();
  for (const f of prev) byId.set(f.id, f);
  for (const f of next) {
    const old = byId.get(f.id);
    byId.set(f.id, old ? { ...old, ...f } : f);
  }
  return [...byId.values()];
}

let store: PondStore | null = null;
function getStore(): PondStore {
  if (!store) store = new PondStore();
  return store;
}

// ───────────────────────────────────────────────────────────────────
//  Hook
// ───────────────────────────────────────────────────────────────────

export interface UsePondOptions {
  url: string;
  fallback?: {
    koiCount: number;
    procedural: boolean;
  };
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

export interface UsePondResult {
  connected: boolean;
  fish: KoiFrame[];
  meta: PondMeta | null;
  peek: () => PondState;

  /** All living koi in shader-viewport coords. Interpolated per-id. */
  getAllShaderFish: () => ShaderFish[];

  /** Legacy two-fish accessor. Wraps getAllShaderFish(). */
  getOrbitCompatibleFish: () => { primary: ShaderFish; secondary: ShaderFish };

  /** Subscribe to speech events. Returns unsubscribe. */
  subscribeToSpeech: (l: SpeechListener) => () => void;

  /** Subscribe to mechanism firings — dance, tag, surface breach, etc.
   *  Listener receives the event synchronously as soon as the firing
   *  arrives over the WebSocket. Returns unsubscribe. */
   subscribeToMechanisms: (l: MechanismListener) => () => void;

  /** Collect per-frame body-point samples for every living, moving,
   *  near-surface koi. Renderer uploads these to the wake injection
   *  instance buffer. Returns empty when the pond is quiet. */
  getAllBodyPoints: () => BodyPoint[];

  /** Diagnostic snapshot of per-fish kine state. Used by development
   *  HUDs to see spring-rendered vs authoritative positions, ring
   *  depth, snapshot staleness. Not reactive — callers poll. */
  getDebugKine: () => DebugKine[];

  /** Returns the current list of food items in the pond. Not reactive
   *  — callers re-read each frame. Food kinds: pollen, algae, insect,
   *  pellet. Used by the diagnostic to overlay food on the motion
   *  trace, and (in a later commit) by the shader for surface rendering. */
  getFood: () => FoodFrame[];

  // ─── chat surface (§ XIV) ───────────────────────────────────────
  /** Current chat ring buffer — visitor sends and pond utterances,
   *  in arrival order, dedup'd by id. Not reactive; consumers should
   *  subscribeToChat to be notified of changes and re-pull. */
  getChat: () => ChatMessage[];

  /** Most recent classifier/rate-limit rejection, or null. Cleared
   *  by clearChatRejection or by sending another message. */
  getLastChatRejection: () => ChatRejection | null;

  /** This session's visitor handle for the chat surface. Null until
   *  the first snapshot delivers it, and remains null on workers
   *  predating the chat deploy — in that case, the chat surface
   *  should remain disabled. */
  getYourHandle: () => string | null;

  /** Count of messages this session has had broadcast. Bumps only on
   *  accepted broadcasts whose handle matches yourHandle. */
  getSessionChatCount: () => number;

  /** Cumulative pond-wide chat counter. Surfaces as the abbreviated
   *  "chat · 1.2k" pill. Visitor-attributable messages only — pond
   *  utterances do not bump. */
  getChatTotal: () => number;

  /** Subscribe to chat lifecycle events: new messages, rejections,
   *  rejection-cleared, snapshot-driven handle/buffer hydration.
   *  Listener receives no arg by default; consumers should re-pull
   *  state via the accessors. Returns unsubscribe. */
  subscribeToChat: (l: ChatListener) => () => void;

  /** Send a chat message. Trimmed and validated client-side
   *  (1..200 chars after trim); empty/oversize sends are silently
   *  dropped. Worker classifies via Workers AI and either broadcasts
   *  to all sockets or sends chat_rejected back to this one. */
  sendChat: (text: string) => void;

  /** Clear the last rejection state. The UI calls this when the
   *  visitor edits the input after a reject, or when they explicitly
   *  dismiss the rejection banner. */
  clearChatRejection: () => void;
}

export function usePond(opts: UsePondOptions): UsePondResult {
  const store = getStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<{ attempts: number; timer: ReturnType<typeof setTimeout> | null }>({
    attempts: 0, timer: null,
  });

  const state = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot(),
    () => store.getSnapshot()
  );

  useEffect(() => {
    if (!opts.url) return;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(opts.url);
        wsRef.current = ws;

        ws.addEventListener("open", () => {
          reconnectRef.current.attempts = 0;
          store.setConnected(true);
        });

        ws.addEventListener("message", (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.t === "snapshot") store.applySnapshot(msg);
            else if (msg.t === "tick") store.applyTick(msg);
            else if (msg.t === "speech") store.applySpeech(msg);
            else if (msg.t === "mechanism") store.applyMechanism(msg);
            else if (msg.t === "chat_message") store.applyChatMessage(msg);
            else if (msg.t === "chat_rejected") store.applyChatRejected(msg);
          } catch (err) {
            console.warn("pond: bad message", err);
          }
        });

        ws.addEventListener("close", () => {
          store.setConnected(false);
          scheduleReconnect();
        });

        ws.addEventListener("error", () => {
          try { ws.close(); } catch { /* */ }
        });
      } catch {
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const base = opts.reconnectBaseMs ?? 1000;
      const max  = opts.reconnectMaxMs ?? 30000;
      const attempts = reconnectRef.current.attempts++;
      const delay = Math.min(max, base * Math.pow(1.6, attempts));
      reconnectRef.current.timer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current.timer) clearTimeout(reconnectRef.current.timer);
      try { wsRef.current?.close(); } catch { /* */ }
    };
  }, [opts.url]);

  // Render-rate kinematic loop. Independent of React render cycle —
  // steps the interpolator ~60 times per second, reading from each
  // fish's snapshot ring.
  //
  // Tab-visibility: the interpolator is naturally tab-safe. Snapshots
  // arrive during hidden state and get pushed to the ring just like
  // visible state. When RAF resumes, interpolation picks up at the
  // current render time which is already bracketed by recent
  // snapshots. No teleport, no drag, no reconciliation needed.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      store.stepKinematics(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const peek = (): PondState => store.peek();

  const getAllShaderFish = (): ShaderFish[] => {
    const s = store.peek();
    const kine = store.getKine();

    if (s.connected && kine.size > 0) {
      // Read from continuous kinematic state — fluid motion every frame.
      const out: ShaderFish[] = [];
      for (const k of kine.values()) out.push(kineToShader(k));
      return out;
    }

    if (opts.fallback?.procedural ?? true) {
      const n = opts.fallback?.koiCount ?? 5;
      const now = Date.now();
      return proceduralShaderFish((now / 1000) % 1e9, n);
    }

    return s.fish.map(toShader);
  };

  const getOrbitCompatibleFish = (): {
    primary: ShaderFish; secondary: ShaderFish;
  } => {
    const all = getAllShaderFish();
    const empty: ShaderFish = { id: "empty-a", x: 0, y: 0, h: 0, depth: 0 };
    return {
      primary:   all[0] ?? empty,
      secondary: all[1] ?? { ...empty, id: "empty-b" },
    };
  };

  const getAllBodyPoints = (): BodyPoint[] => {
    const kine = store.getKine();
    if (kine.size === 0) return [];
    const out: BodyPoint[] = [];
    for (const k of kine.values()) {
      const pts = bodyPointsFor(k);
      for (const p of pts) out.push(p);
    }
    return out;
  };

  /** Debug snapshot — for diagnostic HUDs. Returns a plain-object
   *  view of each fish's spring-rendered position, latest authoritative
   *  snapshot position, ring depth, and staleness. Intentionally
   *  pass-through, not reactive; callers poll at their own rate. */
  const getDebugKine = (): DebugKine[] => {
    const out: DebugKine[] = [];
    const kine = store.getKine();
    const s = store.peek();
    const hungerById = new Map<string, number>();
    for (const f of s.fish) {
      if (typeof f.hu === "number") hungerById.set(f.id, f.hu);
    }
    const nowMs = performance.now();
    for (const k of kine.values()) {
      const last = k.ring[k.ring.length - 1];
      const first = k.ring[0];
      out.push({
        id: k.id,
        name: k.name,
        stage: k.stage,
        renderX: k.x,
        renderY: k.y,
        renderZ: k.z,
        renderH: k.h,
        snapX: last?.x ?? k.x,
        snapY: last?.y ?? k.y,
        snapZ: last?.z ?? k.z,
        snapH: last?.h ?? k.h,
        snapAgeMs: last ? nowMs - last.t : -1,
        ringDepth: k.ring.length,
        ringSpanMs: (first && last) ? last.t - first.t : 0,
        springVx: k.vx,
        springVz: k.vz,
        hunger: hungerById.get(k.id),
      });
    }
    return out;
  };

  return {
    connected: state.connected,
    fish: state.fish,
    meta: state.meta,
    peek,
    getAllShaderFish,
    getOrbitCompatibleFish,
    subscribeToSpeech: store.subscribeToSpeech,
    subscribeToMechanisms: store.subscribeToMechanisms,
    getAllBodyPoints,
    getDebugKine,
    /** Returns the current food list. Pure snapshot, not reactive —
     *  consumers that want live updates should re-read inside their
     *  animation loop (which the diagnostic does). */
    getFood: (): FoodFrame[] => state.food,

    // ─── chat surface ──────────────────────────────────────────
    getChat: (): ChatMessage[] => store.peek().chat,
    getLastChatRejection: (): ChatRejection | null =>
      store.peek().lastChatRejection,
    getYourHandle: (): string | null => store.peek().yourHandle,
    getSessionChatCount: (): number => store.peek().sessionChatCount,
    getChatTotal: (): number => store.peek().chatTotal,
    subscribeToChat: store.subscribeToChat,
    sendChat: (text: string): void => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const trimmed = text.trim();
      // Mirror the worker's validation (z.string().min(1).max(200))
      // so the malformed-shape rejection happens before the round
      // trip rather than after. Silently drop both edges; the UI
      // should be disabling the send button when these conditions
      // hold.
      if (trimmed.length === 0 || trimmed.length > 200) return;
      try {
        ws.send(JSON.stringify({ t: "chat", text: trimmed }));
      } catch {
        /* socket closed mid-send; the close handler will reconnect */
      }
    },
    clearChatRejection: (): void => store.clearChatRejection(),
  };
}

/** Per-fish diagnostic record produced by getDebugKine. */
export interface DebugKine {
  id: string;
  name?: string;
  stage?: string;
  renderX: number;   // spring-rendered X (pond meters)
  renderY: number;
  renderZ: number;
  renderH: number;
  snapX: number;     // latest authoritative snapshot X (pond meters)
  snapY: number;
  snapZ: number;
  snapH: number;
  snapAgeMs: number; // how old the latest snapshot is (performance.now-ms)
  ringDepth: number;
  ringSpanMs: number;
  springVx: number;
  springVz: number;
  /** Hunger 0..1. Undefined only if the server hasn't sent it yet. */
  hunger?: number;
}

// ───────────────────────────────────────────────────────────────────
//  Coordinate bridge
// ───────────────────────────────────────────────────────────────────

function toShader(f: KoiFrame): ShaderFish {
  return {
    id: f.id,
    x: f.x * SHADER_SCALE,
    y: f.z * SHADER_SCALE,
    h: f.h,
    depth: f.y,
    stage: f.stage,
    name: f.name,
    color: f.c,
    mood: f.m,
    founder: f.founder,
    // Action-state — forwarded as-is. Renderers read these each frame
    // to animate intent-specific behavior without needing to re-query
    // the backend.
    intent: f.i,
    target: f.t,
    mechanism: f.mech,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Procedural fallback — N Lissajous fish
// ───────────────────────────────────────────────────────────────────

const T_A = 89.0;
const T_B = 144.0;
const OMEGA_A = (2 * Math.PI) / T_A;
const OMEGA_B = (2 * Math.PI) / T_B;
const R_BASE_X = 0.34;
const R_BASE_Y = 0.22;
const FALLBACK_COLORS = ["kohaku", "shusui", "asagi", "tancho", "ogon", "showa", "goshiki"];
const FALLBACK_INTENTS: IntentKind[] = ["swim", "shoal", "solitary", "linger", "swim"];

function proceduralShaderFish(t: number, count: number): ShaderFish[] {
  const baryX = 0.05 * Math.sin(t * 0.012) + 0.03 * Math.sin(t * 0.007);
  const baryY = -0.03 + 0.04 * Math.cos(t * 0.009);
  const amp = 1.0 + 0.18 * Math.sin(t * 0.013);
  const rx = R_BASE_X * amp;
  const ry = R_BASE_Y * amp;

  const fish: ShaderFish[] = [];
  for (let i = 0; i < count; i++) {
    const phase = (i / count) * Math.PI * 2;
    const speedJitter = 1.0 + (i % 3) * 0.15;
    const x = baryX + rx * Math.cos(OMEGA_A * t * speedJitter + phase);
    const y = baryY + ry * Math.sin(OMEGA_B * t * speedJitter + phase * 1.3);
    const dt = 0.1;
    const xn = baryX + rx * Math.cos(OMEGA_A * (t + dt) * speedJitter + phase);
    const yn = baryY + ry * Math.sin(OMEGA_B * (t + dt) * speedJitter + phase * 1.3);
    const h = Math.atan2(yn - y, xn - x);
    fish.push({
      id: `proc-${i}`,
      x, y, h, depth: -1.2,
      stage: i < 2 ? "adult" : i < 4 ? "adolescent" : "juvenile",
      color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      intent: FALLBACK_INTENTS[i % FALLBACK_INTENTS.length],
      target: null,
    });
  }
  return fish;
}

// ───────────────────────────────────────────────────────────────────
//  Client-side kinematic integrator
// ───────────────────────────────────────────────────────────────────

/** Body length in meters per stage, used for nose-point collision. */
const BODY_LEN_M_KINE: Record<string, number> = {
  egg: 0.03, fry: 0.08, juvenile: 0.20, adolescent: 0.35,
  adult: 0.50, elder: 0.58, dying: 0.50,
};


/** Convert a continuous kinematic state into a ShaderFish. The
 *  rendered heading includes the renderYaw sway offset — a small
 *  opposite-to-turn rotation that looks like body mass-lag. */
function kineToShader(k: KineState): ShaderFish {
  return {
    id: k.id,
    x: k.x * SHADER_SCALE,
    y: k.z * SHADER_SCALE,
    h: k.h + k.renderYaw,
    depth: k.y,
    stage: k.stage,
    name: k.name,
    color: k.color,
    mood: k.mood,
    intent: k.intent,
    target: k.target,
    mechanism: k.mechanism,
  };
}

// ───────────────────────────────────────────────────────────────────
//  Body-point derivation — wake-field injection
// ───────────────────────────────────────────────────────────────────

/** Body length in meters for each life stage — rough real proportions. */
const BODY_LEN_M: Record<string, number> = {
  egg: 0.03, fry: 0.08, juvenile: 0.20, adolescent: 0.35,
  adult: 0.50, elder: 0.58, dying: 0.50,
};

/** Stages that do NOT contribute to wake. Eggs sit still on the shelf. */
const NO_WAKE_STAGES = new Set(["egg"]);

/** Derive per-frame body-point samples for one fish. Each sample
 *  describes where part of the fish's body is currently disturbing the
 *  water, how much, and with what Gaussian footprint.
 *
 *  Strength composition per point:
 *     velocity_mag × body_size × depth_surface_coupling × kind_gain
 *
 *  depth_surface_coupling: 1.0 at surface, 0 at y <= -1.5m. Linear.
 *  Keeps deep koi from writing strong wake into a surface field. */
export function bodyPointsFor(k: KineState): BodyPoint[] {
  if (!k.stage || NO_WAKE_STAGES.has(k.stage)) return [];

  const bodyLen = BODY_LEN_M[k.stage] ?? BODY_LEN_M.adult!;
  const speed = Math.hypot(k.vx, k.vz);
  // No motion, no wake
  if (speed < 0.003) return [];

  // Depth-surface coupling: near surface contributes, deep doesn't
  const surfaceCoupling = Math.max(
    0.0,
    Math.min(1.0, 1.0 + k.y / 1.5)  // y=0 → 1.0, y=-1.5 → 0.0
  );
  if (surfaceCoupling < 0.02) return [];

  const ch = Math.cos(k.h);
  const sh = Math.sin(k.h);

  // Body-local offsets from head (+) to tail (-) along heading.
  // Lateral offsets in body-perpendicular direction.
  const tailOffset = -bodyLen * 0.55;   // behind body center
  const headOffset =  bodyLen * 0.45;   // front
  const pectoralOffset = bodyLen * 0.10;
  const pectoralWidth  = bodyLen * 0.22;
  const flankOffset = -bodyLen * 0.05;  // mid-flank
  const flankWidth  = bodyLen * 0.18;

  // World-space body-point positions
  const tailX = k.x + ch * tailOffset;
  const tailZ = k.z + sh * tailOffset;
  const headX = k.x + ch * headOffset;
  const headZ = k.z + sh * headOffset;
  const pecLX = k.x + ch * pectoralOffset - sh * pectoralWidth;
  const pecLZ = k.z + sh * pectoralOffset + ch * pectoralWidth;
  const pecRX = k.x + ch * pectoralOffset + sh * pectoralWidth;
  const pecRZ = k.z + sh * pectoralOffset - ch * pectoralWidth;

  // Shared strength prefactor
  const sizeFactor = bodyLen / BODY_LEN_M.adult!;
  const base = Math.min(1.0, speed * 6.0) * sizeFactor * surfaceCoupling;
  if (base < 0.015) return [];

  // Per-point gains — tail is the primary wake source, head is bow wave,
  // pectorals matter only during active turns (approximated by renderYaw)
  const turnActivity = Math.min(1.0, Math.abs(k.renderYaw) * 8.0);

  const out: BodyPoint[] = [];

  out.push({
    fishId: k.id,
    kind: "tail",
    x: tailX, z: tailZ,
    strength: base * 1.00,
    radius: 0.020 * (0.6 + 0.4 * sizeFactor),
  });

  out.push({
    fishId: k.id,
    kind: "head",
    x: headX, z: headZ,
    strength: base * 0.40,
    radius: 0.028 * (0.6 + 0.4 * sizeFactor),
  });

  // Pectorals — asymmetric during turns. On the outside of the turn
  // a pectoral flares and releases vortex; inside is tucked.
  // renderYaw sign tells us turn direction.
  const yawSign = Math.sign(k.renderYaw);
  if (turnActivity > 0.1) {
    const outsideL = yawSign > 0 ? 1.0 : 0.2;
    const outsideR = yawSign < 0 ? 1.0 : 0.2;
    out.push({
      fishId: k.id,
      kind: "pectoralL",
      x: pecLX, z: pecLZ,
      strength: base * 0.32 * turnActivity * outsideL,
      radius: 0.012 * (0.6 + 0.4 * sizeFactor),
    });
    out.push({
      fishId: k.id,
      kind: "pectoralR",
      x: pecRX, z: pecRZ,
      strength: base * 0.32 * turnActivity * outsideR,
      radius: 0.012 * (0.6 + 0.4 * sizeFactor),
    });
  }

  // Flank vortex — released during hard turns, on the outside flank
  if (turnActivity > 0.3) {
    const fX = k.x + ch * flankOffset + yawSign * (-sh * flankWidth);
    const fZ = k.z + sh * flankOffset + yawSign * ( ch * flankWidth);
    out.push({
      fishId: k.id,
      kind: "flank",
      x: fX, z: fZ,
      strength: base * 0.45 * turnActivity,
      radius: 0.018 * (0.6 + 0.4 * sizeFactor),
    });
  }

  return out;
}
