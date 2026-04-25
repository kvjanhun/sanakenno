/**
 * Archive routes.
 *
 * Endpoints:
 *   GET /api/archive        - Last 7 days of puzzle metadata (newest first)
 *   GET /api/archive?all=true - All past puzzle metadata (newest first)
 *
 * @module server/routes/archive
 */

import { Hono } from 'hono';
import {
  getPuzzleForDate,
  getPuzzleBySlot,
  totalPuzzles,
} from '../puzzle-engine';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
  max_score: number;
}

const archive = new Hono();

/**
 * GET /api/archive
 * Returns puzzle metadata, newest first.
 * With ?all=true, returns entries from today back through the current cycle.
 * If today is slot 0, the full cycle is returned so every other slot appears.
 * Without the param, returns only the last 7 days.
 * Dates are computed in Helsinki timezone to match puzzle rotation.
 */
archive.get('/', (c) => {
  try {
    const allParam = c.req.query('all');
    const now = new Date();

    let days: number;
    if (allParam === 'true') {
      // The slot sequence runs 1, 2, ..., N-1, 0, 1, 2, ...
      // Today's slot number equals the number of days back to reach slot 0.
      // When today IS slot 0, show one full cycle so all other slots appear.
      const helsinkiNow = new Date(
        now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
      );
      const currentSlot = getPuzzleForDate(helsinkiNow);
      const total = totalPuzzles();
      days = currentSlot > 0 ? currentSlot + 1 : total;
    } else {
      days = 7;
    }

    const entries: ArchiveEntry[] = [];

    for (let daysAgo = 0; daysAgo < days; daysAgo++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      // Convert to Helsinki timezone for rotation alignment
      const helsinki = new Date(
        date.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
      );
      const slot = getPuzzleForDate(helsinki);
      const puzzle = getPuzzleBySlot(slot);
      if (!puzzle) continue;

      // Format as Helsinki-local ISO date
      const year = helsinki.getFullYear();
      const month = String(helsinki.getMonth() + 1).padStart(2, '0');
      const day = String(helsinki.getDate()).padStart(2, '0');

      entries.push({
        date: `${year}-${month}-${day}`,
        puzzle_number: slot,
        letters: [puzzle.center, ...puzzle.letters],
        center: puzzle.center,
        is_today: daysAgo === 0,
        max_score: puzzle.max_score,
      });
    }

    return c.json(entries);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Archive fetch failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return c.json({ error: 'Failed to fetch archive' }, 500);
  }
});

export default archive;
