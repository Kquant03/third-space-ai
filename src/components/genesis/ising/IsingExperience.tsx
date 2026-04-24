"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Ising · experience
//  ─────────────────────────────────────────────────────────────────────────
//  The full Ising laboratory. Composes the simulation, renderer, sparklines,
//  and phase indicator into a three-column page:
//
//    left     — parameter controls (T, J, H, speed, algorithm, events,
//               sweep, init-state, action buttons)
//    center   — canvas with viz-mode legend and Onsager reference
//    right    — observable sparklines (M, |M|, E, χ, C_v, U_L) + theory
//
//  State and rAF loop are owned here. The simulation core is pure TS in
//  simulation.ts and renderer.ts — this file is ~all UI and orchestration.
//
//  Social mode (Tsarev et al. 2019) reskins the physics labels into social-
//  science terms without changing any math. The mapping is presented in a
//  theory panel on the right.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";

import {
  SubstratePlate,
  SectionEyebrow,
} from "@/components/genesis/SubstrateFrame";
import {
  Stage,
  ControlSection,
  Slider,
  Button,
  Toggle,
  PresetRow,
  EquationBlock,
  CanvasSurface,
  TelemetryNote,
} from "@/components/genesis/SubstrateControls";

import {
  TC,
  createGrid,
  metropolisSweep,
  wolffCluster,
  computeObservables,
  onsagerMag,
  StatAccumulator,
  BINDER_CRITICAL,
  type GridInit,
} from "./simulation";
import { renderGrid, type VizMode } from "./renderer";
import { Sparkline } from "./Sparkline";
import { PhaseIndicator } from "./PhaseIndicator";

