/**
 * Client-side merge functions for cross-device sync.
 *
 * Pure functions — no platform dependencies, no I/O.
 * Used by useAuthStore.pullAndMerge() to reconcile server data with local state.
 *
 * Merge strategy: take the best of both sides. No data is ever discarded.
 *
 * @module @sanakenno/shared/sync-merge
 */

import { rankIndex } from './stats';
import type { StatsRecord } from './stats';
import type { SyncPuzzleState } from './auth-types';

/**
 * Merge two stats records for the same puzzle_number.
 *
 * Rules:
 * - best_rank: whichever has the higher rankIndex wins
 * - numeric fields (best_score, words_found, hints_used, elapsed_ms): MAX of both
 * - date: keep the existing (earlier) record's date
 * - max_score: keep existing (it's a puzzle constant, shouldn't differ)
 */
export function mergeStatsRecord(
  existing: StatsRecord,
  incoming: StatsRecord,
): StatsRecord {
  const useIncomingRank =
    rankIndex(incoming.best_rank) > rankIndex(existing.best_rank);

  return {
    puzzle_number: existing.puzzle_number,
    date: existing.date,
    best_rank: useIncomingRank ? incoming.best_rank : existing.best_rank,
    best_score: Math.max(existing.best_score, incoming.best_score),
    max_score: existing.max_score,
    words_found: Math.max(existing.words_found, incoming.words_found),
    hints_used: Math.max(existing.hints_used, incoming.hints_used),
    elapsed_ms: Math.max(existing.elapsed_ms, incoming.elapsed_ms),
  };
}

/**
 * Merge two puzzle states for the same puzzle_number.
 *
 * Rules:
 * - found_words: union of both sets (deduplication preserves all progress)
 * - hints_unlocked: union of both sets
 * - started_at: earlier of the two (the real start time)
 * - total_paused_ms: MAX of both (more paused = more complete record)
 * - score_before_hints: prefer non-null; if both non-null, keep existing
 * - score: recalculated from merged found_words count is not possible here
 *   (no word list access), so take the MAX as a conservative estimate
 */
export function mergePuzzleState(
  local: SyncPuzzleState,
  server: SyncPuzzleState,
): SyncPuzzleState {
  const foundWordsSet = new Set([...local.found_words, ...server.found_words]);
  const hintsSet = new Set([...local.hints_unlocked, ...server.hints_unlocked]);

  let scoreBeforeHints: number | null;
  if (local.score_before_hints !== null) {
    scoreBeforeHints = local.score_before_hints;
  } else {
    scoreBeforeHints = server.score_before_hints;
  }

  return {
    puzzle_number: local.puzzle_number,
    found_words: [...foundWordsSet],
    score: Math.max(local.score, server.score),
    hints_unlocked: [...hintsSet],
    started_at: Math.min(local.started_at, server.started_at),
    total_paused_ms: Math.max(local.total_paused_ms, server.total_paused_ms),
    score_before_hints: scoreBeforeHints,
  };
}
