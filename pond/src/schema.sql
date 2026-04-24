-- ═══════════════════════════════════════════════════════════════════════════
--  Limen Pond — Durable Object SQLite schema
--  ─────────────────────────────────────────────────────────────────────────
--  Applied once on DO construction, idempotent via IF NOT EXISTS. The
--  schema is append-only in practice: new tables may be added, existing
--  tables may gain nullable columns, but no column is ever removed or
--  renamed. This is the contract that makes dataset shards concatenable
--  across pond versions (§ XVI).
--
--  Bitemporality: beliefs use valid_to_tick rather than delete, per § VI.
--  Memories decay via last_accessed_tick + access_count, not removal.
--  Deaths produce name_tiles, which persist forever.
--
--  Indexing philosophy: we index what we query. Memory retrieval scans
--  per-koi rows ordered by recency, so (koi_id, created_at_tick DESC)
--  is the hot index. Relationship cards are keyed by the pair. Events
--  are queried by (type, tick) for analytics.
-- ═══════════════════════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;

-- ─── pond_meta ───────────────────────────────────────────────────────────
-- Single-row table. Identifies this pond, its version, its config hash.
-- Config hash distinguishes ablation runs when the same dataset schema
-- concatenates multiple experimental colonies (§ XV).

CREATE TABLE IF NOT EXISTS pond_meta (
  id                TEXT PRIMARY KEY,    -- always 'self'
  pond_id           TEXT NOT NULL,
  version           TEXT NOT NULL,
  config_hash       TEXT NOT NULL,
  created_at_tick   INTEGER NOT NULL,
  created_at_ms     INTEGER NOT NULL,
  tick_hz           INTEGER NOT NULL DEFAULT 2
);

-- ─── world ───────────────────────────────────────────────────────────────
-- Single-row table. Current world state. Updated every tick.

CREATE TABLE IF NOT EXISTS world (
  id                TEXT PRIMARY KEY,    -- always 'self'
  tick              INTEGER NOT NULL,
  t_day             REAL NOT NULL,       -- [0, 1)
  sim_day           INTEGER NOT NULL,
  season            TEXT NOT NULL,
  weather           TEXT NOT NULL,
  clarity           REAL NOT NULL,
  temperature       REAL NOT NULL,
  solstice_active   INTEGER NOT NULL,    -- 0 or 1
  next_solstice_tick INTEGER NOT NULL,
  tier_level        INTEGER NOT NULL DEFAULT 0,
  month_spend_usd   REAL    NOT NULL DEFAULT 0,
  rng_state         INTEGER NOT NULL DEFAULT 42
);

-- ─── koi ─────────────────────────────────────────────────────────────────
-- One row per koi for all time. Death does not remove the row — stage
-- transitions to 'dying' and then a separate deaths table gets an entry.

