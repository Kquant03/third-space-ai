"use client";

import { useEffect, useRef, useState } from "react";
import { usePond, type DebugKine, type FoodFrame } from "@/lib/usePond";
import { pondSDF } from "@/lib/pondGeometry";

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

// ── Trace storage (per fish, in-component refs) ──────────────────────────
interface TracePoint {
  t: number;     // performance.now() ms
  x: number;     // pond meters
  z: number;
}

const TRACE_WINDOW_MS = 30_000;
const TRACE_MAX_POINTS = 120;

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.NEXT_PUBLIC_POND_DIAG === "true") return true;
  return false;
}

export default function PondDiagnostic() {
  const [enabled, setEnabled] = useState(false);
  const [debug, setDebug] = useState<DebugKine[]>([]);
  const [food, setFood] = useState<FoodFrame[]>([]);
  const [snapshotRateHz, setSnapshotRateHz] = useState(0);

  // Measure snapshot cadence by counting tick changes per second.
  const lastTickRef = useRef<number>(-1);
  const tickSamplesRef = useRef<{ t: number; tick: number }[]>([]);

  // Per-fish trace history. Keyed by id → array of trace points.
  const tracesRef = useRef<Map<string, TracePoint[]>>(new Map());

  // Gate mount after first render so SSR and client agree.
  useEffect(() => { setEnabled(shouldShow()); }, []);

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
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        width: "max-content",
        maxWidth: 520,
        maxHeight: "calc(100vh - 32px)",
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
  // Plot extents: gourd bounding box with a little padding.
  // Gourd is roughly x ∈ [-4.6, 4.1], z ∈ [-3.6, 3.6].
  const minX = -5, maxX = 5;
  const minZ = -4, maxZ = 4;
  const plotW = 380, plotH = plotW * ((maxZ - minZ) / (maxX - minX));
  const worldToPlot = (x: number, z: number): [number, number] => [
    ((x - minX) / (maxX - minX)) * plotW,
    ((z - minZ) / (maxZ - minZ)) * plotH,
  ];

  // Gourd outline — sample 128 points along the SDF zero-contour
  const gourdPath = (() => {
    const pts: [number, number][] = [];
    const N = 128;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      // Ray-march outward from origin until hitting SDF = 0
      let r = 0.1;
      for (let j = 0; j < 40; j++) {
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const s = pondSDF(x, z);
        if (s > 0) break;
        r += Math.max(0.05, -s * 0.6);
      }
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      pts.push(worldToPlot(x, z));
    }
    return "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
  })();

  // Distinct colors per fish — deterministic from id
  const fishColor = (id: string): string => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const hue = ((h % 360) + 360) % 360;
    return `hsl(${hue}, 60%, 65%)`;
  };

  // Per-kind food colors. Pale and understated — food is ambient information,
  // the fish are the story. Pellet is the loudest because it's visitor-sourced.
  const foodColor = (kind: FoodFrame["kind"]): string => {
    switch (kind) {
      case "pollen":  return "rgba(230, 220, 140, 0.70)";  // pale yellow
      case "algae":   return "rgba(130, 180, 130, 0.70)";  // dull green
      case "insect":  return "rgba(220, 170, 110, 0.85)";  // warm amber
      case "pellet":  return "rgba(240, 240, 250, 0.95)";  // near-white
    }
  };

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
        d={gourdPath}
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
