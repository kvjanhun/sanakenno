/**
 * Player authentication routes.
 *
 * Pairing model: every player has a stable, random 64-hex `player_key` minted
 * at /auth/init. The server only stores `player_key_hash`; the raw key lives
 * on each paired device's local storage and is the pairing code shown in the
 * UI. To add a device, paste the key on the target device — no expiry, no
 * single-use. To revoke (fork progress away from other devices), rotate.
 *
 * Endpoints:
 *   POST /api/player/auth/init            - Create player key identity + session
 *   POST /api/player/auth/transfer/create - Email the pairing code (player_key)
 *   POST /api/player/auth/transfer/use    - Exchange player_key for a new session
 *   POST /api/player/auth/rotate          - Rotate player_key + drop other sessions
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
  PlayerPreferences,
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

// Per-destination-address email rate limiting.
// Keyed by SHA-256(lowercase(email)) to avoid storing addresses in memory.
interface EmailRateEntry {
  lastSentMs: number;
  dailyCount: number;
  dailyDate: string; // YYYY-MM-DD
}

const emailRateLimitMap = new Map<string, EmailRateEntry>();
const EMAIL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between sends to same address
const EMAIL_DAILY_LIMIT = 10; // max 10 emails to same address per day

export function resetEmailRateLimit(): void {
  emailRateLimitMap.clear();
}

/** For tests only: pre-seed a rate limit entry without making real requests. */
export function setEmailRateLimitEntry(
  email: string,
  entry: { lastSentMs: number; dailyCount: number; dailyDate: string },
): void {
  emailRateLimitMap.set(
    createHash('sha256').update(email.toLowerCase()).digest('hex'),
    entry,
  );
}

