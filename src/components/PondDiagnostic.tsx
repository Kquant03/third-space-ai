"use client";

import { useEffect, useRef, useState } from "react";
import { usePond, type DebugKine, type FoodFrame } from "@/lib/usePond";

// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Forensic Diagnostic Overlay
//  ─────────────────────────────────────────────────────────────────────────
//  Purpose: give the pond engineer (Stanley) and the model (Claude) an
//  unambiguous view of what's actually happening, so we can stop guessing
//  at "is this a backend issue, a client issue, a clock issue, a
//  coordinate issue?" and just LOOK.
//
//  What it shows:
//
//    1. Connection + broadcast cadence. Is the WS up? What rate are
//       snapshots arriving at? Measured, not assumed. 2 Hz expected.
//
//    2. Per-fish table in pond meters:
//         - id / stage
//         - backend authoritative position (x, z) in METERS
//         - gourd SDF at that point — negative = inside pond, positive =
//           OUTSIDE pond (on land). This alone tells us if backend is
//           steering to invalid positions.
//         - distance between spring-rendered position and latest snapshot
//           — a measure of how "sticky" the spring is lagging.
//         - spring velocity magnitude in m/s
//         - snapshot age in ms — how long since we last heard from the
//           backend about this fish
//
//    3. Motion trace per fish — a small SVG plot of the last 30 seconds
//       of backend-reported positions (not spring-rendered, raw snapshot).
//       If the trace is a single dot, backend is frozen. If it's a visible
//       path, backend is moving fish and jitter is in the rendering layer.
//
//  Toggle: backtick (`) key. Initial state: shown in dev.
//  Layout: right-hand side, fixed-width column, scrollable if needed.
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
  bg: "rgba(1, 1, 6, 0.90)",
  border: "rgba(127, 175, 179, 0.20)",
  ink: "#c8cfe0",
  inkStrong: "#eaeef7",
  inkFaint: "#5a6780",
  ghost: "#7fafb3",
  connected: "#7fafb3",
  disconnected: "#8a6b78",
  good: "#7fafb3",
  warn: "#d4a574",
  bad: "#c87a8a",
} as const;

const FONT_MONO =
  "var(--font-mono), 'JetBrains Mono', monospace";

// ── Gourd SDF — canonical; must match backend/shader ─────────────────────
const GOURD = {
  basinA: { cx: -1.0, cz: 0.0, r: 3.5 },
  basinB: { cx:  1.8, cz: 0.4, r: 2.2 },
  k: 0.9,
} as const;

function pondSDF(x: number, z: number): number {
  const a = GOURD.basinA, b = GOURD.basinB, k = GOURD.k;
  const dA = Math.hypot(x - a.cx, z - a.cz) - a.r;
  const dB = Math.hypot(x - b.cx, z - b.cz) - b.r;
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (dB - dA) / k));
  return dB * (1 - h) + dA * h - k * h * (1 - h);
}

// ── Gourd zero-contour, computed once ───────────────────────────────────
//  This traces the pond outline by ray-marching the SDF outward along 128
//  angles, up to 40 steps each — ~5,000 SDF evaluations. It depends on
//  nothing but the GOURD constants above, and it was sitting inside
//  MotionTrace's render body, so it ran on every render. The panel polls
//  at 5 Hz, which made it ~25,000 SDF evaluations per second to redraw a
//  shape that has never once changed. Module scope; computed on first
//  import; free thereafter.
const PLOT_W = 380;
const PLOT_MIN_X = -5, PLOT_MAX_X = 5;
const PLOT_MIN_Z = -4, PLOT_MAX_Z = 4;
const PLOT_H = PLOT_W * ((PLOT_MAX_Z - PLOT_MIN_Z) / (PLOT_MAX_X - PLOT_MIN_X));

