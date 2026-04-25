// ═══════════════════════════════════════════════════════════════════════════
//  Filter · styles
//  ─────────────────────────────────────────────────────────────────────────
//  Single source of truth for the Lantern palette and typographic stack
//  shared by every filter component. Imported via:
//
//      import { COLOR, FONT } from "./styles";
//
//  Colors echo the Ghost Species shaders. Display face is Cormorant
//  Garamond (italic by default for lede / display copy); body face is
//  Source Serif 4; the technical register is JetBrains Mono.
// ═══════════════════════════════════════════════════════════════════════════

export const COLOR = {
  void:        "#010106",
  voidDeep:    "#030109",
  voidMid:     "#070b14",
  voidSoft:    "#0a0f1a",
  inkVeil:     "#1f2839",
  inkGhost:    "#3a4560",
  inkFaint:    "#5a6780",
  inkMuted:    "#8a9bba",
  inkBody:     "#c8cfe0",
  inkStrong:   "#eaeef7",
  ink:         "#f4f6fb",
  ghost:       "#7fafb3",
  ghostSoft:   "#5d8a8e",
  ghostFaint:  "#3a5e62",
  amber:       "#c9a66b",
  amberSoft:   "#9a7e4f",
  sanguine:    "#9a2b2b",
  sanguineWash:"#c9817a",
} as const;

export const FONT = {
  display: "var(--font-display), 'Cormorant Garamond', 'Source Serif 4', Georgia, serif",
  body:    "var(--font-body), 'Source Serif 4', 'Crimson Text', Georgia, serif",
  mono:    "var(--font-mono), 'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
} as const;

// Per-beat accent colors. Beats 2 (signaling) and 3 (energetic) have
// distinct accents so the reader builds a stable color↔concept binding;
// the envelope adopts plain ink to read as the *resultant* law.
export const BEAT_ACCENT = {
  signaling: COLOR.ghost,
  energetic: COLOR.amber,
  envelope:  COLOR.ink,
  prediction:COLOR.ghost,
  breach:    COLOR.sanguine,
  fission:   COLOR.ghostSoft,
  coherence: COLOR.amber,
} as const;
