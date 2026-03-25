/**
 * Score display, rank badge, progress bar, and expandable rank
 * thresholds list.
 *
 * @module src/components/RankProgress
 */

import { rankThresholds, progressToNextRank } from '../utils/scoring.js';

/** Props for {@link RankProgress}. */
export interface RankProgressProps {
  /** Player's current score. */
  score: number;
  /** Maximum possible score for today's puzzle. */
  maxScore: number;
  /** Current rank name (Finnish). */
  rank: string;
  /** Whether the rank thresholds panel is expanded. */
  showRanks: boolean;
  /** Toggle the rank thresholds panel. */
  onToggleRanks: () => void;
}

/**
 * Render score, rank pill, progress bar, and optional rank list.
 */
export function RankProgress({
  score,
  maxScore,
  rank,
  showRanks,
  onToggleRanks,
}: RankProgressProps): React.JSX.Element {
  const progress = progressToNextRank(score, maxScore);
  const thresholds = rankThresholds(rank, maxScore);

  return (
    <div className="w-full">
      {/* Score + rank pill */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Pisteet: {score}
        </span>
        <button
          type="button"
          onClick={onToggleRanks}
          className="px-3 py-0.5 text-sm font-semibold text-white rounded-full cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {rank}
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={maxScore}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--color-accent)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Expandable rank thresholds */}
      {showRanks && (
        <ul className="mt-3 list-none p-0 m-0 text-sm space-y-1">
          {thresholds.map((t) => (
            <li
              key={t.name}
              className="flex justify-between"
              style={{
                color: t.isCurrent
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                fontWeight: t.isCurrent ? 700 : 400,
              }}
            >
              <span>{t.name}</span>
              <span>{t.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