function worldToPlot(x: number, z: number): [number, number] {
  return [
    ((x - PLOT_MIN_X) / (PLOT_MAX_X - PLOT_MIN_X)) * PLOT_W,
    ((z - PLOT_MIN_Z) / (PLOT_MAX_Z - PLOT_MIN_Z)) * PLOT_H,
  ];
}

const GOURD_PATH: string = (() => {
  const pts: [number, number][] = [];
  const N = 128;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    let r = 0.1;
    for (let j = 0; j < 40; j++) {
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const sd = pondSDF(x, z);
      if (sd > 0) break;
      r += Math.max(0.05, -sd * 0.6);
    }
    pts.push(worldToPlot(Math.cos(ang) * r, Math.sin(ang) * r));
  }
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
})();

// Deterministic per-fish hue. Hoisted for the same reason.
function fishColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `hsl(${((h % 360) + 360) % 360}, 60%, 65%)`;
}

function foodColor(kind: FoodFrame["kind"]): string {
  switch (kind) {
    case "pollen":  return "rgba(230, 220, 140, 0.70)";
    case "algae":   return "rgba(130, 180, 130, 0.70)";
    case "insect":  return "rgba(220, 170, 110, 0.85)";
    case "pellet":  return "rgba(240, 240, 250, 0.95)";
  }
  // Unreachable while the union is complete — but if the worker starts
  // emitting a food kind the client doesn't know about, the switch falls
  // through and returns undefined into an SVG fill, which paints black
  // and reads as "the diagnostic is lying to you". Grey is the honest
  // answer: something is here, we don't know what.
  return "rgba(180, 186, 200, 0.6)";
}

// ── Trace storage (per fish, in-component refs) ──────────────────────────
interface TracePoint {
  t: number;     // performance.now() ms
  x: number;     // pond meters
  z: number;
}

const TRACE_WINDOW_MS = 30_000;
const TRACE_MAX_POINTS = 120;

// The panel is a desktop instrument. It is a fixed-width forensic table
// of ten numeric columns plus a 380px SVG plot, toggled with a key that
// phone keyboards don't have, pinned to a right-hand gutter phones don't
// have either. There is no version of it that's useful at 390px, and the
// honest thing is to not pretend otherwise.
//
// The check is `pointer: coarse` rather than a width breakpoint: a narrow
// desktop window is still a machine with a keyboard and a cursor, and
// Stanley debugging in a half-width browser should keep his instrument.
// A 1024px tablet should not get one.
function isDesktopClass(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(pointer: fine)").matches;
}

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (!isDesktopClass()) return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.NEXT_PUBLIC_POND_DIAG === "true") return true;
  return false;
}

// ─── Dev console admin helpers ─────────────────────────────────────────
// The dev console is gated by a URL secret: ?dev=<SHARED_SECRET>. The
// frontend compares the provided value against NEXT_PUBLIC_POND_DEV_SECRET
// (which must be set to the same string as the worker's SHARED_SECRET
// env var). When they match, the DEV tab renders and the URL secret
// itself is used as the Bearer token for admin POSTs. When they don't,
// the DEV tab doesn't exist at all and admin POSTs are blocked client-
// side. The worker's own /admin/* gate still enforces auth on every
// request — this client-side check is purely for UX (don't show buttons
// that won't work), not for security.
//
// Why URL-as-credential: the previous design cached the secret in
// localStorage after a one-time prompt, which meant any browser session
// that had ever entered the secret stayed authorized forever, and there
// was no way to share an admin-capable link without also sharing the
// prompt-and-paste dance. With the secret in the URL, the link IS the
// credential. Trade-off: the secret appears in browser history and is
// vulnerable to shoulder-surfing. Acceptable for a research-pond
// admin surface where the harm ceiling is "extra eggs in the pond."

function getDevSecretFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const expected = process.env.NEXT_PUBLIC_POND_DEV_SECRET ?? "";
    if (!expected) return null;
    const sp = new URLSearchParams(window.location.search);
    const provided = sp.get("dev");
    return provided === expected ? provided : null;
  } catch {
    return null;
  }
}

