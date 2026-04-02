/**
 * Archive routes.
 *
 * Endpoints:
 *   GET /api/archive - Last 7 days of puzzle metadata (newest first)
 *
 * @module server/routes/archive
 */

import { Hono } from 'hono';
import { getPuzzleForDate, getPuzzleBySlot } from '../puzzle-engine.js';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
}

const archive = new Hono();

/**
 * GET /api/archive
 * Returns the last 7 days of puzzle metadata, newest first.
 * Dates are computed in Helsinki timezone to match puzzle rotation.
 */
archive.get('/', (c) => {
  try {
    const now = new Date();
    const entries: ArchiveEntry[] = [];

    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
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
