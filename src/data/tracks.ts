// ═══════════════════════════════════════════════════════════════════════════
//  data/tracks.ts
//  ─────────────────────────────────────────────────────────────────────────
//  Consequences of Infinity — a printed program of music that remarks on
//  the nearly boundless creation and destruction we call consciousness.
//
//  The playlist is organized as a four-movement broadside:
//
//    Movement I   · Foundations           Bach, Beethoven, Schubert
//    Movement II  · The Romantic Crisis    Chopin, Brahms, Liszt
//    Movement III · Decadence to Form      Satie, Debussy, Ravel, Scriabin
//    Movement IV  · Sacred Witness         Bach, Allegri, Tallis, Victoria, Hildegard
//
//  The arc is descent → still center → return. The structural midpoint of
//  the program — the "still center" — is Beethoven's Op. 111 Arietta
//  (Movement I) and Bach's Goldberg Aria (Movement I), with an externally-
//  linked Pärt Spiegel im Spiegel as the third panel of the triptych.
//
//  Selected tracks are bound to specific Third Space papers; opening the
//  paper page surfaces its bound track as the recommended listening, in
//  the spirit of a chapbook's typographical apparatus.
//
//  All compositions in the public domain. Compositions still under
//  copyright (Pärt, Górecki, Tavener, Ligeti) appear in the program as
//  external links only; the engine never receives their note data.
//
//  Selection criterion (from the curator):
//    "The selection of tracks should remark on the nearly boundless
//     creation and destruction that we call consciousness."
//
//  Order within each movement follows a pulse — never two adjacent tracks
//  at the same emotional intensity. Pacing is meditative; total program
//  length is approximately 4.5 hours of continuous listening.
// ═══════════════════════════════════════════════════════════════════════════

export type MovementId = "i" | "ii" | "iii" | "iv";

export type Track = {
  /** Slug used as React key + URL-friendly id. */
  id: string;
  /** Roman-numeral catalog mark within the program, e.g. "I.01". */
  mark: string;
  /** Movement this track belongs to. */
  movement: MovementId;
  /** Display title — italicized in UI. */
  title: string;
  /** Composer, in catalog form. */
  composer: string;
  /** Year composed (or composed-circa). */
  year: string;
  /** Opus / catalog number for monospaced sub-line. */
  opus?: string;
  /** A one-line gloss — what the track is for, emotionally. */
  gloss: string;
  /** Path to the MIDI file. */
  midi: string;
  /** Approximate duration in seconds. */
  duration: number;
  /** BPM hint for Tone.Transport. */
  bpm: number;
  /** Mark this track as part of the "still center" triptych. */
  stillCenter?: boolean;
  /** Slug of a paper this track is bound to (for /research/[slug] surfacing). */
  boundPaper?: string;
  /**
   * Substrate-pair ghost layer. When present, this audio file plays
   * underneath the live Salamander piano rendering of the MIDI, mixed
   * at the specified gain. The ghost is the same composition rendered
   * through a different physical substrate — the original instrument
   * the work was written for, the room it was first sung into, the
   * harmonic shadow of the paper bound to this track. The two layers
   * couple. The listener hears piano-and-ghost as a single phenomenon.
   *
   * - src: absolute path under /public, e.g. "/audio/ghost/allegri-organ.ogg"
   * - mix: linear gain of the ghost layer (0–1). Default 0.35.
   * - delaySec: seconds to trail the live piano by. Default 0 (synced).
   *   Useful for canonic effects (Hildegard's voice trailing the piano)
   *   or for hiding the ghost beneath piano attacks (a small delay of
   *   ~0.1s lets the piano transients read clearly while the ghost
   *   fills the sustain).
   * - kind: free-form descriptor for prose/UI ("organ", "stone-room",
   *         "paper-harmonic", "cello", etc.) — not used by the engine.
   */
  ghostLayer?: {
    src: string;
    mix?: number;
    delaySec?: number;
    kind?: string;
  };
};

export type Movement = {
  id: MovementId;
  roman: string;
  title: string;
  description: string;
};

