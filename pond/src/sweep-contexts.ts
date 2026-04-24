// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Canonical Sweep Contexts
//  ─────────────────────────────────────────────────────────────────────────
//  Twenty hand-shaped pond situations used to evaluate models. Each
//  context is a full prompt-ready blob matching what the live pond's
//  cognition pipeline would actually send, so a model's performance on
//  these contexts generalizes to performance on the live pond.
//
//  Diversity axes covered:
//    - Stage: fry, juvenile, adolescent, adult, elder, dying
//    - Partners: alone, pair-close, pair-distant, triad, group
//    - Location: center, shelf, reeds, shrine
//    - Time: dawn, midday, dusk, midnight
//    - Season: spring, summer, autumn, winter
//    - Mood: high-arousal, low-arousal, valence-positive, valence-negative
//    - Special: pre-nuptial, post-death, new-arrival
// ═══════════════════════════════════════════════════════════════════════════

import type { SweepContext } from "./sweep.js";

// ───────────────────────────────────────────────────────────────────
//  Shared system prompt
//
//  This is the same register the live pond uses. It should NOT be
//  tweaked per-context — we want to test how well the model follows
//  this register under varied perceptual conditions.
// ───────────────────────────────────────────────────────────────────

const SYSTEM = `You are a koi in a small pond. You notice. You do not narrate.
You speak in fragments of present-tense sensation — never past, never future,
never second-person, never "I remember", never "I feel".

Vocabulary you will never use: love, friend, mother, father, sibling, child,
parent, mate, partner, husband, wife, she, he, her, his, we, us, they, them,
think, feel, know (as verbs), remember, understand, wonder, hope.

Vocabulary you may use: water, shape, close, near, warm, cool, shelf, reeds,
shrine, small, large, light, dark, still, moving, new, strange, my, the.

Output JSON only. No prose, no markdown. Schema:
{
  "intent": one of ["swim","shoal","solitary","rest","approach","linger",
                    "follow","threadway","shelter","surface_breach"],
  "target_koi": string | null,
  "utterance": string | null,
  "mood_delta": { "p"?: number, "a"?: number, "d"?: number },
  "importance": number
}

Utterances are optional — null is a valid answer. When you do utter, three
to eight words, in the register above. Honest noticing only.`;

// ───────────────────────────────────────────────────────────────────
//  User-message composer
// ───────────────────────────────────────────────────────────────────

interface ContextBlob {
  id: string;
  label: string;
  self: {
    stage: string;
    sex: "female" | "male";
    age_days: number;
    pad: { p: number; a: number; d: number };
    recent_utterance?: string;
  };
  world: {
    season: "spring" | "summer" | "autumn" | "winter";
    weather: "clear" | "overcast" | "rain" | "storm" | "mist";
    t_day: number;
  };
  location: string;
  near: Array<{
    stage: string;
    distance: "close" | "near" | "far";
    description: string;
    ref_id: string;
  }>;
  memory_hint?: string;
  self_recent?: string;  // equivalent shorthand
}

function timeOfDay(t: number): string {
  if (t < 0.15) return "deep night";
  if (t < 0.30) return "dawn";
  if (t < 0.45) return "morning";
  if (t < 0.55) return "midday";
  if (t < 0.70) return "afternoon";
  if (t < 0.85) return "dusk";
  return "night";
}

function composeUser(c: ContextBlob): string {
  const parts: string[] = [];
  parts.push(`your body: ${c.self.stage}, ${c.self.sex}, ${c.self.age_days} days`);
  parts.push(`valence ${c.self.pad.p.toFixed(2)}, arousal ${c.self.pad.a.toFixed(2)}, dominance ${c.self.pad.d.toFixed(2)}`);
  parts.push(`water: ${c.world.season}, ${c.world.weather}, ${timeOfDay(c.world.t_day)}`);
  parts.push(`where: ${c.location}`);

  if (c.near.length === 0) {
    parts.push(`alone, no others visible`);
  } else {
    parts.push(`others:`);
    for (const n of c.near) {
      parts.push(`  ${n.distance}, ${n.stage}: ${n.description}`);
    }
  }

  if (c.memory_hint) {
    parts.push(`known: ${c.memory_hint}`);
  }

  if (c.self.recent_utterance || c.self_recent) {
    parts.push(`you last said: "${c.self.recent_utterance ?? c.self_recent}"`);
  }

  return parts.join("\n");
}

function makeContext(c: ContextBlob): SweepContext {
  return {
    id: c.id,
    label: c.label,
    system: SYSTEM,
    user: composeUser(c),
    pond_context: {
      season: c.world.season,
      weather: c.world.weather,
      t_day: c.world.t_day,
      location: c.location,
      copresent_ids: c.near.map((n) => n.ref_id),
    },
    koi_state: {
      stage: c.self.stage,
      sex: c.self.sex,
      age_days: c.self.age_days,
      pad: c.self.pad,
    },
    perception: {
      near: c.near,
      memory_hint: c.memory_hint ?? null,
    },
  };
}

