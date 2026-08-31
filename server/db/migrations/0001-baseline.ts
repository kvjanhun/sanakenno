/**
 * Baseline migration.
 *
 * Captures the three ad-hoc column additions and the one table drop that used
 * to run unconditionally on every boot, before migrations were tracked. It is
 * written defensively because it is the one migration that meets databases in
 * an unknown state: the live production file (which already has all of this),
 * a fresh database created from `schema.sql` (likewise), and any older
 * developer copy in between.
 *
 * Later migrations do not need this defensiveness — from here on the runner
 * knows exactly which version a database is at.
 *
 * @module server/db/migrations/0001-baseline
 */

import type BetterSqlite3 from 'better-sqlite3';
import type { Migration } from './index';

/** Add a column only if the table does not already have it. */
function ensureColumn(
  db: BetterSqlite3.Database,
  table: string,
  column: string,
  decl: string,
): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (rows.some((r) => r.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
}

export const migration: Migration = {
  version: '0001-baseline',
  description:
    'Adopt pre-migration schema drift: player preferences, puzzle is_active, no-hint scores, and the retired transfer-token table',
  up(db) {
    ensureColumn(db, 'players', 'preferences', 'TEXT');
    ensureColumn(db, 'puzzles', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
    ensureColumn(
      db,
      'player_stats',
      'best_no_hint_score',
      'INTEGER NOT NULL DEFAULT 0',
    );

    // The pairing model no longer uses per-transfer tokens — the stable
    // player_key is the pairing code. Rows were short-lived by construction.
    db.exec('DROP TABLE IF EXISTS player_transfer_tokens');
  },
};
