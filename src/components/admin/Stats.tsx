/**
 * Achievement statistics panel.
 *
 * Shows daily achievement breakdown by rank with a period selector.
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

export function Stats() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const [days, setDays] = useState(7);
  const [daily, setDaily] = useState<AchievementDay[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/achievements?days=${days}`,
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
  }, [days, csrfToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {/* Period selector */}
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

      {loading ? (
        <div
          className="text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ladataan...
        </div>
      ) : (
        <>
          {/* Summary */}
          <div
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {grandTotal} saavutusta {days} päivän ajalta
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table
              className="w-full text-xs"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <th className="text-left py-1 px-1">Päivä</th>
                  {SHORT_RANKS.map((r, i) => (
                    <th
                      key={r}
                      className="text-right py-1 px-1"
                      title={RANKS[i]}
                    >
                      {r}
                    </th>
                  ))}
                  <th className="text-right py-1 px-1">Yht</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((day) => (
                  <tr
                    key={day.date}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      className="py-1 px-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {new Date(day.date + 'T12:00:00').toLocaleDateString(
                        'fi-FI',
                        { day: 'numeric', month: 'numeric' },
                      )}
                    </td>
                    {RANKS.map((rank) => (
                      <td
                        key={rank}
                        className="text-right py-1 px-1"
                        style={{
                          color:
                            day.counts[rank] > 0
                              ? 'var(--color-text-primary)'
                              : 'var(--color-text-tertiary)',
                        }}
                      >
                        {day.counts[rank] || 0}
                      </td>
                    ))}
                    <td
                      className="text-right py-1 px-1 font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {day.total}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr
                  style={{
                    borderTop: '2px solid var(--color-border)',
                    fontWeight: 600,
                  }}
                >
                  <td
                    className="py-1 px-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Yht
                  </td>
                  {RANKS.map((rank) => (
                    <td
                      key={rank}
                      className="text-right py-1 px-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {totals[rank] || 0}
                    </td>
                  ))}
                  <td
                    className="text-right py-1 px-1"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
