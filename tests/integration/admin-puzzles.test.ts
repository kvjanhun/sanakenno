/**
 * Admin puzzle management over the real API: CRUD, duplicate detection,
 * display numbering with soft deletes, live-puzzle protection, center
 * variations, preview, word blocking, and cache invalidation.
 *
 * Replaces the puzzle-management scenarios of the former admin.feature BDD
 * suite (admin auth itself is covered in admin-auth.test.ts).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import {
  getDisplayNumber,
  getPuzzleBySlot,
  hashWord,
  totalPuzzles,
  invalidateAll,
} from '../../server/puzzle-engine';
import { resetPreviewRateLimit } from '../../server/routes/admin';
import {
  setupAdmin,
  teardownAdmin,
  adminGet,
  adminHeaders,
  TEST_LETTERS,
  ALT_LETTERS,
  type AdminSession,
} from './helpers/admin-fixture';

let session: AdminSession;

async function postPuzzle(body: Record<string, unknown>): Promise<Response> {
  return app.request('/api/admin/puzzle', {
    method: 'POST',
    headers: adminHeaders(session),
    body: JSON.stringify(body),
  });
}

/** Move the rotation epoch so today's live puzzle is the given slot. */
function setLiveSlot(slot: number): void {
  const db = getDb();
  const total = totalPuzzles();
  const daysDiff = (((slot - 1) % total) + total) % total;
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

beforeEach(async () => {
  session = await setupAdmin();
});

afterEach(() => {
  teardownAdmin();
});

describe('puzzle CRUD', () => {
  it('creates a new puzzle with slot number and next play date', async () => {
    const res = await postPuzzle({
      letters: ['b', 'i', 'k', 'o', 'r', 't', 'u'],
      center: 'k',
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const json = await res.json();
    expect(json.is_new).toBe(true);
    expect(json.slot).toBeDefined();
    expect(json.next_date).toBeTruthy();
  });

  it('appends a new puzzle to the end of the rotation', async () => {
    const res = await postPuzzle({ letters: ALT_LETTERS, center: 'a' });
    const json = await res.json();
    expect(json.slot).toBe(41);
    expect(totalPuzzles()).toBe(42);
  });

  it('rejects a puzzle with 6 letters', async () => {
    const res = await postPuzzle({
      letters: ['a', 'e', 'k', 'l', 'n', 's'],
      center: 'a',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a puzzle with duplicate letters', async () => {
    const res = await postPuzzle({
      letters: ['a', 'a', 'k', 'l', 'n', 's', 'ö'],
      center: 'a',
    });
    expect(res.status).toBe(400);
  });

  it('rejects non-Finnish letters', async () => {
    const res = await postPuzzle({
      letters: ['a', 'e', 'ñ', 'l', 'n', 's', 'ö'],
      center: 'a',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a center that is not among the 7 letters', async () => {
    const res = await postPuzzle({
      letters: ['a', 'e', 'k', 'l', 'n', 's', 'ö'],
      center: 'b',
    });
    expect(res.status).toBe(400);
  });

  it('updates an existing puzzle and serves fresh data without manual cache clearing', async () => {
    expect(getPuzzleBySlot(5)).toBeDefined();
    const res = await postPuzzle({
      slot: 5,
      letters: ALT_LETTERS,
      center: 'a',
      force: true,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const row = getDb()
      .prepare('SELECT letters FROM puzzles WHERE slot = 5')
      .get() as { letters: string };
    expect(row.letters).toContain('d');
    expect(getPuzzleBySlot(5)!.all_letters).toBe('a,d,e,h,l,r,s');
  });

  it('soft-deletes a puzzle and returns the total count', async () => {
    const res = await app.request('/api/admin/puzzle/5?force=true', {
      method: 'DELETE',
      headers: adminHeaders(session),
    });
    const json = await res.json();
    expect(json.status).toBe('deleted');
    expect(json.total_puzzles).toBeDefined();
    const row = getDb()
      .prepare('SELECT is_active FROM puzzles WHERE slot = 5')
      .get() as { is_active: number };
    expect(row.is_active).toBe(0);
  });

  it('swaps two puzzle slots including centers', async () => {
    const db = getDb();
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (3, ?, ?)',
    ).run('a,e,k,l,n,s,ö', 'a');
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (7, ?, ?)',
    ).run('a,d,e,h,l,r,s', 'd');
    invalidateAll();

    const res = await app.request('/api/admin/puzzle/swap', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ slot_a: 3, slot_b: 7, force: true }),
    });
    expect(res.status).toBe(200);
    const slot3 = db
      .prepare('SELECT letters, center FROM puzzles WHERE slot = 3')
      .get() as { letters: string; center: string };
    const slot7 = db
      .prepare('SELECT letters, center FROM puzzles WHERE slot = 7')
      .get() as { letters: string; center: string };
    expect(slot3.letters).toBe('a,d,e,h,l,r,s');
    expect(slot3.center).toBe('d');
    expect(slot7.letters).toBe('a,e,k,l,n,s,ö');
    expect(slot7.center).toBe('a');
  });

  it('cannot swap a slot with itself', async () => {
    const res = await app.request('/api/admin/puzzle/swap', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ slot_a: 3, slot_b: 3 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('duplicate detection', () => {
  const LETTERS = ['b', 'i', 'k', 'o', 'r', 't', 'u'];

  beforeEach(() => {
    getDb()
      .prepare(
        'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (5, ?, ?)',
      )
      .run('b,i,k,o,r,t,u', 'k');
    invalidateAll();
  });

  it('rejects the same letters and center outright, naming the slot', async () => {
    const res = await postPuzzle({ letters: LETTERS, center: 'k' });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.requires_force).not.toBe(true);
    expect(json.duplicate.slot).toBe(5);
  });

  it('treats reordered letters as the same puzzle', async () => {
    const res = await postPuzzle({
      letters: ['u', 't', 'r', 'o', 'k', 'i', 'b'],
      center: 'k',
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.requires_force).not.toBe(true);
  });

  it('warns on same letters with a different center but allows forcing', async () => {
    const res = await postPuzzle({ letters: LETTERS, center: 'b' });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.requires_force).toBe(true);
    expect(json.duplicate.last_played).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof json.duplicate.days_ago).toBe('number');

    const forced = await postPuzzle({
      letters: LETTERS,
      center: 'b',
      force: true,
    });
    const forcedJson = await forced.json();
    expect(forcedJson.is_new).toBe(true);
  });

  it('lets soft-deleted puzzles free their letters for reuse', async () => {
    getDb().prepare('UPDATE puzzles SET is_active = 0 WHERE slot = 5').run();
    invalidateAll();
    const res = await postPuzzle({ letters: LETTERS, center: 'k' });
    const json = await res.json();
    expect(json.is_new).toBe(true);
  });

  it('rejects changing a center onto an existing puzzle', async () => {
    getDb()
      .prepare(
        'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (6, ?, ?)',
      )
      .run('b,i,k,o,r,t,u', 'b');
    invalidateAll();
    const res = await app.request('/api/admin/puzzle/center', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ slot: 6, center: 'k', force: true }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).requires_force).not.toBe(true);
  });

  it("rejects updating a puzzle onto another puzzle's letters and center even with force", async () => {
    const res = await postPuzzle({
      slot: 6,
      letters: LETTERS,
      center: 'k',
      force: true,
    });
    expect(res.status).toBe(409);
    expect((await res.json()).requires_force).not.toBe(true);
  });

  it('does not flag saving a puzzle over itself as a duplicate', async () => {
    const res = await postPuzzle({
      slot: 5,
      letters: LETTERS,
      center: 'k',
      force: true,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

describe('numbering with soft deletes', () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM puzzles').run();
    for (let i = 0; i < 10; i++) {
      db.prepare(
        'INSERT INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
      ).run(i, 'a,e,k,l,n,s,t', 'a');
    }
    invalidateAll();
  });

  async function deleteSlot(slot: number): Promise<void> {
    const res = await app.request(`/api/admin/puzzle/${slot}?force=true`, {
      method: 'DELETE',
      headers: adminHeaders(session),
    });
    expect(res.status).toBe(200);
  }

  it('excludes soft-deleted puzzles from the total count', async () => {
    await deleteSlot(3);
    expect(totalPuzzles()).toBe(9);
  });

  it('closes the display-number gap left by a deleted puzzle', async () => {
    await deleteSlot(3);
    expect(getDisplayNumber(2)).toBe(3);
    expect(getDisplayNumber(4)).toBe(4);
    expect(getDisplayNumber(9)).toBe(9);
  });

  it('gives a soft-deleted puzzle no display number', async () => {
    await deleteSlot(3);
    expect(getDisplayNumber(3)).toBe(null);
  });

  it('appends new puzzles after the highest slot even with gaps', async () => {
    await deleteSlot(3);
    const res = await postPuzzle({ letters: ALT_LETTERS, center: 'a' });
    const json = await res.json();
    expect(json.slot).toBe(10);
    expect(totalPuzzles()).toBe(10);
  });
});

describe("today's puzzle protection", () => {
  beforeEach(() => {
    setLiveSlot(5);
  });

  it('requires force to update the live puzzle', async () => {
    const res = await postPuzzle({
      slot: 5,
      letters: ALT_LETTERS,
      center: 'a',
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('tämän päivän peli');
    expect(json.requires_force).toBe(true);
  });

  it('allows updating the live puzzle with force', async () => {
    const res = await postPuzzle({
      slot: 5,
      letters: ALT_LETTERS,
      center: 'a',
      force: true,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it('requires force to delete the live puzzle', async () => {
    const res = await app.request('/api/admin/puzzle/5', {
      method: 'DELETE',
      headers: adminHeaders(session),
    });
    expect(res.status).toBe(409);
  });

  it('requires force to swap the live puzzle', async () => {
    const res = await app.request('/api/admin/puzzle/swap', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ slot_a: 5, slot_b: 10 }),
    });
    expect(res.status).toBe(409);
  });
});

describe('center letters', () => {
  it('changes the center and serves fresh puzzle data', async () => {
    const before = getPuzzleBySlot(5);
    expect(before).toBeDefined();
    const res = await app.request('/api/admin/puzzle/center', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ slot: 5, center: 'k', force: true }),
    });
    expect(res.status).toBe(200);
    const row = getDb()
      .prepare('SELECT center FROM puzzles WHERE slot = 5')
      .get() as { center: string };
    expect(row.center).toBe('k');
    expect(getPuzzleBySlot(5)!.center).toBe('k');
  });

  it('returns all 7 center variations with stats and active flag', async () => {
    const res = await app.request('/api/admin/puzzle/variations?slot=4', {
      headers: adminGet(session),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    const variations = json.variations as Array<Record<string, unknown>>;
    expect(variations).toHaveLength(7);
    for (const variation of variations) {
      expect(variation.word_count).toBeDefined();
      expect(variation.max_score).toBeDefined();
      expect(variation.pangram_count).toBeDefined();
    }
    expect(variations.filter((v) => v.is_active === true)).toHaveLength(1);
  });
});

describe('preview', () => {
  it('previews a combination without saving', async () => {
    const before = getDb()
      .prepare('SELECT COUNT(*) as count FROM puzzles')
      .get() as { count: number };
    const res = await app.request('/api/admin/preview', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ letters: TEST_LETTERS }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.variations).toHaveLength(7);
    const after = getDb()
      .prepare('SELECT COUNT(*) as count FROM puzzles')
      .get() as { count: number };
    expect(after.count).toBe(before.count);
  });

  it('includes the full word list when a center is given', async () => {
    const res = await app.request('/api/admin/preview', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ letters: TEST_LETTERS, center: 'k' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.words)).toBe(true);
    expect(json.variations).toHaveLength(7);
  });

  it('rate-limits preview requests to 20 per minute', async () => {
    resetPreviewRateLimit();
    let last: Response | null = null;
    for (let i = 0; i < 21; i++) {
      last = await app.request('/api/admin/preview', {
        method: 'POST',
        headers: adminHeaders(session),
        body: JSON.stringify({ letters: TEST_LETTERS }),
      });
    }
    expect(last!.status).toBe(429);
  });
});

describe('word blocking', () => {
  async function block(word: string): Promise<Response> {
    return app.request('/api/admin/block', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({ word }),
    });
  }

  it('blocks a word', async () => {
    const res = await block('example');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const row = getDb()
      .prepare('SELECT * FROM blocked_words WHERE word = ?')
      .get('example');
    expect(row).toBeDefined();
  });

  it('removes a blocked word from puzzle word lists and hashes', async () => {
    getDb()
      .prepare(
        'INSERT OR REPLACE INTO puzzles (slot, letters, center, is_active) VALUES (5, ?, ?, 1)',
      )
      .run('e,i,k,l,n,s,t', 't');
    invalidateAll();
    expect(getPuzzleBySlot(5)!.words).toContain('testi');

    await block('testi');
    const fresh = getPuzzleBySlot(5)!;
    expect(fresh.words).not.toContain('testi');
    expect(fresh.word_hashes).not.toContain(hashWord('testi'));
  });

  it('unblocks a word', async () => {
    await block('testi');
    const row = getDb()
      .prepare('SELECT id FROM blocked_words WHERE word = ?')
      .get('testi') as { id: number };
    const res = await app.request(`/api/admin/block/${row.id}`, {
      method: 'DELETE',
      headers: adminHeaders(session),
    });
    expect(res.status).toBe(200);
    expect(
      getDb()
        .prepare('SELECT * FROM blocked_words WHERE word = ?')
        .get('testi'),
    ).toBeUndefined();
  });

  it('lists blocked words newest-first with id, word, and timestamp', async () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO blocked_words (word, blocked_at) VALUES ('vanha', '2026-01-01 10:00:00')",
    ).run();
    db.prepare(
      "INSERT INTO blocked_words (word, blocked_at) VALUES ('uusi', '2026-02-01 10:00:00')",
    ).run();
    const res = await app.request('/api/admin/blocked', {
      headers: adminGet(session),
    });
    const json = await res.json();
    const words = json.blocked_words as Array<{
      id: number;
      word: string;
      blocked_at: string;
    }>;
    expect(words.length).toBeGreaterThanOrEqual(2);
    expect(words[0].word).toBe('uusi');
    for (const entry of words) {
      expect(entry.id).toBeDefined();
      expect(entry.word).toBeDefined();
      expect(entry.blocked_at).toBeDefined();
    }
  });

  it('is idempotent when blocking an already-blocked word', async () => {
    await block('testi');
    const res = await block('testi');
    expect(res.status).toBe(200);
    const count = getDb()
      .prepare('SELECT COUNT(*) as count FROM blocked_words WHERE word = ?')
      .get('testi') as { count: number };
    expect(count.count).toBe(1);
  });
});
