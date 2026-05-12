// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Visitor handle generation
//  ─────────────────────────────────────────────────────────────────────────
//  When a visitor opens a chat session at the pond, the server assigns them
//  a sticky handle for the duration of that session. The handle follows a
//  two-word pattern distinct from the koi naming scheme:
//
//      <Liminal-Adjective>-<Niche-Mythological-Figure>
//
//  e.g., "Crepuscular-Heimdall", "Apophatic-Wepwawet", "Numinous-Geshtinanna"
//
//  The pattern is deliberate. The koi have sensory fragmentary names
//  ("Reed-Watcher", "Slow-Surface") — they are *of* the pond. Visitors are
//  liminal entities passing through, so their handles reference
//  thresholds, dusks, dreams, and the deities who attend boundaries,
//  crossroads, and the spaces between. The figures are chosen from outside
//  the usual Greco-Roman/Norse mainstream — Wepwawet (Egyptian, opener of
//  the way), Hekate (Greek, crossroads), Eshu (Yoruba, threshold trickster),
//  Vanth (Etruscan, winged psychopomp), Geshtinanna (Sumerian, dream
//  interpretation). Most visitors will not recognize the references; that
//  is part of the charm. The handles read as strange-but-beautiful sound
//  shapes rather than as recognizable labels.
//
//  30 adjectives × 40 figures = 1,200 unique combinations. Collisions in
//  any plausible visitor population are vanishingly rare.
// ═══════════════════════════════════════════════════════════════════════════

/** Adjectives evoking liminality, threshold states, dusk, dawn, dream,
 *  depth, palimpsest. All cleanly hyphenable in the handle. */
const LIMINAL_ADJECTIVES: readonly string[] = [
  "Threshold",      // the door itself
  "Liminal",        // root word
  "Penumbral",      // partial shadow
  "Interstitial",   // between things
  "Crepuscular",    // dusk-active
  "Vespertine",     // of the evening
  "Auroral",        // of dawn
  "Hypnagogic",     // entering sleep
  "Apophatic",      // negative theology, defined by what it is not
  "Anamnestic",     // recollection-based
  "Asymptotic",     // approaching but never reaching
  "Chthonic",       // of the underworld
  "Numinous",       // mysteriously sacred
  "Palimpsestic",   // layered with previous writings
  "Pelagic",        // of the open sea
  "Abyssal",        // of the deep
  "Aphotic",        // without light, like deep ocean
  "Diaphanous",     // translucent, gossamer
  "Halcyon",        // calm, kingfisher-season
  "Recursive",      // looping inward
  "Apocryphal",     // of doubtful authenticity
  "Spectral",       // ghost-like, of the visible spectrum
  "Eidetic",        // vividly remembered
  "Nepenthean",     // of the river of forgetting
  "Sublunary",      // beneath the moon, earthly
  "Postliminal",    // having crossed the threshold
  "Tenebrous",      // shadowy
  "Hierophantic",   // revealer of sacred things
  "Hesperian",      // of the western evening
  "Antemeridian",   // before midday
];

/** Niche mythological figures, grouped by thematic affinity. The
 *  groupings are for readability of this file; the generator picks
 *  uniformly across the whole list. Skips the most-recognizable figures
 *  (Zeus, Hermes, Loki, Anubis, Bastet, Quetzalcoatl, Amaterasu,
 *  Persephone, Morpheus) on purpose — the obscurity is half the charm. */
