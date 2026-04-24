"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Filter · DerivationDrawer (Tier 3)
//  ─────────────────────────────────────────────────────────────────────────
//  A side-drawer that opens when the reader clicks any segment of the
//  composed envelope. Contains:
//    · the segment's exact inequality + subtitle
//    · the line-by-line derivation with primary-literature citations
//    · a short parameter-robustness note
//
//  Three segments: LR (Lieb-Robinson tooth), LE (Landauer tooth), cusp
//  (where they meet — τ*). The reader's click position determines which.
// ═══════════════════════════════════════════════════════════════════════════

import { ReactNode } from "react";

const COLOR = {
  void: "#010106",
  voidDeep: "#030109",
  voidSoft: "#0a0f1a",
  ink: "#f4f6fb",
  inkStrong: "#eaeef7",
  inkBody: "#c8cfe0",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  ghost: "#7fafb3",
} as const;

const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-body), 'Source Serif 4', Georgia, serif",
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

// ───────────────────────────────────────────────────────────────────────────
//  Derivation content — three segments' worth of audit material
// ───────────────────────────────────────────────────────────────────────────

type Step = {
  step: string;
  text: string;
  cite: string | null;
};

type Derivation = {
  title: string;
  equation: string;
  subequation: string;
  body: Step[];
  robustness: string;
};

const DERIVATIONS: Record<"LR" | "LE" | "cusp", Derivation> = {
  LR: {
    title: "The relativistic tooth",
    equation: "L ≤ L_R(τ) ≡ vτ / 2",
    subequation: "Lieb–Robinson bound, relativistically saturated (v ≤ c)",
    body: [
      {
        step: "1 · Information velocity",
        text: "Lieb & Robinson (1972) proved that any quantum system with finite-range local interactions has a bounded information velocity v_LR. In the relativistic limit, v ≤ c.",
        cite:
          "Lieb, E. H. & Robinson, D. W. (1972). The finite group velocity of quantum spin systems. Comm. Math. Phys. 28(3), 251–257.",
      },
      {
        step: "2 · Round-trip closure",
        text: "For a Markov blanket of extent L to remain coordinated over an epoch of duration τ, each cell's update must be conditioned on every other cell's state within that epoch. Round-trip signalling needs 2L/v ≤ τ.",
        cite: null,
      },
      {
        step: "3 · Rearranging",
        text: "L ≤ vτ/2. Violating this makes coordination impossible at any energy cost — the driving field literally cannot reach every cell in time. The bound is structurally stable: refining λ, lowering T, or switching substrates does not change v.",
        cite:
          "Foss-Feig, Gong, Clark & Gorshkov (2015). Phys. Rev. Lett. 114, 157201. Nearly-linear light cones in long-range interacting systems.",
      },
    ],
    robustness:
      "Extensions to power-law interactions [Tran et al. PRL 127:160401, 2021] preserve the tooth up to logarithmic corrections. The relativistic tooth dominates at short τ.",
  },
  LE: {
    title: "The energetic tooth",
    equation: "L ≤ L_E(τ) ≈ λ √(L⊙ τ / (k_B T ln 2))",
    subequation: "Landauer floor composed with the Sivak–Crooks excess",
    body: [
      {
        step: "1 · Landauer bound per bit",
        text: "Every logically irreversible bit erasure at temperature T dissipates at least k_B T ln 2 [Landauer 1961; experimentally verified by Bérut et al. 2012].",
        cite:
          "Bérut, A. et al. (2012). Experimental verification of Landauer's principle. Nature 483, 187–189.",
      },
      {
        step: "2 · Bit count of a blanket",
        text: "A Markov blanket of spatial extent L coarse-grained at granularity λ carries N = (L/λ)² coordinated bits in two dimensions. Updating all N per epoch dissipates at least N · k_B T ln 2.",
        cite:
          "Friston, K. (2013). Life as we know it. J. R. Soc. Interface 10, 20130475.",
      },
      {
        step: "3 · Sivak–Crooks counterdiabatic excess",
        text: "For finite-time protocols, dissipation exceeds the quasi-static minimum by ⟨W_ex⟩ ≥ k_B T ℒ² / τ where ℒ is the thermodynamic (Fisher) length. For N independent bits driven 0 → 1, ℒ² scales as N, giving W_ex ≥ ξ k_B T (L/λ)² / τ with ξ ~ 2.",
        cite:
          "Sivak & Crooks (2012). Phys. Rev. Lett. 108, 190602. Boyd, Patra, Jarzynski & Crutchfield (2022). J. Stat. Phys. 187, 17.",
      },
      {
        step: "4 · Stellar budget constraint",
        text: "Imposing W ≤ L⊙ · τ and solving for L gives L ≤ λ √(L⊙ τ / (k_B T ln 2)) in the Landauer-dominated regime.",
        cite: null,
      },
    ],
    robustness:
      "The Sivak–Crooks bound extends to open-quantum [Scandi & Perarnau-Llobet, Quantum 3:197, 2019] and finite-time parallel-computing [Lipka-Bartosik et al., Nat. Commun. 14:447, 2023] settings without changing the scaling.",
  },
  cusp: {
    title: "The tooth crossover τ*",
    equation: "τ* = 4 λ² L⊙ / (k_B T ln 2 · v²)",
    subequation: "Where L_R(τ*) = L_E(τ*)",
    body: [
      {
        step: "1 · Equating the teeth",
        text: "Setting cτ/2 = λ √(L⊙ τ / (kT ln 2)) and solving for τ yields τ* = 4 λ² L⊙ / (kT ln 2 · v²).",
        cite: null,
      },
      {
        step: "2 · Numerical value",
        text: "At λ = 10⁻⁹ m, T = 300 K, v = c, this evaluates to τ* ≈ 1.9 × 10⁵ yr — longer than any agent-plausible τ, confirming that in the agent regime the relativistic tooth is the active constraint. At λ = 10⁻¹⁰ m (proton de Broglie), τ* drops to ~10³ yr — both teeth bind within the agent regime.",
        cite: null,
      },
      {
        step: "3 · Sensitivity",
        text: "τ* ∝ λ². Doubling the granularity shifts τ* up by a factor of four. No physically realistic granularity moves τ* into a regime that would permit agent-scale galactic expansion.",
        cite:
          "Sebastian (2026), Table 1 of §6.2 — agent-plausible τ → reach at 1 nm granularity.",
      },
    ],
    robustness:
      "The location of τ* depends on λ², T, v, and L⊙. Sweeping each ±2 decades (the sweep-σ toggle in Tier 2) confirms that the cusp shifts monotonically but never opens an escape channel.",
  },
};