function workerBaseUrl(): string {
  // Derive HTTP base URL from the WS URL.
  const ws = process.env.NEXT_PUBLIC_POND_WS_URL ?? "";
  return ws
    .replace(/^ws:/, "http:")
    .replace(/^wss:/, "https:")
    .replace(/\/ws$/, "");
}

async function postAdmin(
  path: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  const secret = getDevSecretFromUrl();
  if (!secret) {
    return {
      ok: false,
      status: 401,
      body: "no dev secret in URL — add ?dev=<SHARED_SECRET>",
    };
  }
  const base = workerBaseUrl();
  try {
    const res = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + secret,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: e instanceof Error ? e.message : String(e),
    };
  }
}

// The default export is a gate and nothing else. Everything with a hook
// in it lives in PondDiagnosticPanel below.
//
// This split is load-bearing, not tidiness. usePond() opens the pond
// WebSocket and takes 2 Hz snapshots for as long as the component is
// mounted — and it was being called unconditionally, above the
// `if (!enabled) return null`. So every visitor on every page opened and
// held a pond socket to render a panel that would never appear: in
// production, where shouldShow() is false; on phones, where it's now
// false too — over cellular, at 2 Hz, forever.
//
// Hooks can't be conditional, so the only way to not call usePond is to
// not mount the component that calls it. Hence the gate.
//
// Note this is specifically about the *diagnostic's* socket. If the
// whispers components need pond state on mobile, they open their own —
// that's their call to make, not this panel's.
export default function PondDiagnostic() {
  const [available, setAvailable] = useState(false);

  // Deferred to an effect so SSR and the first client render agree
  // (shouldShow reads window).
  useEffect(() => { setAvailable(shouldShow()); }, []);

  if (!available) return null;
  return <PondDiagnosticPanel />;
}

