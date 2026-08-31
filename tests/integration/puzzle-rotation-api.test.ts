/**
 * Puzzle rotation, display numbering, and rotation headroom over the real
 * API. Replaces the api.feature BDD scenarios not already covered by
 * tests/api.test.ts (response shapes, validation, and rate limits live
 * there).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import {
  setupServerDb,
  teardownServerDb,
  softDeleteSlot,
  setTodayToCyclePosition,
} from './helpers/server-fixture';
import { getActiveSlots } from '../../server/puzzle-engine';

beforeEach(() => {
  setupServerDb();
});

afterEach(() => {
  teardownServerDb();
});

describe('puzzle structure', () => {
  it('has 1 center letter and 6 distinct outer letters from the Finnish alphabet', async () => {
    const res = await app.request('/api/puzzle');
    const json = await res.json();
    expect(json.center).toHaveLength(1);
    expect(json.letters).toHaveLength(6);
    const all = [json.center, ...json.letters];
    expect(new Set(all).size).toBe(7);
    for (const letter of all) {
      expect(letter).toMatch(/^[a-zåäö]$/);
    }
  });

  it('includes a positive max_score', async () => {
    const res = await app.request('/api/puzzle');
    const json = await res.json();
    expect(json.max_score).toBeGreaterThan(0);
  });

  it('serves the same puzzle to every player on the same day', async () => {
    const first = await (await app.request('/api/puzzle')).json();
    const second = await (await app.request('/api/puzzle')).json();
    expect(second.puzzle_number).toBe(first.puzzle_number);
  });
});

describe('pre-computed puzzle data', () => {
  it('serves word_hashes as SHA-256 hex strings', async () => {
    const res = await app.request('/api/puzzle');
    const json = await res.json();
    expect(Array.isArray(json.word_hashes)).toBe(true);
    for (const hash of json.word_hashes) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('serves hint_data with word_count, pangram_count, by_letter, by_length, by_pair', async () => {
    const res = await app.request('/api/puzzle');
    const { hint_data } = await res.json();
    expect(hint_data.word_count).toBeDefined();
    expect(hint_data.pangram_count).toBeDefined();
    expect(hint_data.by_letter).toBeDefined();
    expect(hint_data.by_length).toBeDefined();
    expect(hint_data.by_pair).toBeDefined();
  });
});

describe('soft-deleted puzzles and display numbering', () => {
  it('counts only puzzles still in rotation in total_puzzles', async () => {
    softDeleteSlot(5);
    const res = await app.request('/api/puzzle');
    const json = await res.json();
    expect(json.total_puzzles).toBe(40);
  });

  it('reports display_number as the position among active puzzles', async () => {
    softDeleteSlot(5);
    const res = await app.request('/api/puzzle/6');
    const json = await res.json();
    expect(json.display_number).toBe(6);
  });
});

describe('rotation headroom (health endpoint)', () => {
  it('reports days_remaining', async () => {
    const res = await app.request('/api/health');
    const json = await res.json();
    expect(typeof json.days_remaining).toBe('number');
  });

  it('reports 1 on the last fresh day of the cycle', async () => {
    setTodayToCyclePosition(getActiveSlots().length - 1);
    const res = await app.request('/api/health');
    const json = await res.json();
    expect(json.days_remaining).toBe(1);
  });

  it('reports a full cycle again on the rollover day', async () => {
    setTodayToCyclePosition(0);
    const res = await app.request('/api/health');
    const json = await res.json();
    expect(json.days_remaining).toBe(41);
  });

  it('ignores soft-deleted puzzles in the remaining-day count', async () => {
    softDeleteSlot(5);
    setTodayToCyclePosition(getActiveSlots().length - 1);
    const res = await app.request('/api/health');
    const json = await res.json();
    expect(json.days_remaining).toBe(1);
  });
});

describe('empty database', () => {
  it('returns 404 with an error message when no puzzles exist', async () => {
    setupServerDb(0);
    const res = await app.request('/api/puzzle/0');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(typeof json.error).toBe('string');
  });
});
