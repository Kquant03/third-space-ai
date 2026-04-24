"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Ising · PhaseIndicator
//  ─────────────────────────────────────────────────────────────────────────
//  Three-state badge that lights up the current phase of the system based
//  on T/T_c:
//
//    coherent   (T < 0.88 T_c) — ghost  (ordered ferromagnet)
//    critical   (0.88..1.12)   — sanguine (near T_c; power-law correlations)
//    disordered (T > 1.12 T_c) — ink-muted (paramagnet)
//
//  The critical band uses the reserved sanguine accent because that's the
//  load-bearing moment — the whole point of the simulation is seeing what
//  happens at T_c.
// ═══════════════════════════════════════════════════════════════════════════

import { TC } from "./simulation";

const COLOR = {
  ghost: "#7fafb3",
  inkMuted: "#8a9bba",
  inkFaint: "#5a6780",
  inkGhost: "#3a4560",
  sanguine: "#9a2b2b",
} as const;

const FONT = {
  mono: "var(--font-mono), 'JetBrains Mono', monospace",
} as const;

type Phase = {
  id: "coherent" | "critical" | "disordered";
  label: string;
  color: string;
  test: (ratio: number) => boolean;
};

const PHASES: Phase[] = [
  {
    id: "coherent",
    label: "Coherent",
    color: COLOR.ghost,
    test: (r) => r < 0.88,
  },
  {
    id: "critical",
    label: "Critical",
    color: COLOR.sanguine,
    test: (r) => r >= 0.88 && r <= 1.12,
  },
  {
    id: "disordered",
    label: "Disordered",
    color: COLOR.inkMuted,
    test: (r) => r > 1.12,
  },
];

export function PhaseIndicator({
  T,
  socialMode = false,
}: {
  T: number;
  socialMode?: boolean;
}) {
  const ratio = T / TC;

  const socialLabels: Record<Phase["id"], string> = {
    coherent: "Consensus",
    critical: "Contested",
    disordered: "Fragmented",
  };

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
      {PHASES.map((p) => {
        const active = p.test(ratio);
        const displayLabel = socialMode ? socialLabels[p.id] : p.label;
        return (
          <div
            key={p.id}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px 4px",
              borderRadius: 2,
              fontFamily: FONT.mono,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              transition: "all 0.4s ease",
              background: active ? `${p.color}14` : "transparent",
              color: active ? p.color : COLOR.inkFaint,
              border: `1px solid ${active ? p.color + "44" : COLOR.inkGhost + "50"}`,
            }}
          >
            {displayLabel}
          </div>
        );
      })}
    </div>
  );
}
