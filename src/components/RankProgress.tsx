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
  /** Whether the share confirmation popup is showing. */
  shareCopied: boolean;
  /** Share button click handler. */
  onShare: () => void;
  /** Score to display as "Pisteet ilman vihjeitä". Mirrors current score until first hint is unlocked. */
  scoreBeforeHints: number;
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
  scoreBeforeHints,
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
          className="px-3 py-0.5 text-sm text-white rounded-full cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)', flexShrink: 0 }}
        >
          {rank}
        </button>

        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {score} pistettä
        </span>

        {/* Share button — popup anchored to this wrapper */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onShare}
            className="px-3 py-0.5 text-sm rounded-full cursor-pointer border-none"
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Jaa tulos
          </button>

          {/* Kopioitu! popup — floats below share button, does not affect layout */}
          {shareCopied && (
            <div
              className="text-xs"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.25rem',
                zIndex: 20,
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
                whiteSpace: 'nowrap',
                color: 'var(--color-text-secondary)',
              }}
            >
              Kopioitu!
            </div>
          )}
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
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '0 0 8px 8px',
            marginTop: '0.25rem',
            overflow: 'hidden',
          }}
        >
          <ul
            className="list-none p-0 m-0 text-sm space-y-1"
            style={{ padding: '0.5rem 0.75rem' }}
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
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              padding: '0.4rem 0.75rem',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8rem',
              textAlign: 'center',
            }}
          >
            Ilman vihjeitä: {scoreBeforeHints} pistettä
          </div>
        </div>
      )}
    </div>
  );
}
