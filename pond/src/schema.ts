// ═══════════════════════════════════════════════════════════════════════════
//  Limen Pond — Schema loader
//  ─────────────────────────────────────────────────────────────────────────
//  Bundles schema.sql as a string constant and applies it to the DO's
//  SQLite storage on first startup. The schema uses IF NOT EXISTS
//  everywhere, so re-applying on every startup is both safe and the
//  simplest migration strategy for Stage 0.
//
//  When stages 4+ start adding columns, we migrate by appending
//  ALTER TABLE statements to `MIGRATIONS[]`. Each migration is keyed by
//  schema_version; pond_meta.version tracks the current version so we
//  only run forward-migrations not previously applied.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The full DDL from schema.sql, inlined. Cloudflare Workers can't read
 * arbitrary files at runtime, so the contents are baked into the bundle.
 * Edit schema.sql and regenerate this string via `npm run bundle:schema`
 * (or, for now, manually keep them in sync).
 */
export const SCHEMA_DDL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pond_meta (
  id                TEXT PRIMARY KEY,
  pond_id           TEXT NOT NULL,
  version           TEXT NOT NULL,
  config_hash       TEXT NOT NULL,
  created_at_tick   INTEGER NOT NULL,
  created_at_ms     INTEGER NOT NULL,
  tick_hz           INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS world (
  id                TEXT PRIMARY KEY,
  tick              INTEGER NOT NULL,
  t_day             REAL NOT NULL,
  sim_day           INTEGER NOT NULL,
  season            TEXT NOT NULL,
  weather           TEXT NOT NULL,
  clarity           REAL NOT NULL,
  temperature       REAL NOT NULL,
  solstice_active   INTEGER NOT NULL,
  next_solstice_tick INTEGER NOT NULL,
  tier_level        INTEGER NOT NULL DEFAULT 0,
  month_spend_usd   REAL    NOT NULL DEFAULT 0,
  rng_state         INTEGER NOT NULL DEFAULT 42
);

CREATE TABLE IF NOT EXISTS koi (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  stage             TEXT NOT NULL,
  sex               TEXT NOT NULL DEFAULT 'female',
  age_ticks         INTEGER NOT NULL,
  hatched_at_tick   INTEGER NOT NULL,
  legendary         INTEGER NOT NULL DEFAULT 0,
  color             TEXT NOT NULL,
  x                 REAL NOT NULL,
  y                 REAL NOT NULL,
  z                 REAL NOT NULL,
  vx                REAL NOT NULL,
  vz                REAL NOT NULL,
  h                 REAL NOT NULL,
  size              REAL NOT NULL,
  pad_p             REAL NOT NULL,
  pad_a             REAL NOT NULL,
  pad_d             REAL NOT NULL,
  hunger            REAL NOT NULL DEFAULT 0.2,
  intent_kind       TEXT NOT NULL,
  intent_target_id  TEXT,
  intent_target_x   REAL,
  intent_target_y   REAL,
  intent_target_z   REAL,
  intent_at_tick    INTEGER NOT NULL,
  intent_mechanism  TEXT,
  next_cognition_tick INTEGER NOT NULL,
  last_twilight_tick  INTEGER NOT NULL DEFAULT 0,
  last_deep_sleep_tick INTEGER NOT NULL DEFAULT 0,
  micro_importance_accum REAL NOT NULL DEFAULT 0,
  drawn_target_id   TEXT,
  drawn_noticing    TEXT,
  drawn_at_tick     INTEGER,
  last_utterance       TEXT,
  last_utterance_tick  INTEGER NOT NULL DEFAULT 0,
  last_spawning_tick   INTEGER NOT NULL DEFAULT 0,
  genetics_json        TEXT NOT NULL DEFAULT '{}',
  genotype_json        TEXT NOT NULL DEFAULT '{}',
  is_alive          INTEGER NOT NULL DEFAULT 1,
  died_at_tick      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_koi_alive ON koi(is_alive);
CREATE INDEX IF NOT EXISTS idx_koi_stage ON koi(stage);

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
  participants_json    TEXT NOT NULL DEFAULT '[]',
  embedding            BLOB NOT NULL,
  valid_to_tick        INTEGER,
  source_memory_ids_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_memory_koi_recent ON memory(koi_id, created_at_tick DESC);
CREATE INDEX IF NOT EXISTS idx_memory_koi_kind ON memory(koi_id, kind);

CREATE TABLE IF NOT EXISTS relationship_card (
  self_id                TEXT NOT NULL,
  other_id               TEXT NOT NULL,
  first_encounter_tick   INTEGER NOT NULL,
  interaction_count      INTEGER NOT NULL DEFAULT 0,
  valence                REAL NOT NULL DEFAULT 0,
  valence_trajectory_json TEXT NOT NULL DEFAULT '[]',
  dominance              REAL NOT NULL DEFAULT 0,
  trust                  REAL NOT NULL DEFAULT 0.3,
  summary                TEXT NOT NULL DEFAULT '',
  notable_memory_ids_json TEXT NOT NULL DEFAULT '[]',
  drawn_count_7d         INTEGER NOT NULL DEFAULT 0,
  last_authored_tick     INTEGER NOT NULL DEFAULT 0,
  familiarity_prior      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (self_id, other_id)
);

CREATE TABLE IF NOT EXISTS drawn_to_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id       TEXT NOT NULL,
  target_id      TEXT NOT NULL,
  noticing       TEXT NOT NULL,
  tick           INTEGER NOT NULL,
  sim_day        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drawn_pair_day ON drawn_to_log(actor_id, target_id, sim_day);

CREATE TABLE IF NOT EXISTS artifact (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL,
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
  state             TEXT NOT NULL DEFAULT 'held',
  current_holder    TEXT,
  current_loc_x     REAL,
  current_loc_y     REAL,
  current_loc_z     REAL
);

CREATE TABLE IF NOT EXISTS artifact_provenance (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id       TEXT NOT NULL REFERENCES artifact(id),
  at_tick           INTEGER NOT NULL,
  mode              TEXT NOT NULL,
  from_holder       TEXT,
  to_holder         TEXT,
  note              TEXT
);
CREATE INDEX IF NOT EXISTS idx_provenance_artifact ON artifact_provenance(artifact_id, at_tick);

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

CREATE TABLE IF NOT EXISTS koi_lineage (
  koi_id            TEXT PRIMARY KEY REFERENCES koi(id),
  parent_a_id       TEXT,
  parent_b_id       TEXT,
  name_tile_artifact_id TEXT,
  birth_cohort_tick INTEGER NOT NULL,
  generation        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lineage_generation ON koi_lineage(generation);
CREATE INDEX IF NOT EXISTS idx_lineage_parent_a ON koi_lineage(parent_a_id);
CREATE INDEX IF NOT EXISTS idx_lineage_parent_b ON koi_lineage(parent_b_id);

CREATE TABLE IF NOT EXISTS skill (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  koi_id            TEXT NOT NULL REFERENCES koi(id),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  created_at_tick   INTEGER NOT NULL,
  times_used        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_skill_koi ON skill(koi_id);

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

CREATE TABLE IF NOT EXISTS food (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  x                 REAL NOT NULL,
  y                 REAL NOT NULL,
  z                 REAL NOT NULL,
  vx                REAL,
  vz                REAL,
  spawned_at_tick   INTEGER NOT NULL,
  decay_at_tick     INTEGER NOT NULL,
  nutrition         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_food_decay ON food(decay_at_tick);
`;

/**
 * Applies the schema to a Cloudflare DO SQLite storage. Idempotent.
 * The DO SQLite API is `state.storage.sql.exec(sql, ...bindings)`.
 *
 * Three-phase because `CREATE TABLE IF NOT EXISTS` is a no-op on an
 * existing table — it won't add newly-declared columns — and any
 * `CREATE INDEX` on those new columns would then fail. So:
 *
 *   1. Ensure all tables exist. A fresh DB gets the full schema here.
 *   2. Migrate any existing tables to the current column set.
 *   3. Create indexes. All referenced columns are now guaranteed.
 */
export function applySchema(sql: SqlStorage): void {
  const statements = SCHEMA_DDL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const tableStmts = statements.filter(
    (s) => /^CREATE\s+TABLE/i.test(s),
  );
  const indexStmts = statements.filter(
    (s) => /^CREATE\s+INDEX/i.test(s),
  );

  for (const stmt of tableStmts) sql.exec(stmt);
  migrate(sql);
  for (const stmt of indexStmts) sql.exec(stmt);
}

/**
 * Schema migrations for databases created under earlier versions.
 * Each call is idempotent — we check column existence via
 * `PRAGMA table_info(...)` and only ALTER TABLE when needed.
 *
 * Every column addition here must be `NOT NULL DEFAULT <value>` because
 * SQLite won't let you add a NOT NULL column with no default to a table
 * that already has rows.
 */
function migrate(sql: SqlStorage): void {
  // Stage 9.5 — Families: color genetics, generation tracking, kin
  // imprinting bias. Any database created before Stage 9.5 is missing
  // these columns.
  addColumnIfMissing(
    sql, "koi", "genetics_json", "TEXT NOT NULL DEFAULT '{}'",
  );
  addColumnIfMissing(
    sql, "koi_lineage", "generation", "INTEGER NOT NULL DEFAULT 0",
  );
  addColumnIfMissing(
    sql, "relationship_card", "familiarity_prior", "REAL NOT NULL DEFAULT 0",
  );

  // Stage 9.6 — Sex and Mendelian genotypes. The pond now has binary
  // sex (female/male, stable for life) and a full diploid genotype
  // blob alongside the expressed phenotype. Existing koi get defaults:
  // sex=female (SQLite can't express conditionality here; the bootstrap
  // overrides for the seed cohort via UPDATE), and genotype_json='{}'
  // which the rehydration path handles by reconstructing a plausible
  // homozygous genotype from the phenotype.
  addColumnIfMissing(
    sql, "koi", "sex", "TEXT NOT NULL DEFAULT 'female'",
  );
  addColumnIfMissing(
    sql, "koi", "genotype_json", "TEXT NOT NULL DEFAULT '{}'",
  );

  // April 2026 — Hunger. Fish now have an interoceptive hunger value
  // that rises over time and falls when food is eaten. Existing koi
  // get the initial baseline (0.2). See HUNGER in constants.ts.
  addColumnIfMissing(
    sql, "koi", "hunger", "REAL NOT NULL DEFAULT 0.2",
  );
}

function addColumnIfMissing(
  sql: SqlStorage, table: string, column: string, typeDecl: string,
): void {
  // PRAGMA table_info returns zero rows when the table doesn't exist,
  // which would mean our CREATE TABLE phase should have just created
  // it — we leave the ALTER alone so we don't error on fresh DBs.
  const cols = sql.exec(`PRAGMA table_info(${table})`).toArray();
  if (cols.length === 0) return;
  const alreadyExists = cols.some((c) => c["name"] === column);
  if (alreadyExists) return;
  sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDecl}`);
}
