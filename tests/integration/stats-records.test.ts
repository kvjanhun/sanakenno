/**
 * Per-puzzle stats record semantics, streaks, and aggregates.
 *
 * Replaces the former stats.feature BDD scenarios not already covered by
 * tests/stats.test.ts and tests/sync-merge.test.ts (server-merge rules) —
 * the stats modal UI scenarios live in tests/e2e/stats.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyStats,
  updateStatsRecord,
  computeStreak,
  computeRankDistribution,
  computeAverageCompletion,
  type StatsRecord,
  type PlayerStats,
} from '@sanakenno/shared';

function record(overrides: Partial<StatsRecord> = {}): StatsRecord {
  return {
    puzzle_number: 5,
    date: '2026-04-01',
    best_rank: 'Onnistuja',
    best_score: 20,
    max_score: 100,
    words_found: 4,
    hints_used: 0,
    elapsed_ms: 60_000,
    ...overrides,
  };
}

function statsWith(...records: StatsRecord[]): PlayerStats {
  return records.reduce(updateStatsRecord, emptyStats());
}

describe('updateStatsRecord', () => {
  it('creates a record on the first word found for a puzzle', () => {
    const stats = updateStatsRecord(emptyStats(), record({ puzzle_number: 5 }));
    expect(stats.records.some((r) => r.puzzle_number === 5)).toBe(true);
  });

  it('upgrades best_rank when a higher rank is reached', () => {
    const stats = statsWith(
      record({ best_rank: 'Onnistuja' }),
      record({ best_rank: 'Sanavalmis' }),
    );
    expect(stats.records[0].best_rank).toBe('Sanavalmis');
  });

  it('never downgrades best_rank', () => {
    const stats = statsWith(
      record({ best_rank: 'Sanavalmis' }),
      record({ best_rank: 'Onnistuja' }),
    );
    expect(stats.records[0].best_rank).toBe('Sanavalmis');
  });

  it('records longest_word per puzzle', () => {
    const stats = statsWith(
      record({ puzzle_number: 7, longest_word: 'sanake' }),
    );
    expect(stats.records[0].longest_word).toBe('sanake');
  });

  it('upgrades longest_word when a longer word is found', () => {
    const stats = statsWith(
      record({ puzzle_number: 7, longest_word: 'kala' }),
      record({ puzzle_number: 7, longest_word: 'lakana' }),
    );
    expect(stats.records[0].longest_word).toBe('lakana');
  });

  it('does not downgrade longest_word', () => {
    const stats = statsWith(
      record({ puzzle_number: 7, longest_word: 'lakana' }),
      record({ puzzle_number: 7, longest_word: 'kala' }),
    );
    expect(stats.records[0].longest_word).toBe('lakana');
  });

  it('records pangrams_found increments', () => {
    const stats = statsWith(
      record({ pangrams_found: 0 }),
      record({ pangrams_found: 1 }),
    );
    expect(stats.records[0].pangrams_found).toBe(1);
  });

  it('keeps the maximum pangrams_found', () => {
    const stats = statsWith(
      record({ pangrams_found: 2 }),
      record({ pangrams_found: 1 }),
    );
    expect(stats.records[0].pangrams_found).toBe(2);
  });

  it('records best_no_hint_score per puzzle', () => {
    const stats = statsWith(record({ best_no_hint_score: 25, hints_used: 1 }));
    expect(stats.records[0].best_no_hint_score).toBe(25);
  });

  it('keeps the maximum best_no_hint_score', () => {
    const stats = statsWith(
      record({ best_no_hint_score: 50, hints_used: 1 }),
      record({ best_no_hint_score: 40, hints_used: 1 }),
    );
    expect(stats.records[0].best_no_hint_score).toBe(50);
  });
});

describe('computeStreak', () => {
  it('counts consecutive days as a streak', () => {
    const records = ['2026-04-01', '2026-03-31', '2026-03-30'].map((date, i) =>
      record({ puzzle_number: i, date }),
    );
    expect(computeStreak(records, '2026-04-01').current).toBe(3);
  });

  it('resets the current streak on a gap', () => {
    const records = ['2026-04-01', '2026-03-30'].map((date, i) =>
      record({ puzzle_number: i, date }),
    );
    expect(computeStreak(records, '2026-04-01').current).toBe(1);
  });

  it('reports the longest consecutive run as the best streak', () => {
    const records = [
      '2026-04-01',
      '2026-03-25',
      '2026-03-24',
      '2026-03-23',
      '2026-03-22',
      '2026-03-21',
    ].map((date, i) => record({ puzzle_number: i, date }));
    expect(computeStreak(records, '2026-04-01').best).toBe(5);
  });
});

describe('rank distribution and completion', () => {
  it('counts best ranks across puzzles', () => {
    const records = [
      record({ puzzle_number: 1, best_rank: 'Onnistuja' }),
      record({ puzzle_number: 2, best_rank: 'Sanavalmis' }),
      record({ puzzle_number: 3, best_rank: 'Onnistuja' }),
    ];
    const distribution = computeRankDistribution(records);
    expect(distribution['Onnistuja']).toBe(2);
    expect(distribution['Sanavalmis']).toBe(1);
  });

  it('averages completion percentage across puzzles', () => {
    const records = [
      record({ puzzle_number: 1, best_score: 50, max_score: 100 }),
      record({ puzzle_number: 2, best_score: 75, max_score: 100 }),
    ];
    expect(computeAverageCompletion(records)).toBeCloseTo(62.5);
  });
});
