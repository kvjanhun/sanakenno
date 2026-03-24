/**
 * Unit tests for the pure scoring logic.
 * Ported from web_kontissa/frontend/tests/unit/useSanakennoLogic.test.js.
 */

import { describe, it, expect } from 'vitest';
import {
  RANKS,
  scoreWord,
  recalcScore,
  rankForScore,
  rankThresholds,
  progressToNextRank,
  colorizeWord,
  toColumns,
  type RankThreshold,
  type ColorizedChar,
} from '../src/utils/scoring.js';

describe('scoreWord', () => {
  const letters: Set<string> = new Set(['a', 'e', 'i', 'k', 'l', 't', 'v']);

  it('scores 4-letter word as 1 point', () => {
    expect(scoreWord('kale', letters)).toBe(1);
  });

  it('scores 5-letter word as 5 points', () => {
    expect(scoreWord('katti', letters)).toBe(5);
  });

  it('scores 7-letter word as 7 points', () => {
    expect(scoreWord('välittä', letters)).toBe(7);
  });

  it('adds 7-point pangram bonus when all letters used', () => {
    expect(scoreWord('aktiveli', letters)).toBe(8 + 7);
  });

  it('no pangram bonus when missing a letter', () => {
    expect(scoreWord('aktive', letters)).toBe(6);
  });
});

describe('recalcScore', () => {
  const letters: Set<string> = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

  it('returns 0 for empty word list', () => {
    expect(recalcScore([], letters)).toBe(0);
  });

  it('sums scores for multiple words', () => {
    expect(recalcScore(['abcd', 'abcde'], letters)).toBe(6);
  });

  it('includes pangram bonuses', () => {
    expect(recalcScore(['abcdefg'], letters)).toBe(14);
  });
});

describe('rankForScore', () => {
  it('returns "Etsi sanoja!" at 0 points', () => {
    expect(rankForScore(0, 100)).toBe('Etsi sanoja!');
  });

  it('returns "Hyvä alku" at 2%', () => {
    expect(rankForScore(2, 100)).toBe('Hyvä alku');
  });

  it('returns "Nyt mennään!" at 10%', () => {
    expect(rankForScore(10, 100)).toBe('Nyt mennään!');
  });

  it('returns "Onnistuja" at 20%', () => {
    expect(rankForScore(20, 100)).toBe('Onnistuja');
  });

  it('returns "Sanavalmis" at 40%', () => {
    expect(rankForScore(40, 100)).toBe('Sanavalmis');
  });

  it('returns "Ällistyttävä" at 70%', () => {
    expect(rankForScore(70, 100)).toBe('Ällistyttävä');
  });

  it('returns "Täysi kenno" at 100%', () => {
    expect(rankForScore(100, 100)).toBe('Täysi kenno');
  });

  it('returns "Etsi sanoja!" when maxScore is 0', () => {
    expect(rankForScore(0, 0)).toBe('Etsi sanoja!');
  });

  it('handles boundary: 1% is still "Etsi sanoja!"', () => {
    expect(rankForScore(1, 100)).toBe('Etsi sanoja!');
  });

  it('handles boundary: 9% is "Hyvä alku"', () => {
    expect(rankForScore(9, 100)).toBe('Hyvä alku');
  });

  it('handles boundary: 69% is "Sanavalmis"', () => {
    expect(rankForScore(69, 100)).toBe('Sanavalmis');
  });

  it('handles boundary: 99% is "Ällistyttävä"', () => {
    expect(rankForScore(99, 100)).toBe('Ällistyttävä');
  });

  it('works with non-round maxScore', () => {
    expect(rankForScore(30, 150)).toBe('Onnistuja');
  });
});

