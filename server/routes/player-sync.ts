/**
 * Player data sync routes.
 *
 * All endpoints require a valid Bearer token (requirePlayer middleware).
 *
 * Endpoints:
 *   GET  /api/player/sync             - Pull all server data for this player
 *   POST /api/player/sync/stats       - Push a single stats record (upsert with merge)
 *   POST /api/player/sync/state       - Push a single puzzle state (upsert)
 *   POST /api/player/sync/preferences - Push display preferences (last-write-wins)
 *
 * @module server/routes/player-sync
 */

import { Hono } from 'hono';
import { getDb } from '../db/connection';
import { requirePlayer, type PlayerVariables } from '../player-auth/middleware';
import {
  rankIndex,
  THEME_IDS,
  type PlayerPreferences,
  type ThemeId,
  type ThemePreference,
} from '@sanakenno/shared';

function readPreferences(
  db: ReturnType<typeof getDb>,
  playerId: number,
): PlayerPreferences | null {
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

function sanitizePreferences(
  body: Record<string, unknown>,
): PlayerPreferences | null {
  const themeIdRaw = body['themeId'];
  const themePrefRaw = body['themePreference'];
  const updatedAtRaw = body['updated_at'];

  let themeId: ThemeId | undefined;
  if (
    typeof themeIdRaw === 'string' &&
    (THEME_IDS as readonly string[]).includes(themeIdRaw)
  ) {
    themeId = themeIdRaw as ThemeId;
  }

  let themePreference: ThemePreference | undefined;
  if (
    themePrefRaw === 'light' ||
    themePrefRaw === 'dark' ||
    themePrefRaw === 'system'
  ) {
    themePreference = themePrefRaw;
  }

  if (typeof updatedAtRaw !== 'string') return null;
  if (Number.isNaN(Date.parse(updatedAtRaw))) return null;

  return {
    themeId,
    themePreference,
    updated_at: updatedAtRaw,
  };
}

const sync = new Hono<{ Variables: PlayerVariables }>();

// All sync endpoints require auth
sync.use('*', requirePlayer);

// ---------------------------------------------------------------------------
// GET /api/player/sync — return all server data for the authenticated player
// ---------------------------------------------------------------------------

sync.get('/', (c) => {
  const { playerId } = c.get('player');
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
    longest_word: string | null;
    pangrams_found: number;
  }

  interface StateRow {
    puzzle_number: number;
    found_words: string;
    score: number;
    hints_unlocked: string;
    started_at: number;
    total_paused_ms: number;
    score_before_hints: number | null;
  }

  const statsRows = db
    .prepare(
      `SELECT puzzle_number, date, best_rank, best_score, max_score,
              words_found, hints_used, elapsed_ms, longest_word, pangrams_found
       FROM player_stats WHERE player_id = ?`,
    )
    .all(playerId) as StatRow[];

  const stateRows = db
    .prepare(
      `SELECT puzzle_number, found_words, score, hints_unlocked,
              started_at, total_paused_ms, score_before_hints
       FROM player_puzzle_states WHERE player_id = ?`,
    )
    .all(playerId) as StateRow[];

  const preferences = readPreferences(db, playerId);

  return c.json({
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
    preferences,
  });
});

// ---------------------------------------------------------------------------
// POST /api/player/sync/stats — upsert a single stats record with merge logic
// ---------------------------------------------------------------------------

