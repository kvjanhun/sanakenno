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
  getActiveSlots,
  getPuzzleForDate,
  getPuzzleBySlot,
} from '../puzzle-engine';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  display_number: number;
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
      // The rotation walks the active slots in order and wraps to the first.
      // Today's *position* in that sequence — not its slot number — is how
      // many days back the cycle started, since soft-deleted slots leave gaps
      // that make slot numbers and cycle positions drift apart.
      // When today already is the first slot, show one full cycle instead.
      const helsinkiNow = new Date(
        now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
      );
      const activeSlots = getActiveSlots();
      const currentIndex = activeSlots.indexOf(getPuzzleForDate(helsinkiNow));
      days = currentIndex > 0 ? currentIndex + 1 : activeSlots.length;
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
        display_number: puzzle.display_number,
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
