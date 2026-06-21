/**
 * Unit tests for the server-side puzzle engine.
 *
 * Tests word filtering, scoring, hash generation, hint data computation,
 * and date-to-slot rotation. Uses a small in-memory wordlist to avoid
 * depending on the full kotus_words.txt file.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import {
  computePuzzle,
  scoreWord,
  isPangram,
  hashWord,
  setWordlist,
  invalidateAll,
  getPuzzleForDate,
} from '../server/puzzle-engine';
import { getDb, closeDb, setDb } from '../server/db/connection';

function setupTestWordlist(words: string[]): void {
  setWordlist(new Set(words));
}

describe('scoreWord (server)', () => {
  const letters: Set<string> = new Set(['a', 'e', 'k', 'l', 'n', 's', 't']);

  it('scores 4-letter word as 1 point', () => {
    expect(scoreWord('kala', letters)).toBe(1);
  });

  it('scores 5-letter word as its length', () => {
    expect(scoreWord('sanka', letters)).toBe(5);
  });

  it('scores pangram with +7 bonus', () => {
    expect(scoreWord('alkusanet', letters)).toBe(9 + 7);
  });

  it('does not give pangram bonus when missing a letter', () => {
    expect(scoreWord('akela', letters)).toBe(5);
  });
});

describe('isPangram', () => {
  const letters: Set<string> = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

  it('returns true when word contains all letters', () => {
    expect(isPangram('abcdefg', letters)).toBe(true);
  });

  it('returns true when word contains all letters plus repeats', () => {
    expect(isPangram('abcdefga', letters)).toBe(true);
  });

  it('returns false when word is missing a letter', () => {
    expect(isPangram('abcdef', letters)).toBe(false);
  });
});

describe('hashWord', () => {
  it('produces correct SHA-256 hex for known input', () => {
    const expected = createHash('sha256').update('kala').digest('hex');
    expect(hashWord('kala')).toBe(expected);
  });

  it('returns lowercase hex string of 64 characters', () => {
    const hash = hashWord('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different words', () => {
    expect(hashWord('kala')).not.toBe(hashWord('kela'));
  });
});

describe('computePuzzle', () => {
  beforeEach(() => {
    setupTestWordlist([
      'kala',
      'kalat',
      'sanka',
      'tela',
      'alkusanet',
      'kone',
      'ala',
      'kalvo',
      'ankka',
      'estetty',
    ]);
  });

  afterEach(() => {
    invalidateAll();
  });

  const letters = 'a,e,k,l,n,s,t';
  const center = 'a';

  it('filters words by minimum length (>= 4)', () => {
    const result = computePuzzle(letters, center);
    expect(result.words).not.toContain('ala');
  });

  it('filters words that must contain center letter', () => {
    const result = computePuzzle(letters, center);
    expect(result.words).not.toContain('kone');
    for (const word of result.words) {
      expect(word).toContain(center);
    }
  });

  it('filters words using only puzzle letters', () => {
    const result = computePuzzle(letters, center);
    expect(result.words).not.toContain('kalvo');
  });

  it('returns valid words sorted alphabetically', () => {
    const result = computePuzzle(letters, center);
    const sorted = [...result.words].sort();
    expect(result.words).toEqual(sorted);
  });

  it('excludes blocked words', () => {
    const result = computePuzzle(letters, center, ['ankka']);
    expect(result.words).not.toContain('ankka');
  });

  it('includes valid words', () => {
    const result = computePuzzle(letters, center);
    expect(result.words).toContain('kala');
    expect(result.words).toContain('kalat');
    expect(result.words).toContain('sanka');
    expect(result.words).toContain('tela');
    expect(result.words).toContain('ankka');
  });

  it('generates correct number of hashes matching words', () => {
    const result = computePuzzle(letters, center);
    expect(result.word_hashes).toHaveLength(result.words.length);
  });

  it('generates correct SHA-256 hashes for each word', () => {
    const result = computePuzzle(letters, center);
    for (let i = 0; i < result.words.length; i++) {
      const expected = createHash('sha256')
        .update(result.words[i])
        .digest('hex');
      expect(result.word_hashes[i]).toBe(expected);
    }
  });

  it('computes correct max_score', () => {
    const result = computePuzzle(letters, center);
    let expectedScore = 0;
    const letterSet = new Set(letters.split(','));
    for (const word of result.words) {
      expectedScore += scoreWord(word, letterSet);
    }
    expect(result.max_score).toBe(expectedScore);
  });

  it('computes correct hint_data.word_count', () => {
    const result = computePuzzle(letters, center);
    expect(result.hint_data.word_count).toBe(result.words.length);
  });

  it('computes correct hint_data.pangram_count', () => {
    const result = computePuzzle(letters, center);
    const letterSet = new Set(letters.split(','));
    const expectedPangrams = result.words.filter((w: string) =>
      isPangram(w, letterSet),
    ).length;
    expect(result.hint_data.pangram_count).toBe(expectedPangrams);
  });

  it('computes hint_data.by_letter correctly', () => {
    const result = computePuzzle(letters, center);
    const totalByLetter = Object.values(result.hint_data.by_letter).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    expect(totalByLetter).toBe(result.words.length);
  });

  it('computes hint_data.by_length correctly', () => {
    const result = computePuzzle(letters, center);
    const totalByLength = Object.values(result.hint_data.by_length).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    expect(totalByLength).toBe(result.words.length);
  });

  it('computes hint_data.by_pair correctly', () => {
    const result = computePuzzle(letters, center);
    const totalByPair = Object.values(result.hint_data.by_pair).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    expect(totalByPair).toBe(result.words.length);
  });

  it('by_length keys are string representations of lengths', () => {
    const result = computePuzzle(letters, center);
    for (const key of Object.keys(result.hint_data.by_length)) {
      expect(typeof key).toBe('string');
      expect(Number.isInteger(Number(key))).toBe(true);
    }
  });
});

describe('computePuzzle with empty wordlist', () => {
  beforeEach(() => {
    setupTestWordlist([]);
  });

  it('returns empty results for empty wordlist', () => {
    const result = computePuzzle('a,b,c,d,e,f,g', 'a');
    expect(result.words).toEqual([]);
    expect(result.word_hashes).toEqual([]);
    expect(result.max_score).toBe(0);
    expect(result.hint_data.word_count).toBe(0);
    expect(result.hint_data.pangram_count).toBe(0);
  });
});

describe('date-to-slot rotation', () => {
  beforeEach(() => {
    closeDb();
    setDb(null);
    const db = getDb({ inMemory: true });

    // Seed 4 puzzles (slots 0, 1, 2, 3)
    db.prepare(
      "INSERT INTO puzzles (slot, letters, center, is_active) VALUES (0, 'a,b,c,d,e,f,g', 'a', 1)",
    ).run();
    db.prepare(
      "INSERT INTO puzzles (slot, letters, center, is_active) VALUES (1, 'a,b,c,d,e,f,g', 'b', 1)",
    ).run();
    db.prepare(
      "INSERT INTO puzzles (slot, letters, center, is_active) VALUES (2, 'a,b,c,d,e,f,g', 'c', 1)",
    ).run();
    db.prepare(
      "INSERT INTO puzzles (slot, letters, center, is_active) VALUES (3, 'a,b,c,d,e,f,g', 'd', 1)",
    ).run();

    db.prepare(
      "INSERT INTO config (key, value) VALUES ('rotation_epoch', '2026-03-01')",
    ).run();
    invalidateAll();
  });

  afterEach(() => {
    closeDb();
    setDb(null);
    invalidateAll();
  });

  it('maps dates to slots sequentially starting at START_INDEX', () => {
    // 2026-03-01: daysDiff = 0, slot = 1
    expect(getPuzzleForDate(new Date('2026-03-01T12:00:00Z'))).toBe(1);

    // 2026-03-02: daysDiff = 1, slot = 2
    expect(getPuzzleForDate(new Date('2026-03-02T12:00:00Z'))).toBe(2);

    // 2026-03-03: daysDiff = 2, slot = 3
    expect(getPuzzleForDate(new Date('2026-03-03T12:00:00Z'))).toBe(3);

    // 2026-03-04: daysDiff = 3, slot = 0
    expect(getPuzzleForDate(new Date('2026-03-04T12:00:00Z'))).toBe(0);

    // 2026-03-05: daysDiff = 4, slot = 1
    expect(getPuzzleForDate(new Date('2026-03-05T12:00:00Z'))).toBe(1);
  });

  it('skips soft-deleted puzzles sequentially without duplicate days', () => {
    const db = getDb();
    // Soft delete slot 2
    db.prepare('UPDATE puzzles SET is_active = 0 WHERE slot = 2').run();
    invalidateAll();

    // 2026-03-01: daysDiff = 0, should serve slot 1
    expect(getPuzzleForDate(new Date('2026-03-01T12:00:00Z'))).toBe(1);

    // 2026-03-02: daysDiff = 1, should skip slot 2 and serve slot 3
    expect(getPuzzleForDate(new Date('2026-03-02T12:00:00Z'))).toBe(3);

    // 2026-03-03: daysDiff = 2, should serve slot 0 (next active slot after 3)
    expect(getPuzzleForDate(new Date('2026-03-03T12:00:00Z'))).toBe(0);

    // 2026-03-04: daysDiff = 3, should serve slot 1
    expect(getPuzzleForDate(new Date('2026-03-04T12:00:00Z'))).toBe(1);
  });

  it('handles negative day offsets (dates before epoch)', () => {
    // 2026-02-28: daysDiff = -1, slot = 0
    expect(getPuzzleForDate(new Date('2026-02-28T12:00:00Z'))).toBe(0);

    // 2026-02-27: daysDiff = -2, slot = 3
    expect(getPuzzleForDate(new Date('2026-02-27T12:00:00Z'))).toBe(3);
  });
});
