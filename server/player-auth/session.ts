/**
 * Player session management.
 *
 * Creates, validates, and deletes player sessions stored in the SQLite
 * `player_sessions` table. Session tokens are cryptographically random hex strings.
 * Separate from admin session management in server/auth/session.ts.
 *
 * @module server/player-auth/session
 */

import { randomBytes } from 'node:crypto';
import { getDb } from '../db/connection';

/** Player data returned after successful token validation. */
export interface PlayerSessionData {
  playerId: number;
  email: string;
}

interface PlayerSessionRow {
  id: string;
  player_id: number;
  expires_at: string;
  email: string;
}

/** Session lifetime: 90 days in milliseconds. */
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Create a new session for a player.
 * Generates a cryptographically random 64-hex token and stores it in the
 * database with a 90-day expiry.
 */
export function createPlayerSession(playerId: number): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const db = getDb();
  db.prepare(
    'INSERT INTO player_sessions (id, player_id, expires_at) VALUES (?, ?, ?)',
  ).run(token, playerId, expiresAt);

  return token;
}

/**
 * Validate a Bearer token.
 * Returns player data if the session exists and has not expired, null otherwise.
 */
export function validatePlayerToken(token: string): PlayerSessionData | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT ps.id, ps.player_id, ps.expires_at, p.email
       FROM player_sessions ps
       JOIN players p ON p.id = ps.player_id
       WHERE ps.id = ? AND ps.expires_at > datetime('now')`,
    )
    .get(token) as PlayerSessionRow | undefined;

  if (!row) return null;

  return {
    playerId: row.player_id,
    email: row.email,
  };
}

/**
 * Delete a single player session by token.
 */
export function deletePlayerSession(token: string): void {
  const db = getDb();
  db.prepare('DELETE FROM player_sessions WHERE id = ?').run(token);
}

/**
 * Remove all expired player sessions from the database.
 * Called opportunistically during auth requests.
 */
export function cleanupExpiredPlayerSessions(): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM player_sessions WHERE expires_at <= datetime('now')",
  ).run();
}
