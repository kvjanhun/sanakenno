/**
 * Word find routes.
 *
 * Endpoints:
 *   POST /api/word-find - Record a successful word find for a puzzle
 *
 * @module server/routes/word-find
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { getDb } from '../db/connection';

const wordFind = new Hono();

const MAX_WORD_LENGTH = 20;

/** In-memory rate limiter: maps IP address to request count. Resets every 60s. */
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT = 60;

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

interface WordFindBody {
  word: string;
  puzzle_number: number;
}

/**
 * POST /api/word-find
 * Records a successful word find. Upserts into word_finds table,
 * incrementing count on duplicate (word, puzzle_number) pairs.
 */
wordFind.post('/', rateLimitMiddleware, async (c) => {
  let body: WordFindBody;
  try {
    body = (await c.req.json()) as WordFindBody;
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { word, puzzle_number } = body;

  if (
    typeof word !== 'string' ||
    word.length === 0 ||
    word.length > MAX_WORD_LENGTH
  ) {
    return c.json({ error: 'Invalid word' }, 400);
  }

  if (
    typeof puzzle_number !== 'number' ||
    !Number.isInteger(puzzle_number) ||
    puzzle_number < 0
  ) {
    return c.json({ error: 'Invalid puzzle_number' }, 400);
  }

  const normalized = word.toLowerCase().replace(/-/g, '');

  try {
    const db = getDb();
    db.prepare(
      `
      INSERT INTO word_finds (word, puzzle_number, count, first_at, last_at)
      VALUES (?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(word, puzzle_number) DO UPDATE SET
        count = count + 1,
        last_at = datetime('now')
    `,
    ).run(normalized, puzzle_number);

    return c.json({ ok: true });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Word find record error',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default wordFind;

/** Resets the in-memory rate limit map (for testing). */
export function resetRateLimit(): void {
  rateLimitMap.clear();
}
