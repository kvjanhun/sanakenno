/**
 * Failed guess routes.
 *
 * Endpoints:
 *   POST /api/failed-guess - Record a non-dictionary guess
 *
 * @module server/routes/failed-guess
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { getDb } from '../db/connection';

const failedGuess = new Hono();

const MAX_WORD_LENGTH = 20;

/** In-memory rate limiter: maps IP address to request count. Resets every 60s. */
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT = 30;

setInterval(() => {
  rateLimitMap.clear();
}, 60_000);

function rateLimitMiddleware(c: Context, next: Next) {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown';

  const count = rateLimitMap.get(ip) || 0;
  if (count >= RATE_LIMIT) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  rateLimitMap.set(ip, count + 1);
  return next();
}

interface FailedGuessBody {
  word: string;
  date: string;
}

/**
 * POST /api/failed-guess
 * Records a non-dictionary word guess. Upserts into failed_guesses table,
 * incrementing count on duplicate (word, puzzle_date) pairs.
 */
failedGuess.post('/', rateLimitMiddleware, async (c) => {
  let body: FailedGuessBody;
  try {
    body = (await c.req.json()) as FailedGuessBody;
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { word, date } = body;

  if (
    typeof word !== 'string' ||
    word.length === 0 ||
    word.length > MAX_WORD_LENGTH
  ) {
    return c.json({ error: 'Invalid word' }, 400);
  }

  // Validate date format (YYYY-MM-DD)
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'Invalid date' }, 400);
  }

  const normalized = word.toLowerCase().replace(/-/g, '');

  try {
    const db = getDb();
    db.prepare(
      `
      INSERT INTO failed_guesses (word, puzzle_date, count, first_at, last_at)
      VALUES (?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(word, puzzle_date) DO UPDATE SET
        count = count + 1,
        last_at = datetime('now')
    `,
    ).run(normalized, date);

    return c.json({ ok: true });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Failed guess record error',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default failedGuess;
