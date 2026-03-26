/**
 * Unit tests for the pure hint-data derivation module.
 *
 * @module tests/hint-data.test
 */

import { describe, it, expect } from 'vitest';
import { deriveHintData, type HintData } from '../src/utils/hint-data.js';

const ALL_LETTERS = new Set(['a', 'e', 'k', 'l', 'n', 's', 't']);

const HINT_DATA: HintData = {
  word_count: 12,
  pangram_count: 1,
  by_letter: { k: 4, a: 3, t: 1, s: 2, l: 2 },
  by_length: { '4': 7, '5': 3, '6': 1, '8': 1 },
  by_pair: { ka: 4, ta: 1, al: 2, sa: 2, ak: 1, la: 2 },
};

describe('deriveHintData', () => {
  it('computes correct totals with no found words', () => {
    const result = deriveHintData(HINT_DATA, new Set(), ALL_LETTERS);

    expect(result.wordCount).toBe(12);
    expect(result.wordsFound).toBe(0);
    expect(result.wordsRemaining).toBe(12);
    expect(result.pangramStats.total).toBe(1);
    expect(result.pangramStats.found).toBe(0);
    expect(result.pangramStats.remaining).toBe(1);
  });

  it('reduces remaining counts when words are found', () => {
    const found = new Set(['kala', 'kana']);
    const result = deriveHintData(HINT_DATA, found, ALL_LETTERS);

    expect(result.wordsFound).toBe(2);
    expect(result.wordsRemaining).toBe(10);
  });

  it('counts found pangrams correctly', () => {
    // 'laskenta' uses all 7 letters → pangram
    const found = new Set(['laskenta']);
    const result = deriveHintData(HINT_DATA, found, ALL_LETTERS);

    expect(result.pangramStats.found).toBe(1);
    expect(result.pangramStats.remaining).toBe(0);
  });

  it('does not count non-pangrams as pangrams', () => {
    const found = new Set(['kala']);
    const result = deriveHintData(HINT_DATA, found, ALL_LETTERS);

    expect(result.pangramStats.found).toBe(0);
    expect(result.pangramStats.remaining).toBe(1);
  });

  it('sorts letterMap alphabetically', () => {
    const result = deriveHintData(HINT_DATA, new Set(), ALL_LETTERS);
    const letters = result.letterMap.map((e) => e.letter);

    expect(letters).toEqual([...letters].sort());
  });

  it('sorts lengthDistribution ascending by length', () => {
    const result = deriveHintData(HINT_DATA, new Set(), ALL_LETTERS);
    const lens = result.lengthDistribution.map((e) => e.len);

    expect(lens).toEqual([4, 5, 6, 8]);
  });

  it('sorts pairMap alphabetically', () => {
    const result = deriveHintData(HINT_DATA, new Set(), ALL_LETTERS);
    const pairs = result.pairMap.map((e) => e.pair);

    expect(pairs).toEqual([...pairs].sort());
  });

  it('reduces by_letter counts for found words', () => {
    const found = new Set(['kala', 'kana']); // Both start with 'k'
    const result = deriveHintData(HINT_DATA, found, ALL_LETTERS);
    const kEntry = result.letterMap.find((e) => e.letter === 'k')!;

    expect(kEntry.total).toBe(4);
    expect(kEntry.found).toBe(2);
    expect(kEntry.remaining).toBe(2);
  });

  it('reduces by_length counts for found words', () => {
    const found = new Set(['kala']); // length 4
    const result = deriveHintData(HINT_DATA, found, ALL_LETTERS);
    const len4 = result.lengthDistribution.find((e) => e.len === 4)!;

    expect(len4.total).toBe(7);
    expect(len4.found).toBe(1);
    expect(len4.remaining).toBe(6);
  });

  it('reduces by_pair counts for found words', () => {
    const found = new Set(['kala']); // prefix 'ka'
    const result = deriveHintData(HINT_DATA, found, ALL_LETTERS);
    const kaEntry = result.pairMap.find((e) => e.pair === 'ka')!;

    expect(kaEntry.total).toBe(4);
    expect(kaEntry.found).toBe(1);
    expect(kaEntry.remaining).toBe(3);
  });

  it('handles all words found', () => {
    // Create a set of 12 fake words matching hint_data distribution
    const words = new Set([
      'kala',
      'kana',
      'kaste',
      'kanat',
      'alas',
      'alka',
      'akat',
      'taka',
      'saat',
      'sanka',
      'lakana',
      'laskenta',
    ]);
    const result = deriveHintData(HINT_DATA, words, ALL_LETTERS);

    expect(result.wordsFound).toBe(12);
    expect(result.wordsRemaining).toBe(0);
  });

  it('returns correct structure for all entry types', () => {
    const result = deriveHintData(HINT_DATA, new Set(), ALL_LETTERS);

    for (const entry of result.letterMap) {
      expect(entry).toHaveProperty('letter');
      expect(entry).toHaveProperty('total');
      expect(entry).toHaveProperty('found');
      expect(entry).toHaveProperty('remaining');
    }

    for (const entry of result.lengthDistribution) {
      expect(entry).toHaveProperty('len');
      expect(entry).toHaveProperty('total');
      expect(entry).toHaveProperty('found');
      expect(entry).toHaveProperty('remaining');
    }

    for (const entry of result.pairMap) {
      expect(entry).toHaveProperty('pair');
      expect(entry).toHaveProperty('total');
      expect(entry).toHaveProperty('found');
      expect(entry).toHaveProperty('remaining');
    }
  });

  it('handles empty hint_data gracefully', () => {
    const emptyData: HintData = {
      word_count: 0,
      pangram_count: 0,
      by_letter: {},
      by_length: {},
      by_pair: {},
    };
    const result = deriveHintData(emptyData, new Set(), ALL_LETTERS);

    expect(result.wordCount).toBe(0);
    expect(result.letterMap).toHaveLength(0);
    expect(result.lengthDistribution).toHaveLength(0);
    expect(result.pairMap).toHaveLength(0);
  });
});