CREATE TABLE IF NOT EXISTS koi (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  stage             TEXT NOT NULL,
  age_ticks         INTEGER NOT NULL,
  hatched_at_tick   INTEGER NOT NULL,
  legendary         INTEGER NOT NULL DEFAULT 0,
  color             TEXT NOT NULL,

  -- position in pond meters
  x                 REAL NOT NULL,
  y                 REAL NOT NULL,
  z                 REAL NOT NULL,
  vx                REAL NOT NULL,
  vz                REAL NOT NULL,
  h                 REAL NOT NULL,
  size              REAL NOT NULL,

  -- PAD affect vector
  pad_p             REAL NOT NULL,
  pad_a             REAL NOT NULL,
  pad_d             REAL NOT NULL,

  -- current intent
  intent_kind       TEXT NOT NULL,
  intent_target_id  TEXT,
  intent_target_x   REAL,
  intent_target_y   REAL,
  intent_target_z   REAL,
  intent_at_tick    INTEGER NOT NULL,
  intent_mechanism  TEXT,

  -- cognition schedule
  next_cognition_tick INTEGER NOT NULL,
  last_twilight_tick  INTEGER NOT NULL DEFAULT 0,
  last_deep_sleep_tick INTEGER NOT NULL DEFAULT 0,
  micro_importance_accum REAL NOT NULL DEFAULT 0,

  -- drawn-to reflection (§ X)
  drawn_target_id   TEXT,
  drawn_noticing    TEXT,
  drawn_at_tick     INTEGER,

  -- most recent utterance
  last_utterance       TEXT,
  last_utterance_tick  INTEGER NOT NULL DEFAULT 0,

  -- reproduction cooldown (§ X)
  last_spawning_tick   INTEGER NOT NULL DEFAULT 0,

  -- phenotype genetics — JSON of KoiGenetics (baseColor, markColor,
  -- markCoverage, markDensity, backBlue, headDot, metallic, finAccent).
  -- Seeded for the cohort from archetypeToGenetics(color). Fry inherit
  -- via combineGenetics(parentA, parentB). Cosmetic only — no behavior
  -- depends on this. Rendering reads it directly.
  genetics_json        TEXT NOT NULL DEFAULT '{}',

  -- lifecycle
  is_alive          INTEGER NOT NULL DEFAULT 1,
  died_at_tick      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_koi_alive ON koi(is_alive);
CREATE INDEX IF NOT EXISTS idx_koi_stage ON koi(stage);

-- ─── reproduction_permission (§ X) ──────────────────────────────────────
-- Granted after the 3-of-7 mutual drawn_to detection. Valid for 2
-- sim-days; if the pair never co-presences at the shelf within that
-- window, the permission expires and nothing happens. "The condition
-- enforces only permission, not act."

CREATE TABLE IF NOT EXISTS reproduction_permission (
  pair_key         TEXT PRIMARY KEY,
  a_id             TEXT NOT NULL,
  b_id             TEXT NOT NULL,
  granted_at_tick  INTEGER NOT NULL,
  expires_at_tick  INTEGER NOT NULL,
  consumed_at_tick INTEGER,
  mutual_days      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permission_active
  ON reproduction_permission(consumed_at_tick, expires_at_tick);

-- ─── memory ──────────────────────────────────────────────────────────────
-- Park-style unified memory stream. Rows distinguished by kind.
-- Embedding stored as BLOB of Float32 (384 floats = 1536 bytes).

CREATE TABLE IF NOT EXISTS memory (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  koi_id               TEXT NOT NULL REFERENCES koi(id),
  kind                 TEXT NOT NULL,
  content              TEXT NOT NULL,
  importance           INTEGER NOT NULL,
  created_at_tick      INTEGER NOT NULL,
  last_accessed_tick   INTEGER NOT NULL,
  access_count         INTEGER NOT NULL DEFAULT 0,
  emotional_valence    REAL NOT NULL DEFAULT 0,
  participants_json    TEXT NOT NULL DEFAULT '[]',     -- JSON array of koi_ids
  embedding            BLOB NOT NULL,                   -- Float32 BLOB, 384 dims
  valid_to_tick        INTEGER,                         -- bitemporal; null = current
  source_memory_ids_json TEXT NOT NULL DEFAULT '[]'    -- JSON array of int
);

CREATE INDEX IF NOT EXISTS idx_memory_koi_recent ON memory(koi_id, created_at_tick DESC);
CREATE INDEX IF NOT EXISTS idx_memory_koi_kind ON memory(koi_id, kind);

-- ─── relationship_card ───────────────────────────────────────────────────
-- One row per directed pair (self → other). The same dyad has two rows,
-- one for each direction — relationships are not symmetric.

CREATE TABLE IF NOT EXISTS relationship_card (
  self_id                TEXT NOT NULL,
  other_id               TEXT NOT NULL,
  first_encounter_tick   INTEGER NOT NULL,
  interaction_count      INTEGER NOT NULL DEFAULT 0,
  valence                REAL NOT NULL DEFAULT 0,
  valence_trajectory_json TEXT NOT NULL DEFAULT '[]',   -- last 7 daily values
  dominance              REAL NOT NULL DEFAULT 0,
  trust                  REAL NOT NULL DEFAULT 0.3,
  summary                TEXT NOT NULL DEFAULT '',
  notable_memory_ids_json TEXT NOT NULL DEFAULT '[]',
  drawn_count_7d         INTEGER NOT NULL DEFAULT 0,
  last_authored_tick     INTEGER NOT NULL DEFAULT 0,
  -- Chemical-familiarity bias (§ IV, Stage 9.5). Seeded at hatch for a
  -- fry's cards toward each parent. Read as a sense ("this one is
  -- particularly familiar"), not a fact ("she is my mother"). Shows up
  -- in the prompt context alongside valence and interaction_count so the
  -- LLM has the right input to author utterances that sound like kin
  -- recognition without naming the relationship.
  familiarity_prior      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (self_id, other_id)
);

-- ─── drawn_to_log ────────────────────────────────────────────────────────
-- Ring log of daily drawn_to reflections. Reproduction condition (§ X)
-- scans this for `drawn(A→B) AND drawn(B→A) in ≥ 3 of last 7 sim-days`.

CREATE TABLE IF NOT EXISTS drawn_to_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id       TEXT NOT NULL,
  target_id      TEXT NOT NULL,
  noticing       TEXT NOT NULL,
  tick           INTEGER NOT NULL,
  sim_day        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drawn_pair_day ON drawn_to_log(actor_id, target_id, sim_day);

-- ─── artifact (§ XII) ────────────────────────────────────────────────────
-- Objects circulate. Each artifact has a full provenance chain recorded
-- in artifact_provenance.

CREATE TABLE IF NOT EXISTS artifact (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL,              -- pebble, shed_scale, lily_petal, name_tile, ...
  origin_event_id   TEXT,
  created_at_tick   INTEGER NOT NULL,
  substance         TEXT NOT NULL,
  color             TEXT NOT NULL,
  wear              REAL NOT NULL DEFAULT 0,
  luminosity        REAL NOT NULL DEFAULT 0,
  inscription       TEXT,
  motifs_json       TEXT NOT NULL DEFAULT '[]',
  rarity            REAL NOT NULL DEFAULT 0.5,
  sacred            INTEGER NOT NULL DEFAULT 0,
  state             TEXT NOT NULL DEFAULT 'held',  -- held, lost, hidden, offered, carried, placed
  current_holder    TEXT,                           -- koi_id or NULL if untenanted
  current_loc_x     REAL,
  current_loc_y     REAL,
  current_loc_z     REAL
);

CREATE TABLE IF NOT EXISTS artifact_provenance (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id       TEXT NOT NULL REFERENCES artifact(id),
  at_tick           INTEGER NOT NULL,
  mode              TEXT NOT NULL,                  -- found, given, created, inherited, lost, offered, died_with
  from_holder       TEXT,
  to_holder         TEXT,
  note              TEXT
);

CREATE INDEX IF NOT EXISTS idx_provenance_artifact ON artifact_provenance(artifact_id, at_tick);

-- ─── event ───────────────────────────────────────────────────────────────
-- The research instrument. Every notable thing writes one row here.
-- Also forwarded to Workers AE for Tier-1 observability. Large payloads
-- (full LLM completions) are SHA-256 hashed and stored separately in R2,
-- with payload_hash as the key.

CREATE TABLE IF NOT EXISTS event (
  id                TEXT PRIMARY KEY,
  at_ms             INTEGER NOT NULL,
  tick              INTEGER NOT NULL,
  actor             TEXT NOT NULL,
  type              TEXT NOT NULL,
  targets_json      TEXT NOT NULL DEFAULT '[]',
  mechanism         TEXT,
  affect_delta_json TEXT,
  llm_model         TEXT,
  llm_temperature   REAL,
  llm_tokens_in     INTEGER,
  llm_tokens_out    INTEGER,
  llm_cost_usd      REAL,
  payload_json      TEXT NOT NULL DEFAULT '{}',
  payload_hash      TEXT NOT NULL,
  schema_version    INTEGER NOT NULL DEFAULT 1,
  config_hash       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_type_tick ON event(type, tick);
CREATE INDEX IF NOT EXISTS idx_event_actor_tick ON event(actor, tick);

-- ─── koi_lineage ─────────────────────────────────────────────────────────
-- Who-begat-whom. Queried for the paper's longest-chain figures and for
-- name inheritance when a fry claims a name-tile.
--
-- `generation` is assigned at hatch: max(parent_a.generation, parent_b.generation) + 1.
-- Seed cohort fish are generation 0. This lets us answer questions like
-- "how many generations has this pond produced?" and surface grandparent /
-- great-grandparent relationships for research without anyone having to
-- walk the tree at query time.

CREATE TABLE IF NOT EXISTS koi_lineage (
  koi_id            TEXT PRIMARY KEY REFERENCES koi(id),
  parent_a_id       TEXT,
  parent_b_id       TEXT,
  name_tile_artifact_id TEXT,     -- if this koi has adopted a name-tile
  birth_cohort_tick INTEGER NOT NULL,
  generation        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lineage_generation ON koi_lineage(generation);
CREATE INDEX IF NOT EXISTS idx_lineage_parent_a ON koi_lineage(parent_a_id);
CREATE INDEX IF NOT EXISTS idx_lineage_parent_b ON koi_lineage(parent_b_id);

-- ─── skill (Voyager-style library per-koi) ──────────────────────────────
-- A repeating behavioral pattern may be promoted during weekly deep sleep
-- to a named reusable routine. (§ VI, § XIII)

CREATE TABLE IF NOT EXISTS skill (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  koi_id            TEXT NOT NULL REFERENCES koi(id),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  created_at_tick   INTEGER NOT NULL,
  times_used        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_skill_koi ON skill(koi_id);

-- ─── visitor_session (§ XIV) ────────────────────────────────────────────
-- Anonymous-first. Signed cookie => visitor_hash. No PII stored.

CREATE TABLE IF NOT EXISTS visitor_session (
  hash              TEXT PRIMARY KEY,
  first_seen_ms     INTEGER NOT NULL,
  last_seen_ms      INTEGER NOT NULL,
  pebble_count      INTEGER NOT NULL DEFAULT 0,
  food_count        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visitor_nickname (
  visitor_hash      TEXT NOT NULL,
  koi_id            TEXT NOT NULL,
  nickname          TEXT NOT NULL,
  set_at_ms         INTEGER NOT NULL,
  PRIMARY KEY (visitor_hash, koi_id)
);
