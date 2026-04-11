/**
 * Player authentication routes.
 *
 * Endpoints:
 *   POST /api/player/auth/request - Request a magic link email
 *   POST /api/player/auth/verify  - Exchange magic link token for Bearer session
 *   POST /api/player/auth/logout  - Invalidate current session
 *   GET  /api/player/me           - Return current player info
 *
 * Authentication is entirely separate from admin auth (server/auth/routes.ts).
 * No passwords are stored — players authenticate via one-time email links.
 *
 * @module server/player-auth/routes
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../db/connection';
import { sendMagicLink } from '../email/send-magic-link';
import {
  createPlayerSession,
  deletePlayerSession,
  cleanupExpiredPlayerSessions,
} from './session';
import { requirePlayer, type PlayerVariables } from './middleware';
import { rankIndex } from '@sanakenno/shared';
import type {
  StatsRecord,
  PlayerStats,
  SyncPuzzleState,
} from '@sanakenno/shared';

const player = new Hono<{ Variables: PlayerVariables }>();

// --- Rate limiting for auth/request ---

const requestRateLimitMap = new Map<string, number>();
const REQUEST_RATE_LIMIT = 3;

const requestRateLimitInterval = setInterval(() => {
  requestRateLimitMap.clear();
}, 60_000);

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__playerRequestRateLimitInterval =
    requestRateLimitInterval;
}

/** Clear rate limit map. Exposed for testing. */
export function resetRequestRateLimit(): void {
  requestRateLimitMap.clear();
}

/** Stop the rate limit reset interval. */
export function stopRequestRateLimitInterval(): void {
  clearInterval(requestRateLimitInterval);
}

function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

function requestRateLimit(c: Context, next: Next) {
  const ip = getClientIp(c);
  const count = requestRateLimitMap.get(ip) || 0;

  if (count >= REQUEST_RATE_LIMIT) {
    return c.json({ error: 'Liian monta yritystä, odota hetki' }, 429);
  }

  requestRateLimitMap.set(ip, count + 1);
  return next();
}

/** Hash a raw token with SHA-256, returning a hex digest. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Magic link TTL: 15 minutes. */
const MAGIC_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Merge-upsert player stats records and puzzle states uploaded at login.
 *
 * Stats: MAX strategy on all numeric fields, best rank wins.
 * Puzzle states: union found_words + hints_unlocked, MAX score, MIN started_at.
 * Never discards data already on the server.
 */
