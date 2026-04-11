/**
 * Database connection module.
 *
 * Uses better-sqlite3 for synchronous SQLite access.
 * Reads DATA_DIR env var (default: ./server/data) for DB path.
 * Initializes schema from schema.sql if tables don't exist.
 * Supports in-memory databases for testing.
 *
 * @module server/db/connection
 */

import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DbOptions {
  inMemory?: boolean;
  dbPath?: string;
}

let _db: BetterSqlite3.Database | null = null;

function resolveDataDir(): string {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  // Default: two levels up from server/db/ -> project root, then server/data
  return join(__dirname, '..', 'data');
}

function applySchema(db: BetterSqlite3.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Migrations: add columns that may be missing from older databases.
  // SQLite's ALTER TABLE ADD COLUMN is idempotent-safe via try/catch.
  const migrations = ['ALTER TABLE achievements ADD COLUMN session_id TEXT'];
  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists — expected, ignore
    }
  }

  // Player auth migration: email-based identity -> player_key_hash identity.
  const playersColumns = db
    .prepare('PRAGMA table_info(players)')
    .all() as Array<{ name: string }>;
  const hasEmail = playersColumns.some((c) => c.name === 'email');
  const hasKeyHash = playersColumns.some((c) => c.name === 'player_key_hash');
  if (hasEmail && !hasKeyHash) {
    db.exec(`
      ALTER TABLE players ADD COLUMN player_key_hash TEXT;
      UPDATE players
      SET player_key_hash = email
      WHERE player_key_hash IS NULL AND email IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_players_key_hash ON players(player_key_hash);
    `);
  }
  if (!hasEmail && hasKeyHash) {
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_players_key_hash ON players(player_key_hash)',
    );
  }

  // Magic-link migration: replace table with transfer tokens.
  db.exec('DROP TABLE IF EXISTS player_magic_tokens');
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_transfer_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_transfer_tokens_hash ON player_transfer_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_transfer_tokens_expires ON player_transfer_tokens(expires_at);
  `);

  // Repair earlier migration bug: some DBs may have player_* tables whose
  // foreign keys still reference a dropped players_old table.
  const playerTablesToCheck = [
    'player_sessions',
    'player_transfer_tokens',
    'player_stats',
    'player_puzzle_states',
  ];
  const tableReferencesPlayersOld = (table: string): boolean => {
    const fkRows = db
      .prepare(`PRAGMA foreign_key_list(${table})`)
      .all() as Array<{ table: string }>;
    return fkRows.some((r) => r.table === 'players_old');
  };

  for (const table of playerTablesToCheck) {
    if (!tableReferencesPlayersOld(table)) continue;
    db.exec('PRAGMA foreign_keys = OFF');
    if (table === 'player_sessions') {
      db.exec(`
        ALTER TABLE player_sessions RENAME TO player_sessions_old_fk;
        CREATE TABLE player_sessions (
            id         TEXT PRIMARY KEY,
            player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO player_sessions (id, player_id, expires_at, created_at)
        SELECT id, player_id, expires_at, created_at FROM player_sessions_old_fk;
        DROP TABLE player_sessions_old_fk;
        CREATE INDEX IF NOT EXISTS idx_player_sessions_expires ON player_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_player_sessions_player  ON player_sessions(player_id);
      `);
    } else if (table === 'player_transfer_tokens') {
      db.exec(`
        ALTER TABLE player_transfer_tokens RENAME TO player_transfer_tokens_old_fk;
        CREATE TABLE player_transfer_tokens (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            token_hash  TEXT NOT NULL UNIQUE,
            expires_at  TEXT NOT NULL,
            used        INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO player_transfer_tokens (id, player_id, token_hash, expires_at, used, created_at)
        SELECT id, player_id, token_hash, expires_at, used, created_at FROM player_transfer_tokens_old_fk;
        DROP TABLE player_transfer_tokens_old_fk;
        CREATE INDEX IF NOT EXISTS idx_transfer_tokens_hash ON player_transfer_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_transfer_tokens_expires ON player_transfer_tokens(expires_at);
      `);
    } else if (table === 'player_stats') {
      db.exec(`
        ALTER TABLE player_stats RENAME TO player_stats_old_fk;
        CREATE TABLE player_stats (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            puzzle_number INTEGER NOT NULL,
            date          TEXT NOT NULL,
            best_rank     TEXT NOT NULL,
            best_score    INTEGER NOT NULL DEFAULT 0,
            max_score     INTEGER NOT NULL DEFAULT 0,
            words_found   INTEGER NOT NULL DEFAULT 0,
            hints_used    INTEGER NOT NULL DEFAULT 0,
            elapsed_ms    INTEGER NOT NULL DEFAULT 0,
            updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(player_id, puzzle_number)
        );
        INSERT INTO player_stats
          (id, player_id, puzzle_number, date, best_rank, best_score, max_score, words_found, hints_used, elapsed_ms, updated_at)
        SELECT
          id, player_id, puzzle_number, date, best_rank, best_score, max_score, words_found, hints_used, elapsed_ms, updated_at
        FROM player_stats_old_fk;
        DROP TABLE player_stats_old_fk;
        CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
      `);
    } else if (table === 'player_puzzle_states') {
      db.exec(`
        ALTER TABLE player_puzzle_states RENAME TO player_puzzle_states_old_fk;
        CREATE TABLE player_puzzle_states (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id          INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            puzzle_number      INTEGER NOT NULL,
            found_words        TEXT NOT NULL DEFAULT '[]',
            score              INTEGER NOT NULL DEFAULT 0,
            hints_unlocked     TEXT NOT NULL DEFAULT '[]',
            started_at         INTEGER NOT NULL DEFAULT 0,
            total_paused_ms    INTEGER NOT NULL DEFAULT 0,
            score_before_hints INTEGER,
            updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(player_id, puzzle_number)
        );
        INSERT INTO player_puzzle_states
          (id, player_id, puzzle_number, found_words, score, hints_unlocked, started_at, total_paused_ms, score_before_hints, updated_at)
        SELECT
          id, player_id, puzzle_number, found_words, score, hints_unlocked, started_at, total_paused_ms, score_before_hints, updated_at
        FROM player_puzzle_states_old_fk;
        DROP TABLE player_puzzle_states_old_fk;
        CREATE INDEX IF NOT EXISTS idx_player_puzzle_states_player ON player_puzzle_states(player_id);
      `);
    }
    db.exec('PRAGMA foreign_keys = ON');
  }
}

/**
 * Initialize the database: create the data directory if needed,
 * open the SQLite file, enable WAL mode, and run the schema.
 */
export function initDb(options: DbOptions = {}): BetterSqlite3.Database {
  if (_db) return _db;

  const { inMemory = false, dbPath } = options;

  try {
    if (inMemory) {
      _db = new Database(':memory:');
    } else {
      const dataDir = resolveDataDir();
      mkdirSync(dataDir, { recursive: true });
      const resolvedPath = dbPath || join(dataDir, 'sanakenno.db');
      _db = new Database(resolvedPath);
    }

    applySchema(_db);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Database initialization failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    throw err;
  }
  return _db;
}

/**
 * Get the database instance, initializing if needed.
 */
export function getDb(options: DbOptions = {}): BetterSqlite3.Database {
  if (!_db) {
    return initDb(options);
  }
  return _db;
}

/**
 * Close the database connection. Useful for tests and graceful shutdown.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Replace the singleton with a custom database instance.
 * Primarily used in tests for dependency injection.
 */
export function setDb(newDb: BetterSqlite3.Database | null): void {
  _db = newDb;
}

export default { initDb, getDb, closeDb, setDb };
