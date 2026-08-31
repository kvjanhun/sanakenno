/**
 * Admin analytics over the real API: combinations browser, puzzle schedule,
 * achievement stats (event and unique-player modes, Helsinki timezone),
 * failed-guess stats, and word-find stats.
 *
 * Replaces the analytics scenarios of the former admin.feature BDD suite.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import { invalidateAll } from '../../server/puzzle-engine';
import {
  setupAdmin,
  teardownAdmin,
  adminGet,
  type AdminSession,
} from './helpers/admin-fixture';

let session: AdminSession;

function helsinkiDateByOffset(offset: number): string {
  const todayHki = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/Helsinki',
  });
  const anchor = new Date(todayHki + 'T12:00:00Z');
  return new Date(anchor.getTime() - offset * 86400000)
    .toISOString()
    .slice(0, 10);
}

function insertAchievement(
  rank: string,
  achievedAt: string,
  sessionId?: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO achievements
       (puzzle_number, rank, score, max_score, words_found, session_id, achieved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(1, rank, 25, 100, 8, sessionId ?? null, achievedAt);
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const res = await app.request(path, { headers: adminGet(session) });
  expect(res.status).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

beforeEach(async () => {
  session = await setupAdmin();
});

afterEach(() => {
  teardownAdmin();
});

describe('combinations browser', () => {
  interface Combination {
    letters: string;
    total_pangrams: number;
    min_word_count: number;
    max_word_count: number;
    in_rotation: number | boolean;
    variations: Array<Record<string, unknown>>;
  }

  function combos(json: Record<string, unknown>): Combination[] {
    return json.combinations as Combination[];
  }

  it('paginates with total count and page info', async () => {
    const json = await getJson('/api/admin/combinations?page=1&per_page=25');
    expect(combos(json).length).toBeLessThanOrEqual(25);
    expect(json.total).toBeDefined();
    expect(json.page).toBeDefined();
  });

  it('filters by required letters', async () => {
    const json = await getJson('/api/admin/combinations?requires=a,ö');
    for (const combo of combos(json)) {
      expect(combo.letters).toContain('a');
      expect(combo.letters).toContain('ö');
    }
  });

  it('filters by excluded letters', async () => {
    const json = await getJson('/api/admin/combinations?excludes=b,c,d');
    for (const combo of combos(json)) {
      expect(combo.letters).not.toMatch(/[bcd]/);
    }
  });

  it('filters by pangram count range', async () => {
    const json = await getJson(
      '/api/admin/combinations?min_pangrams=3&max_pangrams=10',
    );
    for (const combo of combos(json)) {
      expect(combo.total_pangrams).toBeGreaterThanOrEqual(3);
      expect(combo.total_pangrams).toBeLessThanOrEqual(10);
    }
  });

  it('filters by best-case word count bounds', async () => {
    const lower = await getJson('/api/admin/combinations?min_words=50');
    for (const combo of combos(lower)) {
      expect(combo.max_word_count).toBeGreaterThanOrEqual(50);
    }
    const upper = await getJson('/api/admin/combinations?max_words=55');
    for (const combo of combos(upper)) {
      expect(combo.max_word_count).toBeLessThanOrEqual(55);
    }
  });

  it('filters by worst-case word count range', async () => {
    const json = await getJson(
      '/api/admin/combinations?min_words_min=25&max_words_min=29',
    );
    for (const combo of combos(json)) {
      expect(combo.min_word_count).toBeGreaterThanOrEqual(25);
      expect(combo.min_word_count).toBeLessThanOrEqual(29);
    }
  });

  it('filters by rotation membership', async () => {
    const json = await getJson('/api/admin/combinations?in_rotation=true');
    expect(combos(json).length).toBeGreaterThan(0);
    for (const combo of combos(json)) {
      expect(Boolean(combo.in_rotation)).toBe(true);
    }
  });

  it('sorts by pangrams descending', async () => {
    const json = await getJson(
      '/api/admin/combinations?sort=pangrams&order=desc',
    );
    const list = combos(json);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].total_pangrams).toBeLessThanOrEqual(
        list[i - 1].total_pangrams,
      );
    }
  });

  it('includes all 7 center variations per combination', async () => {
    const json = await getJson('/api/admin/combinations?per_page=1');
    const combo = combos(json)[0];
    expect(combo.variations).toHaveLength(7);
    for (const variation of combo.variations) {
      expect(variation.center).toBeDefined();
      expect(variation.word_count).toBeDefined();
      expect(variation.max_score).toBeDefined();
      expect(variation.pangram_count).toBeDefined();
    }
  });
});

describe('schedule', () => {
  interface ScheduleEntry {
    date: string;
    slot: number;
    display_number: number | null;
    is_today: boolean;
  }

  function schedule(json: Record<string, unknown>): ScheduleEntry[] {
    return json.schedule as ScheduleEntry[];
  }

  it('returns the requested number of upcoming days', async () => {
    const json = await getJson('/api/admin/schedule?days=14');
    const entries = schedule(json);
    expect(entries).toHaveLength(14);
    for (const entry of entries) {
      expect(entry.date).toBeDefined();
      expect(entry.slot).toBeDefined();
      expect(entry.display_number).toBeDefined();
    }
    expect(entries[0].is_today).toBe(true);
  });

  it('display numbers are 1-indexed (slot 0 shows as 1)', async () => {
    const json = await getJson('/api/admin/schedule?days=90');
    const entry = schedule(json).find((e) => e.slot === 0);
    expect(entry).toBeDefined();
    expect(entry!.display_number).toBe(1);
  });

  it('skips soft-deleted puzzles and caps display numbers', async () => {
    const db = getDb();
    db.prepare('DELETE FROM puzzles').run();
    for (let i = 0; i < 10; i++) {
      db.prepare(
        'INSERT INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
      ).run(i, 'a,e,k,l,n,s,t', 'a');
    }
    db.prepare('UPDATE puzzles SET is_active = 0 WHERE slot = 3').run();
    invalidateAll();

    const json = await getJson('/api/admin/schedule?days=14');
    const entries = schedule(json);
    expect(entries.some((e) => e.slot === 3)).toBe(false);
    for (const entry of entries) {
      expect(entry.display_number).toBeLessThanOrEqual(9);
    }
  });

  it('cycles through all 41 puzzles before repeating', async () => {
    const json = await getJson('/api/admin/schedule?days=42');
    const entries = schedule(json);
    const firstCycle = entries.slice(0, 41).map((e) => e.slot);
    expect(new Set(firstCycle).size).toBe(41);
    expect(entries[41].slot).toBe(entries[0].slot);
  });

  it('starts from a selected date without marking any entry today', async () => {
    const start = helsinkiDateByOffset(-7);
    const json = await getJson(`/api/admin/schedule?start=${start}&days=3`);
    const entries = schedule(json);
    expect(entries).toHaveLength(3);
    expect(entries[0].date).toBe(start);
    expect(entries.some((e) => e.is_today)).toBe(false);
  });
});

describe('achievement stats', () => {
  interface DailyEntry {
    date: string;
    counts: Record<string, number>;
    total: number;
  }

  function daily(json: Record<string, unknown>): DailyEntry[] {
    return json.daily as DailyEntry[];
  }

  function dayEntry(
    json: Record<string, unknown>,
    offset: number,
  ): DailyEntry | undefined {
    return daily(json).find((e) => e.date === helsinkiDateByOffset(offset));
  }

  it('returns daily entries with per-rank counts and a totals summary', async () => {
    const json = await getJson('/api/admin/achievements?days=7');
    expect(daily(json)).toHaveLength(7);
    for (const entry of daily(json)) {
      expect(entry.counts).toBeDefined();
      expect(entry.total).toBeDefined();
    }
    expect(json.totals).toBeDefined();
  });

  it('counts each stable player once per day at their best rank', async () => {
    const today = helsinkiDateByOffset(0);
    for (const rank of ['Hyvä alku', 'Onnistuja', 'Sanavalmis']) {
      insertAchievement(rank, `${today} 10:00:00`, 'player-a');
    }
    insertAchievement('Onnistuja', `${today} 10:05:00`, 'player-b');
    insertAchievement('Täysi kenno', `${today} 10:10:00`);

    const json = await getJson('/api/admin/achievements?days=7&mode=users');
    const entry = dayEntry(json, 0)!;
    expect(entry.total).toBe(2);
    expect(entry.counts['Sanavalmis']).toBe(1);
    expect(entry.counts['Onnistuja']).toBe(1);
  });

  it('counts each stable player once across the period in overall totals', async () => {
    insertAchievement(
      'Hyvä alku',
      `${helsinkiDateByOffset(2)} 10:00:00`,
      'player-x',
    );
    insertAchievement(
      'Sanavalmis',
      `${helsinkiDateByOffset(0)} 10:00:00`,
      'player-x',
    );
    const json = await getJson('/api/admin/achievements?days=7&mode=users');
    expect(dayEntry(json, 0)!.total).toBe(1);
    expect(dayEntry(json, 0)!.counts['Sanavalmis']).toBe(1);
    const totals = json.totals as Record<string, number>;
    expect(totals['Sanavalmis']).toBe(1);
    expect(totals['Hyvä alku'] || 0).toBe(0);
  });

  it('counts one player once per day and once per period', async () => {
    for (let offset = 0; offset < 7; offset++) {
      insertAchievement(
        'Onnistuja',
        `${helsinkiDateByOffset(offset)} 10:00:00`,
        'player-weekly',
      );
    }
    const json = await getJson('/api/admin/achievements?days=7&mode=users');
    for (let offset = 0; offset < 7; offset++) {
      expect(dayEntry(json, offset)!.total).toBe(1);
    }
    const totals = json.totals as Record<string, number>;
    expect(totals['Onnistuja']).toBe(1);
  });

  it('groups by Helsinki timezone, not UTC', async () => {
    // 23:30 UTC two days ago is 01:30/02:30 Helsinki *yesterday*.
    insertAchievement('Onnistuja', `${helsinkiDateByOffset(2)} 23:30:00`);
    const json = await getJson('/api/admin/achievements?days=7');
    expect(dayEntry(json, 1)!.total).toBeGreaterThan(0);
    expect(dayEntry(json, 2)!.total).toBe(0);
  });

  it('shows empty days with zero counts', async () => {
    const json = await getJson('/api/admin/achievements?days=7');
    const entry = dayEntry(json, 5)!;
    expect(entry).toBeDefined();
    expect(entry.total).toBe(0);
    for (const count of Object.values(entry.counts)) {
      expect(count).toBe(0);
    }
  });
});

describe('failed-guess stats', () => {
  function seedFailedGuess(word: string, count: number, offset: number): void {
    getDb()
      .prepare(
        `INSERT INTO failed_guesses (word, puzzle_date, count, first_at, last_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(word, puzzle_date) DO UPDATE SET
           count = count + excluded.count, last_at = datetime('now')`,
      )
      .run(word, helsinkiDateByOffset(offset), count);
  }

  interface FailedGuessDay {
    date: string;
    total_count: number;
    words: Array<{ word: string; count: number }>;
  }

  it('returns daily failed-guess counts and words', async () => {
    seedFailedGuess('vieras', 3, 0);
    seedFailedGuess('outu', 1, 0);
    seedFailedGuess('kumma', 2, 1);

    const json = await getJson('/api/admin/failed-guesses?days=7');
    const daily = json.daily as FailedGuessDay[];
    expect(daily).toHaveLength(7);

    const today = daily.find((d) => d.date === helsinkiDateByOffset(0))!;
    expect(today.total_count).toBe(4);
    expect(today.words).toContainEqual({ word: 'vieras', count: 3 });
    expect(today.words).toContainEqual({ word: 'outu', count: 1 });

    const yesterday = daily.find((d) => d.date === helsinkiDateByOffset(1))!;
    expect(yesterday.total_count).toBe(2);
  });

  it('keeps the same word separate by day', async () => {
    seedFailedGuess('anna', 3, 0);
    seedFailedGuess('anna', 3, 1);
    const json = await getJson('/api/admin/failed-guesses?days=7');
    const daily = json.daily as FailedGuessDay[];
    const today = daily.find((d) => d.date === helsinkiDateByOffset(0))!;
    const yesterday = daily.find((d) => d.date === helsinkiDateByOffset(1))!;
    expect(today.words).toContainEqual({ word: 'anna', count: 3 });
    expect(yesterday.words).toContainEqual({ word: 'anna', count: 3 });
  });
});

describe('word-find stats', () => {
  function seedWordFind(word: string, count: number, puzzle: number): void {
    getDb()
      .prepare(
        `INSERT INTO word_finds (word, puzzle_number, count, first_at, last_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(word, puzzle_number) DO UPDATE SET
           count = count + excluded.count, last_at = datetime('now')`,
      )
      .run(word, puzzle, count);
  }

  it('returns per-puzzle find counts including zero-find words', async () => {
    seedWordFind('kala', 5, 4);
    seedWordFind('kana', 2, 4);
    const json = await getJson('/api/admin/word-finds?puzzle_number=4');
    expect(json.puzzle_number).toBe(4);
    const words = json.words as Array<{ word: string; find_count: number }>;
    expect(words.some((w) => w.word === 'lakana' && w.find_count === 0)).toBe(
      true,
    );
    expect(words.find((w) => w.word === 'kala')!.find_count).toBe(5);
    const kana = words.find((w) => w.word === 'kana')!;
    expect(kana.find_count).toBe(2);
    expect(kana.find_count).toBeLessThan(
      words.find((w) => w.word === 'kala')!.find_count,
    );
  });

  it('rejects soft-deleted puzzles', async () => {
    getDb().prepare('UPDATE puzzles SET is_active = 0 WHERE slot = 4').run();
    invalidateAll();
    const res = await app.request('/api/admin/word-finds?puzzle_number=4', {
      headers: adminGet(session),
    });
    expect(res.status).toBe(404);
  });
});
