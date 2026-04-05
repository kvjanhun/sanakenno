/**
 * Upcoming puzzle rotation schedule.
 *
 * Displays the next 14 days of puzzle rotation with slot numbers,
 * letters, and center letters. Today's row is highlighted.
 *
 * @module src/components/admin/Schedule
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminStore } from '../../store/useAdminStore.js';
import type { ScheduleEntry } from '../../store/useAdminStore.js';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Schedule() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const loadSlot = useAdminStore((s) => s.loadSlot);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/schedule?days=14`, {
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
  }, [csrfToken]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  if (loading) {
    return (
      <div
        className="text-sm py-4 text-center"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ladataan...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <th className="text-left py-1 px-2">Päivä</th>
            <th className="text-right py-1 px-2">#</th>
            <th className="text-left py-1 px-2">Kirjaimet</th>
            <th className="text-center py-1 px-2">Keskus</th>
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
                  ? 'rgba(255, 100, 62, 0.08)'
                  : 'transparent',
              }}
            >
              <td
                className="py-1 px-2"
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
                className="py-1 px-2 text-right font-mono"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {entry.display_number}
              </td>
              <td
                className="py-1 px-2 font-mono"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {entry.letters?.join('') || '—'}
              </td>
              <td
                className="py-1 px-2 text-center font-bold uppercase"
                style={{ color: 'var(--color-accent)' }}
              >
                {entry.center || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
