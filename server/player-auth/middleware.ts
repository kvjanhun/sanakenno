/**
 * Player auth middleware for Hono.
 *
 * Provides requirePlayer middleware that validates a Bearer token from the
 * Authorization header and sets player context variables on the Hono context.
 * Separate from admin auth middleware in server/auth/middleware.ts.
 *
 * @module server/player-auth/middleware
 */

import type { Context, Next } from 'hono';
import { validatePlayerToken, type PlayerSessionData } from './session';

/** Hono context variables set by player auth middleware. */
export type PlayerVariables = {
  player: PlayerSessionData;
  playerToken: string;
};

/**
 * Extract the Bearer token from the Authorization header.
 * Returns null if the header is absent or malformed.
 */
function extractBearerToken(c: Context): string | null {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Require a valid player Bearer token.
 * Reads the Authorization header, validates it against the database, and
 * sets player data on the Hono context.
 * Returns 401 if the token is missing, invalid, or expired.
 */
export async function requirePlayer(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const token = extractBearerToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const player = validatePlayerToken(token);
  if (!player) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('player', player);
  c.set('playerToken', token);
  await next();
}
