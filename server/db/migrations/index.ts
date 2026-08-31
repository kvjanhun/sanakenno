/**
 * Ordered schema migrations.
 *
 * Every schema change ships as a migration here AND as an update to
 * `schema.sql`. `schema.sql` is the baseline a brand-new database is created
 * from; the migrations bring an existing database (production, or a
 * developer's older copy) up to that same shape. The runner in
 * `../connection.ts` applies pending migrations at startup, inside a write
 * transaction, recording each one in `schema_migrations`.
 *
 * Rules for adding one:
 * - Append; never edit or renumber an applied migration.
 * - `version` is the filename stem and must be unique and sortable.
 * - `up` must be safe to run exactly once against a database that is at the
 *   previous version — the runner guarantees it is never run twice.
 * - Keep migrations forward-only. There is no `down`: rolling back a bad
 *   migration means restoring from the Litestream replica.
 *
 * @module server/db/migrations
 */

import type BetterSqlite3 from 'better-sqlite3';
import { migration as baseline } from './0001-baseline';

export interface Migration {
  /** Unique, sortable identifier. Recorded in `schema_migrations`. */
  version: string;
  /** One-line description of what the migration does. */
  description: string;
  /** Applies the change. Runs inside a transaction owned by the runner. */
  up: (db: BetterSqlite3.Database) => void;
}

/** Applied in array order. Append new migrations to the end. */
export const migrations: Migration[] = [baseline];
