/**
 * GET /api/archive and the past-puzzle word list endpoint over the real
 * API. Replaces the API scenarios from the former archive.feature BDD
 * suite (the archive modal UI lives in tests/e2e/archive.spec.ts).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import {
  getPuzzleForDate,
  totalPuzzles,
  invalidateAll,
} from '../../server/puzzle-engine';
import {
  setupServerDb,
  teardownServerDb,
  softDeleteSlot,
} from './helpers/server-fixture';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  display_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
  max_score: number;
}

async function getArchive(query = ''): Promise<{
  res: Response;
  entries: ArchiveEntry[];
}> {
  const res = await app.request(`/api/archive${query}`);
  return { res, entries: (await res.json()) as ArchiveEntry[] };
}

function todaySlot(): number {
  const helsinki = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  return getPuzzleForDate(helsinki);
}

/**
 * Re-seed the rotation epoch so today resolves to the given slot.
 * getPuzzleForDate maps dates sequentially to active slots starting at
 * slot 1, so the epoch is placed the matching number of days back.
 */
function setTodayToSlot(slot: number): void {
  const db = getDb();
  const total = totalPuzzles();
  const helsinki = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  helsinki.setHours(0, 0, 0, 0);
  const daysBack = ((slot - 1) % total) + total;
  const epoch = new Date(helsinki);
  epoch.setDate(epoch.getDate() - daysBack);
  const epochStr = `${epoch.getFullYear()}-${String(
    epoch.getMonth() + 1,
  ).padStart(2, '0')}-${String(epoch.getDate()).padStart(2, '0')}`;
  db.prepare(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', ?)",
  ).run(epochStr);
  invalidateAll();
}

beforeEach(() => {
  setupServerDb();
});

afterEach(() => {
  teardownServerDb();
});

describe('GET /api/archive', () => {
  it('returns 7 fully-shaped entries', async () => {
    const { res, entries } = await getArchive();
    expect(res.status).toBe(200);
    expect(entries).toHaveLength(7);
    for (const entry of entries) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof entry.puzzle_number).toBe('number');
      expect(typeof entry.display_number).toBe('number');
      expect(entry.letters).toHaveLength(7);
      expect(typeof entry.center).toBe('string');
      expect(typeof entry.is_today).toBe('boolean');
      expect(typeof entry.max_score).toBe('number');
    }
  });

  it('orders entries newest-first, spanning 6 days', async () => {
    const { entries } = await getArchive();
    expect(entries[0].is_today).toBe(true);
    const first = new Date(entries[0].date + 'T12:00:00');
    const last = new Date(entries[entries.length - 1].date + 'T12:00:00');
    const diffDays = Math.round(
      (first.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBe(6);
  });

  it("flags exactly one entry as today's", async () => {
    const { entries } = await getArchive();
    expect(entries.filter((e) => e.is_today)).toHaveLength(1);
  });
});

describe('GET /api/archive?all=true', () => {
  it('returns more entries than the default 7', async () => {
    const { res, entries } = await getArchive('?all=true');
    expect(res.status).toBe(200);
    expect(entries.length).toBeGreaterThan(7);
  });

  it('ends at slot 0 when today is later in the cycle', async () => {
    const { entries } = await getArchive('?all=true');
    expect(entries[0].is_today).toBe(true);
    expect(entries[entries.length - 1].puzzle_number).toBe(0);
  });

  it('returns a full cycle when today is slot 0', async () => {
    setTodayToSlot(0);
    const { entries } = await getArchive('?all=true');
    expect(entries[0].is_today).toBe(true);
    expect(entries).toHaveLength(totalPuzzles());
    expect(entries[entries.length - 1].puzzle_number).toBe(1);
  });

  it('skips soft-deleted slots', async () => {
    setTodayToSlot(3);
    softDeleteSlot(2);
    const { entries } = await getArchive('?all=true');
    expect(entries.some((e) => e.puzzle_number === 2)).toBe(false);
    expect(entries.some((e) => e.puzzle_number === 0)).toBe(true);
  });
});

describe('GET /api/puzzle/:number/words', () => {
  it('serves the word list for a past puzzle', async () => {
    const res = await app.request('/api/puzzle/0/words');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.words)).toBe(true);
  });

  it("blocks the word list for today's puzzle", async () => {
    const res = await app.request(`/api/puzzle/${todaySlot()}/words`);
    expect(res.status).toBe(403);
  });

  it("rejects wrapped aliases of today's puzzle", async () => {
    const res = await app.request(
      `/api/puzzle/${todaySlot() + totalPuzzles()}/words`,
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid puzzle number', async () => {
    const res = await app.request('/api/puzzle/abc/words');
    expect(res.status).toBe(400);
  });
});
