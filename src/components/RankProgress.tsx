/**
 * Score display, rank badge, progress bar, and expandable rank
 * thresholds list.
 *
 * @module src/components/RankProgress
 */

import { useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = progressToNextRank(score, maxScore);
  const thresholds = rankThresholds(rank, maxScore);

  useEffect(() => {
    if (!showRanks) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onToggleRanks();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showRanks, onToggleRanks]);

  return (
    <div ref={containerRef} className="w-full" style={{ position: 'relative' }}>
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

      {/* Expandable rank thresholds — floats over content below, does not affect layout */}
      {showRanks && (
        <ul
          className="list-none p-0 m-0 text-sm space-y-1"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '0 0 8px 8px',
            padding: '0.5rem 0.75rem',
            marginTop: '0.25rem',
          }}
        >
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