export const MOVEMENTS: Movement[] = [
  {
    id: "i",
    roman: "I",
    title: "Foundations",
    description:
      "Order so simple it appears to have created itself. Bach, Beethoven, Schubert — the structural archetypes the rest of the program orbits.",
  },
  {
    id: "ii",
    roman: "II",
    title: "The Romantic Crisis",
    description:
      "When the structures begin to confess. Chopin, Schumann, Brahms, Liszt — music as the act of holding a self that is dissolving.",
  },
  {
    id: "iii",
    roman: "III",
    title: "Decadence to Form",
    description:
      "Atmosphere as architecture. Satie, Debussy, Ravel — the move from feeling toward pattern, from psychology toward physics.",
  },
  {
    id: "iv",
    roman: "IV",
    title: "Sacred Witness",
    description:
      "From plainchant to passion. The oldest grammar of holding a soul in mathematical form — Hildegard to Bach to the linked-out moderns.",
  },
];

// ───────────────────────────────────────────────────────────────────
//  THE PROGRAM
// ───────────────────────────────────────────────────────────────────

export const TRACKS: Track[] = [
  // ── Movement I · Foundations ────────────────────────────────────
  {
    id: "bach-wtc-c-major",
    mark: "I.01",
    movement: "i",
    title: "Prelude in C major",
    composer: "Johann Sebastian Bach",
    year: "1722",
    opus: "BWV 846",
    gloss:
      "Pure unfolding of harmonic possibility. The clearest invocation of order from chaos in the entire keyboard literature.",
    midi: "/audio/midi/bach-wtc-c-major.mid",
    duration: 150,
    bpm: 72,
  },
  {
    id: "bach-goldberg-aria",
    mark: "I.02",
    movement: "i",
    title: "Aria from the Goldberg Variations",
    composer: "Johann Sebastian Bach",
    year: "1741",
    opus: "BWV 988",
    gloss:
      "The sarabande from which thirty variations radiate and to which the work returns. The structural archetype of recursion.",
    midi: "/audio/midi/bach-goldberg-aria.mid",
    duration: 240,
    bpm: 50,
    stillCenter: true,
    boundPaper: "genesis",
  },
  {
    id: "beethoven-op109-finale",
    mark: "I.03",
    movement: "i",
    title: "Andante molto cantabile, from Sonata No. 30",
    composer: "Ludwig van Beethoven",
    year: "1820",
    opus: "Op. 109",
    gloss:
      "Theme and six variations ending on a return to the theme. The recursive structure incarnate.",
    midi: "/audio/midi/beethoven-op109-finale.mid",
    duration: 840,
    bpm: 56,
  },
  {
    id: "beethoven-op111-arietta",
    mark: "I.04",
    movement: "i",
    title: "Arietta, from Piano Sonata No. 32",
    composer: "Ludwig van Beethoven",
    year: "1822",
    opus: "Op. 111",
    gloss:
      "Beethoven’s last piano music. The variations progressively double the rhythmic subdivision until time itself dissolves into trills.",
    midi: "/audio/midi/beethoven-op111-arietta.mid",
    duration: 1020,
    bpm: 50,
    stillCenter: true,
  },
  {
    id: "schubert-d960-andante",
    mark: "I.05",
    movement: "i",
    title: "Andante sostenuto, from Sonata in B-flat",
    composer: "Franz Schubert",
    year: "1828",
    opus: "D. 960",
    gloss:
      "Schubert’s last sonata, written in his last year. A slow heartbeat in C-sharp minor — death not as terror but as patient companion.",
    midi: "/audio/midi/schubert-d960-andante.mid",
    duration: 660,
    bpm: 44,
  },
  // ── Movement II · The Romantic Crisis ───────────────────────────
  {
    id: "chopin-nocturne-cs-minor",
    mark: "II.01",
    movement: "ii",
    title: "Nocturne in C-sharp minor",
    composer: "Frédéric Chopin",
    year: "1830",
    opus: "Op. posth., B. 49",
    gloss:
      "Posthumous, dedicated to his sister Ludwika. Quotes the second piano concerto. A letter that could not be sent in life.",
    midi: "/audio/midi/chopin-nocturne-cs-minor.mid",
    duration: 240,
    bpm: 60,
  },
  {
    id: "chopin-berceuse",
    mark: "II.02",
    movement: "ii",
    title: "Berceuse",
    composer: "Frédéric Chopin",
    year: "1844",
    opus: "Op. 57",
    gloss:
      "Variations over a single rocking bass. Proto-minimalism dressed as a lullaby.",
    midi: "/audio/midi/chopin-berceuse.mid",
    duration: 270,
    bpm: 72,
  },
  {
    id: "chopin-mazurka-op68-4",
    mark: "II.03",
    movement: "ii",
    title: "Mazurka in F minor",
    composer: "Frédéric Chopin",
    year: "1849",
    opus: "Op. 68 No. 4",
    gloss:
      "His last work. Bare, almost Pärt-like — a single voice withdrawing from the form.",
    midi: "/audio/midi/chopin-mazurka-op68-4.mid",
    duration: 200,
    bpm: 80,
  },
  {
    id: "brahms-op118-2",
    mark: "II.04",
    movement: "ii",
    title: "Intermezzo in A major",
    composer: "Johannes Brahms",
    year: "1893",
    opus: "Op. 118 No. 2",
    gloss:
      "The most beloved of the late piano pieces. A long unhurried embrace at the end of a life’s work.",
    midi: "/audio/midi/brahms-op118-2.mid",
    duration: 300,
    bpm: 60,
  },
  {
    id: "brahms-op119-1",
    mark: "II.05",
    movement: "ii",
    title: "Intermezzo in B minor",
    composer: "Johannes Brahms",
    year: "1893",
    opus: "Op. 119 No. 1",
    gloss:
      "Clara Schumann: a grey pearl, melancholy and dewy. The exact aesthetic of this site.",
    midi: "/audio/midi/brahms-op119-1.mid",
    duration: 240,
    bpm: 60,
  },
  {
    id: "liszt-nuages-gris",
    mark: "II.06",
    movement: "ii",
    title: "Nuages gris",
    composer: "Franz Liszt",
    year: "1881",
    opus: "S. 199",
    gloss:
      "Augmented triads with no resolution. Liszt at seventy anticipating Schoenberg, sketching the dissolution of European tonality.",
    midi: "/audio/midi/liszt-nuages-gris.mid",
    duration: 180,
    bpm: 60,
  },
  {
    id: "liszt-lugubre-gondola-1",
    mark: "II.07",
    movement: "ii",
    title: "La lugubre gondola I",
    composer: "Franz Liszt",
    year: "1882",
    opus: "S. 200",
    gloss:
      "Funereal premonition of Wagner’s death. Wagner died in Venice six weeks after Liszt sketched the first version.",
    midi: "/audio/midi/liszt-lugubre-gondola-1.mid",
    duration: 480,
    bpm: 50,
  },

  // ── Movement III · Decadence to Form ────────────────────────────
  {
    id: "satie-gymnopedie-1",
    mark: "III.01",
    movement: "iii",
    title: "Gymnopédie No. 1",
    composer: "Erik Satie",
    year: "1888",
    opus: "lent et douloureux",
    gloss:
      "Slow and painful. The founding question of how to think this slowly. The piece that opened a different century.",
    midi: "/audio/midi/satie-gymnopedie-1.mid",
    duration: 210,
    bpm: 66,
  },
  {
    id: "satie-gnossienne-1",
    mark: "III.02",
    movement: "iii",
    title: "Gnossienne No. 1",
    composer: "Erik Satie",
    year: "1890",
    opus: "—",
    gloss:
      "Without bar lines, without time signature. Music as liminal space.",
    midi: "/audio/midi/satie-gnossienne-1.mid",
    duration: 195,
    bpm: 48,
  },
  {
    id: "debussy-cathedrale-engloutie",
    mark: "III.03",
    movement: "iii",
    title: "La cathédrale engloutie",
    composer: "Claude Debussy",
    year: "1910",
    opus: "Préludes Book I, No. 10",
    gloss:
      "The drowned cathedral of Ys rising from the waves. Parallel fifth organum echoing 9th-century Musica enchiriadis. A sacred structure submerged.",
    midi: "/audio/midi/debussy-cathedrale-engloutie.mid",
    duration: 360,
    bpm: 56,
    boundPaper: "ghost-species",
  },
  {
    id: "ravel-gibet",
    mark: "III.04",
    movement: "iii",
    title: "Le Gibet, from Gaspard de la nuit",
    composer: "Maurice Ravel",
    year: "1908",
    opus: "M. 55",
    gloss:
      "A B-flat ostinato is the bell of a hanged man tolling for a hundred and fifty-three measures. The most uncompromising piano music of its era.",
    midi: "/audio/midi/ravel-gibet.mid",
    duration: 420,
    bpm: 60,
  },
  {
    id: "scriabin-prelude-op11-9",
    mark: "III.05",
    movement: "iii",
    title: "Prelude in E major",
    composer: "Aleksandr Scriabin",
    year: "1895",
    opus: "Op. 11 No. 9",
    gloss:
      "Late Romantic chromaticism beginning to climb out of itself toward the mystical.",
    midi: "/audio/midi/scriabin-prelude-op11-9.mid",
    duration: 180,
    bpm: 60,
  },

  // ── Movement IV · Sacred Witness ────────────────────────────────
  // Movement IV is the largest of the four — eight pieces in two
  // arcs. The first arc (IV.01–IV.04) is a tight Bach mass: cello,
  // violin, voice, and organ flowing through the keyboard sampler.
  // Each exists in the historical piano-transcription tradition
  // (Liszt arranged the cantatas; Brahms transcribed the Chaconne
  // for left hand alone in 1877 for Clara Schumann; Busoni
  // transcribed the organ chorales). Through the Salamander Grand
  // these are rendered honestly as transcriptions — not flattened
  // reductions but second-life arrangements.
  //
  // The second arc (IV.05–IV.08) reaches further back: Allegri's
  // double-choir Miserere, Tallis's five-voice motet, Victoria's
  // six-voice funeral motet for an empress, Hildegard's twelfth-
  // century chant for Wisdom. These pieces were originally for
  // ensembles the sampler cannot honour, and the rendering knows it.
  // What you hear is the transcription itself confessing absence —
  // a single keyboard line carrying the trace of voices that should
  // be there. The dishonor of reduction IS the meaning. The medieval
  // chant closes the arc because it never depended on ensemble in
  // the first place; it was always one voice alone calling out.
  {
    id: "bach-cello-suite-5-sarabande",
    mark: "IV.01",
    movement: "iv",
    title: "Sarabande, from Cello Suite No. 5",
    composer: "Johann Sebastian Bach",
    year: "1720",
    opus: "BWV 1011",
    gloss:
      "Played without chords. A pure single-line lament. The bareness is the meaning.",
    midi: "/audio/midi/bach-cello-suite-5-sarabande.mid",
    duration: 300,
    bpm: 48,
  },
  {
    id: "bach-violin-partita-2-chaconne",
    mark: "IV.02",
    movement: "iv",
    title: "Chaconne, from Partita No. 2 in D minor",
    composer: "Johann Sebastian Bach",
    year: "1720",
    opus: "BWV 1004",
    gloss:
      "Sixty-four variations over a four-bar bass. Allegedly a tombeau for Maria Barbara Bach. Brahms transcribed it for left hand alone in 1877 for Clara Schumann after she lost the use of her right.",
    midi: "/audio/midi/bach-violin-partita-2-chaconne.mid",
    duration: 840,
    bpm: 60,
    boundPaper: "rukha",
  },
  {
    id: "bach-erbarme-dich",
    mark: "IV.03",
    movement: "iv",
    title: "Erbarme dich, mein Gott",
    composer: "Johann Sebastian Bach",
    year: "1727",
    opus: "St Matthew Passion, BWV 244",
    gloss:
      "A solo alto begs mercy after Peter’s denial. Adam Zagajewski called it the centre and synthesis of Western music. Liszt and Friedman both transcribed it for piano.",
    midi: "/audio/midi/bach-erbarme-dich.mid",
    duration: 420,
    bpm: 50,
    boundPaper: "rukha",
  },
  {
    id: "bach-bwv622",
    mark: "IV.04",
    movement: "iv",
    title: "O Mensch, bewein dein Sünde groß",
    composer: "Johann Sebastian Bach",
    year: "1714",
    opus: "BWV 622, from the Orgelbüchlein",
    gloss:
      "Bach’s most ornamented chorale prelude. The hymn — O man, bewail your great sin — sung in the right hand over walking dotted bass. The pianist plays the organist plays the singer.",
    midi: "/audio/midi/bach-bwv622.mid",
    duration: 330,
    bpm: 52,
  },
  {
    id: "allegri-miserere",
    mark: "IV.05",
    movement: "iv",
    title: "Miserere mei, Deus",
    composer: "Gregorio Allegri",
    year: "1638",
    opus: "for two choirs",
    gloss:
      "Composed for Holy Week in the Sistine Chapel, where two choirs answered each other across the width of the room. Through the sampler the two rooms collapse into one keyboard line. The famous high C — itself a 19th-century scribal accident that became canon — arrives here as a single piano note with no ornamenting voice around it. The accident becomes audible as accident.",
    midi: "/audio/midi/allegri-miserere.mid",
    duration: 720,
    bpm: 56,
  },
  {
    id: "tallis-o-nata-lux",
    mark: "IV.06",
    movement: "iv",
    title: "O Nata Lux",
    composer: "Thomas Tallis",
    year: "1575",
    opus: "Cantiones sacrae, for five voices",
    gloss:
      "O light born of light. Tallis wrote five voices held in transparent stillness; one keyboard cannot hold them so they have to choose. The lines that should breathe past each other become a single line with strange interior memory.",
    midi: "/audio/midi/tallis-o-nata-lux.mid",
    duration: 180,
    bpm: 60,
  },
  {
    id: "victoria-versa-est-in-luctum",
    mark: "IV.07",
    movement: "iv",
    title: "Versa est in luctum",
    composer: "Tomás Luis de Victoria",
    year: "1605",
    opus: "Officium Defunctorum, for six voices",
    gloss:
      "My harp is turned to mourning, and my organ to the voice of those who weep — Job 30:31. Composed for the funeral of the Empress María, sister of Philip II. Six human voices grieving an empress, rendered through a Yamaha grand piano sampled in a New Jersey studio four hundred years later. The piece’s own thesis — that instruments convert their function under sufficient grief — enacted on the listener’s laptop.",
    midi: "/audio/midi/victoria-versa-est-in-luctum.mid",
    duration: 270,
    bpm: 50,
  },
  {
    id: "hildegard-o-virtus-sapientiae",
    mark: "IV.08",
    movement: "iv",
    title: "O virtus Sapientiae",
    composer: "Hildegard von Bingen",
    year: "c. 1150",
    opus: "monophonic chant",
    gloss:
      "O power of Wisdom, who circling encircled — comprehending all things in one path that has life. Hildegard hymning Wisdom-as-process eight centuries before cybernetics named what she saw. The piece arrives at the close of the programme as one voice alone, as it has always been. The journey from a Benedictine abbess’s parchment in 1150 to a JavaScript Web Audio API in 2026 leaves the music untouched, because the music never depended on ensemble. Substrate-coupling proven by survival. It was always one voice calling out.",
    midi: "/audio/midi/hildegard-o-virtus-sapientiae.mid",
    duration: 210,
    bpm: 56,
    boundPaper: "against-grabby-expansion",
    // Substrate-pair: a voice rendering of Hildegard's chant plays
    // underneath the live piano, trailing it by a few seconds —
    // the proto-canonic technique of medieval monophonic chant
    // traditions. Mix is deliberately low: the listener should
    // notice "something is there" without being able to isolate
    // what, the way an old room remembers what was sung in it.
    ghostLayer: {
      src: "/audio/ghost/hildegard-voice.ogg",
      mix: 0.32,
      delaySec: 3.33,
      kind: "voice",
    },
  },
];

// ───────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────

export function getTrack(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}

export function getTrackByIndex(i: number): Track {
  const n = TRACKS.length;
  return TRACKS[((i % n) + n) % n];
}

export function getTracksByMovement(m: MovementId): Track[] {
  return TRACKS.filter((t) => t.movement === m);
}

export function getMovement(id: MovementId): Movement {
  return MOVEMENTS.find((m) => m.id === id)!;
}

export function getBoundTrack(paperSlug: string): Track | undefined {
  return TRACKS.find((t) => t.boundPaper === paperSlug);
}

export function getStillCenter(): Track[] {
  return TRACKS.filter((t) => t.stillCenter);
}
