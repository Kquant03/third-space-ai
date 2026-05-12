// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Visitor handle generation
//  ─────────────────────────────────────────────────────────────────────────
//  When a visitor opens a chat session at the pond, the server assigns them
//  a sticky handle for the duration of that session. The handle follows a
//  two-word pattern distinct from the koi naming scheme:
//
//      <Mythic-Adjective>-<Mythic-Figure>
//
//  e.g., "Wandering-Odysseus", "Stormborn-Tiamat", "Drowning-Narcissus"
//
//  The pattern is deliberate. The koi have sensory fragmentary names
//  ("Reed-Watcher", "Slow-Surface") — they are *of* the pond. Visitors
//  arrive carrying the weight of human mythology: the heroes who sought
//  immortality, the gods who attend depths and crossings, the figures
//  whose stories you already half-know. The handle is meant to register
//  as recognition rather than puzzle — a visitor seeing "Mourning-Orpheus"
//  should feel the resonance, not have to look it up.
//
//  Mesopotamia is well-represented (Gilgamesh, Enkidu, Inanna, Tiamat,
//  Ereshkigal, Lilith) because that mythology is where heroic seeking-the-
//  unknown begins. Greek, Norse, Egyptian, Japanese, Hindu, Celtic,
//  Aztec, Yoruban, and Polynesian figures fill out the field — drawn
//  from the canon a literate person would recognize, not the scholarly
//  deep cuts.
//
//  ~32 adjectives × ~55 figures ≈ 1,700 unique combinations. Plenty for
//  any plausible concurrent visitor population.
// ═══════════════════════════════════════════════════════════════════════════

/** Adjectives evoking mythic motion, elemental state, or carried weight.
 *  Mix of single words (Wandering, Burning, Hollow) and mythic compounds
 *  (Stormborn, Wavebound, Bonewhite). Chosen to land with impact when
 *  paired with a heroic or divine name — "Wandering-Odysseus" reads
 *  as recognition, not riddle. */
const LIMINAL_ADJECTIVES: readonly string[] = [
  // Motion through the world
  "Wandering",        // far from home, still moving
  "Returning",        // the long way back
  "Seeking",          // unfinished search
  "Mourning",         // walking with loss
  "Watching",         // the still-eyed observer

  // Elemental and physical state
  "Burning",          // lit from inside or out
  "Drowning",         // submerged in something
  "Sleeping",         // not yet woken
  "Hollow",           // emptied, echoing
  "Silent",           // refusing speech
  "Stormborn",        // child of weather
  "Wavebound",        // tied to tides
  "Earthwalking",     // mortal and grounded
  "Skywatching",      // attending the heavens
  "Starcrowned",      // carrying the heavens

  // Light and shadow
  "Twilit",           // between day and night
  "Moonlit",          // by the lesser light
  "Sunlit",           // by the greater one
  "Spectral",         // ghost-edged
  "Tenebrous",        // shadowy
  "Halcyon",          // calm before
  "Penumbral",        // edge of shadow

  // Material and weight
  "Bronzeshod",       // armored at the foot
  "Ironbound",        // weighted with iron
  "Stonemouthed",     // refusing easy words
  "Bonewhite",        // worn down to essence
  "Goldhanded",       // touched by wealth or grace

  // Threshold and depth
  "Chthonic",         // of the underworld
  "Abyssal",          // of the deep
  "Numinous",         // sacred-strange

  // Memory and return
  "Halfremembered",   // surfacing into mind
  "Remembered",       // held by someone
  "Forgotten",        // released by all
];

/** Mythological figures across the recognizable canon. Grouped by
 *  thematic affinity for readability; the generator picks uniformly
 *  across the whole list. Leans into Mesopotamia (Gilgamesh, Enkidu,
 *  Inanna, Tiamat, Ereshkigal, Lilith) because heroic seeking-of-the-
 *  unknown originates there. The rest spans Greek, Norse, Egyptian,
 *  Japanese, Hindu, Celtic, Aztec, Yoruban, Polynesian. */