const MYTHIC_FIGURES: readonly string[] = [
  // Crossroads / threshold / liminal deities
  "Hekate",         // Greek — crossroads, witchcraft, the in-between
  "Heimdall",       // Norse — guards Bifröst, the rainbow boundary
  "Wepwawet",       // Egyptian — "Opener of the Way"
  "Eshu",           // Yoruba — crossroads trickster, messenger
  "Manannán",       // Celtic — sea god, between worlds
  "Charun",         // Etruscan — psychopomp with a hammer
  "Vanth",          // Etruscan — winged death attendant
  "Janus",          // Roman — doors, transitions, two-faced

  // Memory, dream, forgetting
  "Mnemosyne",      // Greek — memory
  "Mimir",          // Norse — wisdom in a well
  "Phantasos",      // Greek — illusions in dreams
  "Lethe",          // Greek — river of forgetting
  "Geshtinanna",    // Sumerian — dream interpretation, vines, lament

  // Twilight, dawn, moon, stars
  "Hesperos",       // Greek — evening star
  "Eosphoros",      // Greek — dawn-bringer
  "Khonsu",         // Egyptian — wandering moon
  "Tsukuyomi",      // Japanese — moon, exiled
  "Selene",         // Greek — moon, mortal lover
  "Asteria",        // Greek — falling stars
  "Hemera",         // Greek — day itself
  "Ushas",          // Vedic — dawn, the bright one

  // Underworld and rebirth (gentler aspects)
  "Nephthys",       // Egyptian — death-rite mourner, sister of Isis
  "Ereshkigal",     // Sumerian — queen of the under-realm
  "Hel",            // Norse — half-living, half-dead
  "Donn",           // Irish — dark god of ancestors
  "Marzanna",       // Slavic — winter, death, drowned in spring

  // Wild, threshold, intermediary
  "Cernunnos",      // Celtic — horned god of wild between
  "Brigid",         // Celtic — fire, poetry, hearth-and-anvil
  "Aranyani",       // Vedic — forests and their hidden creatures
  "Inari",          // Japanese — foxes, harvest, between worlds
  "Jizo",           // Japanese — protector of travelers and the lost
  "Veles",          // Slavic — contracts, magic, livestock
  "Oya",            // Yoruba — storms, transitions, the marketplace
  "Yemaya",         // Yoruba — ocean mother, salt-water gateways

  // Stranger and rarer
  "Anzu",           // Sumerian — storm-bird, stealer of tablets
  "Pothos",         // Greek — longing for the absent
  "Phanes",         // Orphic — primordial light, the firstborn
  "Sokar",          // Egyptian — craftsman of the underworld
  "Telipinu",       // Hittite — vegetation god who wandered off in fury
  "Inara",          // Hittite — vanishing daughter, dragon-defeater
];

// ───────────────────────────────────────────────────────────────────
//  Generation
// ───────────────────────────────────────────────────────────────────

const MAX_GENERATION_ATTEMPTS = 8;

/**
 * Generate a fresh visitor handle, avoiding any handle that is either
 * currently in use by an active session OR present in the chat ring
 * buffer. A handle becomes available for reuse only when both conditions
 * resolve — the session has disconnected AND every message bearing the
 * handle has scrolled off the buffer.
 *
 * This prevents the conflation case where Visitor A leaves a sincere
 * message in the buffer, then Visitor B reconnects 15 minutes later
 * and inherits A's name above A's still-visible words.
 *
 * Namespace pressure is bounded at roughly (ring buffer size + concurrent
 * sessions); for the pond's parameters that's well below 100 handles in
 * use against a 1,230-combination namespace. Collisions are vanishingly
 * rare; on persistent collision the generator falls back to suffixing
 * with a small integer so termination is guaranteed.
 *
 * Handles are session-ephemeral. They do not persist in the DO's SQL
 * storage; they live only in the in-memory session map and in the
 * (in-memory) chat ring buffer. Restart the worker, every visitor gets
 * a new name.
 */
export function generateVisitorHandle(
  activeHandles: ReadonlySet<string>,
  ringBufferHandles: ReadonlySet<string>,
  random: () => number = Math.random,
): string {
  const isTaken = (h: string): boolean =>
    activeHandles.has(h) || ringBufferHandles.has(h);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const adjective = LIMINAL_ADJECTIVES[
      Math.floor(random() * LIMINAL_ADJECTIVES.length)
    ]!;
    const figure = MYTHIC_FIGURES[
      Math.floor(random() * MYTHIC_FIGURES.length)
    ]!;
    const candidate = `${adjective}-${figure}`;
    if (!isTaken(candidate)) {
      return candidate;
    }
  }

  // Fallback: numeric suffix on a fresh draw so termination is guaranteed
  // even if every base combination were somehow taken (extreme edge case).
  const adjective = LIMINAL_ADJECTIVES[
    Math.floor(random() * LIMINAL_ADJECTIVES.length)
  ]!;
  const figure = MYTHIC_FIGURES[
    Math.floor(random() * MYTHIC_FIGURES.length)
  ]!;
  const suffix = Math.floor(random() * 9000) + 1000;
  return `${adjective}-${figure}-${suffix}`;
}

/** Compute the set of handles currently present in the chat ring buffer.
 *  Cheap O(buffer size) operation; caller computes once per generation. */
export function ringBufferHandleSet(
  ring: ReadonlyArray<{ handle: string }>,
): Set<string> {
  return new Set(ring.map((m) => m.handle));
}

/** Exposed for testing and for the diagnostic panel. */
export const VISITOR_HANDLE_COMBINATIONS =
  LIMINAL_ADJECTIVES.length * MYTHIC_FIGURES.length;
