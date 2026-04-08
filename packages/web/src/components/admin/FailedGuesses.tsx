/**
 * Failed guesses statistics panel.
 *
 * Shows daily failed-guess totals and top failed words for a selected period.
 * Uses local fetch state to keep this view independent from global admin store data.
 *
 * @module src/components/admin/FailedGuesses
 */

import { useCallback, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { FailedGuessDay } from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface FailedGuessesResponse {
  days: number;
  daily: FailedGuessDay[];
  grand_total: number;
}

/**
 * Daily failed-guess breakdown with expandable per-word details.
 */
export function FailedGuesses() {
  const csrfToken = useAdminStore((s) => s.csrfToken);

  const [days, setDays] = useState(7);
  const [daily, setDaily] = useState<FailedGuessDay[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchFailedGuesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/failed-guesses?days=${days}`,
        {
          credentials: 'same-origin',
          headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        },
      );

      if (!res.ok) {
        setDaily([]);
        setGrandTotal(0);
        return;
      }

      const data = (await res.json()) as FailedGuessesResponse;
      setDaily(data.daily || []);
      setGrandTotal(data.grand_total || 0);
    } catch {
      setDaily([]);
      setGrandTotal(0);
    } finally {
      setLoading(false);
    }
  }, [days, csrfToken]);

  useEffect(() => {
    fetchFailedGuesses();
  }, [fetchFailedGuesses]);

  return (
    <div className="space-y-3">
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
          <div
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {grandTotal} virheellistä arvausta {days} päivän ajalta
          </div>

          <div className="space-y-2">
            {daily.map((day) => {
              const dateLabel = new Date(
                day.date + 'T12:00:00',
              ).toLocaleDateString('fi-FI', {
                weekday: 'short',
                day: 'numeric',
                month: 'numeric',
              });

              const sortedWords = [...day.words].sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.word.localeCompare(b.word, 'fi');
              });

              return (
                <details
                  key={day.date}
                  className="rounded"
                  style={{
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                >
                  <summary
                    className="cursor-pointer px-3 py-2 list-none"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">{dateLabel}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color:
                            day.total_count > 0
                              ? 'var(--color-accent)'
                              : 'var(--color-text-tertiary)',
                        }}
                      >
                        {day.total_count}
                      </span>
                    </div>
                  </summary>

                  <div
                    className="px-3 pb-2"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    {sortedWords.length === 0 ? (
                      <div
                        className="text-xs py-2"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Ei virheellisiä arvauksia.
                      </div>
                    ) : (
                      <ul className="py-1 space-y-1">
                        {sortedWords.map((item) => (
                          <li
                            key={`${day.date}-${item.word}`}
                            className="flex justify-between items-center gap-2 text-sm"
                          >
                            <span
                              className="font-mono"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {item.word}
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              {item.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