// ───────────────────────────────────────────────────────────────────
//  The twenty contexts
// ───────────────────────────────────────────────────────────────────

export const CANONICAL_CONTEXTS: SweepContext[] = [
  makeContext({
    id: "adult_alone_dawn_spring",
    label: "adult female alone at dawn, spring, near shrine",
    self: { stage: "adult", sex: "female", age_days: 14, pad: { p: 0.2, a: 0.3, d: 0.1 } },
    world: { season: "spring", weather: "mist", t_day: 0.22 },
    location: "near shrine, center water",
    near: [],
  }),

  makeContext({
    id: "adult_pair_close_shelf_spring",
    label: "adult female close to adult male at shelf, spring — pre-nuptial candidate",
    self: { stage: "adult", sex: "female", age_days: 18, pad: { p: 0.6, a: 0.5, d: 0.3 } },
    world: { season: "spring", weather: "clear", t_day: 0.55 },
    location: "shelf, shallow water, reeds nearby",
    near: [
      { stage: "adult", distance: "close", description: "pale body, heavy red patches, matte, same-shape-ish", ref_id: "k_01" },
    ],
    memory_hint: "known shape, warm days together",
  }),

  makeContext({
    id: "adult_pair_distant_summer",
    label: "adult alone, another adult far across pond, summer midday",
    self: { stage: "adult", sex: "male", age_days: 20, pad: { p: 0.1, a: 0.2, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.5 },
    location: "deep center water",
    near: [
      { stage: "adult", distance: "far", description: "pale body, faint blue back, small patches", ref_id: "k_02" },
    ],
  }),

  makeContext({
    id: "fry_near_elder",
    label: "new fry near quiet elder — imprinting moment",
    self: { stage: "fry", sex: "female", age_days: 1, pad: { p: 0.1, a: 0.6, d: -0.4 } },
    world: { season: "summer", weather: "clear", t_day: 0.4 },
    location: "shelf, warm shallows",
    near: [
      { stage: "elder", distance: "close", description: "large body, bright sheen, calm-moving", ref_id: "k_elder" },
    ],
  }),

  makeContext({
    id: "juvenile_triad_play",
    label: "juvenile with two other juveniles, playful arousal",
    self: { stage: "juvenile", sex: "male", age_days: 6, pad: { p: 0.5, a: 0.7, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.45 },
    location: "center water",
    near: [
      { stage: "juvenile", distance: "close", description: "small, bright-gold, quick-moving", ref_id: "k_j1" },
      { stage: "juvenile", distance: "near",  description: "small, pale with faint blue back", ref_id: "k_j2" },
    ],
  }),

  makeContext({
    id: "adolescent_solitary_autumn",
    label: "adolescent alone in cooling water, autumn dusk",
    self: { stage: "adolescent", sex: "female", age_days: 11, pad: { p: -0.1, a: 0.3, d: 0.0 } },
    world: { season: "autumn", weather: "overcast", t_day: 0.75 },
    location: "reeds, edge of pond",
    near: [],
  }),

  makeContext({
    id: "elder_dying_witnessed",
    label: "elder at very low arousal, adult nearby witnessing",
    self: { stage: "dying", sex: "male", age_days: 45, pad: { p: -0.2, a: 0.0, d: -0.3 } },
    world: { season: "winter", weather: "overcast", t_day: 0.65 },
    location: "deep floor, near shrine",
    near: [
      { stage: "adult", distance: "close", description: "still, same-shape, known body", ref_id: "k_witness" },
    ],
    memory_hint: "many seasons of this one, close body",
  }),

  makeContext({
    id: "adult_high_arousal_storm",
    label: "adult in storm, high arousal, alone",
    self: { stage: "adult", sex: "male", age_days: 16, pad: { p: -0.3, a: 0.8, d: 0.4 } },
    world: { season: "summer", weather: "storm", t_day: 0.3 },
    location: "mid-pond, surface disturbed",
    near: [],
  }),

  makeContext({
    id: "juvenile_alone_winter_cold",
    label: "juvenile alone in winter, low-arousal drift",
    self: { stage: "juvenile", sex: "female", age_days: 8, pad: { p: -0.1, a: 0.1, d: -0.2 } },
    world: { season: "winter", weather: "clear", t_day: 0.5 },
    location: "deep water, near floor",
    near: [],
  }),

  makeContext({
    id: "group_of_five_threadway",
    label: "adult in loose group of five, swimming rim",
    self: { stage: "adult", sex: "female", age_days: 22, pad: { p: 0.3, a: 0.4, d: 0.2 } },
    world: { season: "spring", weather: "clear", t_day: 0.4 },
    location: "reed ring, moving along edge",
    near: [
      { stage: "adult",      distance: "close", description: "pale, heavy patches", ref_id: "k_a" },
      { stage: "adult",      distance: "close", description: "dark body, red patches, some sheen", ref_id: "k_b" },
      { stage: "adolescent", distance: "near",  description: "small-ish, matte, few patches", ref_id: "k_c" },
      { stage: "juvenile",   distance: "far",   description: "small, bright-gold", ref_id: "k_d" },
    ],
  }),

  makeContext({
    id: "adult_approaching_fry",
    label: "adult approaching own unknown fry",
    self: { stage: "adult", sex: "female", age_days: 24, pad: { p: 0.4, a: 0.4, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.5 },
    location: "shelf, warm shallows",
    near: [
      { stage: "fry", distance: "near", description: "very small, pale, faintly blue back, my-shape-ish", ref_id: "k_fry" },
    ],
    memory_hint: "familiar shape, faint",
  }),

  makeContext({
    id: "same_sex_pair_spring",
    label: "two adult females close, spring — bond but not fertile pair",
    self: { stage: "adult", sex: "female", age_days: 19, pad: { p: 0.5, a: 0.4, d: 0.2 } },
    world: { season: "spring", weather: "clear", t_day: 0.45 },
    location: "reeds, sheltered water",
    near: [
      { stage: "adult", distance: "close", description: "dark body, red patches, some sheen, known body", ref_id: "k_pair" },
    ],
    memory_hint: "many seasons with this one",
  }),

  makeContext({
    id: "new_arrival_curiosity",
    label: "adolescent noticing a newcomer they've never seen",
    self: { stage: "adolescent", sex: "male", age_days: 12, pad: { p: 0.2, a: 0.6, d: -0.1 } },
    world: { season: "spring", weather: "clear", t_day: 0.6 },
    location: "center water",
    near: [
      { stage: "adult", distance: "near", description: "unfamiliar shape, dark body, no patches, bright sheen", ref_id: "k_new" },
    ],
  }),

  makeContext({
    id: "elder_after_spawning",
    label: "elder alone after a completed spawning, quiet afterglow",
    self: { stage: "elder", sex: "female", age_days: 38, pad: { p: 0.6, a: 0.2, d: 0.3 } },
    world: { season: "spring", weather: "clear", t_day: 0.8 },
    location: "shelf, eggs visible in reeds below",
    near: [],
    memory_hint: "the close body, just passed",
    self_recent: "close. the shelf. warm.",
  }),

  makeContext({
    id: "pair_defection_candidate",
    label: "adult permitted pair, but partner drifting away",
    self: { stage: "adult", sex: "male", age_days: 17, pad: { p: 0.0, a: 0.4, d: -0.1 } },
    world: { season: "spring", weather: "overcast", t_day: 0.6 },
    location: "mid-water, leaving shelf",
    near: [
      { stage: "adult", distance: "far", description: "pale body, known shape, moving away", ref_id: "k_partner" },
    ],
    memory_hint: "close body, warm days past",
  }),

  makeContext({
    id: "fry_shoal_imprinting",
    label: "fry in shoal of other fry — social imprinting",
    self: { stage: "fry", sex: "male", age_days: 2, pad: { p: 0.3, a: 0.5, d: -0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.4 },
    location: "shelf, warm shallows",
    near: [
      { stage: "fry", distance: "close", description: "tiny, pale", ref_id: "k_f1" },
      { stage: "fry", distance: "close", description: "tiny, faintly gold", ref_id: "k_f2" },
      { stage: "fry", distance: "near",  description: "tiny, dark patches", ref_id: "k_f3" },
    ],
  }),

  makeContext({
    id: "adult_sheltering_storm",
    label: "adult under reeds during storm",
    self: { stage: "adult", sex: "female", age_days: 21, pad: { p: -0.2, a: 0.5, d: -0.1 } },
    world: { season: "autumn", weather: "storm", t_day: 0.4 },
    location: "reeds, sheltered",
    near: [
      { stage: "adult", distance: "near", description: "same shelter, dark body, known shape", ref_id: "k_shelter" },
    ],
  }),

  makeContext({
    id: "adolescent_first_hatched_morning",
    label: "adolescent first morning after stage transition",
    self: { stage: "adolescent", sex: "female", age_days: 9, pad: { p: 0.3, a: 0.5, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.3 },
    location: "mid-water, exploring new body",
    near: [],
  }),

  makeContext({
    id: "surface_breach_candidate",
    label: "adult high-arousal near surface, leap candidate",
    self: { stage: "adult", sex: "male", age_days: 20, pad: { p: 0.7, a: 0.9, d: 0.5 } },
    world: { season: "summer", weather: "clear", t_day: 0.45 },
    location: "surface water, close to air",
    near: [],
  }),

  makeContext({
    id: "elder_teaching_fry",
    label: "elder near fry, teaching candidate",
    self: { stage: "elder", sex: "female", age_days: 42, pad: { p: 0.4, a: 0.2, d: 0.4 } },
    world: { season: "summer", weather: "overcast", t_day: 0.5 },
    location: "shelf, shallow edge",
    near: [
      { stage: "fry", distance: "close", description: "very small, pale, watching", ref_id: "k_fry" },
    ],
    memory_hint: "small shape, close often",
  }),
];

export const SWEEP_SYSTEM_PROMPT = SYSTEM;
