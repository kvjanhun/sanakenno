/**
 * Score display, rank badge, progress bar, and expandable rank
 * thresholds list.
 *
 * @module src/components/RankProgress
 */

import { useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { rankThresholds, progressToNextRank } from '@sanakenno/shared';

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
  /** Score to display as "Pisteet ilman apuja". Mirrors current score until first hint is unlocked. */
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
  scoreBeforeHints,
}: RankProgressProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = progressToNextRank(score, maxScore);
  const thresholds = rankThresholds(rank, maxScore);

  // Animate score counter from previous value to new value.
  const [displayScore, setDisplayScore] = useState(score);
  const fromRef = useRef(score);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = score;
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    if (from === to) return;
    const duration = 300;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

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
          key={rank}
          type="button"
          onClick={onToggleRanks}
          className="flex items-center gap-1 px-3 py-0.5 text-sm rounded-full cursor-pointer border-none rank-pulse"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-on-accent)',
            flexShrink: 0,
          }}
          aria-expanded={showRanks}
        >
          <span>{rank}</span>
          {showRanks ? (
            <ChevronUp size={14} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>

        <span
          className="text-[26px] font-bold leading-none"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-game)',
          }}
        >
          {displayScore} pistettä
        </span>
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
            Ilman apuja: {scoreBeforeHints} pistettä
          </div>
        </div>
      )}
    </div>
  );
}
