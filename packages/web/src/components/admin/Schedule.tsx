/**
 * Upcoming puzzle rotation schedule.
 *
 * Displays a selectable upcoming puzzle rotation window with slot numbers,
 * letters, and center letters. Today's row is highlighted.
 *
 * @module src/components/admin/Schedule
 */

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import type { ScheduleEntry } from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

function inclusiveDayCount(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  return Math.max(1, Math.min(90, Math.round((end - start) / 86400000) + 1));
}

const DEFAULT_START = formatDateInput(new Date());
const DEFAULT_END = addDays(DEFAULT_START, 13);

export function Schedule() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    const days = inclusiveDayCount(startDate, endDate);
    try {
      const params = new URLSearchParams({
        start: startDate,
        days: String(days),
      });
      const res = await fetch(`${API_BASE}/api/admin/schedule?${params}`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSchedule(data.schedule);
      } else {
        setStatusMessage('Aikataulua ei voitu ladata.', 'error');
      }
    } catch {
      setStatusMessage('Aikataulua ei voitu ladata.', 'error');
    }
    setLoading(false);
  }, [csrfToken, endDate, startDate, setStatusMessage]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleStartDateChange = (value: string) => {
    if (!value) return;
    setStartDate(value);
    if (value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    if (!value) return;
    setEndDate(value);
    if (value < startDate) {
      setStartDate(value);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div
        className="overflow-hidden rounded-2xl border shadow-xs"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <CalendarDays
                className="h-5 w-5"
                style={{ color: 'var(--color-accent)' }}
              />
              <h2
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Julkaisuaikataulu
              </h2>
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Uusien ja vanhojen pelien kierto aikajanalla.
            </p>
          </div>

          {/* Filters inside Header */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Alku:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="h-9 rounded-xl px-3 border focus:outline-none focus:ring-1 focus:ring-accent font-medium shadow-xs"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Loppu:
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={addDays(startDate, 89)}
                onChange={(event) => handleEndDateChange(event.target.value)}
                className="h-9 rounded-xl px-3 border focus:outline-none focus:ring-1 focus:ring-accent font-medium shadow-xs"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <span
              className="px-2.5 py-1 rounded-full border shrink-0 bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {loading ? 'Ladataan...' : `${schedule.length} päivää`}
            </span>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
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
              Ladataan aikataulua...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[min(38rem,72vh)]">
            <table className="w-full text-left border-collapse min-w-[32rem]">
              <thead
                className="sticky top-0 z-10"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <tr
                  className="text-xs font-bold uppercase tracking-wider border-b"
                  style={{
                    color: 'var(--color-text-tertiary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <th className="px-6 py-4 font-semibold">Päivämäärä</th>
                  <th className="px-6 py-4 font-semibold text-center w-24">
                    Pelinumero
                  </th>
                  <th className="px-6 py-4 font-semibold">Kirjaimet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {schedule.map((entry) => {
                  const dayDate = new Date(entry.date + 'T12:00:00');
                  const weekday = dayDate.toLocaleDateString('fi-FI', {
                    weekday: 'short',
                  });
                  const dateString = dayDate.toLocaleDateString('fi-FI', {
                    day: 'numeric',
                    month: 'numeric',
                  });

                  return (
                    <tr
                      key={entry.date}
                      className="transition-colors select-none"
                      style={{
                        backgroundColor: entry.is_today
                          ? 'color-mix(in srgb, var(--color-accent) 7%, var(--color-bg-secondary))'
                          : 'transparent',
                      }}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {entry.is_today && (
                            <span
                              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-xs shrink-0"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'var(--color-on-accent)',
                              }}
                            >
                              Tänään
                            </span>
                          )}
                          <span
                            className="text-sm font-semibold capitalize"
                            style={{
                              color: entry.is_today
                                ? 'var(--color-accent)'
                                : 'var(--color-text-primary)',
                            }}
                          >
                            {weekday} {dateString}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md border text-center inline-block min-w-[2.5rem]"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          #{entry.display_number}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1">
                          {entry.letters ? (
                            entry.letters.map((letter) => {
                              const isCenter = letter === entry.center;
                              return (
                                <span
                                  key={letter}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg font-mono text-xs font-bold shadow-xs select-none uppercase"
                                  style={{
                                    backgroundColor: isCenter
                                      ? 'var(--color-accent)'
                                      : 'var(--color-bg-primary)',
                                    color: isCenter
                                      ? 'var(--color-on-accent)'
                                      : 'var(--color-text-primary)',
                                    border: isCenter
                                      ? '1px solid var(--color-accent)'
                                      : '1px solid var(--color-border)',
                                  }}
                                >
                                  {letter}
                                </span>
                              );
                            })
                          ) : (
                            <span
                              className="text-xs italic"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              Ei asetettua peliä
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
