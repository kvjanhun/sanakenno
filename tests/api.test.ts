/**
 * API integration tests for the Hono server.
 *
 * Uses Hono's app.request() method -- no HTTP server needed.
 * Each test gets a fresh in-memory SQLite database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../server/index';
import { getDb, closeDb, setDb } from '../server/db/connection';
import { resetRateLimit } from '../server/routes/achievement';
import { resetRateLimit as resetWordFindRateLimit } from '../server/routes/word-find';
import {
  setWordlist,
  invalidateAll,
  getPuzzleForDate,
  totalPuzzles,
} from '../server/puzzle-engine';

interface PuzzleResponse {
  center: string;
  letters: string[];
  word_hashes: string[];
  hint_data: {
    word_count: number;
    pangram_count: number;
    by_letter: Record<string, number>;
    by_length: Record<string, number>;
    by_pair: Record<string, number>;
  };
  max_score: number;
  puzzle_number: number;
  total_puzzles: number;
}

interface AchievementRow {
  id: number;
  puzzle_number: number;
  rank: string;
  score: number;
  max_score: number;
  words_found: number;
  elapsed_ms: number | null;
  session_id: string | null;
  achieved_at: string;
}

interface WordFindRow {
  word: string;
  puzzle_number: number;
  count: number;
}

interface ErrorResponse {
  error: string;
}

interface StatusResponse {
  status: string;
}

function request(path: string, options: RequestInit = {}) {
  return app.request(path, options);
}

function postJson(
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('GET /api/health', () => {
  beforeEach(() => {
    closeDb();
    setDb(null);
    getDb({ inMemory: true });
  });

  afterEach(() => {
    closeDb();
    setDb(null);
  });

  it('returns 200 with status ok when DB is reachable', async () => {
    const res = await request('/api/health');
    expect(res.status).toBe(200);

    const json = (await res.json()) as StatusResponse;
    expect(json.status).toBe('ok');
  });
});

function seedPuzzleData(): void {
  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });

  db.prepare(
    'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
  ).run(0, 'a,e,k,l,n,s,t', 'a');
  db.prepare(
    'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
  ).run(1, 'a,d,e,h,l,r,s', 'e');
  db.prepare(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', '2026-02-24')",
  ).run();

  setWordlist(
    new Set([
      'kala',
      'sanka',
      'taka',
      'kana',
      'lakana',
      'kanat',
      'kaste',
      'helas',
      'lehde',
      'lehdes',
      'rades',
    ]),
  );

  invalidateAll();
}

describe('GET /api/puzzle', () => {
  beforeEach(() => seedPuzzleData());
  afterEach(() => {
    closeDb();
    setDb(null);
    invalidateAll();
  });

  it('returns correct response shape', async () => {
    const res = await request('/api/puzzle');
    expect(res.status).toBe(200);

    const json = (await res.json()) as PuzzleResponse;
    expect(json).toHaveProperty('center');
    expect(json).toHaveProperty('letters');
    expect(json).toHaveProperty('word_hashes');
    expect(json).toHaveProperty('hint_data');
    expect(json).toHaveProperty('max_score');
    expect(json).toHaveProperty('puzzle_number');
    expect(json).toHaveProperty('total_puzzles');

    expect(json.center).toHaveLength(1);

    expect(Array.isArray(json.letters)).toBe(true);
    expect(json.letters).toHaveLength(6);

    expect(Array.isArray(json.word_hashes)).toBe(true);
    json.word_hashes.forEach((hash: string) => {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    expect(json.hint_data).toHaveProperty('word_count');
    expect(json.hint_data).toHaveProperty('pangram_count');
    expect(json.hint_data).toHaveProperty('by_letter');
    expect(json.hint_data).toHaveProperty('by_length');
    expect(json.hint_data).toHaveProperty('by_pair');

    expect(json.max_score).toBeGreaterThan(0);

    expect(Number.isInteger(json.puzzle_number)).toBe(true);
    expect(json.puzzle_number).toBeGreaterThanOrEqual(0);

    expect(json.total_puzzles).toBeGreaterThan(0);
  });

  it('does not include plaintext words', async () => {
    const res = await request('/api/puzzle');
    const json = (await res.json()) as PuzzleResponse;
    expect(json).not.toHaveProperty('words');
  });
});

describe('GET /api/puzzle/:number', () => {
  beforeEach(() => seedPuzzleData());
  afterEach(() => {
    closeDb();
    setDb(null);
    invalidateAll();
  });

  it('returns a specific puzzle by number', async () => {
    const res = await request('/api/puzzle/0');
    expect(res.status).toBe(200);

    const json = (await res.json()) as PuzzleResponse;
    expect(json.puzzle_number).toBe(0);
  });

  it('returns puzzle number 1 when requesting slot 1', async () => {
    const res = await request('/api/puzzle/1');
    const json = (await res.json()) as PuzzleResponse;
    expect(json.puzzle_number).toBe(1);
  });

  it('returns 404 for out-of-range puzzle number', async () => {
    const res = await request('/api/puzzle/42');
    expect(res.status).toBe(404);
  });

  it('returns 404 for inactive puzzle number', async () => {
    const db = getDb();
    db.prepare('UPDATE puzzles SET is_active = 0 WHERE slot = ?').run(1);
    invalidateAll();

    const res = await request('/api/puzzle/1');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid puzzle number', async () => {
    const res = await request('/api/puzzle/abc');
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative puzzle number', async () => {
    const res = await request('/api/puzzle/-1');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/puzzle/:number/words', () => {
  beforeEach(() => seedPuzzleData());
  afterEach(() => {
    closeDb();
    setDb(null);
    invalidateAll();
  });

  it("rejects wrapped aliases of today's puzzle", async () => {
    const now = new Date();
    const helsinki = new Date(
      now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
    );
    const activeSlot = getPuzzleForDate(helsinki);
    const alias = activeSlot + totalPuzzles();

    const res = await request(`/api/puzzle/${alias}/words`);

    expect(res.status).toBe(404);
  });

  it('returns 404 for inactive puzzle word list', async () => {
    const db = getDb();
    db.prepare('UPDATE puzzles SET is_active = 0 WHERE slot = ?').run(1);
    invalidateAll();

    const res = await request('/api/puzzle/1/words');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/achievement', () => {
  beforeEach(() => {
    closeDb();
    setDb(null);
    const db = getDb({ inMemory: true });
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center, is_active) VALUES (?, ?, ?, 1)',
    ).run(5, 'a,e,k,l,n,s,t', 'a');
    resetRateLimit();
  });

  afterEach(() => {
    closeDb();
    setDb(null);
  });

  const validPayload: Record<string, unknown> = {
    puzzle_number: 5,
    rank: 'Onnistuja',
    score: 25,
    max_score: 42,
    words_found: 8,
    elapsed_ms: 120000,
  };

  it('returns 201 with valid data', async () => {
    const res = await postJson('/api/achievement', validPayload);
    expect(res.status).toBe(201);

    const json = (await res.json()) as StatusResponse;
    expect(json.status).toBe('recorded');
  });

  it('stores the achievement in the database', async () => {
    await postJson('/api/achievement', validPayload);

    const db = getDb();
    const row = db.prepare('SELECT * FROM achievements').get() as
      | AchievementRow
      | undefined;
    expect(row).toBeTruthy();
    expect(row!.puzzle_number).toBe(5);
    expect(row!.rank).toBe('Onnistuja');
    expect(row!.score).toBe(25);
    expect(row!.max_score).toBe(42);
    expect(row!.words_found).toBe(8);
    expect(row!.elapsed_ms).toBe(120000);
  });

  it('accepts payload without optional elapsed_ms', async () => {
    const { elapsed_ms: _elapsed, ...payloadWithout } = validPayload;
    const res = await postJson('/api/achievement', payloadWithout);
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid rank', async () => {
    const res = await postJson('/api/achievement', {
      ...validPayload,
      rank: 'InvalidRank',
    });
    expect(res.status).toBe(400);

    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toContain('Invalid rank');
  });

  it('returns 400 for missing required fields', async () => {
    const { score: _score, ...payloadWithout } = validPayload;
    const res = await postJson('/api/achievement', payloadWithout);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative score', async () => {
    const res = await postJson('/api/achievement', {
      ...validPayload,
      score: -5,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer values', async () => {
    const res = await postJson('/api/achievement', {
      ...validPayload,
      score: 25.5,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await request('/api/achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('validates all 7 Finnish ranks are accepted', async () => {
    const validRanks = [
      'Etsi sanoja!',
      'Hyvä alku',
      'Nyt mennään!',
      'Onnistuja',
      'Sanavalmis',
      'Ällistyttävä',
      'Täysi kenno',
    ];

    for (const rank of validRanks) {
      resetRateLimit();
      const res = await postJson('/api/achievement', {
        ...validPayload,
        rank,
      });
      expect(res.status).toBe(201);
    }
  });

  describe('rate limiting', () => {
    it('returns 429 after 10 requests per minute', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await postJson('/api/achievement', validPayload);
        expect(res.status).toBe(201);
      }

      const res = await postJson('/api/achievement', validPayload);
      expect(res.status).toBe(429);

      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toContain('Rate limit');
    });
  });

  it('returns 404 for non-existent puzzle_number', async () => {
    const res = await postJson('/api/achievement', {
      ...validPayload,
      puzzle_number: 999,
    });
    expect(res.status).toBe(404);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toContain('ei löydy tai se ei ole aktiivinen');
  });

  it('returns 404 for inactive puzzle', async () => {
    const db = getDb();
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center, is_active) VALUES (?, ?, ?, 0)',
    ).run(6, 'a,e,k,l,n,s,t', 'a');

    const res = await postJson('/api/achievement', {
      ...validPayload,
      puzzle_number: 6,
    });
    expect(res.status).toBe(404);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toContain('ei löydy tai se ei ole aktiivinen');
  });
});

describe('POST /api/word-find', () => {
  beforeEach(() => {
    closeDb();
    setDb(null);
    getDb({ inMemory: true });
    resetWordFindRateLimit();
  });

  afterEach(() => {
    closeDb();
    setDb(null);
  });

  it('records a valid word find', async () => {
    const res = await postJson('/api/word-find', {
      word: 'Kala',
      puzzle_number: 5,
    });

    expect(res.status).toBe(200);

    const db = getDb();
    const row = db.prepare('SELECT * FROM word_finds').get() as
      | WordFindRow
      | undefined;
    expect(row).toBeTruthy();
    expect(row!.word).toBe('kala');
    expect(row!.puzzle_number).toBe(5);
    expect(row!.count).toBe(1);
  });

  it('increments duplicate word finds by word and puzzle number', async () => {
    await postJson('/api/word-find', { word: 'kala', puzzle_number: 5 });
    const res = await postJson('/api/word-find', {
      word: 'kala',
      puzzle_number: 5,
    });

    expect(res.status).toBe(200);

    const db = getDb();
    const row = db
      .prepare(
        'SELECT count FROM word_finds WHERE word = ? AND puzzle_number = ?',
      )
      .get('kala', 5) as { count: number } | undefined;
    expect(row?.count).toBe(2);
  });

  it('keeps counts separate per puzzle number', async () => {
    await postJson('/api/word-find', { word: 'kala', puzzle_number: 5 });
    await postJson('/api/word-find', { word: 'kala', puzzle_number: 6 });

    const db = getDb();
    const rows = db
      .prepare(
        'SELECT puzzle_number, count FROM word_finds ORDER BY puzzle_number',
      )
      .all() as Array<{ puzzle_number: number; count: number }>;
    expect(rows).toEqual([
      { puzzle_number: 5, count: 1 },
      { puzzle_number: 6, count: 1 },
    ]);
  });

  it('returns 400 for invalid puzzle number', async () => {
    const res = await postJson('/api/word-find', {
      word: 'kala',
      puzzle_number: -1,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await request('/api/word-find', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    expect(res.status).toBe(400);
  });

  it('returns 429 after 60 requests per minute', async () => {
    for (let i = 0; i < 60; i++) {
      const res = await postJson('/api/word-find', {
        word: `word${i}`,
        puzzle_number: 5,
      });
      expect(res.status).toBe(200);
    }

    const res = await postJson('/api/word-find', {
      word: 'word60',
      puzzle_number: 5,
    });
    expect(res.status).toBe(429);
  });
});