function PondDiagnosticPanel() {
  // The gate above already decided this machine gets the panel; `enabled`
  // is now purely the backtick show/hide.
  const [enabled, setEnabled] = useState(true);
  const [debug, setDebug] = useState<DebugKine[]>([]);
  const [food, setFood] = useState<FoodFrame[]>([]);
  const [snapshotRateHz, setSnapshotRateHz] = useState(0);

  // Tab state. STATUS is the original forensic panel; DEV is the test
  // console for triggering simulation events (spawning, bonds, time
  // jumps, etc.) without waiting for them to occur naturally. DEV is
  // only shown when the URL carries ?dev=<NEXT_PUBLIC_POND_DEV_SECRET>
  // matching the build-time env var. Visitors without the secret in
  // the URL never see the tab. Admin endpoints additionally check the
  // SHARED_SECRET header on the worker side using the same value, so
  // the gate is defended at both layers.
  const [tab, setTab] = useState<"status" | "dev">("status");
  const [devEnabled, setDevEnabled] = useState(false);
  const [adminBusy, setAdminBusy] = useState<string | null>(null);
  const [adminLastResult, setAdminLastResult] = useState<string>("");

  // Live header height. Default to the expanded value for the first
  // paint; the ResizeObserver below corrects it before it matters.
  const [headerHeight, setHeaderHeight] = useState(256);

  // Measure snapshot cadence by counting tick changes per second.
  const lastTickRef = useRef<number>(-1);
  const tickSamplesRef = useRef<{ t: number; tick: number }[]>([]);

  // Per-fish trace history. Keyed by id → array of trace points.
  const tracesRef = useRef<Map<string, TracePoint[]>>(new Map());

  // Gate the DEV tab on a URL secret match. getDevSecretFromUrl()
  // returns non-null only when ?dev=<value> matches the build-time
  // NEXT_PUBLIC_POND_DEV_SECRET. Without that match, the tab doesn't
  // render and admin POSTs are short-circuited client-side.
  useEffect(() => {
    setDevEnabled(getDevSecretFromUrl() !== null);
  }, []);

  // Measure the header instead of guessing at it.
  //
  // This previously mirrored SiteHeader's 64px scroll threshold and
  // hardcoded 256 / 76 as the two clearances. That's a duplicated
  // constant across two files with no link between them: every time the
  // masthead's padding or the scotch rule changes, this silently drifts
  // until someone notices the panel overlapping the nav. It also snapped
  // between the two values instantly while the header itself eased over
  // 0.5s, so the panel jumped and the header followed.
  //
  // The old comment says querySelector("header") "matched the wrong
  // element or returned mid-transition values". Both are addressable:
  // SiteHeader now carries data-site-header so there's exactly one thing
  // to match, and mid-transition values are precisely what we want —
  // a ResizeObserver fires throughout the max-height animation, so the
  // panel now rides the header down instead of teleporting ahead of it.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-site-header]");
    if (!el) return;                       // chromeless route: no header

    const apply = () => {
      // Round: sub-pixel churn during the ease would re-render at 60fps
      // for no visible gain.
      const h = Math.round(el.getBoundingClientRect().height);
      setHeaderHeight((prev) => (prev === h ? prev : h));
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pond = usePond({
    url: process.env.NEXT_PUBLIC_POND_WS_URL ?? "",
    fallback: { koiCount: 2, procedural: true },
  });

  // Keyboard toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setEnabled((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Poll debug state at 5 Hz. Also record trace points and measure
  // snapshot rate.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const d = pond.getDebugKine();
      setDebug(d);
      setFood(pond.getFood());

      // Trace: record backend-reported (snap) positions for every fish
      const now = performance.now();
      const traces = tracesRef.current;
      for (const k of d) {
        let arr = traces.get(k.id);
        if (!arr) { arr = []; traces.set(k.id, arr); }
        // Only push if the snapshot has changed since last trace point
        // (we sample at 5 Hz but backend is 2 Hz, so we'd push
        // duplicates otherwise).
        const last = arr[arr.length - 1];
        if (!last || last.x !== k.snapX || last.z !== k.snapZ) {
          arr.push({ t: now, x: k.snapX, z: k.snapZ });
        }
        // Drop points older than TRACE_WINDOW_MS
        const cutoff = now - TRACE_WINDOW_MS;
        while (arr.length > 0 && arr[0]!.t < cutoff) arr.shift();
        // Cap total points
        while (arr.length > TRACE_MAX_POINTS) arr.shift();
      }
      // Remove traces for fish that no longer exist
      const ids = new Set(d.map((k) => k.id));
      for (const id of Array.from(traces.keys())) {
        if (!ids.has(id)) traces.delete(id);
      }

      // Snapshot rate: track backend tick changes per second
      const state = pond.peek();
      const currentTick = state.tick;
      if (currentTick !== lastTickRef.current) {
        lastTickRef.current = currentTick;
        tickSamplesRef.current.push({ t: now, tick: currentTick });
        // Keep last 5 seconds of tick transitions
        const tc = now - 5000;
        while (tickSamplesRef.current.length > 0 &&
               tickSamplesRef.current[0]!.t < tc) {
          tickSamplesRef.current.shift();
        }
      }
      const samples = tickSamplesRef.current;
      if (samples.length >= 2) {
        const first = samples[0]!;
        const last = samples[samples.length - 1]!;
        const dtSec = (last.t - first.t) / 1000;
        const ticks = last.tick - first.tick;
        if (dtSec > 0.5) {
          setSnapshotRateHz(ticks / dtSec);
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [enabled, pond]);

  if (!enabled) return null;

  const { connected, meta } = pond;
  const state = pond.peek();
  const version = meta?.version ?? "—";
  const season = meta?.season ?? "—";

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: headerHeight,
        // Clear the MiniPlayer. The 12rem here was a third hardcoded
        // guess at another component's height; --miniplayer-clearance is
        // defined once in globals.css and used by the footer too, so
        // there's one number to correct when the player changes.
        bottom: "calc(var(--miniplayer-clearance, 192px) + 16px)",
        zIndex: 50,
        width: "max-content",
        maxWidth: 520,
        padding: "14px 18px",
        background: COLOR.bg,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 2,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.06em",
        color: COLOR.ink,
        lineHeight: 1.55,
        backdropFilter: "blur(8px)",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        WebkitBackdropFilter: "blur(8px)" as any,
        pointerEvents: "auto",
        userSelect: "text",
        overflowY: "auto",
        overflowX: "hidden",
        // Subtle scrollbar styling — visible enough to know it's there,
        // not so loud it competes with the diagnostic content.
        scrollbarWidth: "thin",
        scrollbarColor: `${COLOR.border} transparent`,
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
      }}>
        <span style={{
          color: COLOR.inkStrong,
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
        }}>
          Pond Diagnostic
        </span>
        <span style={{ color: COLOR.inkFaint, fontSize: 9, letterSpacing: "0.24em" }}>
          ` to hide
        </span>
      </div>

      {/* ── Tab strip (only when ?dev=1 in URL) ──────────────── */}
      {devEnabled && (
        <div style={{
          display: "flex",
          gap: 0,
          marginBottom: 10,
          borderBottom: `1px solid ${COLOR.border}`,
        }}>
          <TabButton
            label="STATUS"
            active={tab === "status"}
            onClick={() => setTab("status")}
          />
          <TabButton
            label="DEV"
            active={tab === "dev"}
            onClick={() => setTab("dev")}
          />
        </div>
      )}

      {/* ── STATUS tab content ──────────────────────────────── */}
      <div style={{ display: tab === "status" ? "block" : "none" }}>

      {/* ── Connection & cadence ─────────────────────────────── */}
      <Row label="STATE">
        <Pulse connected={connected} />
        <span style={{
          color: connected ? COLOR.connected : COLOR.disconnected,
          marginLeft: 6,
        }}>
          {connected ? "CONNECTED" : "OFFLINE"}
        </span>
      </Row>
      <Row label="VERSION"><Val>{version}</Val></Row>
      <Row label="TICK"><Val>{state.tick.toLocaleString()}</Val></Row>
      <Row label="SNAP RATE">
        <ValColor v={snapshotRateHz} good={1.5} warn={0.5}>
          {snapshotRateHz.toFixed(2)} Hz
        </ValColor>
        <span style={{ color: COLOR.inkFaint, fontSize: 9, marginLeft: 6 }}>
          (expect 2.00)
        </span>
      </Row>
      <Row label="SEASON"><Val>{season}</Val></Row>
      <Row label="ALIVE"><Val>{state.fish.length}</Val> koi</Row>

      {/* ── Per-fish table ────────────────────────────────────── */}
      <div style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${COLOR.border}`,
      }}>
        <div style={{
          color: COLOR.inkFaint,
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Fish · snapshot positions (pond meters)
        </div>

        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 10,
        }}>
          <thead>
            <tr style={{ color: COLOR.inkFaint, fontSize: 9, letterSpacing: "0.14em" }}>
              <th style={th}>name</th>
              <th style={th}>stage</th>
              <th style={th}>x</th>
              <th style={th}>z</th>
              <th style={th}>sdf</th>
              <th style={th}>drift</th>
              <th style={th}>|v|</th>
              <th style={th}>hunger</th>
              <th style={th}>age</th>
              <th style={th}>snap ms</th>
            </tr>
          </thead>
          <tbody>
            {debug.map((k) => {
              const sdf = pondSDF(k.snapX, k.snapZ);
              const drift = Math.hypot(k.renderX - k.snapX, k.renderZ - k.snapZ);
              const vmag = Math.hypot(k.springVx, k.springVz);
              const shortName = (k.name ?? k.id).slice(0, 10);
              const h = k.hunger;
              const hungerColor =
                h === undefined ? COLOR.inkFaint :
                h >= 0.90       ? COLOR.bad     :  // starving
                h >= 0.55       ? COLOR.warn    :  // preoccupied
                                  COLOR.good;      // sated-ish
              return (
                <tr key={k.id} style={{
                  borderTop: `1px solid rgba(127,175,179,0.06)`,
                }}>
                  <td style={td}>{shortName}</td>
                  <td style={{ ...td, color: COLOR.inkFaint }}>
                    {(k.stage ?? "").slice(0, 3)}
                  </td>
                  <td style={td}>{k.snapX.toFixed(2)}</td>
                  <td style={td}>{k.snapZ.toFixed(2)}</td>
                  <td style={{ ...td, color: sdf > 0 ? COLOR.bad : sdf > -0.3 ? COLOR.warn : COLOR.good }}>
                    {sdf.toFixed(2)}
                  </td>
                  <td style={{ ...td, color: drift > 0.5 ? COLOR.warn : COLOR.ink }}>
                    {drift.toFixed(2)}
                  </td>
                  <td style={td}>{vmag.toFixed(3)}</td>
                  <td style={{ ...td, color: hungerColor }}>
                    {h === undefined ? "—" : h.toFixed(2)}
                  </td>
                  {/* Real koi life-age. tick_interval_ms from pond
                      meta tells us ms per tick; combined with
                      6 sim-hours per real-hour at REAL_SECONDS_PER_SIM_DAY
                      = 21600, ticks-per-sim-day = (21600 * 1000) /
                      tick_interval_ms. For young fish (< 1 day) show in
                      sim-hours for readability. */}
                  <td style={{ ...td, color: COLOR.ink }}>
                    {(() => {
                      if (k.ageTicks === undefined) return "—";
                      const tickIntervalMs = state.meta?.tick_interval_ms ?? 500;
                      const REAL_SECONDS_PER_SIM_DAY = 21600;
                      const ticksPerSimDay = (REAL_SECONDS_PER_SIM_DAY * 1000) / tickIntervalMs;
                      const ageDays = k.ageTicks / ticksPerSimDay;
                      if (ageDays < 1) {
                        const ageHours = ageDays * 24;
                        return ageHours.toFixed(1) + "h";
                      }
                      return ageDays.toFixed(1) + "d";
                    })()}
                  </td>
                  <td style={{ ...td, color: k.snapAgeMs > 1500 ? COLOR.bad : k.snapAgeMs > 700 ? COLOR.warn : COLOR.ink }}>
                    {Math.round(k.snapAgeMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Legend />
      </div>

      {/* ── Motion trace — overlaid path of every fish in pond-meters ── */}
      <div style={{
        marginTop: 14,
        paddingTop: 10,
        borderTop: `1px solid ${COLOR.border}`,
      }}>
        <div style={{
          color: COLOR.inkFaint,
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Motion trace · last 30s · raw backend
        </div>
        <MotionTrace
          traces={tracesRef.current}
          debug={debug}
          food={food}
        />
      </div>
      </div>{/* close STATUS tab wrapper */}

      {/* ── DEV tab content ──────────────────────────────────── */}
      {devEnabled && tab === "dev" && (
        <div>
          {/* Reproduction section */}
          <div style={{
            color: COLOR.inkFaint,
            fontSize: 9,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: 8,
            marginTop: 2,
          }}>
            Reproduction
          </div>
          <DevButton
            label="Trigger Spawn — Shiki × Kokutou"
            busy={adminBusy === "spawn"}
            onClick={async () => {
              setAdminBusy("spawn");
              setAdminLastResult("");
              const r = await postAdmin("/admin/spawn", {});
              setAdminBusy(null);
              setAdminLastResult(
                (r.ok ? "✓ " : "✗ ") + r.status + " — " + r.body
              );
            }}
          />
          <DevButton
            label="Force Hatch — all eggs"
            busy={adminBusy === "hatch"}
            onClick={async () => {
              setAdminBusy("hatch");
              setAdminLastResult("");
              const r = await postAdmin("/admin/hatch-all", {});
              setAdminBusy(null);
              setAdminLastResult(
                (r.ok ? "✓ " : "✗ ") + r.status + " — " + r.body
              );
            }}
          />
          <DevButton
            label="Clear All Eggs — remove without hatching"
            busy={adminBusy === "clear"}
            onClick={async () => {
              setAdminBusy("clear");
              setAdminLastResult("");
              const r = await postAdmin("/admin/clear-eggs", {});
              setAdminBusy(null);
              setAdminLastResult(
                (r.ok ? "✓ " : "✗ ") + r.status + " — " + r.body
              );
            }}
          />

          {/* Result line — shows the last admin call's status. */}
          {adminLastResult && (
            <div style={{
              marginTop: 10,
              padding: "6px 8px",
              background: "rgba(0,0,0,0.25)",
              border: `1px solid ${COLOR.border}`,
              borderRadius: 1,
              color: adminLastResult.startsWith("✓") ? COLOR.good : COLOR.bad,
              fontSize: 9,
              letterSpacing: "0.04em",
              wordBreak: "break-word",
              maxHeight: 80,
              overflowY: "auto",
            }}>
              {adminLastResult}
            </div>
          )}

          <div style={{
            color: COLOR.inkFaint,
            fontSize: 9,
            marginTop: 12,
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}>
            <div>buttons bypass the usual gates (proximity, bond permission,</div>
            <div>witness density) and call the worker directly. requires</div>
            <div>SHARED_SECRET — prompted on first use, cached in localStorage.</div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Motion trace plot ─────────────────────────────────────────────────────

function MotionTrace({
  traces, debug, food,
}: {
  traces: Map<string, TracePoint[]>;
  debug: DebugKine[];
  food: FoodFrame[];
}) {
  // Extents, projection, gourd contour and palettes all live at module
  // scope now — see GOURD_PATH above. This component is pure layout.
  const plotW = PLOT_W, plotH = PLOT_H;

  return (
    <svg
      width={plotW}
      height={plotH}
      style={{
        display: "block",
        background: "rgba(127, 175, 179, 0.03)",
        border: `1px solid ${COLOR.border}`,
      }}
    >
      {/* Gourd outline */}
      <path
        d={GOURD_PATH}
        fill="rgba(127, 175, 179, 0.05)"
        stroke="rgba(127, 175, 179, 0.30)"
        strokeWidth={1}
      />

      {/* Origin + axes */}
      {(() => {
        const [ox, oy] = worldToPlot(0, 0);
        return (
          <>
            <line x1={0} y1={oy} x2={plotW} y2={oy} stroke="rgba(127,175,179,0.08)" strokeWidth={0.5} />
            <line x1={ox} y1={0} x2={ox} y2={plotH} stroke="rgba(127,175,179,0.08)" strokeWidth={0.5} />
            <circle cx={ox} cy={oy} r={2} fill="rgba(127,175,179,0.35)" />
          </>
        );
      })()}

      {/* Food dots — drawn BEFORE fish so fish visit-points sit on top */}
      {food.map((f) => {
        const [fx, fy] = worldToPlot(f.x, f.z);
        return (
          <circle
            key={f.id}
            cx={fx} cy={fy}
            r={f.kind === "pellet" ? 2.5 : 1.8}
            fill={foodColor(f.kind)}
          />
        );
      })}

      {/* Traces */}
      {Array.from(traces.entries()).map(([id, pts]) => {
        if (pts.length < 2) return null;
        const color = fishColor(id);
        const d = pts.map((p, i) => {
          const [x, y] = worldToPlot(p.x, p.z);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        }).join("");
        return (
          <g key={id}>
            <path d={d} fill="none" stroke={color} strokeWidth={1} opacity={0.55} />
            {/* fade tail by rendering head dot bright */}
          </g>
        );
      })}

      {/* Current position dots — spring rendered (filled) + snapshot (hollow) */}
      {debug.map((k) => {
        const color = fishColor(k.id);
        const [sx, sy] = worldToPlot(k.snapX, k.snapZ);
        const [rx, ry] = worldToPlot(k.renderX, k.renderZ);
        return (
          <g key={k.id}>
            <circle cx={sx} cy={sy} r={3} fill="none" stroke={color} strokeWidth={1.2} />
            <circle cx={rx} cy={ry} r={2} fill={color} />
            <line x1={sx} y1={sy} x2={rx} y2={ry} stroke={color} strokeWidth={0.5} opacity={0.4} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{
      marginTop: 8,
      fontSize: 9,
      color: COLOR.inkFaint,
      letterSpacing: "0.08em",
      lineHeight: 1.6,
    }}>
      <div>sdf: &lt;-0.3 = safely inside · -0.3..0 = near wall · &gt;0 = <span style={{ color: COLOR.bad }}>OUTSIDE POND</span></div>
      <div>drift: spring-to-target distance in meters · high = spring catching up</div>
      <div>age: ms since last snapshot · should stay near 500</div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  textAlign: "right",
  padding: "4px 4px 4px 4px",
  fontWeight: 400,
  textTransform: "uppercase",
};
(th as React.CSSProperties & { [k: string]: unknown })[
  "textAlign"
] = "right";

const td: React.CSSProperties = {
  textAlign: "right",
  padding: "3px 4px",
  fontFamily: FONT_MONO,
  fontVariantNumeric: "tabular-nums",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
      <span style={{ color: COLOR.inkFaint, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.22em" }}>
        {label}
      </span>
      <span style={{ color: COLOR.ink, fontFamily: FONT_MONO, textAlign: "right" }}>
        {children}
      </span>
    </div>
  );
}

function TabButton({
  label, active, onClick,
}: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 10px",
        background: "transparent",
        border: "none",
        borderBottom: active
          ? `2px solid ${COLOR.inkStrong}`
          : "2px solid transparent",
        color: active ? COLOR.inkStrong : COLOR.inkFaint,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        cursor: "pointer",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = COLOR.ink;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = COLOR.inkFaint;
      }}
    >
      {label}
    </button>
  );
}

function DevButton({
  label, busy, onClick,
}: {
  label: string; busy: boolean; onClick: () => void | Promise<void>;
}) {
  return (
    <button
      onClick={() => { void onClick(); }}
      disabled={busy}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 10px",
        marginBottom: 6,
        background: busy ? "rgba(127, 175, 179, 0.15)" : "rgba(0, 0, 0, 0.25)",
        border: `1px solid ${busy ? COLOR.connected : COLOR.border}`,
        borderRadius: 1,
        color: busy ? COLOR.connected : COLOR.ink,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.08em",
        cursor: busy ? "wait" : "pointer",
        outline: "none",
        textAlign: "left",
        transition: "background 120ms, border-color 120ms, color 120ms",
      }}
    >
      {busy ? "· · · " + label : label}
    </button>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return <span style={{ color: COLOR.inkStrong }}>{children}</span>;
}

function ValColor({
  v, good, warn, children,
}: {
  v: number; good: number; warn: number; children: React.ReactNode;
}) {
  const color = v >= good ? COLOR.good : v >= warn ? COLOR.warn : COLOR.bad;
  return <span style={{ color }}>{children}</span>;
}

function Pulse({ connected }: { connected: boolean }) {
  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: 6, height: 6,
          borderRadius: "50%",
          background: connected ? COLOR.connected : COLOR.disconnected,
          boxShadow: connected
            ? `0 0 6px ${COLOR.connected}, 0 0 14px ${COLOR.connected}55`
            : "none",
          verticalAlign: "middle",
          animation: connected ? "pondPulse 2.2s ease-in-out infinite" : undefined,
        }}
      />
      <style>{`
        @keyframes pondPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