describe('rankThresholds', () => {
  it('hides "Täysi kenno" when not at that rank', () => {
    const thresholds = rankThresholds('Hyvä alku', 100);
    expect(
      thresholds.find((t: RankThreshold) => t.name === 'Täysi kenno'),
    ).toBeUndefined();
  });

  it('shows "Täysi kenno" when at that rank', () => {
    const thresholds = rankThresholds('Täysi kenno', 100);
    expect(
      thresholds.find((t: RankThreshold) => t.name === 'Täysi kenno'),
    ).toBeDefined();
  });

  it('marks current rank correctly', () => {
    const thresholds = rankThresholds('Onnistuja', 100);
    const current = thresholds.find((t: RankThreshold) => t.isCurrent);
    expect(current!.name).toBe('Onnistuja');
  });

  it('calculates correct point thresholds', () => {
    const thresholds = rankThresholds('Etsi sanoja!', 200);
    const allistyttava = thresholds.find(
      (t: RankThreshold) => t.name === 'Ällistyttävä',
    );
    expect(allistyttava!.points).toBe(140);
  });

  it('returns thresholds in ascending order', () => {
    const thresholds = rankThresholds('Etsi sanoja!', 100);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i].points).toBeGreaterThanOrEqual(
        thresholds[i - 1].points,
      );
    }
  });
});

describe('progressToNextRank', () => {
  it('returns 0 when maxScore is 0', () => {
    expect(progressToNextRank(0, 0)).toBe(0);
  });

  it('returns 100 when at Täysi kenno', () => {
    expect(progressToNextRank(100, 100)).toBe(100);
  });

  it('returns 0 at the start of a rank', () => {
    expect(progressToNextRank(2, 100)).toBe(0);
  });

  it('returns ~50% halfway between ranks', () => {
    const progress = progressToNextRank(6, 100);
    expect(progress).toBeCloseTo(50, 0);
  });

  it('approaches 100 near next rank', () => {
    const progress = progressToNextRank(9, 100);
    expect(progress).toBeGreaterThan(80);
  });
});

describe('colorizeWord', () => {
  const center = 'a';
  const allLetters: Set<string> = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

  it('marks center letter as accent', () => {
    const result = colorizeWord('a', center, allLetters);
    expect(result[0]).toEqual({ char: 'a', color: 'accent' });
  });

  it('marks other puzzle letters as primary', () => {
    const result = colorizeWord('b', center, allLetters);
    expect(result[0]).toEqual({ char: 'b', color: 'primary' });
  });

  it('marks non-puzzle letters as tertiary', () => {
    const result = colorizeWord('z', center, allLetters);
    expect(result[0]).toEqual({ char: 'z', color: 'tertiary' });
  });

  it('marks dash as tertiary', () => {
    const result = colorizeWord('-', center, allLetters);
    expect(result[0]).toEqual({ char: '-', color: 'tertiary' });
  });

  it('handles mixed word correctly', () => {
    const result = colorizeWord('abz-', center, allLetters);
    expect(result.map((r: ColorizedChar) => r.color)).toEqual([
      'accent',
      'primary',
      'tertiary',
      'tertiary',
    ]);
  });
});

describe('toColumns', () => {
  it('returns empty array for empty input', () => {
    expect(toColumns([])).toEqual([]);
  });

  it('puts all items in one column when under limit', () => {
    const words = ['a', 'b', 'c'];
    expect(toColumns(words)).toEqual([['a', 'b', 'c']]);
  });

  it('splits into multiple columns at default 10', () => {
    const words = Array.from({ length: 25 }, (_, i) => `w${i}`);
    const cols = toColumns(words);
    expect(cols).toHaveLength(3);
    expect(cols[0]).toHaveLength(10);
    expect(cols[1]).toHaveLength(10);
    expect(cols[2]).toHaveLength(5);
  });

  it('respects custom perColumn parameter', () => {
    const words = ['a', 'b', 'c', 'd', 'e'];
    const cols = toColumns(words, 2);
    expect(cols).toHaveLength(3);
    expect(cols[0]).toEqual(['a', 'b']);
    expect(cols[2]).toEqual(['e']);
  });
});

describe('RANKS', () => {
  it('has 7 ranks', () => {
    expect(RANKS).toHaveLength(7);
  });

  it('is sorted by percentage descending', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].pct).toBeLessThan(RANKS[i - 1].pct);
    }
  });

  it('starts at 100% and ends at 0%', () => {
    expect(RANKS[0].pct).toBe(100);
    expect(RANKS[RANKS.length - 1].pct).toBe(0);
  });
});
