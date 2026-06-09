import { bestNoHintScoreForRecord, type PlayerStats } from '@sanakenno/shared';
import { loadFromStorage } from './storage';

interface StoredPuzzleState {
  score?: number;
  hintsUnlocked?: string[];
  scoreBeforeHints?: number | null;
}

function savedNoHintScore(puzzleNumber: number): number {
  const state = loadFromStorage<StoredPuzzleState>(
    `sanakenno_state_${puzzleNumber}`,
  );
  if (!state) return 0;
  if (typeof state.scoreBeforeHints === 'number') return state.scoreBeforeHints;
  if (
    (state.hintsUnlocked ?? []).length === 0 &&
    typeof state.score === 'number'
  ) {
    return state.score;
  }
  return 0;
}

/** Backfill best no-hint score from legacy records and saved puzzle state. */
export function backfillNoHintStats(stats: PlayerStats): PlayerStats {
  return {
    ...stats,
    records: stats.records.map((record) => ({
      ...record,
      best_no_hint_score: Math.max(
        bestNoHintScoreForRecord(record),
        savedNoHintScore(record.puzzle_number),
      ),
    })),
  };
}
