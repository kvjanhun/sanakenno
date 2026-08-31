/**
 * Database connection module.
 *
 * Uses better-sqlite3 for synchronous SQLite access.
 * Reads DATA_DIR env var (default: ./server/data) for DB path.
 * Creates a fresh database from schema.sql, then brings any database up to
 * date by applying pending migrations from db/migrations/.
 * Supports in-memory databases for testing.
 *
 * @module server/db/connection
 */

import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrations } from './migrations/index';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DbOptions {
  inMemory?: boolean;
  dbPath?: string;
}

interface ImmediateTransactionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
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
  db.pragma('busy_timeout = 5000');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  runMigrations(db);
}

/**
 * Apply every migration this database has not seen yet, in order.
 *
 * Two app instances share the SQLite file and start at the same time after a
 * host reboot, so each migration runs under `BEGIN IMMEDIATE` (reserving the
 * single writer slot) and re-checks inside that lock whether the other
 * instance already applied it. `busy_timeout` makes the loser wait rather than
 * fail. A migration that throws aborts startup — a half-migrated database
 * serving traffic is worse than a container that refuses to come up.
 */
export function runMigrations(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const isApplied = (version: string): boolean =>
    db
      .prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
      .get(version) !== undefined;

  for (const migration of migrations) {
    if (isApplied(migration.version)) continue;

    db.exec('BEGIN IMMEDIATE');
    try {
      // Re-check under the write lock: the other instance may have applied
      // this migration between our read above and acquiring the lock.
      if (!isApplied(migration.version)) {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(
          migration.version,
        );
        console.log(
          JSON.stringify({
            level: 'info',
            message: 'Applied schema migration',
            version: migration.version,
            description: migration.description,
          }),
        );
      }
      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* preserve the original migration error */
      }
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Schema migration failed',
          version: migration.version,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      throw err;
    }
  }
}

function isSqliteBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: unknown }).code;
  return code === 'SQLITE_BUSY' || error.message.includes('database is locked');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runImmediateTransactionOnce<T>(
  db: BetterSqlite3.Database,
  work: () => T,
): T {
  let started = false;
  try {
    db.exec('BEGIN IMMEDIATE');
    started = true;
    const result = work();
    db.exec('COMMIT');
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* preserve the original transaction error */
      }
    }
    throw error;
  }
}

/**
 * Run a short read-modify-write transaction with SQLite writer reservation.
 *
 * `BEGIN IMMEDIATE` asks SQLite for the single writer slot before reads begin,
 * avoiding deferred read-to-write upgrade races between app instances. A short
 * retry smooths over transient SQLITE_BUSY collisions.
 */
export async function runImmediateTransactionWithRetry<T>(
  db: BetterSqlite3.Database,
  work: () => T,
  options: ImmediateTransactionOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 25;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return runImmediateTransactionOnce(db, work);
    } catch (error) {
      if (!isSqliteBusyError(error) || attempt >= maxRetries) {
        throw error;
      }

      const jitterMs = Math.floor(Math.random() * retryDelayMs);
      await delay(retryDelayMs * (attempt + 1) + jitterMs);
    }
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
