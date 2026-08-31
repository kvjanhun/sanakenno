/**
 * Schema migration runner.
 *
 * Covers the three states a real database can be in when a container boots:
 * brand new (created from schema.sql), already fully migrated (the common
 * restart), and an older shape that predates a migration.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import {
  getDb,
  closeDb,
  setDb,
  runMigrations,
} from '../../server/db/connection';
import { migrations, type Migration } from '../../server/db/migrations/index';

afterEach(() => {
  closeDb();
  setDb(null);
  vi.restoreAllMocks();
});

function appliedVersions(db: BetterSqlite3.Database): string[] {
  return (
    db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all() as Array<{ version: string }>
  ).map((r) => r.version);
}

describe('migration runner', () => {
  it('records every migration as applied on a fresh database', () => {
    const db = getDb({ inMemory: true });
    expect(appliedVersions(db)).toEqual(migrations.map((m) => m.version));
  });

  it('is a no-op on a database that is already up to date', () => {
    const db = getDb({ inMemory: true });
    const before = db
      .prepare('SELECT version, applied_at FROM schema_migrations')
      .all();

    runMigrations(db);

    expect(
      db.prepare('SELECT version, applied_at FROM schema_migrations').all(),
    ).toEqual(before);
  });

  it('applies only the migrations a database has not seen', () => {
    const db = getDb({ inMemory: true });
    const ran: string[] = [];
    const extra: Migration = {
      version: '9999-test-only',
      description: 'test migration',
      up: (target) => {
        ran.push('9999-test-only');
        target.exec('CREATE TABLE migration_probe (id INTEGER PRIMARY KEY)');
      },
    };

    migrations.push(extra);
    try {
      runMigrations(db);
      expect(ran).toEqual(['9999-test-only']);
      expect(appliedVersions(db)).toContain('9999-test-only');

      // Second run must not re-apply it — the CREATE TABLE would throw.
      runMigrations(db);
      expect(ran).toEqual(['9999-test-only']);
    } finally {
      migrations.pop();
    }
  });

  it('aborts startup and rolls back when a migration throws', () => {
    const db = getDb({ inMemory: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken: Migration = {
      version: '9999-broken',
      description: 'always fails',
      up: (target) => {
        target.exec('CREATE TABLE half_done (id INTEGER PRIMARY KEY)');
        throw new Error('migration exploded');
      },
    };

    migrations.push(broken);
    try {
      expect(() => runMigrations(db)).toThrow('migration exploded');
      expect(appliedVersions(db)).not.toContain('9999-broken');
      // The partial work inside the failed migration was rolled back.
      const table = db
        .prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'")
        .get();
      expect(table).toBeUndefined();
    } finally {
      migrations.pop();
    }
  });

  it('lets a second instance skip a migration the first already applied', () => {
    // Both containers open the same file after a host reboot. The loser of the
    // write-lock race must not re-run the migration.
    const shared = getDb({ inMemory: true });

    const ran: string[] = [];
    const extra: Migration = {
      version: '9999-concurrent',
      description: 'concurrent probe',
      up: () => {
        ran.push('applied');
      },
    };

    migrations.push(extra);
    try {
      runMigrations(shared); // instance A
      runMigrations(shared); // instance B, same file
      expect(ran).toEqual(['applied']);
    } finally {
      migrations.pop();
    }
  });
});

describe('baseline migration', () => {
  it('brings a pre-migration database up to the current shape', () => {
    // A database as it looked before migrations were tracked: no
    // schema_migrations table, missing the later columns, and still carrying
    // the retired transfer-token table.
    const legacy = new Database(':memory:');
    legacy.exec(`
      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_key_hash TEXT NOT NULL UNIQUE
      );
      CREATE TABLE puzzles (
        slot INTEGER PRIMARY KEY,
        letters TEXT NOT NULL,
        center TEXT NOT NULL
      );
      CREATE TABLE player_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        puzzle_number INTEGER NOT NULL
      );
      CREATE TABLE player_transfer_tokens (token TEXT PRIMARY KEY);
    `);

    runMigrations(legacy);

    const columns = (table: string): string[] =>
      (
        legacy.prepare(`PRAGMA table_info(${table})`).all() as Array<{
          name: string;
        }>
      ).map((r) => r.name);

    expect(columns('players')).toContain('preferences');
    expect(columns('puzzles')).toContain('is_active');
    expect(columns('player_stats')).toContain('best_no_hint_score');
    expect(
      legacy
        .prepare(
          "SELECT name FROM sqlite_master WHERE name = 'player_transfer_tokens'",
        )
        .get(),
    ).toBeUndefined();

    legacy.close();
  });
});
