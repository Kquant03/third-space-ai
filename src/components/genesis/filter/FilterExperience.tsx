"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · FilterExperience
//  ─────────────────────────────────────────────────────────────────────────
//  The big client component that composes the full Filter artifact:
//
//    · hero pullquote (rhetorical callout after the masthead)
//    · Tier 0 — overview plate (phase plot + short reading guide)
//    · self-explanation prompt (Rozenblit & Keil intervention)
//    · Tier 1 — scrollytelling derivation (6 beats, sticky plot,
//               You-Draw-It with scoring at beat 6)
//    · naïve-grabby refutation (3 steps, each breaks against a bound)
//    · Tier 2 — sandbox (scenario × strategy × constants × sweep-σ
//               with small-multiples invariance check)
//    · loopholes (what the bound does not rule out)
//    · Tier 3 drawer (mounted as a fixed overlay; opens on envelope click)
//
//  Import from the substrate page; this component is where the Filter
//  experience actually lives.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from "react";

import {
  SubstratePlate,
  SectionEyebrow,
} from "@/components/genesis/SubstrateFrame";
import {
  Stage,
  ControlSection,
  Slider,
  Button,
  PresetRow,
  StatRow,
} from "@/components/genesis/SubstrateControls";

import {
  LAMBDA_DEFAULT,
  T_DEFAULT,
  V_DEFAULT,
  L_SUN,
  SEC_PER_YR,
  TAU_AGENT_MAX,
  kTln2,
  L_env,
  tau_star,
  fmtSci,
  fmtTau,
  fmtL_m,
} from "@/components/genesis/filter/physics";
import {
  SCENARIO_LIST,
  SCENARIOS,
  STRATEGY_LIST,
  BEAT_VISIBILITY,
  ScenarioId,
  StrategyId,
} from "@/components/genesis/filter/scenarios";
import { PhasePlot } from "@/components/genesis/filter/PhasePlot";
import {
  PredictionCurve,
  makeInitialPrediction,
  scorePrediction,
  PredictionPoint,
} from "@/components/genesis/filter/PredictionCurve";
import { TrajectoryRender } from "@/components/genesis/filter/TrajectoryRender";
import { DerivationDrawer } from "@/components/genesis/filter/DerivationDrawer";
import { LoopholesPanel } from "@/components/genesis/filter/LoopholesPanel";
import { SmallMultiples } from "@/components/genesis/filter/SmallMultiples";
import { RefutationStep } from "@/components/genesis/filter/RefutationStep";

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

// ───────────────────────────────────────────────────────────────────────────

