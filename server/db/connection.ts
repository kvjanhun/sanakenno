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
