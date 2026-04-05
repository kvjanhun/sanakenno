/**
 * Achievement statistics panel.
 *
 * Shows daily achievement breakdown by rank with period and mode selectors.
 * "Sessions" mode shows only the highest rank each player session reached.
 * Includes a compact digit summary and stacked bar visualization per day.
 *
 * @module src/components/admin/Stats
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminStore } from '../../store/useAdminStore.js';
import type { AchievementDay } from '../../store/useAdminStore.js';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const RANKS = [
  'Etsi sanoja!',
  'Hyvä alku',
  'Nyt mennään!',
  'Onnistuja',
  'Sanavalmis',
  'Ällistyttävä',
  'Täysi kenno',
];

const SHORT_RANKS = ['ES', 'HA', 'NM', 'ON', 'SV', 'ÄL', 'TK'];

/** Colors for each rank, from cool (low) to warm (high). */
const RANK_COLORS = [
  '#94a3b8', // ES - slate
  '#60a5fa', // HA - blue
  '#34d399', // NM - green
  '#a78bfa', // ON - purple
  '#fbbf24', // SV - amber
  '#f97316', // ÄL - orange
  '#ef4444', // TK - red
];

/**
 * Build a compact digit string: one digit per rank, showing count of
 * sessions that peaked at each rank. e.g. "0000201" = 2x Sanavalmis, 1x TK.
 */
function digitSummary(counts: Record<string, number>): string {
  return RANKS.map((r) => Math.min(9, counts[r] || 0).toString()).join('');
}

export function Stats() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState<'sessions' | 'all'>('sessions');
  const [daily, setDaily] = useState<AchievementDay[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/achievements?days=${days}&mode=${mode}`,
        {
          credentials: 'same-origin',
          headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        },
      );
      if (res.ok) {
        const data = await res.json();
        setDaily(data.daily);
        setTotals(data.totals);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [days, mode, csrfToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  const maxDayTotal = Math.max(1, ...daily.map((d) => d.total));

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className="px-3 py-1 rounded text-sm cursor-pointer"
              style={{
                backgroundColor:
                  days === d
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-secondary)',
                color: days === d ? '#fff' : 'var(--color-text-primary)',
                border: `1px solid ${days === d ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {d} pv
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['sessions', 'all'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{
                backgroundColor:
                  mode === m
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-secondary)',
                color: mode === m ? '#fff' : 'var(--color-text-primary)',
                border: `1px solid ${mode === m ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {m === 'sessions' ? 'Pelaajat' : 'Kaikki'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          className="text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ladataan...
        </div>
      ) : (
        <>
          {/* Summary line */}
          <div
            className="flex justify-between items-baseline text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <span>
              {grandTotal} {mode === 'sessions' ? 'pelaajaa' : 'saavutusta'}{' '}
              {days} päivän ajalta
            </span>
            <span className="font-mono" title={RANKS.join(' | ')}>
              {digitSummary(totals)}
            </span>
          </div>

          {/* Legend */}
          <div className="flex gap-2 flex-wrap">
            {RANKS.map((rank, i) => (
              <span
                key={rank}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: RANK_COLORS[i] }}
                />
                {rank}
              </span>
            ))}
          </div>

          {/* Stacked bars + table */}
          <div className="space-y-0">
            {daily.map((day) => {
              const dateLabel = new Date(
                day.date + 'T12:00:00',
              ).toLocaleDateString('fi-FI', {
                weekday: 'short',
                day: 'numeric',
                month: 'numeric',
              });
              const barWidth =
                day.total > 0
                  ? Math.max(2, (day.total / maxDayTotal) * 100)
                  : 0;

              return (
                <div
                  key={day.date}
                  className="flex items-center gap-2 py-1"
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {/* Date */}
                  <span
                    className="text-xs w-16 shrink-0"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {dateLabel}
                  </span>

                  {/* Stacked bar — wrapper constrains width */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div
                      className="flex h-4 rounded-sm overflow-hidden"
                      style={{
                        width: `${barWidth}%`,
                        minWidth: day.total > 0 ? '4px' : '0',
                      }}
                    >
                      {RANKS.map((rank, i) => {
                        const count = day.counts[rank] || 0;
                        if (count === 0) return null;
                        const pct = (count / day.total) * 100;
                        return (
                          <div
                            key={rank}
                            title={`${RANKS[i]}: ${count}`}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: RANK_COLORS[i],
                              minWidth: '2px',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Digit summary + total */}
                  <span
                    className="font-mono text-xs ml-auto shrink-0"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    title={RANKS.map(
                      (r, i) => `${SHORT_RANKS[i]}: ${day.counts[r] || 0}`,
                    ).join(', ')}
                  >
                    {digitSummary(day.counts)}
                  </span>
                  <span
                    className="text-xs font-semibold w-6 text-right shrink-0"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {day.total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals row */}
          <div
            className="flex items-center gap-2 pt-1"
            style={{ borderTop: '2px solid var(--color-border)' }}
          >
            <span
              className="text-xs w-16 shrink-0 font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Yhteensä
            </span>
            <div className="flex-1" />
            <span
              className="font-mono text-xs font-semibold shrink-0"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {digitSummary(totals)}
            </span>
            <span
              className="text-xs font-semibold w-6 text-right shrink-0"
              style={{ color: 'var(--color-accent)' }}
            >
              {grandTotal}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
