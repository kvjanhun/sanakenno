/**
 * Database connection module.
 *
 * Uses better-sqlite3 for synchronous SQLite access.
 * Reads DATA_DIR env var (default: ./server/data) for DB path.
 * Initializes schema from schema.sql if tables don't exist.
 *
 * @module server/db/connection
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Database.Database | null} */
let _db = null;

/**
 * Resolve the data directory from the DATA_DIR environment variable.
 * Falls back to ./server/data relative to project root.
 *
 * @returns {string} Absolute path to the data directory.
 */
function resolveDataDir() {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  // Default: two levels up from server/db/ → project root, then server/data
  return join(__dirname, '..', 'data');
}

/**
 * Initialize the database: create the data directory if needed,
 * open the SQLite file, enable WAL mode, and run the schema.
 *
 * @returns {Database.Database} The initialized database instance.
 */
export function initDb() {
  if (_db) return _db;

  const dataDir = resolveDataDir();
  mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'sanakenno.db');
  _db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Run schema — all statements use IF NOT EXISTS, safe to re-run
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  _db.exec(schema);

  return _db;
}

/**
 * Get the database instance, initializing if needed.
 *
 * @returns {Database.Database} The database instance.
 */
export function getDb() {
  if (!_db) {
    return initDb();
  }
  return _db;
}

/**
 * Close the database connection. Useful for tests and graceful shutdown.
 */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export default { initDb, getDb, closeDb };