sync.post('/stats', async (c) => {
  const { playerId } = c.get('player');
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }

  const puzzle_number = body['puzzle_number'] as number | undefined;
  const date = body['date'] as string | undefined;
  const best_rank = body['best_rank'] as string | undefined;
  const best_score = body['best_score'] as number | undefined;
  const max_score = body['max_score'] as number | undefined;
  const words_found = body['words_found'] as number | undefined;
  const hints_used = body['hints_used'] as number | undefined;
  const elapsed_ms = body['elapsed_ms'] as number | undefined;
  const longest_word =
    typeof body['longest_word'] === 'string' ? body['longest_word'] : null;
  const pangrams_found =
    typeof body['pangrams_found'] === 'number' ? body['pangrams_found'] : 0;

  if (
    typeof puzzle_number !== 'number' ||
    typeof date !== 'string' ||
    typeof best_rank !== 'string' ||
    typeof best_score !== 'number'
  ) {
    return c.json({ error: 'Virheellinen pyyntö' }, 400);
  }

  const db = getDb();

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

  const existing = db
    .prepare(
      `SELECT best_rank, best_score, max_score, words_found, hints_used, elapsed_ms,
              longest_word, pangrams_found
       FROM player_stats WHERE player_id = ? AND puzzle_number = ?`,
    )
    .get(playerId, puzzle_number) as ExistingStatRow | undefined;

  if (!existing) {
    // First record — insert directly
    db.prepare(
      `INSERT INTO player_stats
         (player_id, puzzle_number, date, best_rank, best_score,
          max_score, words_found, hints_used, elapsed_ms, longest_word, pangrams_found)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      playerId,
      puzzle_number,
      date,
      best_rank,
      best_score ?? 0,
      max_score ?? 0,
      words_found ?? 0,
      hints_used ?? 0,
      elapsed_ms ?? 0,
      longest_word,
      pangrams_found,
    );
  } else {
    // Merge: take best of server and incoming
    const mergedRank =
      rankIndex(best_rank) > rankIndex(existing.best_rank)
        ? best_rank
        : existing.best_rank;
    const existingLW = existing.longest_word ?? '';
    const incomingLW = longest_word ?? '';
    const mergedLongestWord =
      existingLW.length >= incomingLW.length ? existingLW || null : incomingLW;

    db.prepare(
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
    ).run(
      mergedRank,
      best_score ?? 0,
      max_score ?? 0,
      words_found ?? 0,
      hints_used ?? 0,
      elapsed_ms ?? 0,
      mergedLongestWord || null,
      pangrams_found,
      playerId,
      puzzle_number,
    );
  }

  return c.json({ status: 'synced' });
});

// ---------------------------------------------------------------------------
// POST /api/player/sync/state — upsert a puzzle state (merged with any existing row)
// ---------------------------------------------------------------------------

sync.post('/state', async (c) => {
  const { playerId } = c.get('player');
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }

  const puzzle_number = body['puzzle_number'] as number | undefined;
  const found_words = body['found_words'] as string[] | undefined;
  const score = body['score'] as number | undefined;
  const hints_unlocked = body['hints_unlocked'] as string[] | undefined;
  const started_at = body['started_at'] as number | undefined;
  const total_paused_ms = body['total_paused_ms'] as number | undefined;
  const score_before_hints = body['score_before_hints'] as
    | number
    | null
    | undefined;

  if (typeof puzzle_number !== 'number' || !Array.isArray(found_words)) {
    return c.json({ error: 'Virheellinen pyyntö' }, 400);
  }

  const db = getDb();

  interface ExistingStateRow {
    found_words: string;
    score: number;
    hints_unlocked: string;
    started_at: number;
    total_paused_ms: number;
    score_before_hints: number | null;
  }

  const existing = db
    .prepare(
      `SELECT found_words, score, hints_unlocked, started_at, total_paused_ms, score_before_hints
       FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = ?`,
    )
    .get(playerId, puzzle_number) as ExistingStateRow | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO player_puzzle_states
         (player_id, puzzle_number, found_words, score, hints_unlocked,
          started_at, total_paused_ms, score_before_hints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      playerId,
      puzzle_number,
      JSON.stringify(found_words),
      score ?? 0,
      JSON.stringify(hints_unlocked ?? []),
      started_at ?? 0,
      total_paused_ms ?? 0,
      score_before_hints ?? null,
    );
  } else {
    const mergedWords = [
      ...new Set([
        ...(JSON.parse(existing.found_words) as string[]),
        ...(found_words ?? []),
      ]),
    ];
    const mergedHints = [
      ...new Set([
        ...(JSON.parse(existing.hints_unlocked) as string[]),
        ...(hints_unlocked ?? []),
      ]),
    ];
    const mergedScore = Math.max(existing.score, score ?? 0);
    const incomingStarted = started_at ?? 0;
    const mergedStartedAt =
      existing.started_at && incomingStarted
        ? Math.min(existing.started_at, incomingStarted)
        : existing.started_at || incomingStarted;
    const mergedPausedMs = Math.max(
      existing.total_paused_ms,
      total_paused_ms ?? 0,
    );
    const mergedScoreBefore =
      existing.score_before_hints ?? score_before_hints ?? null;
    db.prepare(
      `UPDATE player_puzzle_states SET
         found_words = ?, score = ?, hints_unlocked = ?,
         started_at = ?, total_paused_ms = ?, score_before_hints = ?,
         updated_at = datetime('now')
       WHERE player_id = ? AND puzzle_number = ?`,
    ).run(
      JSON.stringify(mergedWords),
      mergedScore,
      JSON.stringify(mergedHints),
      mergedStartedAt,
      mergedPausedMs,
      mergedScoreBefore,
      playerId,
      puzzle_number,
    );
  }

  return c.json({ status: 'synced' });
});

// ---------------------------------------------------------------------------
// POST /api/player/sync/preferences — upsert display preferences
// Last-write-wins by `updated_at`; server silently keeps its value when newer.
// ---------------------------------------------------------------------------

sync.post('/preferences', async (c) => {
  const { playerId } = c.get('player');
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }

  const incoming = sanitizePreferences(body);
  if (!incoming) {
    return c.json({ error: 'Virheellinen pyyntö' }, 400);
  }

  const db = getDb();
  const existing = readPreferences(db, playerId);

  // Keep the server value if it is newer than the incoming one.
  if (
    existing &&
    Date.parse(existing.updated_at) > Date.parse(incoming.updated_at)
  ) {
    return c.json({ status: 'kept', preferences: existing });
  }

  db.prepare(
    `UPDATE players SET preferences = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(JSON.stringify(incoming), playerId);

  return c.json({ status: 'synced', preferences: incoming });
});

export default sync;
