/**
 * Server-side session management.
 *
 * Creates, validates, and deletes sessions stored in the SQLite `sessions` table.
 * Session IDs and CSRF tokens are cryptographically random hex strings.
 *
 * @module server/auth/session
 */

import { randomBytes } from 'node:crypto';
import { getDb } from '../db/connection.js';

/** Session data returned after successful validation. */
export interface SessionData {
  adminId: number;
  username: string;
  csrfToken: string;
}

interface SessionRow {
  id: string;
  admin_id: number;
  csrf_token: string;
  expires_at: string;
  username: string;
}

/** Session lifetime: 7 days in milliseconds. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Create a new session for an admin user.
 * Generates cryptographically random session ID and CSRF token,
 * stores them in the database with a 7-day expiry.
 */
export function createSession(adminId: number): {
  sessionId: string;
  csrfToken: string;
} {
  const sessionId = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const db = getDb();
  db.prepare(
    'INSERT INTO sessions (id, admin_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)',
  ).run(sessionId, adminId, csrfToken, expiresAt);

  return { sessionId, csrfToken };
}

/**
 * Validate a session by its ID.
 * Returns session data if the session exists and has not expired, null otherwise.
 */
export function validateSession(sessionId: string): SessionData | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id, s.admin_id, s.csrf_token, s.expires_at, a.username
       FROM sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .get(sessionId) as SessionRow | undefined;

  if (!row) return null;

  return {
    adminId: row.admin_id,
    username: row.username,
    csrfToken: row.csrf_token,
  };
}

/**
 * Delete a single session by ID.
 */
export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/**
 * Delete all sessions for an admin, optionally keeping one session.
 * Used by change-password to invalidate other sessions.
 */
export function deleteSessionsForAdmin(
  adminId: number,
  exceptSessionId?: string,
): void {
  const db = getDb();
  if (exceptSessionId) {
    db.prepare('DELETE FROM sessions WHERE admin_id = ? AND id != ?').run(
      adminId,
      exceptSessionId,
    );
  } else {
    db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(adminId);
  }
}

/**
 * Remove all expired sessions from the database.
 * Called opportunistically during login.
 */
export function cleanupExpiredSessions(): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}
