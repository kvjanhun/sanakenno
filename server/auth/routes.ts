/**
 * Authentication routes.
 *
 * Endpoints:
 *   POST /api/auth/login           - Authenticate with username/password
 *   POST /api/auth/logout          - End current session
 *   GET  /api/auth/session         - Check session validity, return CSRF token
 *   POST /api/auth/change-password - Change password (requires current password)
 *
 * @module server/auth/routes
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import argon2 from 'argon2';
import { getDb } from '../db/connection.js';
import {
  createSession,
  validateSession,
  deleteSession,
  deleteSessionsForAdmin,
  cleanupExpiredSessions,
} from './session.js';
import {
  SESSION_COOKIE,
  requireAuth,
  type AdminVariables,
} from './middleware.js';

const auth = new Hono<{ Variables: AdminVariables }>();

// --- Rate limiting for login ---

const loginRateLimitMap = new Map<string, number>();
const LOGIN_RATE_LIMIT = 5;

const loginRateLimitInterval = setInterval(() => {
  loginRateLimitMap.clear();
}, 60_000);

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__loginRateLimitInterval =
    loginRateLimitInterval;
}

/** Clear login rate limit map. Exposed for testing. */
export function resetLoginRateLimit(): void {
  loginRateLimitMap.clear();
}

/** Stop the login rate limit reset interval. */
export function stopLoginRateLimitInterval(): void {
  clearInterval(loginRateLimitInterval);
}

function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

function loginRateLimit(c: Context, next: Next) {
  const ip = getClientIp(c);
  const count = loginRateLimitMap.get(ip) || 0;

  if (count >= LOGIN_RATE_LIMIT) {
    return c.json({ error: 'Liian monta yritystä, odota hetki' }, 429);
  }

  loginRateLimitMap.set(ip, count + 1);
  return next();
}

// --- Cookie helpers ---

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
}

/** Dummy hash for constant-time comparison when user doesn't exist. */
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dW5rbm93bg$dW5rbm93bg';

function setSessionCookie(c: Context, sessionId: string): void {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

// --- Routes ---

/**
 * POST /login
 * Authenticate with username and password.
 * Returns CSRF token on success, sets session cookie.
 */
auth.post('/login', loginRateLimit, async (c) => {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { username, password } = body;
  if (!username || !password) {
    return c.json({ error: 'Käyttäjänimi ja salasana vaaditaan' }, 400);
  }

  const db = getDb();
  const admin = db
    .prepare(
      'SELECT id, username, password_hash FROM admins WHERE username = ?',
    )
    .get(username) as AdminRow | undefined;

  // Constant-time: always verify even if user doesn't exist
  const hashToVerify = admin?.password_hash || DUMMY_HASH;

  let valid = false;
  try {
    valid = await argon2.verify(hashToVerify, password);
  } catch {
    valid = false;
  }

  if (!valid || !admin) {
    return c.json({ error: 'Virheelliset tunnukset' }, 401);
  }

  // Clean up old sessions opportunistically
  cleanupExpiredSessions();

  const { sessionId, csrfToken } = createSession(admin.id);
  setSessionCookie(c, sessionId);

  return c.json({ username: admin.username, csrf_token: csrfToken });
});

/**
 * POST /logout
 * End the current session and clear the cookie.
 */
auth.post('/logout', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    deleteSession(sessionId);
  }

  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ status: 'ok' });
});

/**
 * GET /session
 * Check if the current session is valid.
 * Returns username and CSRF token if authenticated.
 */
auth.get('/session', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) {
    return c.json({ authenticated: false });
  }

  const session = validateSession(sessionId);
  if (!session) {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    username: session.username,
    csrf_token: session.csrfToken,
  });
});

/**
 * POST /change-password
 * Change the admin's password. Requires the current password.
 * Invalidates all other sessions for this admin.
 */
auth.post('/change-password', requireAuth, async (c) => {
  const admin = c.get('admin') as { adminId: number; username: string };
  const currentSessionId = c.get('sessionId') as string;

  let body: { current_password?: string; new_password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return c.json({ error: 'Nykyinen ja uusi salasana vaaditaan' }, 400);
  }

  if (new_password.length < 12) {
    return c.json({ error: 'Salasanan on oltava vähintään 12 merkkiä' }, 400);
  }

  const db = getDb();
  const row = db
    .prepare('SELECT password_hash FROM admins WHERE id = ?')
    .get(admin.adminId) as { password_hash: string } | undefined;

  if (!row) {
    return c.json({ error: 'Admin not found' }, 404);
  }

  let valid = false;
  try {
    valid = await argon2.verify(row.password_hash, current_password);
  } catch {
    valid = false;
  }

  if (!valid) {
    return c.json({ error: 'Nykyinen salasana on virheellinen' }, 401);
  }

  const newHash = await argon2.hash(new_password, { type: argon2.argon2id });
  db.prepare(
    "UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(newHash, admin.adminId);

  // Invalidate all other sessions
  deleteSessionsForAdmin(admin.adminId, currentSessionId);

  return c.json({ status: 'ok' });
});

export default auth;
