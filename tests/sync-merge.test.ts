/**
 * Unit tests for the cross-device sync merge functions.
 */

import { describe, it, expect } from 'vitest';
import { mergeStatsRecord, mergePuzzleState } from '@sanakenno/shared';
import type { StatsRecord, SyncPuzzleState } from '@sanakenno/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<StatsRecord> = {}): StatsRecord {
  return {
    puzzle_number: 1,
    date: '2026-01-01',
    best_rank: 'Hyvä alku',
    best_score: 10,
    max_score: 100,
    words_found: 5,
    hints_used: 0,
    elapsed_ms: 60_000,
    ...overrides,
  };
}

function makeState(overrides: Partial<SyncPuzzleState> = {}): SyncPuzzleState {
  return {
    puzzle_number: 1,
    found_words: ['kissa', 'koira'],
    score: 10,
    hints_unlocked: [],
    started_at: 1_700_000_000_000,
    total_paused_ms: 0,
    score_before_hints: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mergeStatsRecord
// ---------------------------------------------------------------------------

describe('mergeStatsRecord', () => {
  it('keeps existing puzzle_number and date', () => {
    const result = mergeStatsRecord(
      makeRecord({ puzzle_number: 42, date: '2026-01-10' }),
      makeRecord({ puzzle_number: 42, date: '2026-02-01' }),
    );
    expect(result.puzzle_number).toBe(42);
    expect(result.date).toBe('2026-01-10');
  });

  it('keeps existing max_score', () => {
    const result = mergeStatsRecord(
      makeRecord({ max_score: 100 }),
      makeRecord({ max_score: 99 }),
    );
    expect(result.max_score).toBe(100);
  });

  it('takes higher best_score', () => {
    const result = mergeStatsRecord(
      makeRecord({ best_score: 30 }),
      makeRecord({ best_score: 50 }),
    );
    expect(result.best_score).toBe(50);
  });

  it('takes higher words_found', () => {
    const result = mergeStatsRecord(
      makeRecord({ words_found: 3 }),
      makeRecord({ words_found: 7 }),
    );
    expect(result.words_found).toBe(7);
  });

  it('takes higher hints_used', () => {
    const result = mergeStatsRecord(
      makeRecord({ hints_used: 1 }),
      makeRecord({ hints_used: 3 }),
    );
    expect(result.hints_used).toBe(3);
  });

  it('takes higher elapsed_ms', () => {
    const result = mergeStatsRecord(
      makeRecord({ elapsed_ms: 120_000 }),
      makeRecord({ elapsed_ms: 90_000 }),
    );
    expect(result.elapsed_ms).toBe(120_000);
  });

  it('keeps existing best_rank when it is higher', () => {
    const result = mergeStatsRecord(
      makeRecord({ best_rank: 'Täysi kenno' }),
      makeRecord({ best_rank: 'Hyvä alku' }),
    );
    expect(result.best_rank).toBe('Täysi kenno');
  });

  it('takes incoming best_rank when it is higher', () => {
    const result = mergeStatsRecord(
      makeRecord({ best_rank: 'Hyvä alku' }),
      makeRecord({ best_rank: 'Ällistyttävä' }),
    );
    expect(result.best_rank).toBe('Ällistyttävä');
  });

  it('keeps existing best_rank when ranks are equal', () => {
    const result = mergeStatsRecord(
      makeRecord({ best_rank: 'Nyt mennään!' }),
      makeRecord({ best_rank: 'Nyt mennään!' }),
    );
    expect(result.best_rank).toBe('Nyt mennään!');
  });

  it('merges symmetrically for numeric fields', () => {
    const a = makeRecord({ best_score: 40, words_found: 8 });
    const b = makeRecord({ best_score: 60, words_found: 5 });
    const ab = mergeStatsRecord(a, b);
    const ba = mergeStatsRecord(b, a);
    expect(ab.best_score).toBe(ba.best_score);
    expect(ab.words_found).toBe(ba.words_found);
  });

  it('keeps the longer longest_word', () => {
    const result = mergeStatsRecord(
      makeRecord({ longest_word: 'kissa' }),
      makeRecord({ longest_word: 'sanake' }),
    );
    expect(result.longest_word).toBe('sanake');
  });

  it('keeps existing longest_word when it is longer', () => {
    const result = mergeStatsRecord(
      makeRecord({ longest_word: 'pitkäsana' }),
      makeRecord({ longest_word: 'lyhyt' }),
    );
    expect(result.longest_word).toBe('pitkäsana');
  });

  it('keeps existing longest_word on equal length', () => {
    const result = mergeStatsRecord(
      makeRecord({ longest_word: 'kissa' }),
      makeRecord({ longest_word: 'koira' }),
    );
    expect(result.longest_word).toBe('kissa');
  });

  it('handles missing longest_word on both sides', () => {
    const result = mergeStatsRecord(makeRecord(), makeRecord());
    expect(result.longest_word).toBe('');
  });

  it('handles missing longest_word on one side', () => {
    const result = mergeStatsRecord(
      makeRecord({ longest_word: 'sana' }),
      makeRecord(),
    );
    expect(result.longest_word).toBe('sana');
  });

  it('takes higher pangrams_found', () => {
    const result = mergeStatsRecord(
      makeRecord({ pangrams_found: 1 }),
      makeRecord({ pangrams_found: 3 }),
    );
    expect(result.pangrams_found).toBe(3);
  });

  it('handles missing pangrams_found (treats as 0)', () => {
    const result = mergeStatsRecord(
      makeRecord({ pangrams_found: 2 }),
      makeRecord(),
    );
    expect(result.pangrams_found).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// mergePuzzleState
// ---------------------------------------------------------------------------

describe('mergePuzzleState', () => {
  it('keeps local puzzle_number', () => {
    const result = mergePuzzleState(
      makeState({ puzzle_number: 5 }),
      makeState({ puzzle_number: 5 }),
    );
    expect(result.puzzle_number).toBe(5);
  });

  it('unions found_words from both sides', () => {
    const result = mergePuzzleState(
      makeState({ found_words: ['kissa', 'koira'] }),
      makeState({ found_words: ['koira', 'lintu'] }),
    );
    expect(result.found_words.sort()).toEqual(
      ['kissa', 'koira', 'lintu'].sort(),
    );
  });

  it('deduplicates found_words', () => {
    const result = mergePuzzleState(
      makeState({ found_words: ['kissa', 'kissa'] }),
      makeState({ found_words: ['kissa'] }),
    );
    expect(result.found_words.filter((w) => w === 'kissa').length).toBe(1);
  });

  it('unions hints_unlocked from both sides', () => {
    const result = mergePuzzleState(
      makeState({ hints_unlocked: ['hint-a'] }),
      makeState({ hints_unlocked: ['hint-b'] }),
    );
    expect(result.hints_unlocked.sort()).toEqual(['hint-a', 'hint-b'].sort());
  });

  it('takes the earlier started_at', () => {
    const result = mergePuzzleState(
      makeState({ started_at: 2_000_000_000_000 }),
      makeState({ started_at: 1_000_000_000_000 }),
    );
    expect(result.started_at).toBe(1_000_000_000_000);
  });

  it('takes the higher total_paused_ms', () => {
    const result = mergePuzzleState(
      makeState({ total_paused_ms: 5_000 }),
      makeState({ total_paused_ms: 8_000 }),
    );
    expect(result.total_paused_ms).toBe(8_000);
  });

  it('takes the higher score', () => {
    const result = mergePuzzleState(
      makeState({ score: 30 }),
      makeState({ score: 50 }),
    );
    expect(result.score).toBe(50);
  });

  it('prefers local score_before_hints when non-null', () => {
    const result = mergePuzzleState(
      makeState({ score_before_hints: 20 }),
      makeState({ score_before_hints: 35 }),
    );
    expect(result.score_before_hints).toBe(20);
  });

  it('falls back to server score_before_hints when local is null', () => {
    const result = mergePuzzleState(
      makeState({ score_before_hints: null }),
      makeState({ score_before_hints: 35 }),
    );
    expect(result.score_before_hints).toBe(35);
  });

  it('returns null score_before_hints when both are null', () => {
    const result = mergePuzzleState(
      makeState({ score_before_hints: null }),
      makeState({ score_before_hints: null }),
    );
    expect(result.score_before_hints).toBeNull();
  });

  it('merges correctly when one side has no found_words', () => {
    const result = mergePuzzleState(
      makeState({ found_words: [] }),
      makeState({ found_words: ['kissa'] }),
    );
    expect(result.found_words).toEqual(['kissa']);
  });

  it('produces empty found_words when both sides are empty', () => {
    const result = mergePuzzleState(
      makeState({ found_words: [] }),
      makeState({ found_words: [] }),
    );
    expect(result.found_words).toEqual([]);
  });
});
