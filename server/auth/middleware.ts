/**
 * Auth middleware for Hono.
 *
 * Provides three middleware functions:
 *   - securityHeaders: adds security headers to all admin/auth responses
 *   - requireAuth: validates session cookie and populates context
 *   - requireCsrf: verifies CSRF token on state-changing requests
 *
 * @module server/auth/middleware
 */

import { timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { validateSession, type SessionData } from './session';

/** Cookie name used for session identification. */
export const SESSION_COOKIE = 'sanakenno_session';

/** Hono context variables set by auth middleware. */
export type AdminVariables = {
  admin: SessionData;
  sessionId: string;
};

/**
 * Add security headers to responses.
 * Applied to all /api/auth/* and /api/admin/* routes.
 */
export async function securityHeaders(c: Context, next: Next): Promise<void> {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Cache-Control', 'no-store');
}

/**
 * Require a valid session. Reads the session cookie, validates it against
 * the database, and sets admin data on the Hono context.
 * Returns 401 if the session is missing, invalid, or expired.
 */
export async function requireAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = validateSession(sessionId);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('admin', session);
  c.set('sessionId', sessionId);
  await next();
}

/**
 * Require a valid CSRF token on state-changing requests (POST, PUT, DELETE, PATCH).
 * Reads the X-CSRF-Token header and compares it timing-safely against the session token.
 * Returns 403 if the token is missing or invalid.
 * GET and HEAD requests pass through without CSRF checks.
 */
export async function requireCsrf(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const method = c.req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return next();
  }

  const admin = c.get('admin') as SessionData | undefined;
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = c.req.header('X-CSRF-Token');
  if (!token) {
    return c.json({ error: 'CSRF token required' }, 403);
  }

  const expected = Buffer.from(admin.csrfToken, 'utf-8');
  const received = Buffer.from(token, 'utf-8');

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return c.json({ error: 'CSRF token mismatch' }, 403);
  }

  await next();
}
