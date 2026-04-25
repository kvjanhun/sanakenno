import { describe, expect, it } from 'vitest';
import {
  computeLifetimeStats,
  computeStreak,
  getHelsinkiDateString,
} from '@sanakenno/shared';
import type { StatsRecord } from '@sanakenno/shared';

function makeRecord(overrides: Partial<StatsRecord> = {}): StatsRecord {
  return {
    puzzle_number: 1,
    date: '2026-04-01',
    best_rank: 'Hyvä alku',
    best_score: 10,
    max_score: 100,
    words_found: 2,
    hints_used: 0,
    elapsed_ms: 60_000,
    ...overrides,
  };
}

describe('getHelsinkiDateString', () => {
  it('returns the next Helsinki date before UTC midnight when Helsinki has crossed midnight', () => {
    expect(getHelsinkiDateString(new Date('2026-03-27T22:30:00Z'))).toBe(
      '2026-03-28',
    );
  });

  it('handles Helsinki summer time', () => {
    expect(getHelsinkiDateString(new Date('2026-07-01T21:30:00Z'))).toBe(
      '2026-07-02',
    );
  });
});

describe('computeStreak', () => {
  it('defaults today to the Helsinki date', () => {
    const records = [
      makeRecord({ date: getHelsinkiDateString(new Date()) }),
      makeRecord({ puzzle_number: 2, date: '2026-03-01' }),
    ];

    expect(computeStreak(records).current).toBe(1);
  });

  it('keeps explicit today override behavior deterministic', () => {
    const records = [
      makeRecord({ date: '2026-04-01' }),
      makeRecord({ puzzle_number: 2, date: '2026-03-31' }),
    ];

    expect(computeStreak(records, '2026-04-01').current).toBe(2);
  });
});

describe('computeLifetimeStats', () => {
  it('sums words and pangrams and keeps the longest word', () => {
    const totals = computeLifetimeStats([
      makeRecord({ words_found: 3, pangrams_found: 1, longest_word: 'kala' }),
      makeRecord({
        puzzle_number: 2,
        words_found: 5,
        pangrams_found: 2,
        longest_word: 'lakana',
      }),
    ]);

    expect(totals).toEqual({
      totalWords: 8,
      totalPangrams: 3,
      longestWord: 'lakana',
    });
  });
});
