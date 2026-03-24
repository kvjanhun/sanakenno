/**
 * API integration tests for the Hono server.
 *
 * Uses Hono's app.request() method — no HTTP server needed.
 * Each test gets a fresh in-memory SQLite database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../server/index.js';
import { getDb, closeDb, setDb } from '../server/db/connection.js';
import {
  resetRateLimit,
  stopRateLimitInterval,
} from '../server/routes/achievement.js';
import Database from 'better-sqlite3';

/**
 * Helper: make a request via Hono's app.request().
 *
 * @param {string} path - Request path (e.g., '/api/health')
 * @param {object} [options] - Fetch-compatible request options
 * @returns {Promise<Response>}
 */
function request(path, options = {}) {
  return app.request(path, options);
}

/**
 * Helper: make a JSON POST request.
 *
 * @param {string} path
 * @param {object} body
 * @param {object} [headers] - Additional headers
 * @returns {Promise<Response>}
 */
function postJson(path, body, headers = {}) {
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
    // Initialize with in-memory DB
    getDb({ inMemory: true });
  });

  afterEach(() => {
    closeDb();
    setDb(null);
  });

  it('returns 200 with status ok when DB is reachable', async () => {
    const res = await request('/api/health');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
  });
});

describe('GET /api/puzzle', () => {
  it('returns correct response shape', async () => {
    const res = await request('/api/puzzle');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('center');
    expect(json).toHaveProperty('letters');
    expect(json).toHaveProperty('word_hashes');
    expect(json).toHaveProperty('hint_data');
    expect(json).toHaveProperty('max_score');
    expect(json).toHaveProperty('puzzle_number');
    expect(json).toHaveProperty('total_puzzles');

    // Center is a single character
    expect(json.center).toHaveLength(1);

    // Letters is an array of 6 outer letters
    expect(Array.isArray(json.letters)).toBe(true);
    expect(json.letters).toHaveLength(6);

    // word_hashes is an array of hex strings
    expect(Array.isArray(json.word_hashes)).toBe(true);
    json.word_hashes.forEach((hash) => {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    // hint_data has expected structure
    expect(json.hint_data).toHaveProperty('word_count');
    expect(json.hint_data).toHaveProperty('pangram_count');
    expect(json.hint_data).toHaveProperty('by_letter');
    expect(json.hint_data).toHaveProperty('by_length');
    expect(json.hint_data).toHaveProperty('by_pair');

    // max_score is positive
    expect(json.max_score).toBeGreaterThan(0);

    // puzzle_number is a non-negative integer
    expect(Number.isInteger(json.puzzle_number)).toBe(true);
    expect(json.puzzle_number).toBeGreaterThanOrEqual(0);

    // total_puzzles is a positive integer
    expect(json.total_puzzles).toBeGreaterThan(0);
  });

  it('does not include plaintext words', async () => {
    const res = await request('/api/puzzle');
    const json = await res.json();
    expect(json).not.toHaveProperty('words');
  });
});

describe('GET /api/puzzle/:number', () => {
  it('returns a specific puzzle by number', async () => {
    const res = await request('/api/puzzle/0');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.puzzle_number).toBe(0);
  });

  it('returns puzzle number 1 when requesting slot 1', async () => {
    const res = await request('/api/puzzle/1');
    const json = await res.json();
    expect(json.puzzle_number).toBe(1);
  });

  it('wraps around for out-of-range puzzle number', async () => {
    // The stub has 2 puzzles, so requesting 42 should wrap to 42 % 2 = 0
    const res = await request('/api/puzzle/42');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.puzzle_number).toBe(42 % json.total_puzzles);
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

describe('POST /api/achievement', () => {
  beforeEach(() => {
    closeDb();
    setDb(null);
    getDb({ inMemory: true });
    resetRateLimit();
  });

  afterEach(() => {
    closeDb();
    setDb(null);
  });

  const validPayload = {
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

    const json = await res.json();
    expect(json.status).toBe('recorded');
  });

  it('stores the achievement in the database', async () => {
    await postJson('/api/achievement', validPayload);

    const db = getDb();
    const row = db.prepare('SELECT * FROM achievements').get();
    expect(row).toBeTruthy();
    expect(row.puzzle_number).toBe(5);
    expect(row.rank).toBe('Onnistuja');
    expect(row.score).toBe(25);
    expect(row.max_score).toBe(42);
    expect(row.words_found).toBe(8);
    expect(row.elapsed_ms).toBe(120000);
  });

  it('accepts payload without optional elapsed_ms', async () => {
    const { elapsed_ms, ...payloadWithout } = validPayload;
    const res = await postJson('/api/achievement', payloadWithout);
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid rank', async () => {
    const res = await postJson('/api/achievement', {
      ...validPayload,
      rank: 'InvalidRank',
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Invalid rank');
  });

  it('returns 400 for missing required fields', async () => {
    // Missing score
    const { score, ...payloadWithout } = validPayload;
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
      // Send 10 valid requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const res = await postJson('/api/achievement', validPayload);
        expect(res.status).toBe(201);
      }

      // The 11th should be rate-limited
      const res = await postJson('/api/achievement', validPayload);
      expect(res.status).toBe(429);

      const json = await res.json();
      expect(json.error).toContain('Rate limit');
    });
  });
});
