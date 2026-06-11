/**
 * Player statistics modal.
 *
 * Reads play history from localStorage and displays summary stats:
 * puzzles played, streak, best streak, rank distribution, and
 * average completion percentage.
 *
 * @module src/components/StatsModal
 */

import { useState, useEffect } from 'react';
import {
  RANKS,
  computeStreak,
  computeLifetimeStats,
  computeLifetimeNoHintStats,
  computeRankDistribution,
  computeAverageCompletion,
  emptyStats,
  STATS_STORAGE_KEY,
} from '@sanakenno/shared';
import type { PlayerStats } from '@sanakenno/shared';
import { loadFromStorage } from '../utils/storage';
import { backfillNoHintStats } from '../utils/statsBackfill';
import { ModalShell } from './ModalShell';

/** Props for {@link StatsModal}. */
export interface StatsModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * Stats modal component.
 */
export function StatsModal({
  show,
  onClose,
}: StatsModalProps): React.JSX.Element {
  const [stats, setStats] = useState<PlayerStats>(emptyStats());

  useEffect(() => {
    if (show) {
      const loaded = loadFromStorage<PlayerStats>(STATS_STORAGE_KEY);
      setStats(backfillNoHintStats(loaded ?? emptyStats()));
    }
  }, [show]);

  const { records } = stats;
  const { current: currentStreak, best: bestStreak } = computeStreak(records);
  const rankDist = computeRankDistribution(records);
  const avgCompletion = computeAverageCompletion(records);
  const lifetime = computeLifetimeStats(records);
  const noHintLifetime = computeLifetimeNoHintStats(records);
  const maxCount = Math.max(1, ...Object.values(rankDist));

  // Ranks from lowest to highest for display
  const ranksLowestFirst = [...RANKS].reverse();

  return (
    <ModalShell
      show={show}
      title="Tilastot"
      titleId="stats-title"
      onClose={onClose}
    >
      {records.length === 0 ? (
        <div
          className="text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ei vielä tilastoja. Pelaa kenno!
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Kaikki pelit ── */}
          <section
            data-stats-section="all-games"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '0.75rem',
              padding: '1rem',
            }}
          >
            <div
              className="text-xs font-semibold tracking-wide uppercase mb-3"
              data-stats-heading="all-games"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Kaikki pelit
            </div>

            {/* all number stats — one unified list */}
            <div className="space-y-1.5" data-stats-all-summary>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Pelattuja pelejä
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {records.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Putki
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {currentStreak}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Pisin putki
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {bestStreak}
                </span>
              </div>
            </div>

            <div className="mt-1.5 space-y-1.5" data-stats-all-totals>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Sanoja löydetty
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {lifetime.totalWords}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Pangrammeja löydetty
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {lifetime.totalPangrams}
                </span>
              </div>
              <div className="flex items-start justify-between text-xs py-0.5 gap-4">
                <span
                  style={{ color: 'var(--color-text-secondary)' }}
                  className="shrink-0"
                >
                  Pisin sana
                </span>
                <span
                  className="font-semibold text-right break-all"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {lifetime.longestWord || '—'}
                </span>
              </div>
            </div>

            {/* subtle divider */}
            <div
              className="my-3.5"
              style={{ borderTop: '1px solid var(--color-border)' }}
            />

            {/* average completion bar */}
            <div data-stats-all-average className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Keskimääräinen tulos
                </span>
                <span
                  className="text-xs font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {avgCompletion.toFixed(0)} %
                </span>
              </div>
              <div
                className="h-2 w-full rounded-full overflow-hidden"
                style={{
                  backgroundColor:
                    'var(--color-bg-tertiary, var(--color-bg-primary))',
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, avgCompletion)}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>

            {/* rank distribution bars */}
            <div data-stats-all-ranks className="mt-4">
              <div
                className="text-xs font-semibold tracking-wide uppercase mb-2.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Saavutetut tasot
              </div>
              <div className="space-y-2">
                {ranksLowestFirst.map((rank) => {
                  const count = rankDist[rank.name] || 0;
                  const pct = (count / maxCount) * 100;
                  return (
                    <div
                      key={rank.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="w-24 shrink-0 truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title={rank.name}
                      >
                        {rank.name}
                      </span>
                      <div
                        className="flex-1 min-w-0 h-2 rounded-full overflow-hidden"
                        style={{
                          backgroundColor:
                            'var(--color-bg-tertiary, var(--color-bg-primary))',
                        }}
                      >
                        {count > 0 && (
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: 'var(--color-accent)',
                            }}
                          />
                        )}
                      </div>
                      <span
                        className="w-5 text-right shrink-0 font-medium font-mono"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {count || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Ilman apuja ── */}
          <section
            data-stats-section="no-hint"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '0.75rem',
              padding: '1rem',
            }}
          >
            <div
              className="text-xs font-semibold tracking-wide uppercase mb-3"
              data-stats-heading="no-hint"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ilman apuja
            </div>

            <div className="space-y-1.5" data-stats-no-hint-summary>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Paras tulos
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {noHintLifetime.highestPercentage.toFixed(0)} %
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Ällistyttäviä pelejä
                </span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {noHintLifetime.topTierCount}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </ModalShell>
  );
}
