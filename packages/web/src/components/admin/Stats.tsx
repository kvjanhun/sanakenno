/**
 * Admin statistics dashboard.
 *
 * Shows achievement distribution by rank, with a stable-user mode and raw
 * achievement-event mode.
 *
 * @module src/components/admin/Stats
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Hash, Trophy, Users } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import type { AchievementDay } from '../../store/useAdminStore';

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

const PERIODS = [7, 30, 90];

const RANK_FILLS = [
  'var(--color-text-tertiary)',
  'color-mix(in srgb, var(--color-accent) 24%, var(--color-bg-primary))',
  'color-mix(in srgb, var(--color-accent) 38%, var(--color-bg-primary))',
  'color-mix(in srgb, var(--color-accent) 54%, var(--color-bg-primary))',
  'color-mix(in srgb, var(--color-accent) 70%, var(--color-bg-primary))',
  'color-mix(in srgb, var(--color-accent) 84%, var(--color-bg-primary))',
  'var(--color-accent)',
];

type AchievementMode = 'users' | 'all';

function formatAdminDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

/**
 * Achievement statistics dashboard for admin users.
 */
export function Stats() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState<AchievementMode>('users');
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
        setDaily(data.daily || []);
        setTotals(data.totals || {});
      }
    } catch {
      setDaily([]);
      setTotals({});
    } finally {
      setLoading(false);
    }
  }, [days, mode, csrfToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const grandTotal = useMemo(
    () => Object.values(totals).reduce((sum, count) => sum + count, 0),
    [totals],
  );

  const activeDays = useMemo(
    () => daily.filter((day) => day.total > 0).length,
    [daily],
  );

  const bestDay = useMemo(
    () =>
      daily.reduce<AchievementDay | null>((best, day) => {
        if (!best || day.total > best.total) return day;
        return best;
      }, null),
    [daily],
  );

  const topRank = useMemo(() => {
    return RANKS.reduce(
      (best, rank) => {
        const count = totals[rank] || 0;
        return count > best.count ? { rank, count } : best;
      },
      { rank: RANKS[0], count: 0 },
    );
  }, [totals]);

  const maxRankTotal = Math.max(1, ...RANKS.map((rank) => totals[rank] || 0));
  const maxDayTotal = Math.max(1, ...daily.map((day) => day.total));
  const unitLabel = mode === 'users' ? 'käyttäjää' : 'saavutusta';

  return (
    <div className="space-y-2" aria-label="Tilastot">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded p-1"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {PERIODS.map((period) => {
              const active = days === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDays(period)}
                  className="h-8 rounded px-3 text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-bg-primary)'
                      : 'transparent',
                    color: active
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    border: active
                      ? '1px solid var(--color-border)'
                      : '1px solid transparent',
                  }}
                >
                  {period} pv
                </button>
              );
            })}
          </div>

          <div
            className="inline-flex rounded p-1"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {[
              { key: 'users', label: 'Käyttäjät', icon: Users },
              { key: 'all', label: 'Saavutukset', icon: Activity },
            ].map((item) => {
              const active = mode === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key as AchievementMode)}
                  className="inline-flex h-8 items-center gap-2 rounded px-3 text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-accent)'
                      : 'transparent',
                    color: active
                      ? 'var(--color-on-accent)'
                      : 'var(--color-text-secondary)',
                    border: '1px solid transparent',
                  }}
                >
                  <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {grandTotal} {unitLabel} / {days} pv
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {[
          {
            label: mode === 'users' ? 'Käyttäjät' : 'Saavutukset',
            value: grandTotal,
            meta:
              mode === 'users'
                ? 'vakaalla tunnisteella'
                : 'kaikki rankkitapahtumat',
            icon: Users,
          },
          {
            label: 'Aktiiviset päivät',
            value: activeDays,
            meta: `${days} päivän ikkunasta`,
            icon: Activity,
          },
          {
            label: 'Huippupäivä',
            value: bestDay?.total ?? 0,
            meta: bestDay ? formatAdminDate(bestDay.date) : '-',
            icon: Trophy,
          },
          {
            label: 'Yleisin rankki',
            value: topRank.count,
            meta: topRank.count > 0 ? topRank.rank : '-',
            icon: Hash,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-lg p-2.5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {item.label}
                </span>
                <Icon
                  size={17}
                  strokeWidth={2.1}
                  aria-hidden="true"
                  style={{ color: 'var(--color-accent)' }}
                />
              </div>
              <div
                className="mt-2 text-2xl font-semibold leading-none"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {item.value}
              </div>
              <div
                className="mt-1 truncate text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {item.meta}
              </div>
            </div>
          );
        })}
      </div>

      <section
        className="rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex flex-col gap-1 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rankkijakauma
            </h3>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {mode === 'users'
                ? 'Korkein päivän aikana saavutettu rankki per käyttäjä'
                : 'Kaikki tallennetut rankkisiirtymät'}
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className="py-12 text-center text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ladataan...
          </div>
        ) : (
          <div className="grid gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div
              className="space-y-2 p-3 md:border-r"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {RANKS.map((rank, index) => {
                const count = totals[rank] || 0;
                const width = count > 0 ? (count / maxRankTotal) * 100 : 0;
                return (
                  <div
                    key={rank}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm"
                  >
                    <span
                      className="truncate"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {rank}
                    </span>
                    <div
                      className="h-2 rounded"
                      style={{ backgroundColor: 'var(--color-bg-primary)' }}
                    >
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${width}%`,
                          minWidth: count > 0 ? '0.4rem' : 0,
                          backgroundColor: RANK_FILLS[index],
                        }}
                      />
                    </div>
                    <span
                      className="text-right font-mono text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3">
              <div className="space-y-1.5">
                {daily.map((day) => {
                  const barWidth =
                    day.total > 0
                      ? Math.max(4, (day.total / maxDayTotal) * 100)
                      : 0;

                  return (
                    <div
                      key={day.date}
                      className="grid grid-cols-[4.75rem_minmax(0,1fr)_4.25rem] items-center gap-3"
                    >
                      <span
                        className="truncate text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formatAdminDate(day.date)}
                      </span>

                      <div
                        className="h-5 overflow-hidden rounded"
                        style={{ backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        <div
                          className="flex h-full overflow-hidden rounded"
                          style={{
                            width: `${barWidth}%`,
                            minWidth: day.total > 0 ? '0.35rem' : 0,
                          }}
                        >
                          {RANKS.map((rank, index) => {
                            const count = day.counts[rank] || 0;
                            if (count === 0) return null;
                            return (
                              <div
                                key={rank}
                                title={`${rank}: ${count}`}
                                style={{
                                  width: `${(count / day.total) * 100}%`,
                                  minWidth: '0.25rem',
                                  backgroundColor: RANK_FILLS[index],
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <span
                        className="text-right font-mono text-xs"
                        title={RANKS.map(
                          (rank) => `${rank}: ${day.counts[rank] || 0}`,
                        ).join(', ')}
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {day.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
