/**
 * Database connection module.
 *
 * Provides a singleton better-sqlite3 connection for the application.
 * Supports both file-based (production) and in-memory (test) databases.
 *
 * @module server/db/connection
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('better-sqlite3').Database | null} */
let db = null;

/**
 * SQL schema for the achievements table.
 * Applied automatically when initializing the database.
 */
const ACHIEVEMENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_number INTEGER NOT NULL,
    rank TEXT NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    words_found INTEGER NOT NULL,
    elapsed_ms INTEGER,
    achieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Initialize or retrieve the database connection.
 *
 * @param {object} [options]
 * @param {boolean} [options.inMemory=false] - Use an in-memory database (for tests)
 * @param {string}  [options.dbPath]         - Custom path to the SQLite database file
 * @returns {import('better-sqlite3').Database} The database connection
 */
export function getDb(options = {}) {
  if (db) return db;

  const { inMemory = false, dbPath } = options;

  if (inMemory) {
    db = new Database(':memory:');
  } else {
    const resolvedPath = dbPath || join(__dirname, '..', 'data', 'sanakenno.db');
    db = new Database(resolvedPath);
  }

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Apply schema
  db.exec(ACHIEVEMENTS_SCHEMA);

  return db;
}

/**
 * Close the database connection and reset the singleton.
 * Primarily used in tests for cleanup.
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reset the singleton reference without closing.
 * Allows injection of a custom database instance for testing.
 *
 * @param {import('better-sqlite3').Database | null} newDb
 */
export function setDb(newDb) {
  db = newDb;
}
