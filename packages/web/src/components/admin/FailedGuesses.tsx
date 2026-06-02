/**
 * Failed guesses statistics panel.
 *
 * Shows daily failed-guess totals and top failed words for a selected period.
 * Uses local fetch state to keep this view independent from global admin store data.
 *
 * @module src/components/admin/FailedGuesses
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
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
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);

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
        setStatusMessage('Virhearvauksia ei voitu ladata.', 'error');
        return;
      }

      const data = (await res.json()) as FailedGuessesResponse;
      setDaily(data.daily || []);
      setGrandTotal(data.grand_total || 0);
    } catch {
      setDaily([]);
      setGrandTotal(0);
      setStatusMessage('Virhearvauksia ei voitu ladata.', 'error');
    } finally {
      setLoading(false);
    }
  }, [days, csrfToken, setStatusMessage]);

  useEffect(() => {
    fetchFailedGuesses();
  }, [fetchFailedGuesses]);

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          className="flex items-center gap-1.5 p-1 rounded-xl border bg-[var(--color-bg-primary)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {[7, 30, 90].map((d) => {
            const active = days === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className="h-8 rounded-lg px-4 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: active
                    ? 'var(--color-accent)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-on-accent)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {d} pv
              </button>
            );
          })}
        </div>

        {!loading && (
          <div
            className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-[var(--color-bg-primary)]"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            Yhteensä:{' '}
            <strong
              className="font-mono text-sm inline-block ml-1"
              style={{ color: 'var(--color-accent)' }}
            >
              {grandTotal}
            </strong>{' '}
            virhearvausta
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center space-y-3">
          <div
            className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{
              borderColor: 'var(--color-accent)',
              borderTopColor: 'transparent',
            }}
          />
          <div
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ladataan vääriä arvauksia...
          </div>
        </div>
      ) : daily.length === 0 ? (
        <div
          className="py-12 text-center space-y-2 border-2 border-dashed rounded-2xl"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-primary)] flex items-center justify-center">
            <AlertTriangle
              size={18}
              className="text-[var(--color-text-tertiary)]"
            />
          </div>
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Ei virhearvauksia tältä ajanjaksolta
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
                className="group rounded-xl border transition-all duration-300 [&_summary::-webkit-details-marker]:hidden"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 list-none select-none rounded-xl hover:bg-[color-mix(in srgb,var(--color-accent)_3%,var(--color-bg-secondary))]">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                    <span
                      className="font-bold text-sm tracking-tight capitalize"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {dateLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-extrabold px-3 py-1 rounded-full font-mono"
                      style={{
                        backgroundColor:
                          day.total_count > 0
                            ? 'color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-primary))'
                            : 'var(--color-bg-secondary)',
                        color:
                          day.total_count > 0
                            ? 'var(--color-accent)'
                            : 'var(--color-text-tertiary)',
                      }}
                    >
                      {day.total_count} virhettä
                    </span>
                    <ChevronDown
                      size={16}
                      className="text-[var(--color-text-tertiary)] transition-transform duration-200 group-open:rotate-180"
                    />
                  </div>
                </summary>

                <div
                  className="px-5 pb-5 pt-4 border-t"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                >
                  {sortedWords.length === 0 ? (
                    <div
                      className="text-xs py-2 text-center"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Ei virheellisiä arvauksia tänä päivänä.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sortedWords.map((item) => (
                        <div
                          key={`${day.date}-${item.word}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium hover:scale-[1.04] active:scale-[0.98] transition-all duration-150 cursor-default bg-[var(--color-bg-primary)] shadow-xs"
                          style={{
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          <span
                            className="font-bold tracking-wide font-mono"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {item.word}
                          </span>
                          <span
                            className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                'color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-primary))',
                              color: 'var(--color-accent)',
                            }}
                          >
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