// ───────────────────────────────────────────────────────────────────────────
//  DerivationDrawer — slides in from the right
// ───────────────────────────────────────────────────────────────────────────

export function DerivationDrawer({
  open,
  segment,
  onClose,
}: {
  open: boolean;
  segment: "LR" | "LE" | "cusp" | null;
  onClose: () => void;
}) {
  if (!open || !segment) return null;
  const d = DERIVATIONS[segment];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(1, 1, 6, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          width: "min(640px, 92vw)",
          height: "100vh",
          overflowY: "auto",
          background: COLOR.voidDeep,
          borderLeft: `1px solid ${COLOR.inkGhost}`,
          boxShadow: "-12px 0 60px rgba(127, 175, 179, 0.04)",
          padding: "clamp(32px, 4vw, 56px) clamp(28px, 4vw, 48px)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: COLOR.inkMuted,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          ← close audit
        </button>

        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: COLOR.inkFaint,
            marginBottom: 14,
          }}
        >
          Tier 3 · derivation audit
        </div>

        <h2
          style={{
            fontFamily: FONT.display,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: "clamp(32px, 3.8vw, 44px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: COLOR.ink,
            margin: 0,
          }}
        >
          {d.title}
        </h2>

        {/* Inequality card. */}
        <div
          style={{
            marginTop: 32,
            padding: "20px 22px",
            background: COLOR.voidSoft,
            border: `1px solid ${COLOR.inkGhost}`,
            borderLeft: `2px solid ${COLOR.ghost}`,
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 17,
              lineHeight: 1.55,
              color: COLOR.ink,
            }}
          >
            {d.equation}
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontSize: 14,
              color: COLOR.inkMuted,
            }}
          >
            {d.subequation}
          </div>
        </div>

        {/* Derivation steps. */}
        {d.body.map((s, i) => (
          <section key={i} style={{ marginTop: 32 }}>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLOR.ghost,
                marginBottom: 10,
                fontWeight: 500,
              }}
            >
              {s.step}
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 15.5,
                lineHeight: 1.7,
                color: COLOR.inkBody,
              }}
            >
              {s.text}
            </div>
            {s.cite && (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: FONT.mono,
                  fontSize: 10.5,
                  lineHeight: 1.55,
                  color: COLOR.inkFaint,
                  fontStyle: "italic",
                }}
              >
                ↳ {s.cite}
              </div>
            )}
          </section>
        ))}

        {/* Robustness note. */}
        <div
          style={{
            marginTop: 44,
            padding: "18px 20px",
            background: COLOR.voidSoft,
            border: `1px solid ${COLOR.inkGhost}`,
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              marginBottom: 10,
            }}
          >
            parameter robustness
          </div>
          <div
            style={{
              fontFamily: FONT.display,
              fontStyle: "italic",
              fontSize: 15,
              lineHeight: 1.6,
              color: COLOR.inkBody,
            }}
          >
            {d.robustness}
          </div>
        </div>

        {/* Closing cue. */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: `1px solid ${COLOR.inkGhost}`,
            fontFamily: FONT.mono,
            fontSize: 10,
            lineHeight: 1.65,
            color: COLOR.inkFaint,
          }}
        >
          Return to the plot to sweep other constants, or try a different
          strategy in the sandbox to see whether any choice opens an escape
          channel.
        </div>
      </div>
    </div>
  );
}
