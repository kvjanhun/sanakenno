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
}: StatsModalProps): React.JSX.Element | null {
  const [stats, setStats] = useState<PlayerStats>(emptyStats());

  useEffect(() => {
    if (show) {
      const loaded = loadFromStorage<PlayerStats>(STATS_STORAGE_KEY);
      setStats(backfillNoHintStats(loaded ?? emptyStats()));
    }
  }, [show]);

  if (!show) return null;

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
    <ModalShell title="Tilastot" titleId="stats-title" onClose={onClose}>
      {records.length === 0 ? (
        <div
          className="text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ei vielä tilastoja. Pelaa kenno!
        </div>
      ) : (
        <div className="space-y-4">
          <section data-stats-section="all-games">
            <div
              className="text-sm mb-2"
              data-stats-heading="all-games"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Kaikki pelit
            </div>
            <div className="space-y-3">
              <div
                className="grid grid-cols-3 gap-2 text-center"
                data-stats-all-summary
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                }}
              >
                <div>
                  <div
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {records.length}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Pelattu
                  </div>
                </div>
                <div>
                  <div
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {currentStreak}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Putki
                  </div>
                </div>
                <div>
                  <div
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {bestStreak}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Paras putki
                  </div>
                </div>
              </div>

              <div
                className="space-y-3"
                data-stats-all-totals
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                }}
              >
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div
                      className="text-xl font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {lifetime.totalWords}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Sanoja
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xl font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {lifetime.totalPangrams}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Pangrammeja
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-lg font-semibold break-all"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {lifetime.longestWord || '—'}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Pisin sana
                  </div>
                </div>
              </div>

              <div data-stats-all-average>
                <div className="flex justify-between items-baseline mb-1">
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Keskimääräinen tulos
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {avgCompletion.toFixed(0)} %
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--color-bg-secondary)' }}
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

              <div data-stats-all-ranks>
                <div
                  className="text-sm mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Paras taso per kenno
                </div>
                <div className="space-y-1">
                  {ranksLowestFirst.map((rank) => {
                    const count = rankDist[rank.name] || 0;
                    const pct = (count / maxCount) * 100;
                    return (
                      <div key={rank.name} className="flex items-center gap-2">
                        <span
                          className="text-xs w-24 shrink-0 truncate"
                          style={{ color: 'var(--color-text-secondary)' }}
                          title={rank.name}
                        >
                          {rank.name}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className="h-4 rounded-sm"
                            style={{
                              width: count > 0 ? `${Math.max(4, pct)}%` : '0',
                              backgroundColor: 'var(--color-accent)',
                              minWidth: count > 0 ? '4px' : '0',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs w-4 text-right shrink-0"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {count || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section data-stats-section="no-hint">
            <div
              className="text-sm mb-2"
              data-stats-heading="no-hint"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ilman apuja
            </div>
            <div
              className="grid grid-cols-2 gap-2 text-center"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div>
                <div
                  className="text-xl font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {noHintLifetime.highestPercentage.toFixed(0)} %
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Paras tulos
                </div>
              </div>
              <div>
                <div
                  className="text-xl font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {noHintLifetime.topTierCount}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Ällistyttäviä
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </ModalShell>
  );
}