const MYTHIC_FIGURES: readonly string[] = [
  // Mesopotamian — heroic origin, the first stories
  "Gilgamesh",      // Sumerian — king who sought immortality and lost it
  "Enkidu",         // Sumerian — wild man, Gilgamesh's friend, dies first
  "Inanna",         // Sumerian — descent into and return from the underworld
  "Ishtar",         // Babylonian — Inanna's later name, war and love
  "Tiamat",         // Babylonian — primordial saltwater, mother of dragons
  "Ereshkigal",     // Sumerian — queen of the underworld, ruler of below
  "Lilith",         // Mesopotamian — first refuser, exile, owl-winged

  // Greek — heroes, seekers, the looked-back
  "Odysseus",       // long-wandering king, slow homecoming
  "Penelope",       // the patient weaver who waited
  "Persephone",     // pomegranate seeds, between two worlds
  "Orpheus",        // sang to the underworld, looked back too soon
  "Eurydice",       // almost-returned, lost to the glance
  "Achilles",       // the heel, the rage, the choice
  "Hector",         // the better man, the lost defender of Troy
  "Cassandra",      // saw clearly, was never believed
  "Atalanta",       // huntress, runner, lost to golden apples
  "Sisyphus",       // the stone, the slope, eternity
  "Echo",           // the voice without a self
  "Narcissus",      // the reflection, the drowning
  "Mnemosyne",      // mother of the Muses, memory itself
  "Hekate",         // crossroads, three faces, torchbearer
  "Charon",         // the ferryman, the obol-keeper
  "Hermes",         // boundary crosser, messenger, guide of souls
  "Pandora",        // who opened it, who closed it on hope

  // Norse — sky and saga
  "Odin",           // one-eyed, hanged for runes, the wandering god
  "Thor",           // thunder, hammer, simple strength
  "Loki",           // shape-changer, mother of monsters, end-bringer
  "Freya",          // amber tears, falcon-cloak, the chooser
  "Heimdall",       // the watchman of the rainbow bridge
  "Mimir",          // the severed head in the well of wisdom
  "Baldur",         // beautiful, killed by mistletoe and Loki
  "Hel",            // half-living, ruler of the unremarkable dead

  // Egyptian — the long durations
  "Anubis",         // jackal-headed, weigher of hearts
  "Thoth",          // ibis, writing, the moon
  "Isis",           // who gathered the pieces, who would not give up
  "Osiris",         // dismembered, restored, ruler of the silent
  "Bastet",         // cat-headed, of joy and protection
  "Sekhmet",        // lion-headed, of fierce healing
  "Horus",          // falcon, the son who took his father's place
  "Nephthys",       // mourner, sister, keeper of secrets

  // Japanese — sun, moon, storm
  "Amaterasu",      // sun goddess who hid in the cave
  "Tsukuyomi",      // moon, exiled across the sky
  "Susanoo",        // storm, banished, slayer of serpents
  "Izanami",        // first mother, who could not return
  "Inari",          // foxes, harvest, the keeper of thresholds

  // Hindu — the dancing weight of the universe
  "Shiva",          // destroyer who is also stillness
  "Kali",           // black goddess of time, ferocious mother
  "Ganesha",        // remover of obstacles, the beginning
  "Saraswati",      // river goddess of knowledge, swan-borne
  "Krishna",        // flute, blue, the lover, the charioteer

  // Celtic — the in-between island
  "Cernunnos",      // horned god of the wild
  "Brigid",         // fire, poetry, the hearth and the smith
  "Morrigan",       // crow goddess of war and prophecy

  // Other — wide world
  "Quetzalcoatl",   // Aztec — feathered serpent, the wind, the morning star
  "Pele",           // Hawaiian — volcano goddess of creation and destruction
  "Anansi",         // West African — spider trickster, keeper of stories
  "Yemaya",         // Yoruban — ocean mother, salt-water gateways
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
