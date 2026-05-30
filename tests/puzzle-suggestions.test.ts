import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, getDb, setDb } from '../server/db/connection';
import { invalidateAll, setWordlist } from '../server/puzzle-engine';
import {
  setSuggestionQualityForTesting,
  suggestPuzzle,
  suggestionKey,
  type PangramQualityGrade,
} from '../server/puzzle-suggestions';

interface VariationSeed {
  center: string;
  word_count: number;
  max_score: number;
  pangram_count: number;
}

function generatedWords(
  letters: string,
  center: string,
  count: number,
  extras: string[] = [],
): string[] {
  const chars = Array.from(letters);
  const words = new Set<string>([letters, ...extras]);
  for (const a of chars) {
    for (const b of chars) {
      for (const c of chars) {
        words.add(`${center}${a}${b}${c}`);
        if (words.size >= count) return [...words].slice(0, count);
      }
    }
  }
  return [...words].slice(0, count);
}

function seedPuzzle(slot: number, letters: string, center: string): void {
  getDb()
    .prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
    )
    .run(slot, Array.from(letters).sort().join(','), center);
}

function seedCombination(
  letters: string,
  variations: VariationSeed[],
  totalPangrams = 1,
): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO combinations
       (letters, total_pangrams, min_word_count, max_word_count, min_max_score, max_max_score, variations, in_rotation)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(
      Array.from(letters).sort().join(''),
      totalPangrams,
      Math.min(...variations.map((v) => v.word_count)),
      Math.max(...variations.map((v) => v.word_count)),
      Math.min(...variations.map((v) => v.max_score)),
      Math.max(...variations.map((v) => v.max_score)),
      JSON.stringify(variations),
    );
}

function setQuality(grades: Record<string, PangramQualityGrade>): void {
  setSuggestionQualityForTesting(grades);
}

describe('suggestPuzzle', () => {
  beforeEach(() => {
    closeDb();
    setDb(null);
    getDb({ inMemory: true });
    invalidateAll();

    seedPuzzle(0, 'abcdefg', 'a');
    seedPuzzle(1, 'hijklmn', 'h');

    setWordlist(
      new Set([
        ...generatedWords('abcdefg', 'a', 24, ['abcd', 'abce', 'abcf']),
        ...generatedWords('hijklmn', 'h', 24, ['hijk', 'hijl', 'hijm']),
        ...generatedWords('opqrstu', 'o', 36),
        ...generatedWords('vwxyzåä', 'v', 36),
        ...generatedWords('abcghij', 'a', 36, ['abcd', 'abce', 'abcf']),
      ]),
    );
  });

  afterEach(() => {
    setSuggestionQualityForTesting(null);
    invalidateAll();
    closeDb();
    setDb(null);
  });

  it('rejects letter sets already present in the rotation', () => {
    seedCombination('abcdefg', [
      { center: 'a', word_count: 30, max_score: 100, pangram_count: 1 },
    ]);
    seedCombination('opqrstu', [
      { center: 'o', word_count: 36, max_score: 120, pangram_count: 1 },
    ]);
    setQuality({
      [suggestionKey('abcdefg', 'a')]: 'good',
      [suggestionKey('opqrstu', 'o')]: 'good',
    });

    const suggestion = suggestPuzzle();

    expect(suggestion?.letters_key).toBe('opqrstu');
  });

  it('skips declined letter and center pairs', () => {
    seedCombination('opqrstu', [
      { center: 'o', word_count: 36, max_score: 120, pangram_count: 1 },
    ]);
    seedCombination('vwxyzåä', [
      { center: 'v', word_count: 36, max_score: 118, pangram_count: 1 },
    ]);
    setQuality({
      [suggestionKey('opqrstu', 'o')]: 'good',
      [suggestionKey('vwxyzåä', 'v')]: 'good',
    });

    const first = suggestPuzzle();
    const second = suggestPuzzle({
      declined: [suggestionKey(first!.letters, first!.center)],
    });

    expect(second).not.toBeNull();
    expect(second?.letters_key).not.toBe(first?.letters_key);
  });

  it('prefers lower short-word overlap with append neighbors', () => {
    seedCombination('abcghij', [
      { center: 'a', word_count: 36, max_score: 120, pangram_count: 1 },
    ]);
    seedCombination('opqrstu', [
      { center: 'o', word_count: 36, max_score: 120, pangram_count: 1 },
    ]);
    setQuality({
      [suggestionKey('abcghij', 'a')]: 'good',
      [suggestionKey('opqrstu', 'o')]: 'good',
    });

    const suggestion = suggestPuzzle();

    expect(suggestion?.letters_key).toBe('opqrstu');
  });

  it('rejects candidates with rejected pangram quality', () => {
    seedCombination('opqrstu', [
      { center: 'o', word_count: 36, max_score: 120, pangram_count: 1 },
    ]);
    seedCombination('vwxyzåä', [
      { center: 'v', word_count: 36, max_score: 118, pangram_count: 1 },
    ]);
    setQuality({
      [suggestionKey('opqrstu', 'o')]: 'reject',
      [suggestionKey('vwxyzåä', 'v')]: 'ok',
    });

    const suggestion = suggestPuzzle();

    expect(suggestion?.letters_key).toBe('vwxyzäå');
    expect(suggestion?.quality_grade).toBe('ok');
  });

  it('falls back to unreviewed candidates when no reviewed candidate is eligible', () => {
    seedCombination('opqrstu', [
      { center: 'o', word_count: 36, max_score: 120, pangram_count: 1 },
    ]);

    const suggestion = suggestPuzzle();

    expect(suggestion?.letters_key).toBe('opqrstu');
    expect(suggestion?.quality_grade).toBe('unreviewed');
  });
});
