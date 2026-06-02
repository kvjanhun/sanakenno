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
  const loadSlot = useAdminStore((s) => s.loadSlot);
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
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [csrfToken, endDate, startDate]);

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
    <section className="w-full" aria-label="Aikataulu">
      <div
        className="overflow-hidden rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex flex-wrap items-center gap-2 px-2 py-1.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <CalendarDays
            size={15}
            strokeWidth={2.2}
            aria-hidden="true"
            style={{ color: 'var(--color-accent)' }}
          />
          <label
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Alku
            <input
              type="date"
              value={startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              className="h-7 rounded px-2 text-xs"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>
          <label
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Loppu
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={addDays(startDate, 89)}
              onChange={(event) => handleEndDateChange(event.target.value)}
              className="h-7 rounded px-2 text-xs"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>
          <span
            className="ml-auto text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {loading ? 'Ladataan...' : `${schedule.length} päivää`}
          </span>
        </div>

        <div className="max-h-[min(36rem,72vh)] overflow-auto">
          <table className="w-auto min-w-[32rem] max-w-full text-sm">
            <thead
              className="sticky top-0 z-10"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <tr
                className="text-left text-xs"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                <th className="px-2 py-1 font-semibold">Päivä</th>
                <th className="px-2 py-1 text-right font-semibold">#</th>
                <th className="px-2 py-1 font-semibold">Kirjaimet</th>
                <th className="px-2 py-1 text-center font-semibold">Keskus</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((entry) => (
                <tr
                  key={entry.date}
                  className="cursor-pointer"
                  onClick={() => loadSlot(entry.slot)}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: entry.is_today
                      ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                      : 'transparent',
                  }}
                >
                  <td
                    className="px-2 py-0.5 text-xs"
                    style={{
                      color: entry.is_today
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      fontWeight: entry.is_today ? 600 : 400,
                    }}
                  >
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString(
                      'fi-FI',
                      { weekday: 'short', day: 'numeric', month: 'numeric' },
                    )}
                  </td>
                  <td
                    className="px-2 py-0.5 text-right font-mono text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {entry.display_number}
                  </td>
                  <td
                    className="px-2 py-0.5 font-mono text-xs"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {entry.letters?.join('') || '-'}
                  </td>
                  <td className="px-2 py-0.5 text-center">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded font-mono text-[11px] font-bold"
                      style={{
                        backgroundColor: entry.center
                          ? 'var(--color-accent)'
                          : 'var(--color-bg-primary)',
                        border: entry.center
                          ? '1px solid var(--color-accent)'
                          : '1px solid var(--color-border)',
                        color: entry.center
                          ? 'var(--color-on-accent)'
                          : 'var(--color-text-tertiary)',
                      }}
                    >
                      {entry.center || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
