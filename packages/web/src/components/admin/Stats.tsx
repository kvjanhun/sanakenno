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
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
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
      } else {
        setStatusMessage('Tilastoja ei voitu ladata.', 'error');
      }
    } catch {
      setDaily([]);
      setTotals({});
      setStatusMessage('Tilastoja ei voitu ladata.', 'error');
    } finally {
      setLoading(false);
    }
  }, [days, mode, csrfToken, setStatusMessage]);

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
  const unitLabel = mode === 'users' ? 'pelaajaa' : 'saavutusta';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Controls Grid */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Days filters */}
          <div
            className="inline-flex rounded-xl p-1 border bg-[var(--color-bg-primary)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {PERIODS.map((period) => {
              const active = days === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDays(period)}
                  className="h-8 rounded-lg px-3 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-accent)'
                      : 'transparent',
                    color: active
                      ? 'var(--color-on-accent)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {period} pv
                </button>
              );
            })}
          </div>

          {/* Mode filters */}
          <div
            className="inline-flex rounded-xl p-1 border bg-[var(--color-bg-primary)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {[
              { key: 'users', label: 'Uniikit käyttäjät', icon: Users },
              { key: 'all', label: 'Kaikki tapahtumat', icon: Activity },
            ].map((item) => {
              const active = mode === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key as AchievementMode)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-accent)'
                      : 'transparent',
                    color: active
                      ? 'var(--color-on-accent)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon size={13} strokeWidth={2.4} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

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
          {unitLabel} kaudella
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: mode === 'users' ? 'Aktiiviset pelaajat' : 'Saavutukset',
            value: grandTotal,
            meta:
              mode === 'users'
                ? 'Istuntokohtaiset laite-ID:t'
                : 'Peliavustajan tasomerkit',
            icon: Users,
          },
          {
            label: 'Pelatut päivät',
            value: activeDays,
            meta: `${days} päivän seurantaikkunasta`,
            icon: Activity,
          },
          {
            label: 'Huippupäivän ennätys',
            value: bestDay?.total ?? 0,
            meta: bestDay ? formatAdminDate(bestDay.date) : '-',
            icon: Trophy,
          },
          {
            label: 'Suosituin saavutettu taso',
            value: topRank.count,
            meta: topRank.count > 0 ? topRank.rank : '-',
            icon: Hash,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border p-5 space-y-3 shadow-xs"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {item.label}
                </span>
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-primary))',
                  }}
                >
                  <Icon
                    size={16}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    style={{ color: 'var(--color-accent)' }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div
                  className="text-3xl font-extrabold tracking-tight font-mono"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {item.value}
                </div>
                <div
                  className="text-[11px] truncate font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {item.meta}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Card Split Grid */}
      <section
        className="rounded-2xl border overflow-hidden shadow-xs"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="flex flex-col border-b px-6 py-5 gap-1"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-base font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Rankkijakauma & ajallinen jakauma
          </h3>
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {mode === 'users'
              ? 'Yksittäisten pelaajien korkein pelatun päivän aikana ansioitunut taso'
              : 'Bruttomääräiset pelisilmukan aikaiset tasonvaihdot'}
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
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
              Ladataan analytiikkadataa...
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 lg:grid-cols-12 divide-y divide-[var(--color-border)] lg:divide-y-0 lg:divide-[var(--color-border)] lg:divide-x"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* LEFT: Cumulative Rank Bars */}
            <div className="lg:col-span-5 p-6 space-y-4">
              <div className="space-y-1">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Kokonaistasot kootusti
                </span>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Tasoja saavutettu annettuna seurantajaksona
                </p>
              </div>

              <div className="space-y-3">
                {RANKS.map((rank, index) => {
                  const count = totals[rank] || 0;
                  const percentWidth =
                    count > 0 ? (count / maxRankTotal) * 100 : 0;
                  return (
                    <div key={rank} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {rank}
                        </span>
                        <span
                          className="font-mono font-bold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {count}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentWidth}%`,
                            backgroundColor: RANK_FILLS[index],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Daily activity split timeline */}
            <div className="lg:col-span-7 p-6 space-y-4">
              <div className="space-y-1">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Päivittäinen aktiivisuusjakauma
                </span>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Päiväkohtaiset suoritukset ja tasoluokkien suhde
                </p>
              </div>

              <div className="space-y-2 max-h-[22rem] overflow-y-auto pr-2 scrollbar-thin">
                {daily.map((day) => {
                  const barWidth =
                    day.total > 0
                      ? Math.max(4, (day.total / maxDayTotal) * 100)
                      : 0;

                  return (
                    <div
                      key={day.date}
                      className="grid grid-cols-[5rem_1fr_3.5rem] items-center gap-4 text-xs"
                    >
                      <span
                        className="font-bold truncate capitalize"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formatAdminDate(day.date)}
                      </span>

                      <div
                        className="h-6 overflow-hidden rounded-lg shadow-xs"
                        style={{ backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        <div
                          className="flex h-full overflow-hidden transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                          }}
                        >
                          {RANKS.map((rank, index) => {
                            const count = day.counts[rank] || 0;
                            if (count === 0) return null;
                            const segmentPercent = (count / day.total) * 100;
                            return (
                              <div
                                key={rank}
                                title={`${rank}: ${count}`}
                                style={{
                                  width: `${segmentPercent}%`,
                                  backgroundColor: RANK_FILLS[index],
                                }}
                                className="h-full transition-all"
                              />
                            );
                          })}
                        </div>
                      </div>

                      <span
                        className="text-right font-mono font-bold"
                        title={RANKS.map(
                          (rank) => `${rank}: ${day.counts[rank] || 0}`,
                        ).join(', ')}
                        style={{ color: 'var(--color-accent)' }}
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