function checkEmailRateLimit(email: string): {
  allowed: boolean;
  error?: string;
} {
  const key = createHash('sha256').update(email.toLowerCase()).digest('hex');
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const entry = emailRateLimitMap.get(key);

  if (entry) {
    if (now - entry.lastSentMs < EMAIL_COOLDOWN_MS) {
      const waitMinutes = Math.ceil(
        (EMAIL_COOLDOWN_MS - (now - entry.lastSentMs)) / 60_000,
      );
      return {
        allowed: false,
        error: `Odota ${waitMinutes} min ennen uuden linkin lähettämistä`,
      };
    }
    const count = entry.dailyDate === today ? entry.dailyCount : 0;
    if (count >= EMAIL_DAILY_LIMIT) {
      return {
        allowed: false,
        error: 'Päivittäinen rajoitus täynnä, yritä huomenna',
      };
    }
    emailRateLimitMap.set(key, {
      lastSentMs: now,
      dailyCount: count + 1,
      dailyDate: today,
    });
  } else {
    emailRateLimitMap.set(key, {
      lastSentMs: now,
      dailyCount: 1,
      dailyDate: today,
    });
  }
  return { allowed: true };
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
      longest_word: string | null;
      pangrams_found: number;
    }
    const selectStat = db.prepare(
      `SELECT best_rank, best_score, max_score, words_found, hints_used, elapsed_ms,
              longest_word, pangrams_found
       FROM player_stats WHERE player_id = ? AND puzzle_number = ?`,
    );
    const insertStat = db.prepare(
      `INSERT INTO player_stats
         (player_id, puzzle_number, date, best_rank, best_score,
          max_score, words_found, hints_used, elapsed_ms, longest_word, pangrams_found)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const updateStat = db.prepare(
      `UPDATE player_stats SET
         best_rank = ?,
         best_score = MAX(best_score, ?),
         max_score = MAX(max_score, ?),
         words_found = MAX(words_found, ?),
         hints_used = MAX(hints_used, ?),
         elapsed_ms = MAX(elapsed_ms, ?),
         longest_word = ?,
         pangrams_found = MAX(pangrams_found, ?),
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
            r.longest_word ?? null,
            r.pangrams_found ?? 0,
          );
        } else {
          const mergedRank =
            rankIndex(r.best_rank) > rankIndex(existing.best_rank)
              ? r.best_rank
              : existing.best_rank;
          const existingLW = existing.longest_word ?? '';
          const incomingLW = r.longest_word ?? '';
          const mergedLongestWord =
            existingLW.length >= incomingLW.length
              ? existingLW || null
              : incomingLW;
          updateStat.run(
            mergedRank,
            r.best_score,
            r.max_score,
            r.words_found,
            r.hints_used,
            r.elapsed_ms,
            mergedLongestWord,
            r.pangrams_found ?? 0,
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
  preferences: PlayerPreferences | null;
} {
  const db = getDb();
  const statsRows = db
    .prepare(
      `SELECT puzzle_number, date, best_rank, best_score, max_score,
              words_found, hints_used, elapsed_ms, longest_word, pangrams_found
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
    longest_word: string | null;
    pangrams_found: number;
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
        longest_word: r.longest_word ?? undefined,
        pangrams_found: r.pangrams_found,
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
    preferences: readPlayerPreferences(playerId),
  };
}

function readPlayerPreferences(playerId: number): PlayerPreferences | null {
  const db = getDb();
  const row = db
    .prepare('SELECT preferences FROM players WHERE id = ?')
    .get(playerId) as { preferences: string | null } | undefined;
  if (!row?.preferences) return null;
  try {
    return JSON.parse(row.preferences) as PlayerPreferences;
  } catch {
    return null;
  }
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

/**
 * Email the pairing code to the given address. The authenticated device must
 * include its locally-stored `player_key` so the server can verify (via hash)
 * that the sender actually holds the current key, then embed the raw key in
 * the outgoing email. The server never stores the raw key.
 */
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
      // Ignore malformed body and validate below.
    }

    const email = typeof body['email'] === 'string' ? body['email'].trim() : '';
    const playerKey =
      typeof body['player_key'] === 'string' ? body['player_key'].trim() : '';

    if (!playerKey) {
      return c.json({ error: 'Tunniste puuttuu' }, 400);
    }

    const db = getDb();
    const row = db
      .prepare('SELECT player_key_hash FROM players WHERE id = ?')
      .get(playerId) as { player_key_hash: string } | undefined;
    if (!row || row.player_key_hash !== hashToken(playerKey)) {
      return c.json({ error: 'Virheellinen tunniste' }, 400);
    }

    if (!email) {
      return c.json({ error: 'Sähköpostiosoite puuttuu' }, 400);
    }

    const { allowed, error } = checkEmailRateLimit(email);
    if (!allowed) {
      return c.json({ error: error ?? 'Liian monta yritystä' }, 429);
    }

    const baseUrl = process.env.BASE_URL || 'https://sanakenno.fi';
    await sendTransferLink(email, playerKey, baseUrl).catch((err: unknown) => {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Transfer link email failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });

    return c.json({ status: 'ok' });
  },
);

/**
 * Pair this (unauthenticated) device to an existing player by its stable
 * player_key. Verifies by hash, upserts any local data the client is bringing
 * in, and mints a fresh 90-day session for the new device.
 */
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
    return c.json({ error: 'Tunniste puuttuu' }, 400);
  }

  const db = getDb();
  const row = db
    .prepare('SELECT id FROM players WHERE player_key_hash = ?')
    .get(hashToken(rawToken)) as { id: number } | undefined;
  if (!row) {
    return c.json({ error: 'Virheellinen tunniste' }, 400);
  }

  const playerId = row.id;
  bulkUpsertLocalData(
    playerId,
    body['stats'] as PlayerStats | undefined,
    body['puzzle_states'] as SyncPuzzleState[] | undefined,
  );
  cleanupExpiredPlayerSessions();
  const token = createPlayerSession(playerId);
  return c.json({
    token,
    player_id: playerId,
    ...fetchPlayerData(playerId),
  });
});

/**
 * Rotate the authenticated player's pairing code. Generates a new player_key,
 * updates the hash, and deletes all other sessions for this player so that
 * previously-paired devices fall back to anonymous init on their next request.
 * The current session is preserved.
 */
player.post('/auth/rotate', requirePlayer, (c) => {
  const { playerId } = c.get('player');
  const currentToken = c.get('playerToken');
  const newKey = randomBytes(32).toString('hex');
  const newHash = hashToken(newKey);
  const db = getDb();
  db.prepare(
    "UPDATE players SET player_key_hash = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(newHash, playerId);
  db.prepare('DELETE FROM player_sessions WHERE player_id = ? AND id != ?').run(
    playerId,
    currentToken,
  );
  return c.json({ player_key: newKey });
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
