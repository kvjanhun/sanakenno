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
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
 * Apply schema and pragmas to a database instance.
 *
 * @param {Database.Database} db - The database to initialize.
 */
function applySchema(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

/**
 * Initialize the database: create the data directory if needed,
 * open the SQLite file, enable WAL mode, and run the schema.
 *
 * @param {object} [options]
 * @param {boolean} [options.inMemory=false] - Use an in-memory database (for tests).
 * @param {string}  [options.dbPath]         - Custom path to the SQLite database file.
 * @returns {Database.Database} The initialized database instance.
 */
export function initDb(options = {}) {
  if (_db) return _db;

  const { inMemory = false, dbPath } = options;

  if (inMemory) {
    _db = new Database(':memory:');
  } else {
    const dataDir = resolveDataDir();
    mkdirSync(dataDir, { recursive: true });
    const resolvedPath = dbPath || join(dataDir, 'sanakenno.db');
    _db = new Database(resolvedPath);
  }

  applySchema(_db);
  return _db;
}

/**
 * Get the database instance, initializing if needed.
 *
 * @param {object} [options] - Passed to initDb if the database is not yet initialized.
 * @param {boolean} [options.inMemory=false] - Use an in-memory database (for tests).
 * @param {string}  [options.dbPath]         - Custom path to the SQLite database file.
 * @returns {Database.Database} The database instance.
 */
export function getDb(options = {}) {
  if (!_db) {
    return initDb(options);
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

/**
 * Replace the singleton with a custom database instance.
 * Primarily used in tests for dependency injection.
 *
 * @param {Database.Database | null} newDb
 */
export function setDb(newDb) {
  _db = newDb;
}

export default { initDb, getDb, closeDb, setDb };