export function FilterExperience() {
  // ── Tier 1 scrollytelling state ─────────────────────────────────
  const [beatIdx, setBeatIdx] = useState(0);
  const [prediction, setPrediction] = useState<PredictionPoint[]>(() =>
    makeInitialPrediction(9),
  );
  const [selfExplanation, setSelfExplanation] = useState("");

  // ── Tier 2 sandbox state ────────────────────────────────────────
  const [sbScenario, setSbScenario] = useState<ScenarioId>("galactic");
  const [sbStrategy, setSbStrategy] = useState<StrategyId>("monolithic");
  const [sbLam, setSbLam] = useState(LAMBDA_DEFAULT);
  const [sbT, setSbT] = useState(T_DEFAULT);
  const [sbSweep, setSbSweep] = useState(false);
  const [sbPlaying, setSbPlaying] = useState(false);
  const [sbProgress, setSbProgress] = useState(0);

  // ── Tier 3 drawer ───────────────────────────────────────────────
  const [drawerSeg, setDrawerSeg] = useState<"LR" | "LE" | "cusp" | null>(null);

  // ── Playback loop for sandbox trajectory ────────────────────────
  useEffect(() => {
    if (!sbPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setSbProgress((p) => {
        const np = p + dt / 8; // 8 s full playback
        if (np >= 1) {
          setSbPlaying(false);
          return 1;
        }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sbPlaying]);

  const resetSandbox = () => {
    setSbPlaying(false);
    setSbProgress(0);
  };
  const playSandbox = () => {
    if (sbProgress >= 1) setSbProgress(0);
    setSbPlaying(true);
  };

  // ── Prediction score (computed against default constants) ───────
  const predScore = useMemo(
    () => scorePrediction(prediction, LAMBDA_DEFAULT, T_DEFAULT, V_DEFAULT, L_SUN),
    [prediction],
  );

  const beatVis = BEAT_VISIBILITY[beatIdx] ?? BEAT_VISIBILITY[0];

  // PhasePlot's prediction-render delegate — lets PhasePlot keep its SVG
  // coord space while PredictionCurve owns its interaction logic.
  const renderPrediction = (
    pts: PredictionPoint[],
    editable: boolean,
    onChange?: (p: PredictionPoint[]) => void,
  ) => (
    <PredictionCurve points={pts} editable={editable} onChange={onChange} />
  );

  return (
    <>
      {/* ───────────────────────  HERO PULLQUOTE  ─────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(32px, 4.5vw, 56px)",
            lineHeight: 1.12,
            letterSpacing: "-0.01em",
            color: COLOR.ink,
            maxWidth: "26ch",
          }}
        >
          The filter envelope{" "}
          <span style={{ color: COLOR.inkMuted }}>does not care</span>{" "}
          how you fragment.
        </div>
        <p
          style={{
            marginTop: 28,
            maxWidth: "60ch",
            fontFamily: FONT.body,
            fontSize: 17.5,
            lineHeight: 1.7,
            color: COLOR.inkBody,
          }}
        >
          Three information-theoretic bounds compose into a feasibility
          envelope in (τ, L) phase space. A civilization attempting to be
          both large and responsive crosses it. Architected cost-sharing
          fission inherits the envelope under the rescaling L → D rather
          than escaping it.
        </p>
        <div
          style={{
            marginTop: 32,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
          }}
        >
          Composing Landauer (1961) · Lieb–Robinson (1972) · Sivak–Crooks
          (2012) via Zhong & DeWeese (2024)
        </div>
      </SubstratePlate>

      {/* ─────────────────────────  TIER 0  ───────────────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <SectionEyebrow>Tier 0 · overview</SectionEyebrow>
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "minmax(0, 2.2fr) minmax(260px, 1fr)",
            gap: "clamp(24px, 3vw, 48px)",
            alignItems: "start",
          }}
          className="filter-t0-grid"
        >
          <div>
            <PhasePlot
              show={{
                axes: true,
                agentBand: true,
                infeasible: true,
                L_R: true,
                L_E: true,
                envelope: true,
                tauStar: true,
              }}
              label="Composition of three information-theoretic bounds"
              onEnvelopeClick={(seg) => setDrawerSeg(seg)}
            />
          </div>
          <div>
            <p
              style={{
                fontFamily: FONT.body,
                fontSize: 15.5,
                lineHeight: 1.7,
                color: COLOR.inkBody,
                margin: 0,
              }}
            >
              <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
                Read the plot as a map of what a civilization can do.
              </em>{" "}
              The horizontal axis is its response timescale; the vertical is
              how far across space it coordinates a single state. The bright
              line is the envelope — where the composed bounds bite. Anything
              above it cannot exist as a coordinated agent.
            </p>
            <p
              style={{
                marginTop: 20,
                fontFamily: FONT.display,
                fontStyle: "italic",
                fontSize: 14,
                lineHeight: 1.55,
                color: COLOR.inkFaint,
              }}
            >
              Click any segment of the envelope to open its derivation audit.
            </p>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .filter-t0-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </SubstratePlate>

      {/* ──────────────────  SELF-EXPLANATION PROMPT  ────────────── */}
      <div
        style={{
          maxWidth: "52rem",
          margin: "0 auto 64px",
        }}
      >
        <div
          style={{
            padding: "clamp(24px, 3vw, 40px) clamp(24px, 3vw, 44px)",
            border: `1px solid ${COLOR.inkGhost}`,
            borderLeft: `2px solid ${COLOR.ghost}`,
            background: "rgba(10, 15, 26, 0.5)",
          }}
        >
          <SectionEyebrow color={COLOR.ghost}>
            a moment before we begin
          </SectionEyebrow>
          <p
            style={{
              marginTop: 14,
              marginBottom: 16,
              fontFamily: FONT.body,
              fontSize: 16.5,
              lineHeight: 1.65,
              color: COLOR.inkBody,
            }}
          >
            <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
              In one sentence:
            </em>{" "}
            how does a galaxy-spanning civilization dissipate the heat of
            its own computations?
          </p>
          <textarea
            className="genesis-textarea"
            rows={3}
            placeholder="(write freely — nothing is sent anywhere)"
            value={selfExplanation}
            onChange={(e) => setSelfExplanation(e.target.value)}
          />
          <p
            style={{
              marginTop: 12,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontSize: 13,
              lineHeight: 1.55,
              color: COLOR.inkFaint,
            }}
          >
            Rozenblit &amp; Keil (2002) called this the illusion of
            explanatory depth. We tend to overestimate how well we
            understand mechanisms until we try to write them down.
          </p>
        </div>
      </div>

      {/* ─────────────────────────  TIER 1  ───────────────────────── */}
      <div style={{ marginBottom: 72 }}>
        <SectionEyebrow>Tier 1 · derivation, in six beats</SectionEyebrow>
        <h2
          style={{
            marginTop: 14,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: COLOR.ink,
            maxWidth: "28ch",
          }}
        >
          Scroll with us. The wall builds itself.
        </h2>

        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(360px, 1fr)",
            gap: "clamp(32px, 5vw, 72px)",
            alignItems: "start",
          }}
          className="filter-t1-grid"
        >
          {/* Sticky phase plot + prediction verdict card. */}
          <div style={{ position: "sticky", top: 32 }}>
            <PhasePlot
              show={beatVis}
              prediction={beatIdx >= 1 && beatIdx <= 6 ? prediction : undefined}
              predictionEditable={beatIdx === 1}
              onPredictionChange={setPrediction}
              predictionRender={renderPrediction}
            />
            {beatIdx === 6 && predScore && (
              <PredictionVerdict score={predScore} />
            )}
          </div>

          {/* Scroll beats. */}
          <div>
            <ScrollBeat id={1} onActive={setBeatIdx}>
              <BeatEyebrow>beat 1 · predict</BeatEyebrow>
              <BeatTitle>Before we show you the wall, place yours.</BeatTitle>
              <BeatProse>
                The cyan curve to your left represents <em>your guess</em> at
                the maximum coordinated extent a civilization can achieve at
                each response timescale. Drag the nine points up or down. You
                have no constraints — only intuition. Where do you place the
                boundary?
              </BeatProse>
              <BeatMinorProse>
                Crouch, Fagen, Callan &amp; Mazur (2004) showed that
                prediction-then-reveal produces significant belief update
                where passive exposition produces none. The gap between your
                curve and the derived envelope is the pedagogical payload —
                don&apos;t skip.
              </BeatMinorProse>
            </ScrollBeat>

            <ScrollBeat id={2} onActive={setBeatIdx}>
              <BeatEyebrow>beat 2 · Landauer</BeatEyebrow>
              <BeatTitle>
                Every erased bit costs <Mono>kT ln 2</Mono> of heat.
              </BeatTitle>
              <BeatProse>
                A Markov blanket of spatial extent <em>L</em> coarse-grained
                at granularity <em>λ</em> carries (<em>L/λ</em>)² coordinated
                bits. Each update dissipates at least (<em>L/λ</em>)²{" "}
                <Mono>kT ln 2</Mono> — Landauer&apos;s bound. Composed with
                the Sivak–Crooks counterdiabatic excess for finite-time
                driving, total dissipation over an epoch of duration{" "}
                <em>τ</em> scales as <Mono>L² / τ</Mono>. Demand that the
                power stay within one star&apos;s output, and you get the
                Landauer tooth:
              </BeatProse>
              <EquationCallout>
                L_E(τ) ≈ λ √(L⊙ τ / (kT ln 2))
              </EquationCallout>
              <BeatProse>
                Slope ½ on log-log. Soft but unforgiving: at long τ it lets
                the civilization grow, but it grows as the square root of
                time.
              </BeatProse>
            </ScrollBeat>

            <ScrollBeat id={3} onActive={setBeatIdx}>
              <BeatEyebrow>beat 3 · Lieb–Robinson</BeatEyebrow>
              <BeatTitle>Information has a light cone.</BeatTitle>
              <BeatProse>
                For the blanket to remain coordinated, information must
                traverse its extent within the epoch. Round-trip signalling
                requires <Mono>2L/v ≤ τ</Mono>. In the relativistic limit, v
                = c, giving the linear tooth:
              </BeatProse>
              <EquationCallout>L_R(τ) = cτ / 2</EquationCallout>
              <BeatProse>
                Slope 1 on log-log. Hard: violating it makes coordination
                impossible at any energy cost — the driving field literally
                cannot reach every cell in time. No amount of money, matter,
                or cleverness moves this tooth.
              </BeatProse>
            </ScrollBeat>

            <ScrollBeat id={4} onActive={setBeatIdx}>
              <BeatEyebrow>beat 4 · composition</BeatEyebrow>
              <BeatTitle>
                Both teeth bite. The envelope is the minimum.
              </BeatTitle>
              <BeatProse>
                The feasibility envelope is{" "}
                <Mono>L_max(τ) = min(L_R, L_E)</Mono>. At short τ the
                relativistic tooth is binding; at long τ the Landauer tooth.
                They cross at <em>τ*</em>, a quantity fixed by physical
                constants:
              </BeatProse>
              <EquationCallout>
                τ* = 4 λ² L⊙ / (kT ln 2 · v²) ≈ 1.9 × 10⁵ yr
              </EquationCallout>
              <BeatProse>
                At molecular granularity (λ ≈ 10⁻⁹ m), τ* is hundreds of
                thousands of years — far beyond any agent-plausible response
                time.{" "}
                <em>
                  Within the agent regime, the relativistic tooth is the
                  active constraint.
                </em>{" "}
                This is new content relative to v13 of the paper.
              </BeatProse>
            </ScrollBeat>

            <ScrollBeat id={5} onActive={setBeatIdx}>
              <BeatEyebrow>beat 5 · the forbidden region</BeatEyebrow>
              <BeatTitle>
                Everything above the envelope is ruled out.
              </BeatTitle>
              <BeatProse>
                The hatched region is not a danger zone or a soft limit. It
                is a volume of phase space that physically cannot be occupied
                by any coordinated Markov-blanket agent. Hatching is an old
                engineering convention for territory that belongs to the
                laws, not to us.
              </BeatProse>
              <BeatProse>
                The claim is not <em>we should not expand</em>. It is{" "}
                <em>
                  a coordinated expansion past the envelope is not a thing
                  that can be done.
                </em>
              </BeatProse>
            </ScrollBeat>

            <ScrollBeat id={6} onActive={setBeatIdx}>
              <BeatEyebrow>beat 6 · your curve meets the wall</BeatEyebrow>
              <BeatTitle>How far off were you?</BeatTitle>
              <BeatProse>
                Your predicted curve, dashed in cyan, is overlaid against
                the derived envelope. The verdict card reports how many
                decades of <em>L</em> your guess sat above the derivation,
                on average.
              </BeatProse>
              <BeatProse>
                The gap is the point. It is the distance between{" "}
                <em>what a careful reader thinks is possible</em> and{" "}
                <em>what three composed bounds permit</em>. The paper&apos;s
                argument is that this gap explains the quiet sky.
              </BeatProse>
            </ScrollBeat>
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .filter-t1-grid {
              grid-template-columns: 1fr !important;
            }
            .filter-t1-grid > div:first-child {
              position: relative !important;
              top: auto !important;
            }
          }
        `}</style>
      </div>

      {/* ───────────────────  NAÏVE-GRABBY REFUTATION  ─────────────── */}
      <div
        style={{
          maxWidth: "62rem",
          margin: "0 auto 72px",
        }}
      >
        <SectionEyebrow>the optimistic argument, step by step</SectionEyebrow>
        <h2
          style={{
            marginTop: 14,
            marginBottom: 28,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(28px, 3.6vw, 40px)",
            lineHeight: 1.1,
            letterSpacing: "-0.005em",
            color: COLOR.ink,
            maxWidth: "36ch",
          }}
        >
          Three steps of the grabby story. Each one breaks against its bound.
        </h2>
        <RefutationStep
          num="1"
          claim="Harvest the stars for energy."
          against="Landauer."
          detail="Harvesting more energy only raises the ceiling on dissipation; it doesn't change that every bit of coordination pays kT ln 2. Bigger coordinated state still costs L² per epoch. Energy is the wrong optimization target."
        />
        <RefutationStep
          num="2"
          claim="Expand outward at a substantial fraction of c."
          against="Lieb–Robinson."
          detail="Expansion speed is not the bottleneck. The bottleneck is round-trip coordination time across the expanded frontier. A 10-ly civilization at τ = 5 yr needs a coordination signal that went out 5 years ago, the answer coming back now. Any faster response demands smaller L."
        />
        <RefutationStep
          num="3"
          claim="Fragment at the coordination horizon — daughters inherit."
          against="Sivak–Crooks, via L → D."
          detail="The most careful version of the objection. Zhong & DeWeese (2024) show Sivak–Crooks is equivalent to optimal transport in Wasserstein-2 space. For two daughter civilizations sharing state across distance D, maintaining that shared state pays W ≥ kT · D² / τ. The envelope is invariant under L → D. The coordination channel hits the same wall — see Tier 2."
        />
        <p
          style={{
            marginTop: 32,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontSize: 14.5,
            lineHeight: 1.65,
            color: COLOR.inkMuted,
            maxWidth: "48rem",
          }}
        >
          Muller, Bewes, Sharma &amp; Reimann (2008) showed that voicing the
          optimistic argument and refuting it step by step produces
          substantially more durable belief update than clean exposition
          alone — even though readers report it as more confusing.
        </p>
      </div>

      {/* ─────────────────────────  TIER 2 · SANDBOX  ───────────────── */}
      <SubstratePlate style={{ marginBottom: 48 }}>
        <SectionEyebrow>Tier 2 · the sandbox</SectionEyebrow>
        <h2
          style={{
            marginTop: 14,
            marginBottom: 14,
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: COLOR.ink,
            maxWidth: "22ch",
          }}
        >
          Try to break it.
        </h2>
        <p
          style={{
            maxWidth: "52rem",
            marginBottom: 40,
            fontFamily: FONT.body,
            fontSize: 17,
            lineHeight: 1.7,
            color: COLOR.inkBody,
          }}
        >
          Pick a scenario. Pick a strategy. Sweep the constants through two
          decades on either side. The envelope refuses to move.{" "}
          <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
            That refusal is the argument that the bound is derived, not
            chosen.
          </em>
        </p>

        <Stage
          controlsWidth={340}
          canvas={
            <div>
              <PhasePlot
                lam={sbLam}
                T={sbT}
                show={{
                  axes: true,
                  agentBand: true,
                  infeasible: true,
                  L_R: true,
                  L_E: true,
                  envelope: true,
                  tauStar: true,
                }}
                trajectory={
                  <TrajectoryRender
                    scenarioId={sbScenario}
                    progress={sbProgress}
                    strategy={sbStrategy}
                    lam={sbLam}
                    T={sbT}
                  />
                }
                sweepSigma={sbSweep}
                scenarios={SCENARIO_LIST}
                activeScenario={sbScenario}
                onEnvelopeClick={(seg) => setDrawerSeg(seg)}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                {!sbPlaying ? (
                  <Button variant="primary" active onClick={playSandbox}>
                    {sbProgress >= 1
                      ? "replay"
                      : sbProgress > 0
                        ? "continue"
                        : "play"}
                  </Button>
                ) : (
                  <Button onClick={() => setSbPlaying(false)}>pause</Button>
                )}
                <Button onClick={resetSandbox}>reset</Button>
                <Button
                  variant={sbSweep ? "primary" : "default"}
                  active={sbSweep}
                  onClick={() => setSbSweep(!sbSweep)}
                >
                  sweep σ {sbSweep ? "· on" : ""}
                </Button>
              </div>

              {sbSweep && (
                <p
                  style={{
                    marginTop: 16,
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: COLOR.inkMuted,
                  }}
                >
                  Ghost envelopes are drawn for λ = {fmtSci(sbLam * 0.01)} to{" "}
                  {fmtSci(sbLam * 100)} m — four decades of granularity
                  either side of the current value. The envelope&apos;s{" "}
                  <em>qualitative shape</em> — two teeth meeting at a cusp — is
                  structurally invariant. That is the claim.
                </p>
              )}

              <p
                style={{
                  marginTop: 20,
                  fontFamily: FONT.body,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: COLOR.inkBody,
                }}
              >
                <em style={{ fontFamily: FONT.display, color: COLOR.ink }}>
                  Reading this plot:
                </em>{" "}
                {SCENARIOS[sbScenario].note}
                {sbStrategy === "architected" && (
                  <>
                    {" "}
                    The dashed ghost-soft line is the coordination channel —
                    the shared state that makes this a single civilization
                    rather than two. Watch where it lands. It lands on the
                    envelope, at the same τ, because the envelope is
                    invariant under L → D.
                  </>
                )}
              </p>
            </div>
          }
          controls={
            <div>
              <ControlSection title="scenario">
                <div style={{ display: "grid", gap: 8 }}>
                  {SCENARIO_LIST.map((s) => (
                    <ScenarioChoice
                      key={s.id}
                      label={s.label}
                      sub={s.sub}
                      active={sbScenario === s.id}
                      onClick={() => {
                        setSbScenario(s.id);
                        resetSandbox();
                      }}
                    />
                  ))}
                </div>
              </ControlSection>

              <ControlSection title="strategy">
                <div style={{ display: "grid", gap: 8 }}>
                  {STRATEGY_LIST.map((s) => (
                    <ScenarioChoice
                      key={s.id}
                      label={s.label}
                      sub={s.sub}
                      active={sbStrategy === s.id}
                      onClick={() => {
                        setSbStrategy(s.id);
                        resetSandbox();
                      }}
                    />
                  ))}
                </div>
              </ControlSection>

              <ControlSection title="constants">
                <Slider
                  label="λ · granularity"
                  value={Math.log10(sbLam)}
                  min={-12}
                  max={-3}
                  step={0.01}
                  onChange={(v) => setSbLam(Math.pow(10, v))}
                  format={() => `${fmtSci(sbLam)} m`}
                />
                <Slider
                  label="T · temperature"
                  value={sbT}
                  min={3}
                  max={3000}
                  step={1}
                  onChange={setSbT}
                  format={(v) => `${v.toFixed(0)} K`}
                />
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: FONT.display,
                    fontStyle: "italic",
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    color: COLOR.inkFaint,
                  }}
                >
                  v = c (Lieb–Robinson saturated).
                  <br />
                  L⊙ = 3.828 × 10²⁶ W (solar constant).
                  <br />
                  These cannot be tuned by any engineering choice.
                </div>
              </ControlSection>

              <div
                style={{
                  padding: "16px 18px",
                  border: `1px solid ${COLOR.inkGhost}`,
                  background: "rgba(10, 15, 26, 0.4)",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: COLOR.inkFaint,
                    marginBottom: 12,
                  }}
                >
                  derived, not chosen
                </div>
                <StatRow label="kT ln 2" value={`${fmtSci(kTln2(sbT))} J`} />
                <StatRow
                  label="τ*(λ)"
                  value={fmtTau(tau_star(sbLam, sbT) / SEC_PER_YR)}
                  hint="tooth crossover"
                />
                <StatRow
                  label="L_max at agent cap"
                  value={fmtL_m(
                    L_env(TAU_AGENT_MAX, sbLam, sbT, V_DEFAULT, L_SUN),
                  )}
                  hint="τ = 1000 yr"
                />
              </div>
            </div>
          }
        />

        {/* Invariance across scenarios. */}
        <div style={{ marginTop: 56 }}>
          <SectionEyebrow>invariance across scenarios</SectionEyebrow>
          <h3
            style={{
              marginTop: 14,
              marginBottom: 24,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(20px, 2vw, 26px)",
              lineHeight: 1.3,
              color: COLOR.ink,
              maxWidth: "44rem",
            }}
          >
            The envelope holds across all four scenarios on identical axes.
            Only the target changes; the wall does not.
          </h3>
          <SmallMultiples lam={sbLam} T={sbT} v={V_DEFAULT} L_star={L_SUN} />
        </div>
      </SubstratePlate>

      {/* ─────────────────────────  LOOPHOLES  ───────────────────── */}
      <div style={{ maxWidth: "62rem", margin: "0 auto 80px" }}>
        <LoopholesPanel />
      </div>

      {/* ─────────────────────────  TIER 3 DRAWER  ───────────────── */}
      <DerivationDrawer
        open={!!drawerSeg}
        segment={drawerSeg}
        onClose={() => setDrawerSeg(null)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

function ScrollBeat({
  id,
  children,
  onActive,
}: {
  id: number;
  children: React.ReactNode;
  onActive: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
          onActive(id);
        }
      },
      { threshold: [0.3, 0.55, 0.8], rootMargin: "-15% 0px -15% 0px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [id, onActive]);
  return (
    <div
      ref={ref}
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem 0",
      }}
    >
      {children}
    </div>
  );
}

function BeatEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: COLOR.ghost,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function BeatTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "0 0 16px",
        fontFamily: FONT.display,
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: "clamp(22px, 2.4vw, 28px)",
        lineHeight: 1.25,
        letterSpacing: "-0.005em",
        color: COLOR.ink,
      }}
    >
      {children}
    </h3>
  );
}

function BeatProse({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        marginTop: 0,
        marginBottom: 16,
        fontFamily: FONT.body,
        fontSize: 17,
        lineHeight: 1.72,
        color: COLOR.inkBody,
        maxWidth: "40rem",
      }}
    >
      {children}
    </p>
  );
}

function BeatMinorProse({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        marginTop: 16,
        fontFamily: FONT.display,
        fontStyle: "italic",
        fontSize: 14,
        lineHeight: 1.6,
        color: COLOR.inkMuted,
        maxWidth: "40rem",
      }}
    >
      {children}
    </p>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: FONT.mono,
        fontSize: "0.92em",
        color: COLOR.ghost,
        background: "rgba(127, 175, 179, 0.08)",
        padding: "1px 6px",
        borderRadius: 2,
      }}
    >
      {children}
    </code>
  );
}

function EquationCallout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "20px 0",
        padding: "14px 18px",
        fontFamily: FONT.mono,
        fontSize: 15,
        color: COLOR.ink,
        border: `1px solid ${COLOR.inkGhost}`,
        borderLeft: `2px solid ${COLOR.ghost}`,
        background: "rgba(10, 15, 26, 0.45)",
      }}
    >
      {children}
    </div>
  );
}

function PredictionVerdict({
  score,
}: {
  score: { meanSigned: number; meanAbs: number; maxOver: number };
}) {
  return (
    <div
      style={{
        marginTop: 24,
        padding: "20px 22px",
        border: `1px solid ${COLOR.inkGhost}`,
        borderLeft: `2px solid ${COLOR.ghost}`,
        background: "rgba(10, 15, 26, 0.5)",
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: COLOR.ghost,
          marginBottom: 10,
        }}
      >
        your prediction vs the derivation
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: FONT.body,
          fontSize: 15.5,
          lineHeight: 1.7,
          color: COLOR.inkBody,
        }}
      >
        {score.meanSigned > 0.3 ? (
          <>
            On average, your guessed envelope sits{" "}
            <strong
              style={{
                fontFamily: FONT.mono,
                color: COLOR.ink,
                fontWeight: 500,
              }}
            >
              {score.meanSigned.toFixed(1)} decades
            </strong>{" "}
            above the composed bound. At the worst point you over-estimated
            by{" "}
            <strong
              style={{
                fontFamily: FONT.mono,
                color: COLOR.ink,
                fontWeight: 500,
              }}
            >
              {score.maxOver.toFixed(1)} decades
            </strong>{" "}
            — a factor of{" "}
            {Math.pow(10, score.maxOver).toExponential(1)}. The optimistic
            intuition about coordinated reach is not wrong by a little. It
            is wrong by a lot.
          </>
        ) : score.meanSigned < -0.3 ? (
          <>
            Your curve sits <em>below</em> the derived envelope by an
            average of{" "}
            <strong
              style={{
                fontFamily: FONT.mono,
                color: COLOR.ink,
                fontWeight: 500,
              }}
            >
              {Math.abs(score.meanSigned).toFixed(1)} decades
            </strong>
            . That is an unusually conservative guess — most readers
            over-estimate reach by 1–2 orders.
          </>
        ) : (
          <>
            Your curve tracks the envelope to within{" "}
            <strong
              style={{
                fontFamily: FONT.mono,
                color: COLOR.ink,
                fontWeight: 500,
              }}
            >
              {score.meanAbs.toFixed(2)} decades
            </strong>{" "}
            on average — closer than most readers place it before seeing
            the derivation.
          </>
        )}
      </p>
    </div>
  );
}

function ScenarioChoice({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="genesis-hover-ghost"
      style={{
        textAlign: "left",
        padding: "12px 14px",
        background: active ? "rgba(127, 175, 179, 0.08)" : "transparent",
        border: `1px solid ${active ? COLOR.ghost + "70" : COLOR.inkGhost + "60"}`,
        borderRadius: 2,
        cursor: "pointer",
        fontFamily: FONT.mono,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: active ? COLOR.ink : COLOR.inkBody,
          marginBottom: 3,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: COLOR.inkMuted,
          lineHeight: 1.55,
          letterSpacing: "0.02em",
        }}
      >
        {sub}
      </div>
    </button>
  );
}
