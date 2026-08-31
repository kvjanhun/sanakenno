/**
 * Shared in-memory server fixture for integration tests.
 *
 * Mirrors production setup: real Hono app, real SQLite (in-memory), a
 * 41-slot puzzle rotation, and a small Finnish word list.
 */
import { getDb, closeDb, setDb } from '../../../server/db/connection';
import { resetRateLimit as resetAchievementRateLimit } from '../../../server/routes/achievement';
import { resetRateLimit as resetFailedGuessRateLimit } from '../../../server/routes/failed-guess';
import { resetRateLimit as resetWordFindRateLimit } from '../../../server/routes/word-find';
import {
  getActiveSlots,
  setWordlist,
  invalidateAll,
} from '../../../server/puzzle-engine';
import type BetterSqlite3 from 'better-sqlite3';

export const TEST_WORDS = [
  'kala',
  'sanka',
  'taka',
  'kana',
  'lakana',
  'kanat',
  'kaste',
  'alat',
  'alka',
  'saat',
  'alas',
  'akat',
];

/** Open a fresh in-memory DB seeded with `slots` puzzles (slot 0..slots-1). */
export function setupServerDb(slots = 41): BetterSqlite3.Database {
  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });
  resetAchievementRateLimit();
  resetFailedGuessRateLimit();
  resetWordFindRateLimit();
  invalidateAll();

  for (let i = 0; i < slots; i++) {
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
    ).run(i, 'a,e,k,l,n,s,t', 'a');
  }
  db.prepare(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', '2026-02-24')",
  ).run();

  setWordlist(new Set(TEST_WORDS));
  return db;
}

export function teardownServerDb(): void {
  invalidateAll();
  closeDb();
  setDb(null);
}

/** Soft-delete a puzzle slot and invalidate the rotation cache. */
export function softDeleteSlot(slot: number): void {
  getDb().prepare('UPDATE puzzles SET is_active = 0 WHERE slot = ?').run(slot);
  invalidateAll();
}

/**
 * Move the rotation epoch so today lands on a chosen position in the cycle.
 * The rotation walks active slots in order starting from the first slot at
 * or after index 1, so the epoch offset is the distance from that start
 * position to the target position.
 */
export function setTodayToCyclePosition(targetIndex: number): void {
  const db = getDb();
  const activeSlots = getActiveSlots();
  const startSlot = activeSlots.find((slot) => slot >= 1) ?? activeSlots[0];
  const startIndex = activeSlots.indexOf(startSlot);
  const total = activeSlots.length;
  const daysDiff = (((targetIndex - startIndex) % total) + total) % total;

  const today = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  const epoch = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - daysDiff,
  );
  const epochStr = `${epoch.getFullYear()}-${String(
    epoch.getMonth() + 1,
  ).padStart(2, '0')}-${String(epoch.getDate()).padStart(2, '0')}`;

  db.prepare(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', ?)",
  ).run(epochStr);
  invalidateAll();
}
