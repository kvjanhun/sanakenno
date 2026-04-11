/**
 * Player authentication routes.
 *
 * Endpoints:
 *   POST /api/player/auth/init            - Create player key identity + session
 *   POST /api/player/auth/transfer/create - Create one-time transfer token
 *   POST /api/player/auth/transfer/use    - Exchange transfer token for session
 *   POST /api/player/auth/logout          - Invalidate current session
 *   GET  /api/player/me                   - Return current player info
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../db/connection';
import { sendTransferLink } from '../email/send-transfer-link';
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

const transferCreateRateLimitMap = new Map<string, number>();
const TRANSFER_CREATE_RATE_LIMIT = 3;

const transferCreateRateLimitInterval = setInterval(() => {
  transferCreateRateLimitMap.clear();
}, 60_000);

if (typeof globalThis !== 'undefined') {
  (
    globalThis as Record<string, unknown>
  ).__playerTransferCreateRateLimitInterval = transferCreateRateLimitInterval;
}

export function resetTransferCreateRateLimit(): void {
  transferCreateRateLimitMap.clear();
}

function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

function transferCreateRateLimit(c: Context, next: Next) {
  const ip = getClientIp(c);
  const count = transferCreateRateLimitMap.get(ip) || 0;
  if (count >= TRANSFER_CREATE_RATE_LIMIT) {
    return c.json({ error: 'Liian monta yritystä, odota hetki' }, 429);
  }
  transferCreateRateLimitMap.set(ip, count + 1);
  return next();
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

const TRANSFER_TOKEN_TTL_MS = 15 * 60 * 1000;

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

function fetchPlayerData(playerId: number): {
  stats: PlayerStats;
  puzzle_states: SyncPuzzleState[];
} {
  const db = getDb();
  const statsRows = db
    .prepare(
      `SELECT puzzle_number, date, best_rank, best_score, max_score,
              words_found, hints_used, elapsed_ms
       FROM player_stats WHERE player_id = ?`,
    )
    .all(playerId) as Array<{
    puzzle_number: number;
    date: string;
    best_rank: string;
    best_score: number;
    max_score: number;
    words_found: number;
    hints_used: number;
    elapsed_ms: number;
  }>;
  const stateRows = db
    .prepare(
      `SELECT puzzle_number, found_words, score, hints_unlocked,
              started_at, total_paused_ms, score_before_hints
       FROM player_puzzle_states WHERE player_id = ?`,
    )
    .all(playerId) as Array<{
    puzzle_number: number;
    found_words: string;
    score: number;
    hints_unlocked: string;
    started_at: number;
    total_paused_ms: number;
    score_before_hints: number | null;
  }>;

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

player.post('/auth/init', (c) => {
  const playerKey = randomBytes(32).toString('hex');
  const playerKeyHash = hashToken(playerKey);
  const db = getDb();
  try {
    db.prepare('INSERT INTO players (player_key_hash) VALUES (?)').run(
      playerKeyHash,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('players.email')) {
      // Legacy DB compatibility: keep privacy (no user email), satisfy NOT NULL.
      db.prepare(
        'INSERT INTO players (player_key_hash, email) VALUES (?, ?)',
      ).run(playerKeyHash, `legacy-${playerKeyHash}@invalid.local`);
    } else {
      throw err;
    }
  }
  const row = db
    .prepare('SELECT id FROM players WHERE player_key_hash = ?')
    .get(playerKeyHash) as { id: number };
  const token = createPlayerSession(row.id);
  return c.json({ player_key: playerKey, token, player_id: row.id });
});

player.post(
  '/auth/transfer/create',
  requirePlayer,
  transferCreateRateLimit,
  async (c) => {
    const { playerId } = c.get('player');
    let body: Record<string, unknown> = {};
    try {
      body = await c.req.json();
    } catch {
      // Ignore malformed body and treat as empty.
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + TRANSFER_TOKEN_TTL_MS,
    ).toISOString();
    const db = getDb();
    db.prepare(
      'INSERT INTO player_transfer_tokens (player_id, token_hash, expires_at) VALUES (?, ?, ?)',
    ).run(playerId, tokenHash, expiresAt);
    cleanupExpiredPlayerSessions();
    db.prepare(
      "DELETE FROM player_transfer_tokens WHERE expires_at <= datetime('now')",
    ).run();

    const email = typeof body['email'] === 'string' ? body['email'].trim() : '';
    if (email) {
      const baseUrl = process.env.BASE_URL || 'https://sanakenno.fi';
      await sendTransferLink(email, rawToken, baseUrl).catch((err: unknown) => {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Transfer link email failed',
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      });
    }

    return c.json({ transfer_token: rawToken });
  },
);

player.post('/auth/transfer/use', async (c) => {
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    // Ignore malformed body and validate token below.
  }
  const rawToken =
    typeof body['token'] === 'string' ? body['token'].trim() : '';
  if (!rawToken) {
    return c.json({ error: 'Token puuttuu' }, 400);
  }

  const db = getDb();
  const tokenRow = db
    .prepare(
      `SELECT id, player_id, expires_at, used
       FROM player_transfer_tokens
       WHERE token_hash = ?`,
    )
    .get(hashToken(rawToken)) as
    | { id: number; player_id: number; expires_at: string; used: number }
    | undefined;
  if (!tokenRow || new Date(tokenRow.expires_at) <= new Date()) {
    return c.json({ error: 'Virheellinen tai vanhentunut linkki' }, 400);
  }
  if (tokenRow.used) {
    return c.json({ error: 'Linkki on jo käytetty' }, 400);
  }

  db.prepare('UPDATE player_transfer_tokens SET used = 1 WHERE id = ?').run(
    tokenRow.id,
  );

  const playerId = tokenRow.player_id;
  bulkUpsertLocalData(
    playerId,
    body['stats'] as PlayerStats | undefined,
    body['puzzle_states'] as SyncPuzzleState[] | undefined,
  );
  const token = createPlayerSession(playerId);
  return c.json({
    token,
    player_id: playerId,
    ...fetchPlayerData(playerId),
  });
});

player.post('/auth/logout', requirePlayer, (c) => {
  deletePlayerSession(c.get('playerToken'));
  return c.json({ status: 'ok' });
});

player.get('/me', requirePlayer, (c) => {
  const { playerId } = c.get('player');
  return c.json({ player_id: playerId });
});

export default player;
