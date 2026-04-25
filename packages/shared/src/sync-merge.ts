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

function hasAdditionalItems(local: string[], server: string[]): boolean {
  const serverSet = new Set(server);
  return local.some((item) => !serverSet.has(item));
}

function earlierStartedAt(a: number, b: number): number {
  if (a > 0 && b > 0) return Math.min(a, b);
  return a || b;
}

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

  const existingLW = existing.longest_word ?? '';
  const incomingLW = incoming.longest_word ?? '';

  return {
    puzzle_number: existing.puzzle_number,
    date: existing.date,
    best_rank: useIncomingRank ? incoming.best_rank : existing.best_rank,
    best_score: Math.max(existing.best_score, incoming.best_score),
    max_score: existing.max_score,
    words_found: Math.max(existing.words_found, incoming.words_found),
    hints_used: Math.max(existing.hints_used, incoming.hints_used),
    elapsed_ms: Math.max(existing.elapsed_ms, incoming.elapsed_ms),
    longest_word:
      existingLW.length >= incomingLW.length ? existingLW : incomingLW,
    pangrams_found: Math.max(
      existing.pangrams_found ?? 0,
      incoming.pangrams_found ?? 0,
    ),
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
    started_at: earlierStartedAt(local.started_at, server.started_at),
    total_paused_ms: Math.max(local.total_paused_ms, server.total_paused_ms),
    score_before_hints: scoreBeforeHints,
  };
}

/**
 * Return true when a local stats record contains strictly better progress than
 * the server record and should be pushed back after a pull/merge.
 */
export function isStatsRecordBetterThanServer(
  local: StatsRecord,
  server: StatsRecord | undefined,
): boolean {
  if (!server) return true;
  if (rankIndex(local.best_rank) > rankIndex(server.best_rank)) return true;
  if (local.best_score > server.best_score) return true;
  if (local.max_score > server.max_score) return true;
  if (local.words_found > server.words_found) return true;
  if (local.hints_used > server.hints_used) return true;
  if (local.elapsed_ms > server.elapsed_ms) return true;
  if ((local.longest_word ?? '').length > (server.longest_word ?? '').length) {
    return true;
  }
  return (local.pangrams_found ?? 0) > (server.pangrams_found ?? 0);
}

/**
 * Return true when a local puzzle state contains progress not yet represented
 * by the server state and should be pushed back after a pull/merge.
 */
export function isPuzzleStateBetterThanServer(
  local: SyncPuzzleState,
  server: SyncPuzzleState | undefined,
): boolean {
  if (!server) return true;
  if (hasAdditionalItems(local.found_words, server.found_words)) return true;
  if (hasAdditionalItems(local.hints_unlocked, server.hints_unlocked)) {
    return true;
  }
  if (local.score > server.score) return true;
  if (
    local.started_at > 0 &&
    (server.started_at === 0 || local.started_at < server.started_at)
  ) {
    return true;
  }
  if (local.total_paused_ms > server.total_paused_ms) return true;
  return (
    local.score_before_hints !== null && server.score_before_hints === null
  );
}
