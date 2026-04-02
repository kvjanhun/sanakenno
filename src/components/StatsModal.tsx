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
import { RANKS } from '../utils/scoring.js';
import {
  computeStreak,
  computeRankDistribution,
  computeAverageCompletion,
  emptyStats,
  STATS_STORAGE_KEY,
} from '../utils/stats.js';
import type { PlayerStats } from '../utils/stats.js';
import { loadFromStorage } from '../utils/storage.js';

/** Rank display colors, ordered from lowest to highest. */
const RANK_COLORS: Record<string, string> = {
  'Etsi sanoja!': '#94a3b8',
  'Hyvä alku': '#60a5fa',
  'Nyt mennään!': '#34d399',
  Onnistuja: '#a78bfa',
  Sanavalmis: '#fbbf24',
  Ällistyttävä: '#f97316',
  'Täysi kenno': '#ef4444',
};

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
      setStats(loaded ?? emptyStats());
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  if (!show) return null;

  const { records } = stats;
  const { current: currentStreak, best: bestStreak } = computeStreak(records);
  const rankDist = computeRankDistribution(records);
  const avgCompletion = computeAverageCompletion(records);
  const maxCount = Math.max(1, ...Object.values(rankDist));

  // Ranks from lowest to highest for display
  const ranksLowestFirst = [...RANKS].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-4 overflow-y-auto max-h-[90vh]"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="stats-title"
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tilastot
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-lg bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label="Sulje"
          >
            ✕
          </button>
        </div>

        {records.length === 0 ? (
          <div
            className="text-sm py-4 text-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ei vielä tilastoja. Pelaa kenno!
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary row */}
            <div
              className="grid grid-cols-3 gap-2 text-center"
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

            {/* Average completion */}
            <div>
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

            {/* Rank distribution */}
            <div>
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
                            backgroundColor:
                              RANK_COLORS[rank.name] || 'var(--color-accent)',
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
        )}
      </div>
    </div>
  );
}