function bulkUpsertLocalData(
  playerId: number,
  stats: PlayerStats | undefined,
  puzzleStates: SyncPuzzleState[] | undefined,
): void {
  const db = getDb();

  if (stats?.records?.length) {
    interface ExistingStatRow {
      best_rank: string;
      best_score: number;
      max_score: number;
      words_found: number;
      hints_used: number;
      elapsed_ms: number;
    }
    const selectStat = db.prepare(
      `SELECT best_rank, best_score, max_score, words_found, hints_used, elapsed_ms
       FROM player_stats WHERE player_id = ? AND puzzle_number = ?`,
    );
    const insertStat = db.prepare(
      `INSERT INTO player_stats
         (player_id, puzzle_number, date, best_rank, best_score,
          max_score, words_found, hints_used, elapsed_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const updateStat = db.prepare(
      `UPDATE player_stats SET
         best_rank = ?,
         best_score = MAX(best_score, ?),
         max_score = MAX(max_score, ?),
         words_found = MAX(words_found, ?),
         hints_used = MAX(hints_used, ?),
         elapsed_ms = MAX(elapsed_ms, ?),
         updated_at = datetime('now')
       WHERE player_id = ? AND puzzle_number = ?`,
    );
    db.transaction((records: StatsRecord[]) => {
      for (const r of records) {
        const existing = selectStat.get(playerId, r.puzzle_number) as
          | ExistingStatRow
          | undefined;
        if (!existing) {
          insertStat.run(
            playerId,
            r.puzzle_number,
            r.date,
            r.best_rank,
            r.best_score,
            r.max_score,
            r.words_found,
            r.hints_used,
            r.elapsed_ms,
          );
        } else {
          const mergedRank =
            rankIndex(r.best_rank) > rankIndex(existing.best_rank)
              ? r.best_rank
              : existing.best_rank;
          updateStat.run(
            mergedRank,
            r.best_score,
            r.max_score,
            r.words_found,
            r.hints_used,
            r.elapsed_ms,
            playerId,
            r.puzzle_number,
          );
        }
      }
    })(stats.records);
  }

  if (puzzleStates?.length) {
    interface ExistingStateRow {
      found_words: string;
      score: number;
      hints_unlocked: string;
      started_at: number;
      total_paused_ms: number;
      score_before_hints: number | null;
    }
    const selectState = db.prepare(
      `SELECT found_words, score, hints_unlocked, started_at, total_paused_ms, score_before_hints
       FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = ?`,
    );
    const insertState = db.prepare(
      `INSERT INTO player_puzzle_states
         (player_id, puzzle_number, found_words, score, hints_unlocked,
          started_at, total_paused_ms, score_before_hints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const updateState = db.prepare(
      `UPDATE player_puzzle_states SET
         found_words = ?, score = ?, hints_unlocked = ?,
         started_at = ?, total_paused_ms = ?, score_before_hints = ?,
         updated_at = datetime('now')
       WHERE player_id = ? AND puzzle_number = ?`,
    );
    db.transaction((states: SyncPuzzleState[]) => {
      for (const s of states) {
        const existing = selectState.get(playerId, s.puzzle_number) as
          | ExistingStateRow
          | undefined;
        if (!existing) {
          insertState.run(
            playerId,
            s.puzzle_number,
            JSON.stringify(s.found_words),
            s.score,
            JSON.stringify(s.hints_unlocked),
            s.started_at,
            s.total_paused_ms,
            s.score_before_hints ?? null,
          );
        } else {
          const mergedWords = [
            ...new Set([
              ...(JSON.parse(existing.found_words) as string[]),
              ...s.found_words,
            ]),
          ];
          const mergedHints = [
            ...new Set([
              ...(JSON.parse(existing.hints_unlocked) as string[]),
              ...s.hints_unlocked,
            ]),
          ];
          const mergedScore = Math.max(existing.score, s.score);
          const mergedStartedAt =
            existing.started_at && s.started_at
              ? Math.min(existing.started_at, s.started_at)
              : existing.started_at || s.started_at;
          const mergedPausedMs = Math.max(
            existing.total_paused_ms,
            s.total_paused_ms,
          );
          const mergedScoreBefore =
            existing.score_before_hints ?? s.score_before_hints;
          updateState.run(
            JSON.stringify(mergedWords),
            mergedScore,
            JSON.stringify(mergedHints),
            mergedStartedAt,
            mergedPausedMs,
            mergedScoreBefore,
            playerId,
            s.puzzle_number,
          );
        }
      }
    })(puzzleStates);
  }
}

/** Fetch all server-side data for a player (for return after verify). */
function fetchPlayerData(playerId: number): {
  stats: PlayerStats;
  puzzle_states: SyncPuzzleState[];
} {
  const db = getDb();

  interface StatRow {
    puzzle_number: number;
    date: string;
    best_rank: string;
    best_score: number;
    max_score: number;
    words_found: number;
    hints_used: number;
    elapsed_ms: number;
  }

  const statsRows = db
    .prepare(
      `SELECT puzzle_number, date, best_rank, best_score, max_score,
              words_found, hints_used, elapsed_ms
       FROM player_stats WHERE player_id = ?`,
    )
    .all(playerId) as StatRow[];

  interface StateRow {
    puzzle_number: number;
    found_words: string;
    score: number;
    hints_unlocked: string;
    started_at: number;
    total_paused_ms: number;
    score_before_hints: number | null;
  }

  const stateRows = db
    .prepare(
      `SELECT puzzle_number, found_words, score, hints_unlocked,
              started_at, total_paused_ms, score_before_hints
       FROM player_puzzle_states WHERE player_id = ?`,
    )
    .all(playerId) as StateRow[];

  return {
    stats: {
      records: statsRows.map((r) => ({
        puzzle_number: r.puzzle_number,
        date: r.date,
        best_rank: r.best_rank,
        best_score: r.best_score,
        max_score: r.max_score,
        words_found: r.words_found,
        hints_used: r.hints_used,
        elapsed_ms: r.elapsed_ms,
      })),
      version: 1,
    },
    puzzle_states: stateRows.map((r) => ({
      puzzle_number: r.puzzle_number,
      found_words: JSON.parse(r.found_words) as string[],
      score: r.score,
      hints_unlocked: JSON.parse(r.hints_unlocked) as string[],
      started_at: r.started_at,
      total_paused_ms: r.total_paused_ms,
      score_before_hints: r.score_before_hints,
    })),
  };
}

// ---------------------------------------------------------------------------

/**
 * POST /auth/request
 *
 * Request a magic link. Always returns 200 regardless of whether the email
 * address is known (prevents email enumeration).
 * Rate-limited to 3 requests per minute per IP.
 */
player.post('/auth/request', requestRateLimit, async (c) => {
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }
  const email = typeof body['email'] === 'string' ? body['email'].trim() : '';

  // Basic email validation
  if (!email || !email.includes('@') || !email.includes('.')) {
    return c.json({ error: 'Virheellinen sähköpostiosoite' }, 400);
  }

  const db = getDb();

  // Auto-create player account on first request
  db.prepare('INSERT OR IGNORE INTO players (email) VALUES (?)').run(email);

  interface PlayerRow {
    id: number;
  }
  const row = db
    .prepare('SELECT id FROM players WHERE email = ?')
    .get(email) as PlayerRow;

  // Generate and store magic token
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_TOKEN_TTL_MS).toISOString();

  db.prepare(
    'INSERT INTO player_magic_tokens (player_id, token_hash, expires_at) VALUES (?, ?, ?)',
  ).run(row.id, tokenHash, expiresAt);

  // Clean up expired tokens opportunistically
  cleanupExpiredPlayerSessions();
  db.prepare(
    "DELETE FROM player_magic_tokens WHERE expires_at <= datetime('now')",
  ).run();

  // Send email (fire-and-forget error logging — don't reveal failures to client)
  const baseUrl = process.env.BASE_URL || 'https://sanakenno.fi';
  await sendMagicLink(email, rawToken, baseUrl).catch((err: unknown) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Magic link email failed',
        email,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return c.json({ status: 'sent' });
});

/**
 * POST /auth/verify
 *
 * Exchange a magic link token for a Bearer session token.
 * Optionally accepts local stats and puzzle states to bulk-upload on first use.
 */
player.post('/auth/verify', async (c) => {
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }

  const rawToken =
    typeof body['token'] === 'string' ? body['token'].trim() : '';
  if (!rawToken) {
    return c.json({ error: 'Token puuttuu' }, 400);
  }

  const tokenHash = hashToken(rawToken);
  const db = getDb();

  interface MagicTokenRow {
    id: number;
    player_id: number;
    expires_at: string;
    used: number;
  }

  const tokenRow = db
    .prepare(
      `SELECT id, player_id, expires_at, used
       FROM player_magic_tokens
       WHERE token_hash = ?`,
    )
    .get(tokenHash) as MagicTokenRow | undefined;

  if (!tokenRow) {
    return c.json({ error: 'Virheellinen tai vanhentunut linkki' }, 400);
  }
  if (tokenRow.used) {
    return c.json({ error: 'Linkki on jo käytetty' }, 400);
  }
  if (new Date(tokenRow.expires_at) <= new Date()) {
    return c.json({ error: 'Virheellinen tai vanhentunut linkki' }, 400);
  }

  // Mark token as used
  db.prepare('UPDATE player_magic_tokens SET used = 1 WHERE id = ?').run(
    tokenRow.id,
  );

  const playerId = tokenRow.player_id;

  // Upload local data if provided (first-time registration)
  bulkUpsertLocalData(
    playerId,
    body['stats'] as PlayerStats | undefined,
    body['puzzle_states'] as SyncPuzzleState[] | undefined,
  );

  const sessionToken = createPlayerSession(playerId);
  const serverData = fetchPlayerData(playerId);

  interface PlayerEmailRow {
    email: string;
  }
  const playerRow = db
    .prepare('SELECT email FROM players WHERE id = ?')
    .get(playerId) as PlayerEmailRow;

  return c.json({
    token: sessionToken,
    player_id: playerId,
    email: playerRow.email,
    ...serverData,
  });
});

/**
 * POST /auth/logout
 *
 * Invalidate the current Bearer session.
 */
player.post('/auth/logout', requirePlayer, (c) => {
  const token = c.get('playerToken');
  deletePlayerSession(token);
  return c.json({ status: 'ok' });
});

/**
 * GET /me
 *
 * Return current player identity. Used to validate a stored token on app mount.
 */
player.get('/me', requirePlayer, (c) => {
  const { playerId, email } = c.get('player');
  return c.json({ player_id: playerId, email });
});

export default player;
