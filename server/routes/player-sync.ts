/**
 * Player data sync routes.
 *
 * All endpoints require a valid Bearer token (requirePlayer middleware).
 *
 * Endpoints:
 *   GET  /api/player/sync         - Pull all server data for this player
 *   POST /api/player/sync/stats   - Push a single stats record (upsert with merge)
 *   POST /api/player/sync/state   - Push a single puzzle state (upsert)
 *
 * @module server/routes/player-sync
 */

import { Hono } from 'hono';
import { getDb } from '../db/connection';
import { requirePlayer, type PlayerVariables } from '../player-auth/middleware';
import { rankIndex } from '@sanakenno/shared';

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
              words_found, hints_used, elapsed_ms
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
  }

  const existing = db
    .prepare(
      `SELECT best_rank, best_score, max_score, words_found, hints_used, elapsed_ms
       FROM player_stats WHERE player_id = ? AND puzzle_number = ?`,
    )
    .get(playerId, puzzle_number) as ExistingStatRow | undefined;

  if (!existing) {
    // First record — insert directly
    db.prepare(
      `INSERT INTO player_stats
         (player_id, puzzle_number, date, best_rank, best_score,
          max_score, words_found, hints_used, elapsed_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    );
  } else {
    // Merge: take best of server and incoming
    const mergedRank =
      rankIndex(best_rank) > rankIndex(existing.best_rank)
        ? best_rank
        : existing.best_rank;

    db.prepare(
      `UPDATE player_stats SET
         best_rank = ?,
         best_score = MAX(best_score, ?),
         max_score = MAX(max_score, ?),
         words_found = MAX(words_found, ?),
         hints_used = MAX(hints_used, ?),
         elapsed_ms = MAX(elapsed_ms, ?),
         updated_at = datetime('now')
       WHERE player_id = ? AND puzzle_number = ?`,
    ).run(
      mergedRank,
      best_score ?? 0,
      max_score ?? 0,
      words_found ?? 0,
      hints_used ?? 0,
      elapsed_ms ?? 0,
      playerId,
      puzzle_number,
    );
  }

  return c.json({ status: 'synced' });
});

// ---------------------------------------------------------------------------
// POST /api/player/sync/state — upsert a puzzle state (last-write-wins)
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
  db.prepare(
    `INSERT OR REPLACE INTO player_puzzle_states
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

  return c.json({ status: 'synced' });
});

export default sync;
