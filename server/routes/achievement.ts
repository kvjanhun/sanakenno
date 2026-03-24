/**
 * Achievement routes.
 *
 * Endpoints:
 *   POST /api/achievement - Record a player achievement (anonymous, rate-limited)
 *
 * @module server/routes/achievement
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { getDb } from '../db/connection.js';

const achievement = new Hono();

/** Valid Finnish rank names, ordered from lowest to highest. */
const VALID_RANKS: readonly string[] = [
  'Etsi sanoja!',
  'Hyvä alku',
  'Nyt mennään!',
  'Onnistuja',
  'Sanavalmis',
  'Ällistyttävä',
  'Täysi kenno',
] as const;

interface AchievementBody {
  puzzle_number: number;
  rank: string;
  score: number;
  max_score: number;
  words_found: number;
  elapsed_ms?: number;
}

/** In-memory rate limiter: maps IP address to request count. Resets every 60s. */
const rateLimitMap = new Map<string, number>();

const RATE_LIMIT = 10;

let rateLimitInterval = setInterval(() => {
  rateLimitMap.clear();
}, 60_000);

// Allow cleanup in tests
if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__achievementRateLimitInterval = rateLimitInterval;
}

/**
 * Clear the rate limit map. Exposed for testing.
 */
export function resetRateLimit(): void {
  rateLimitMap.clear();
}

/**
 * Stop the rate limit reset interval. Call during shutdown/cleanup.
 */
export function stopRateLimitInterval(): void {
  clearInterval(rateLimitInterval);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

/**
 * Rate limiting middleware. Limits to RATE_LIMIT requests per minute per IP.
 */
function rateLimitMiddleware(c: Context, next: Next) {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown';

  const count = rateLimitMap.get(ip) || 0;

  if (count >= RATE_LIMIT) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  rateLimitMap.set(ip, count + 1);
  return next();
}

/**
 * POST /api/achievement
 *
 * Records a player achievement. Validates rank, numeric fields,
 * and enforces rate limiting (10 requests/minute per IP).
 */
achievement.post('/', rateLimitMiddleware, async (c) => {
  let body: AchievementBody;
  try {
    body = await c.req.json<AchievementBody>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { puzzle_number, rank, score, max_score, words_found, elapsed_ms } =
    body;

  if (
    puzzle_number === undefined ||
    rank === undefined ||
    score === undefined ||
    max_score === undefined ||
    words_found === undefined
  ) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  if (!VALID_RANKS.includes(rank)) {
    return c.json({ error: 'Invalid rank' }, 400);
  }

  if (
    !isNonNegativeInteger(puzzle_number) ||
    !isNonNegativeInteger(score) ||
    !isNonNegativeInteger(max_score) ||
    !isNonNegativeInteger(words_found)
  ) {
    return c.json({ error: 'Numeric fields must be non-negative integers' }, 400);
  }

  if (elapsed_ms !== undefined && !isNonNegativeInteger(elapsed_ms)) {
    return c.json({ error: 'elapsed_ms must be a non-negative integer' }, 400);
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO achievements (puzzle_number, rank, score, max_score, words_found, elapsed_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(puzzle_number, rank, score, max_score, words_found, elapsed_ms ?? null);

  return c.json({ status: 'recorded' }, 201);
});

export default achievement;