const COLOR = {
  void: "#010106",
  voidSoft: "#0a0f1a",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
  ghostSoft: "#5d8a8e",
  sanguine: "#9a2b2b",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ─── Simulation constants ─────────────────────────────────────────────────
const GRID_SIZE = 128;
const CELL_SIZE = 4;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 512
const SPARK_W = 260;
const SPARK_H = 46;

// ─── Algorithm / mode types ───────────────────────────────────────────────
type Algorithm = "metropolis" | "wolff";
type NewsEvent = "positive" | "negative" | null;

// ─── Label maps — social mode uses Tsarev 2019 vocabulary ────────────────

type Labels = {
  temperature: string;
  coupling: string;
  field: string;
  mag: string;
  absMag: string;
  energy: string;
  chi: string;
  cv: string;
  binder: string;
  events: string;
  positive: string;
  negative: string;
};

const PHYSICS_LABELS: Labels = {
  temperature: "temperature · T",
  coupling: "coupling · J",
  field: "external field · H",
  mag: "magnetization ⟨M⟩",
  absMag: "order param |M|",
  energy: "energy ⟨E⟩/N",
  chi: "susceptibility χ",
  cv: "specific heat C_v",
  binder: "Binder cumulant U_L",
  events: "field events",
  positive: "+ positive",
  negative: "− negative",
};

const SOCIAL_LABELS: Labels = {
  temperature: "social noise",
  coupling: "conformity pressure",
  field: "media influence",
  mag: "consensus ⟨σ⟩",
  absMag: "polarization |σ|",
  energy: "social tension",
  chi: "community susceptibility",
  cv: "volatility",
  binder: "cohesion U_L",
  events: "media events",
  positive: "+ viral positive",
  negative: "− crisis event",
};

// ───────────────────────────────────────────────────────────────────────────

export function IsingExperience() {
  // ── Refs (non-reactive sim state) ───────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<Int8Array>(createGrid(GRID_SIZE));
  const animRef = useRef<number | null>(null);
  const statsRef = useRef<StatAccumulator>(new StatAccumulator(300));
  const sweepCountRef = useRef(0);
  // Ref mirror of the sweep state so the rAF loop doesn't re-bind every
  // setState. `setSweepT` triggers the UI update; the ref drives the math.
  const sweepRef = useRef<{ active: boolean; T: number; dir: number }>({
    active: false,
    T: 0.5,
    dir: 1,
  });

  // ── UI state ────────────────────────────────────────────────────
  const [running, setRunning] = useState(true);
  const [temperature, setTemperature] = useState(TC);
  const [coupling, setCoupling] = useState(1.0);
  const [externalField, setExternalField] = useState(0.0);
  const [sweepSpeed, setSweepSpeed] = useState(3);
  const [algorithm, setAlgorithm] = useState<Algorithm>("metropolis");
  const [vizMode, setVizMode] = useState<VizMode>("spin");
  const [newsEvent, setNewsEvent] = useState<NewsEvent>(null);
  const [socialMode, setSocialMode] = useState(false);

  // Observable histories (fixed-length rolling windows stored as state
  // so sparklines re-render; 500-sample cap is tight enough to not break
  // re-render cost even at high frame rates).
  const [magHistory, setMagHistory] = useState<number[]>([]);
  const [absMagHistory, setAbsMagHistory] = useState<number[]>([]);
  const [energyHistory, setEnergyHistory] = useState<number[]>([]);
  const [chiHistory, setChiHistory] = useState<number[]>([]);
  const [cvHistory, setCvHistory] = useState<number[]>([]);
  const [binderHistory, setBinderHistory] = useState<number[]>([]);

  const [clusterInfo, setClusterInfo] = useState<{
    count: number;
    maxSize: number;
  }>({ count: 0, maxSize: 0 });
  const [wallInfo, setWallInfo] = useState<{ count: number }>({ count: 0 });
  const [currentObs, setCurrentObs] = useState({
    magnetization: 0,
    energy: 0,
    absMag: 0,
  });
  const [sweepCount, setSweepCount] = useState(0);
  const [lastClusterSize, setLastClusterSize] = useState(0);

  // Sweep UI mirror of sweepRef state
  const [sweepActive, setSweepActive] = useState(false);
  const [sweepT, setSweepT] = useState(0.5);

  const labels = socialMode ? SOCIAL_LABELS : PHYSICS_LABELS;

  // ── Render a single canvas frame from current gridRef ──────────
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stats = renderGrid(
      ctx,
      gridRef.current,
      GRID_SIZE,
      CANVAS_SIZE,
      CELL_SIZE,
      vizMode,
      coupling,
    );
    if (stats.clusterCount !== undefined && stats.maxClusterSize !== undefined) {
      setClusterInfo({
        count: stats.clusterCount,
        maxSize: stats.maxClusterSize,
      });
    }
    if (stats.wallCount !== undefined) {
      setWallInfo({ count: stats.wallCount });
    }
  }, [vizMode, coupling]);

  // Paint on viz-mode change so the reader sees it immediately even if paused.
  useEffect(() => {
    repaint();
  }, [vizMode, repaint]);

  // ── Main simulation loop ───────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    let active = true;

    const step = () => {
      if (!active) return;

      // Temperature sweep bookkeeping — reads/writes sweepRef, mirrors to
      // the UI via setSweepT. When the sweep falls below 0.3 we terminate.
      if (sweepRef.current.active) {
        sweepRef.current.T += sweepRef.current.dir * 0.008;
        if (sweepRef.current.T > 4.5) sweepRef.current.dir = -1;
        if (sweepRef.current.T < 0.3) {
          sweepRef.current.dir = 1;
          sweepRef.current.active = false;
          setSweepActive(false);
        }
        setSweepT(sweepRef.current.T);
      }

      const effTemp = sweepRef.current.active ? sweepRef.current.T : temperature;
      const effBeta = 1.0 / effTemp;
      const effectiveH =
        externalField +
        (newsEvent === "positive" ? 0.15 : newsEvent === "negative" ? -0.15 : 0);

      if (algorithm === "wolff") {
        // Wolff: run until total flipped >= N² * sweepSpeed (comparable
        // work budget to Metropolis so the speed knob means the same thing).
        let totalFlipped = 0;
        let lastCS = 0;
        while (totalFlipped < GRID_SIZE * GRID_SIZE * sweepSpeed) {
          const { clusterSize } = wolffCluster(
            gridRef.current,
            GRID_SIZE,
            effBeta,
            coupling,
          );
          totalFlipped += clusterSize;
          lastCS = clusterSize;
        }
        setLastClusterSize(lastCS);
      } else {
        for (let i = 0; i < sweepSpeed; i++) {
          metropolisSweep(
            gridRef.current,
            GRID_SIZE,
            effBeta,
            coupling,
            effectiveH,
          );
        }
      }

      sweepCountRef.current += sweepSpeed;
      const obs = computeObservables(
        gridRef.current,
        GRID_SIZE,
        coupling,
        effectiveH,
      );
      statsRef.current.push(obs.magnetization, obs.absMag, obs.energy);

      const chi = statsRef.current.susceptibility(effTemp, GRID_SIZE);
      const cv = statsRef.current.specificHeat(effTemp, GRID_SIZE);
      const binder = statsRef.current.binderCumulant();

      setCurrentObs({
        magnetization: obs.magnetization,
        energy: obs.energy,
        absMag: obs.absMag,
      });
      setSweepCount(sweepCountRef.current);

      // Tail-appended histories with 500-sample cap.
      const pushCapped = (prev: number[], v: number) => {
        const n = [...prev, v];
        return n.length > 500 ? n.slice(-500) : n;
      };
      setMagHistory((p) => pushCapped(p, obs.magnetization));
      setAbsMagHistory((p) => pushCapped(p, obs.absMag));
      setEnergyHistory((p) => pushCapped(p, obs.energy));
      setChiHistory((p) => pushCapped(p, chi));
      setCvHistory((p) => pushCapped(p, cv));
      setBinderHistory((p) => pushCapped(p, binder));

      repaint();
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      active = false;
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [
    running,
    temperature,
    coupling,
    externalField,
    sweepSpeed,
    algorithm,
    newsEvent,
    repaint,
  ]);

  // ── Actions ─────────────────────────────────────────────────────
  const resetSimulation = useCallback(() => {
    gridRef.current = createGrid(GRID_SIZE);
    sweepCountRef.current = 0;
    statsRef.current = new StatAccumulator(300);
    setMagHistory([]);
    setAbsMagHistory([]);
    setEnergyHistory([]);
    setChiHistory([]);
    setCvHistory([]);
    setBinderHistory([]);
    setSweepCount(0);
    setNewsEvent(null);
    setLastClusterSize(0);
    sweepRef.current = { active: false, T: 0.5, dir: 1 };
    setSweepActive(false);
    repaint();
  }, [repaint]);

  const startSweep = useCallback(() => {
    sweepRef.current = { active: true, T: 0.5, dir: 1 };
    setSweepActive(true);
    statsRef.current = new StatAccumulator(300);
  }, []);

  const reinit = useCallback(
    (mode: GridInit) => {
      gridRef.current = createGrid(GRID_SIZE, mode);
      statsRef.current = new StatAccumulator(300);
      sweepCountRef.current = 0;
      setSweepCount(0);
      repaint();
    },
    [repaint],
  );

  // ── Derived display values ─────────────────────────────────────
  const effTemp = sweepActive ? sweepT : temperature;
  const chi = statsRef.current.susceptibility(effTemp, GRID_SIZE);
  const cv = statsRef.current.specificHeat(effTemp, GRID_SIZE);
  const binder = statsRef.current.binderCumulant();

  const algorithmLabel =
    algorithm === "wolff" ? "Wolff cluster" : "Metropolis–Hastings";
  const vizLabel =
    vizMode === "cluster"
      ? " · Hoshen-Kopelman"
      : vizMode === "walls"
        ? " · Domain walls"
        : vizMode === "energy"
          ? " · Energy density"
          : "";

  // ───────────────────────────────────────────────────────────────
  //  Render
  // ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Hero pullquote ─────────────────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(28px, 3.8vw, 44px)",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: COLOR.ink,
            maxWidth: "30ch",
          }}
        >
          Spin correlations sharpen.{" "}
          <span style={{ color: COLOR.inkMuted }}>
            Domains braid. The lattice commits.
          </span>
        </div>
        <p
          style={{
            marginTop: 24,
            maxWidth: "62ch",
            fontFamily: FONT.body,
            fontSize: 16.5,
            lineHeight: 1.7,
            color: COLOR.inkBody,
          }}
        >
          The 2D Ising model is the smallest system that exhibits a phase
          transition with every expected observable: an order parameter,
          a diverging susceptibility, a specific-heat singularity, a
          universal Binder cumulant at criticality. Metropolis-Hastings
          gives you the honest sluggishness of single-spin dynamics; Wolff
          defeats critical slowing down by flipping whole correlated
          clusters at once. {socialMode ? (
            <>Under Tsarev et al. (2019)&apos;s mapping, the same lattice
            models collective opinion dynamics — spins become viewpoints,
            coupling becomes conformity, the external field becomes media
            influence.</>
          ) : (
            <>Onsager (1944) solved it exactly. We sample from it.</>
          )}
        </p>
        <div
          style={{
            marginTop: 28,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          Ising (1925) · Onsager (1944) · Wolff (1989) ·{" "}
          {socialMode ? "Tsarev et al. (2019)" : "Kamieniarz-Blöte (1993)"}
        </div>
      </SubstratePlate>

      {/* ── Mode toggles bar ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <ToggleGroup<VizMode>
          label="viz"
          options={[
            { id: "spin", label: "Spin" },
            { id: "cluster", label: "Cluster" },
            { id: "walls", label: "Walls" },
            { id: "energy", label: "Energy" },
          ]}
          active={vizMode}
          onSelect={setVizMode}
        />
        <ToggleGroup<Algorithm>
          label="algorithm"
          options={[
            { id: "metropolis", label: "Metropolis" },
            { id: "wolff", label: "Wolff" },
          ]}
          active={algorithm}
          onSelect={setAlgorithm}
        />
        <ToggleGroup<"physics" | "social">
          label="reading"
          options={[
            { id: "physics", label: "Physics" },
            { id: "social", label: "Social" },
          ]}
          active={socialMode ? "social" : "physics"}
          onSelect={(id) => setSocialMode(id === "social")}
        />
      </div>

      {/* ── Three-column lab layout ───────────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <div
          className="ising-lab-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr) 300px",
            gap: "clamp(20px, 2.5vw, 36px)",
            alignItems: "start",
          }}
        >
          {/* ═══ LEFT: parameter controls ═══ */}
          <div>
            <PhaseIndicator T={effTemp} socialMode={socialMode} />

            <ControlSection title={labels.temperature} compact>
              <Slider
                label="T"
                value={effTemp}
                min={0.1}
                max={5.0}
                step={0.01}
                onChange={(v) => {
                  if (!sweepActive) setTemperature(v);
                }}
                format={(v) => v.toFixed(3)}
                accent={
                  effTemp < TC * 0.88
                    ? COLOR.ghost
                    : effTemp > TC * 1.12
                      ? COLOR.inkMuted
                      : COLOR.sanguine
                }
                hint={`T_c = ${TC.toFixed(3)}. Below: ordered. Above: disordered.`}
              />
            </ControlSection>

            <ControlSection title={labels.coupling} compact>
              <Slider
                label="J"
                value={coupling}
                min={0.0}
                max={2.0}
                step={0.01}
                onChange={setCoupling}
                format={(v) => v.toFixed(2)}
                hint={
                  socialMode
                    ? "Strength of peer influence and group conformity."
                    : "Nearest-neighbour interaction strength."
                }
              />
            </ControlSection>

            <ControlSection title={labels.field} compact>
              <Slider
                label="H"
                value={externalField}
                min={-1.0}
                max={1.0}
                step={0.01}
                onChange={setExternalField}
                format={(v) => v.toFixed(2)}
                hint={
                  socialMode
                    ? "Global media/narrative push. Tsarev's s-photon field."
                    : "Zeeman coupling to external magnetic field."
                }
              />
            </ControlSection>

            <ControlSection title="speed" compact>
              <Slider
                label="sweeps/frame"
                value={sweepSpeed}
                min={1}
                max={10}
                step={1}
                onChange={(v) => setSweepSpeed(Math.round(v))}
                format={(v) => `${Math.round(v)}×`}
              />
            </ControlSection>

            <ControlSection title={labels.events} compact>
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  onClick={() =>
                    setNewsEvent((n) => (n === "positive" ? null : "positive"))
                  }
                  active={newsEvent === "positive"}
                  variant="default"
                  fullWidth
                >
                  {labels.positive}
                </Button>
                <Button
                  onClick={() =>
                    setNewsEvent((n) => (n === "negative" ? null : "negative"))
                  }
                  active={newsEvent === "negative"}
                  variant="default"
                  fullWidth
                >
                  {labels.negative}
                </Button>
              </div>
            </ControlSection>

            <ControlSection title="playback" compact>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Button
                  variant="primary"
                  active={running}
                  onClick={() => setRunning(!running)}
                  fullWidth
                >
                  {running ? "pause" : "run"}
                </Button>
                <Button onClick={resetSimulation} fullWidth>
                  reset
                </Button>
              </div>
              <Button
                onClick={startSweep}
                disabled={sweepActive}
                active={sweepActive}
                variant="default"
                fullWidth
              >
                {sweepActive
                  ? `sweeping T = ${sweepT.toFixed(2)}`
                  : "▷ auto temperature sweep"}
              </Button>
            </ControlSection>

            <ControlSection title="initial state" compact>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => reinit("allUp")}
                  className="genesis-hover-ghost"
                  style={initBtnStyle(COLOR.sanguine)}
                >
                  all +1
                </button>
                <button
                  type="button"
                  onClick={() => reinit("allDown")}
                  className="genesis-hover-ghost"
                  style={initBtnStyle(COLOR.ghost)}
                >
                  all −1
                </button>
                <button
                  type="button"
                  onClick={() => reinit("random")}
                  className="genesis-hover-ghost"
                  style={initBtnStyle(COLOR.inkMuted)}
                >
                  random
                </button>
              </div>
            </ControlSection>

            <TelemetryNote>
              {sweepCount.toLocaleString()} sweeps · {GRID_SIZE}² lattice
              {algorithm === "wolff" && lastClusterSize > 0 && (
                <>
                  {" "}
                  · last cluster: {lastClusterSize.toLocaleString()}
                </>
              )}
            </TelemetryNote>
          </div>

          {/* ═══ CENTER: canvas ═══ */}
          <div>
            <CanvasSurface aspectRatio="1 / 1">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  imageRendering: "pixelated",
                }}
              />
            </CanvasSurface>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 18,
                marginTop: 10,
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.08em",
              }}
            >
              {vizMode === "spin" && (
                <>
                  <LegendDot color={COLOR.sanguine} label="+1 spin" />
                  <LegendDot color={COLOR.ghost} label="−1 spin" />
                </>
              )}
              {vizMode === "cluster" && (
                <>
                  <LegendDot
                    color="#d4b45c"
                    label={`largest cluster (${clusterInfo.maxSize.toLocaleString()})`}
                  />
                  <span style={{ color: COLOR.inkMuted }}>
                    {clusterInfo.count} clusters
                  </span>
                </>
              )}
              {vizMode === "walls" && (
                <LegendDot
                  color={COLOR.ghost}
                  label={`domain walls (${wallInfo.count.toLocaleString()} bonds)`}
                />
              )}
              {vizMode === "energy" && (
                <>
                  <LegendDot color="#4a6a9a" label="low E" />
                  <LegendDot color={COLOR.inkMuted} label="zero" />
                  <LegendDot color={COLOR.sanguine} label="high E" />
                </>
              )}
            </div>

            {/* Onsager reference */}
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "rgba(10, 15, 26, 0.4)",
                border: `1px solid ${COLOR.inkGhost}`,
                borderLeft: `2px solid ${COLOR.ghost}`,
                fontFamily: FONT.mono,
                fontSize: 11,
                lineHeight: 1.65,
                color: COLOR.inkMuted,
              }}
            >
              {socialMode ? (
                <>
                  Dicke superradiant mapping: T &lt; T_c → coherent consensus ·
                  T &gt; T_c → opinion disorder
                </>
              ) : (
                <>
                  Onsager exact: m₀(T) = [1 − sinh⁻⁴(2J/T)]^(1/8) →{" "}
                  <span style={{ color: COLOR.ghost, fontWeight: 500 }}>
                    m₀({effTemp.toFixed(2)}) ={" "}
                    {onsagerMag(effTemp, coupling).toFixed(4)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ═══ RIGHT: observables ═══ */}
          <div>
            <SectionEyebrow>
              {socialMode ? "social observables" : "thermodynamic observables"}
            </SectionEyebrow>
            <div style={{ marginTop: 16 }}>
              <Sparkline
                data={magHistory}
                width={SPARK_W}
                height={SPARK_H}
                label={labels.mag}
                value={currentObs.magnetization}
                min={-1}
                max={1}
                criticalLine={0}
                accent={COLOR.ghost}
              />
              <Sparkline
                data={absMagHistory}
                width={SPARK_W}
                height={SPARK_H}
                label={labels.absMag}
                value={currentObs.absMag}
                min={0}
                max={1}
                accent={COLOR.inkStrong}
              />
              <Sparkline
                data={energyHistory}
                width={SPARK_W}
                height={SPARK_H}
                label={labels.energy}
                value={currentObs.energy}
                unit={socialMode ? "" : "J"}
                accent={COLOR.ghostSoft}
              />
              <Sparkline
                data={chiHistory}
                width={SPARK_W}
                height={SPARK_H}
                label={labels.chi}
                value={chi}
                format={(v) => (v > 999 ? v.toExponential(1) : v.toFixed(1))}
                accent={COLOR.ghost}
              />
              <Sparkline
                data={cvHistory}
                width={SPARK_W}
                height={SPARK_H}
                label={labels.cv}
                value={cv}
                format={(v) => (v > 999 ? v.toExponential(1) : v.toFixed(1))}
                accent={COLOR.ghostSoft}
              />
              <Sparkline
                data={binderHistory}
                width={SPARK_W}
                height={SPARK_H}
                label={labels.binder}
                value={binder}
                min={0}
                max={0.7}
                criticalLine={BINDER_CRITICAL}
                format={(v) => v.toFixed(4)}
                accent={COLOR.ink}
              />
            </div>

            {/* Theory panel */}
            {socialMode ? (
              <EquationBlock title="Tsarev–Dicke mapping">
                P (arousal) = collective polarization
                <br />
                S (valence) = population imbalance
                <br />
                H (s-field) = information quanta
                <br />
                χ = community susceptibility
                <br />
                <br />
                T &lt; T_c → superradiant consensus
                <br />
                coherent social energy release
                <br />
                P² + S² = 1/4 (Russell circumplex)
              </EquationBlock>
            ) : (
              <EquationBlock
                title="critical exponents (exact, 2D Ising)"
                note={
                  <>
                    T_c = 2/ln(1+√2) ≈ {TC.toFixed(6)}
                    <br />
                    U* ≈ 0.6107 (Binder cumulant crossing)
                    <br />χ_max ∼ L^(γ/ν) = L^(7/4)
                  </>
                }
              >
                β = 1/8 · γ = 7/4 · ν = 1<br />
                α = 0 (log) · η = 1/4 · δ = 15
              </EquationBlock>
            )}
          </div>
        </div>

        <style>{`
          @media (max-width: 1100px) {
            .ising-lab-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </SubstratePlate>

      {/* ── Reading note ──────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "56rem",
          margin: "0 auto 64px",
          fontFamily: FONT.body,
          fontSize: 15.5,
          lineHeight: 1.72,
          color: COLOR.inkBody,
        }}
      >
        <SectionEyebrow>
          {socialMode
            ? "on the social reading"
            : "what to watch"}
        </SectionEyebrow>
        {socialMode ? (
          <>
            <p style={{ marginTop: 16 }}>
              Tsarev, Trofimova, Alodjants &amp; Khrennikov (2019) showed
              that the Dicke superradiant phase transition and the 2D Ising
              transition share an effective Hamiltonian — so the same
              observables describe collective opinion dynamics. Conformity
              pressure is the coupling J; social noise is T; media narrative
              pushes are H. What looks like a temperature sweep of a
              ferromagnet is also a model of how consensus fragments as a
              community's tolerance for disagreement grows.
            </p>
            <p>
              This is not metaphor. It is the same differential structure,
              sampled with the same Monte Carlo kernel. The physicist and
              the social scientist are looking at one system.
            </p>
          </>
        ) : (
          <>
            <p style={{ marginTop: 16 }}>
              Set T a hair above T_c and switch to the{" "}
              <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
                cluster
              </em>{" "}
              view. You&apos;ll see the percolating cluster — the one that
              touches opposite edges — struggle to maintain itself. The
              fractal dimension of that cluster at criticality is exactly
              d_F = 91/48 ≈ 1.896. Domain walls form SLE(3) curves with
              fractal dimension 11/8.
            </p>
            <p>
              Watch the Binder cumulant sparkline near T_c. It should hover
              near the universal value U* ≈ 0.6107, indicated by the dashed
              sanguine guide line. Below T_c it rises toward 2/3; above T_c
              it falls toward 0. The crossing is how you locate T_c without
              knowing it in advance — it is the method that lets you measure
              critical temperatures in materials whose exact solutions you
              don&apos;t have.
            </p>
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

function ToggleGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px 6px 14px",
        border: `1px solid ${COLOR.inkGhost}`,
        borderRadius: 2,
        background: "rgba(10, 15, 26, 0.35)",
      }}
    >
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
        }}
      >
        {label}
      </span>
      <Toggle<T> options={options} active={active} onSelect={onSelect} />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: COLOR.inkMuted,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

function initBtnStyle(accent: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 4px",
    borderRadius: 2,
    background: "transparent",
    border: `1px solid ${COLOR.inkGhost}60`,
    color: accent,
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.25s ease",
  };
}
