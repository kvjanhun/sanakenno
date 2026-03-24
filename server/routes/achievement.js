/**
 * Achievement routes.
 *
 * Endpoints:
 *   POST /api/achievement - Record a player achievement (anonymous, rate-limited)
 *
 * @module server/routes/achievement
 */

import { Hono } from 'hono';
import { getDb } from '../db/connection.js';

const achievement = new Hono();

/**
 * Valid Finnish rank names, ordered from lowest to highest.
 * All user-facing strings are in Finnish per project conventions.
 */
const VALID_RANKS = [
  'Etsi sanoja!',
  'Hyvä alku',
  'Nyt mennään!',
  'Onnistuja',
  'Sanavalmis',
  'Ällistyttävä',
  'Täysi kenno',
];

/**
 * In-memory rate limiter: maps IP address to request count.
 * Resets every 60 seconds.
 * @type {Map<string, number>}
 */
const rateLimitMap = new Map();

/** Maximum achievement requests per IP per minute. */
const RATE_LIMIT = 10;

// Reset rate limit counters every 60 seconds
let rateLimitInterval = setInterval(() => {
  rateLimitMap.clear();
}, 60_000);

// Allow cleanup in tests
if (typeof globalThis !== 'undefined') {
  globalThis.__achievementRateLimitInterval = rateLimitInterval;
}

/**
 * Clear the rate limit map. Exposed for testing purposes.
 */
export function resetRateLimit() {
  rateLimitMap.clear();
}

/**
 * Stop the rate limit reset interval. Call during shutdown/cleanup.
 */
export function stopRateLimitInterval() {
  clearInterval(rateLimitInterval);
}

/**
 * Check if a value is a non-negative integer.
 *
 * @param {*} value - The value to check
 * @returns {boolean}
 */
function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Rate limiting middleware for the achievement endpoint.
 * Limits to RATE_LIMIT requests per minute per IP.
 */
function rateLimitMiddleware(c, next) {
  // Use X-Forwarded-For if behind a proxy, fall back to remote address
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
 *
 * Request body:
 *   - puzzle_number: non-negative integer (required)
 *   - rank: one of the 7 valid Finnish ranks (required)
 *   - score: non-negative integer (required)
 *   - max_score: non-negative integer (required)
 *   - words_found: non-negative integer (required)
 *   - elapsed_ms: non-negative integer (optional)
 */
achievement.post('/', rateLimitMiddleware, async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { puzzle_number, rank, score, max_score, words_found, elapsed_ms } =
    body;

  // Validate required fields are present
  if (
    puzzle_number === undefined ||
    rank === undefined ||
    score === undefined ||
    max_score === undefined ||
    words_found === undefined
  ) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // Validate rank
  if (!VALID_RANKS.includes(rank)) {
    return c.json({ error: 'Invalid rank' }, 400);
  }

  // Validate numeric fields
  if (
    !isNonNegativeInteger(puzzle_number) ||
    !isNonNegativeInteger(score) ||
    !isNonNegativeInteger(max_score) ||
    !isNonNegativeInteger(words_found)
  ) {
    return c.json({ error: 'Numeric fields must be non-negative integers' }, 400);
  }

  // Validate optional elapsed_ms if present
  if (elapsed_ms !== undefined && !isNonNegativeInteger(elapsed_ms)) {
    return c.json({ error: 'elapsed_ms must be a non-negative integer' }, 400);
  }

  // Store in database
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO achievements (puzzle_number, rank, score, max_score, words_found, elapsed_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(puzzle_number, rank, score, max_score, words_found, elapsed_ms ?? null);

  return c.json({ status: 'recorded' }, 201);
});

export default achievement;
