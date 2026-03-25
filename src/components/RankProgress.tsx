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
  /** Whether the share confirmation is showing. */
  shareCopied: boolean;
  /** Share button click handler. */
  onShare: () => void;
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
  shareCopied,
  onShare,
}: RankProgressProps): React.JSX.Element {
  const progress = progressToNextRank(score, maxScore);
  const thresholds = rankThresholds(rank, maxScore);

  return (
    <div className="w-full">
      {/* Rank + score + share */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onToggleRanks}
          className="px-3 py-0.5 text-sm font-semibold text-white rounded-full cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {rank}
        </button>
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {score} pistettä
        </span>
        <div className="flex items-center gap-2">
          {shareCopied && (
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Kopioitu!
            </span>
          )}
          <button
            type="button"
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onClick={onShare}
          >
            Jaa tulos
          </button>
        </div>
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
