/**
 * Player statistics computation — pure functions, no DOM access.
 *
 * Tracks per-puzzle play records in localStorage and derives
 * streaks, rank distribution, and average completion.
 *
 * @module src/utils/stats
 */

import { RANKS } from './scoring.js';

/** Per-puzzle play record. */
export interface StatsRecord {
  puzzle_number: number;
  date: string;
  best_rank: string;
  best_score: number;
  max_score: number;
  words_found: number;
  hints_used: number;
  elapsed_ms: number;
}

/** Top-level stats shape stored in localStorage. */
export interface PlayerStats {
  records: StatsRecord[];
  version: 1;
}

export const STATS_STORAGE_KEY = 'sanakenno_player_stats';

/** Map a Finnish rank name to its numeric index (higher = better). */
export function rankIndex(name: string): number {
  // RANKS is ordered from highest (Täysi kenno, index 0) to lowest
  const idx = RANKS.findIndex((r) => r.name === name);
  if (idx === -1) return -1;
  // Invert so higher rank = higher number
  return RANKS.length - 1 - idx;
}

/**
 * Upsert a stats record. Only upgrades best_rank and best_score.
 * Returns a new PlayerStats (immutable).
 */
export function updateStatsRecord(
  stats: PlayerStats,
  record: StatsRecord,
): PlayerStats {
  const existing = stats.records.find(
    (r) => r.puzzle_number === record.puzzle_number,
  );

  if (!existing) {
    return {
      ...stats,
      records: [...stats.records, record],
    };
  }

  const shouldUpgrade =
    rankIndex(record.best_rank) > rankIndex(existing.best_rank);

  return {
    ...stats,
    records: stats.records.map((r) =>
      r.puzzle_number === record.puzzle_number
        ? {
            ...r,
            best_rank: shouldUpgrade ? record.best_rank : r.best_rank,
            best_score: Math.max(r.best_score, record.best_score),
            words_found: Math.max(r.words_found, record.words_found),
            hints_used: Math.max(r.hints_used, record.hints_used),
            elapsed_ms: Math.max(r.elapsed_ms, record.elapsed_ms),
          }
        : r,
    ),
  };
}

/**
 * Compute current and best streak from a list of date strings.
 * Dates must be ISO format (YYYY-MM-DD). Assumes "today" is
 * the most recent date in the list for streak calculation.
 */
export function computeStreak(
  records: StatsRecord[],
  today?: string,
): { current: number; best: number } {
  if (records.length === 0) return { current: 0, best: 0 };

  const dates = [...new Set(records.map((r) => r.date))].sort().reverse();
  if (dates.length === 0) return { current: 0, best: 0 };

  // Check if the most recent date is today or yesterday (for current streak)
  const todayStr = today ?? new Date().toISOString().split('T')[0];
  const todayDate = new Date(todayStr + 'T12:00:00');
  const latestDate = new Date(dates[0] + 'T12:00:00');
  const daysDiff = Math.round(
    (todayDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Current streak: must include today or yesterday
  let current = 0;
  if (daysDiff <= 1) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T12:00:00');
      const curr = new Date(dates[i] + 'T12:00:00');
      const diff = Math.round(
        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Best streak: longest consecutive run anywhere
  const sorted = [...dates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  best = Math.max(best, current);

  return { current, best };
}

/** Count best rank occurrences across all puzzle records. */
export function computeRankDistribution(
  records: StatsRecord[],
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const r of records) {
    dist[r.best_rank] = (dist[r.best_rank] || 0) + 1;
  }
  return dist;
}

/** Average completion percentage across all puzzle records. */
export function computeAverageCompletion(records: StatsRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => {
    return sum + (r.max_score > 0 ? (r.best_score / r.max_score) * 100 : 0);
  }, 0);
  return total / records.length;
}

/** Create an empty PlayerStats object. */
export function emptyStats(): PlayerStats {
  return { records: [], version: 1 };
}
