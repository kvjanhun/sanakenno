/**
 * Player data sync routes.
 *
 * All endpoints require a valid Bearer token (requirePlayer middleware).
 *
 * Endpoints:
 *   GET  /api/player/sync             - Pull all server data for this player
 *   POST /api/player/sync/stats       - Push a single stats record (upsert with merge)
 *   POST /api/player/sync/state       - Push a single puzzle state (upsert)
 *   POST /api/player/sync/progress    - Push state + derived stats in one transaction
 *   POST /api/player/sync/preferences - Push display preferences (last-write-wins)
 *
 * @module server/routes/player-sync
 */

import { Hono } from 'hono';
import { getDb } from '../db/connection';
import { requirePlayer, type PlayerVariables } from '../player-auth/middleware';
import { getPuzzleBySlot } from '../puzzle-engine';
import {
  isPangram,
  mergePuzzleState,
  mergeStatsRecord,
  rankForScore,
  THEME_IDS,
  type PlayerPreferences,
  type StatsRecord,
  type SyncProgressPayload,
  type SyncPuzzleState,
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

interface ExistingStatRow {
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

interface ExistingStateRow {
  found_words: string;
  score: number;
  hints_unlocked: string;
  started_at: number;
  total_paused_ms: number;
  score_before_hints: number | null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function readPuzzleState(
  db: ReturnType<typeof getDb>,
  playerId: number,
  puzzleNumber: number,
): SyncPuzzleState | undefined {
  const existing = db
    .prepare(
      `SELECT found_words, score, hints_unlocked, started_at, total_paused_ms, score_before_hints
       FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = ?`,
    )
    .get(playerId, puzzleNumber) as ExistingStateRow | undefined;

  if (!existing) return undefined;

  return {
    puzzle_number: puzzleNumber,
    found_words: JSON.parse(existing.found_words) as string[],
    score: existing.score,
    hints_unlocked: JSON.parse(existing.hints_unlocked) as string[],
    started_at: existing.started_at,
    total_paused_ms: existing.total_paused_ms,
    score_before_hints: existing.score_before_hints,
  };
}

function writePuzzleState(
  db: ReturnType<typeof getDb>,
  playerId: number,
  state: SyncPuzzleState,
  exists: boolean,
): void {
  if (!exists) {
    db.prepare(
      `INSERT INTO player_puzzle_states
         (player_id, puzzle_number, found_words, score, hints_unlocked,
          started_at, total_paused_ms, score_before_hints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      playerId,
      state.puzzle_number,
      JSON.stringify(state.found_words),
      state.score,
      JSON.stringify(state.hints_unlocked),
      state.started_at,
      state.total_paused_ms,
      state.score_before_hints,
    );
    return;
  }

  db.prepare(
    `UPDATE player_puzzle_states SET
       found_words = ?, score = ?, hints_unlocked = ?,
       started_at = ?, total_paused_ms = ?, score_before_hints = ?,
       updated_at = datetime('now')
     WHERE player_id = ? AND puzzle_number = ?`,
  ).run(
    JSON.stringify(state.found_words),
    state.score,
    JSON.stringify(state.hints_unlocked),
    state.started_at,
    state.total_paused_ms,
    state.score_before_hints,
    playerId,
    state.puzzle_number,
  );
}

function mergeAndStorePuzzleState(
  db: ReturnType<typeof getDb>,
  playerId: number,
  incoming: SyncPuzzleState,
): SyncPuzzleState {
  const existing = readPuzzleState(db, playerId, incoming.puzzle_number);
  const merged = existing ? mergePuzzleState(existing, incoming) : incoming;
  writePuzzleState(db, playerId, merged, Boolean(existing));
  return merged;
}

function readStatsRecord(
  db: ReturnType<typeof getDb>,
  playerId: number,
  puzzleNumber: number,
): StatsRecord | undefined {
  const existing = db
    .prepare(
      `SELECT date, best_rank, best_score, max_score, words_found, hints_used, elapsed_ms,
              longest_word, pangrams_found
       FROM player_stats WHERE player_id = ? AND puzzle_number = ?`,
    )
    .get(playerId, puzzleNumber) as ExistingStatRow | undefined;

  if (!existing) return undefined;

  return {
    puzzle_number: puzzleNumber,
    date: existing.date,
    best_rank: existing.best_rank,
    best_score: existing.best_score,
    max_score: existing.max_score,
    words_found: existing.words_found,
    hints_used: existing.hints_used,
    elapsed_ms: existing.elapsed_ms,
    longest_word: existing.longest_word ?? undefined,
    pangrams_found: existing.pangrams_found,
  };
}

function writeStatsRecord(
  db: ReturnType<typeof getDb>,
  playerId: number,
  record: StatsRecord,
  exists: boolean,
): void {
  if (!exists) {
    db.prepare(
      `INSERT INTO player_stats
         (player_id, puzzle_number, date, best_rank, best_score,
          max_score, words_found, hints_used, elapsed_ms, longest_word, pangrams_found)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      playerId,
      record.puzzle_number,
      record.date,
      record.best_rank,
      record.best_score,
      record.max_score,
      record.words_found,
      record.hints_used,
      record.elapsed_ms,
      record.longest_word ?? null,
      record.pangrams_found ?? 0,
    );
    return;
  }

  db.prepare(
    `UPDATE player_stats SET
       date = ?,
       best_rank = ?,
       best_score = ?,
       max_score = ?,
       words_found = ?,
       hints_used = ?,
       elapsed_ms = ?,
       longest_word = ?,
       pangrams_found = ?,
       updated_at = datetime('now')
     WHERE player_id = ? AND puzzle_number = ?`,
  ).run(
    record.date,
    record.best_rank,
    record.best_score,
    record.max_score,
    record.words_found,
    record.hints_used,
    record.elapsed_ms,
    record.longest_word ?? null,
    record.pangrams_found ?? 0,
    playerId,
    record.puzzle_number,
  );
}

function mergeAndStoreStatsRecord(
  db: ReturnType<typeof getDb>,
  playerId: number,
  incoming: StatsRecord,
): StatsRecord {
  const existing = readStatsRecord(db, playerId, incoming.puzzle_number);
  const merged = existing
    ? {
        ...mergeStatsRecord(existing, incoming),
        max_score: Math.max(existing.max_score, incoming.max_score),
      }
    : incoming;
  writeStatsRecord(db, playerId, merged, Boolean(existing));
  return merged;
}

function deriveStatsFromProgress(
  payload: SyncProgressPayload,
  mergedState: SyncPuzzleState,
): StatsRecord {
  const puzzle = getPuzzleBySlot(payload.puzzle_number);
  const allLetters = puzzle
    ? new Set<string>([puzzle.center, ...puzzle.letters])
    : new Set<string>();
  const maxScore =
    payload.max_score > 0 ? payload.max_score : (puzzle?.max_score ?? 0);
  const longestWord = mergedState.found_words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    '',
  );
  const pangramsFound =
    allLetters.size > 0
      ? mergedState.found_words.filter((word) => isPangram(word, allLetters))
          .length
      : 0;
  const elapsedMs =
    mergedState.started_at > 0
      ? Math.max(
          0,
          Date.now() - mergedState.started_at - mergedState.total_paused_ms,
        )
      : 0;

  return {
    puzzle_number: payload.puzzle_number,
    date: payload.date,
    best_rank: rankForScore(mergedState.score, maxScore),
    best_score: mergedState.score,
    max_score: maxScore,
    words_found: mergedState.found_words.length,
    hints_used: mergedState.hints_unlocked.length,
    elapsed_ms: elapsedMs,
    longest_word: longestWord,
    pangrams_found: pangramsFound,
  };
}

function sanitizeProgressPayload(
  body: Record<string, unknown>,
): SyncProgressPayload | null {
  const puzzleNumber = body['puzzle_number'];
  const date = body['date'];
  const foundWords = body['found_words'];
  const score = body['score'];
  const hintsUnlocked = body['hints_unlocked'];
  const startedAt = body['started_at'];
  const totalPausedMs = body['total_paused_ms'];
  const scoreBeforeHints = body['score_before_hints'];
  const maxScore = body['max_score'];

  if (
    typeof puzzleNumber !== 'number' ||
    typeof date !== 'string' ||
    !isStringArray(foundWords) ||
    typeof score !== 'number' ||
    !isStringArray(hintsUnlocked) ||
    typeof startedAt !== 'number' ||
    typeof totalPausedMs !== 'number' ||
    !(scoreBeforeHints === null || typeof scoreBeforeHints === 'number') ||
    typeof maxScore !== 'number'
  ) {
    return null;
  }

  return {
    puzzle_number: puzzleNumber,
    date,
    found_words: foundWords,
    score,
    hints_unlocked: hintsUnlocked,
    started_at: startedAt,
    total_paused_ms: totalPausedMs,
    score_before_hints: scoreBeforeHints,
    max_score: maxScore,
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
  mergeAndStoreStatsRecord(db, playerId, {
    puzzle_number,
    date,
    best_rank,
    best_score: best_score ?? 0,
    max_score: max_score ?? 0,
    words_found: words_found ?? 0,
    hints_used: hints_used ?? 0,
    elapsed_ms: elapsed_ms ?? 0,
    longest_word: longest_word ?? undefined,
    pangrams_found,
  });

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
  mergeAndStorePuzzleState(db, playerId, {
    puzzle_number,
    found_words,
    score: score ?? 0,
    hints_unlocked: hints_unlocked ?? [],
    started_at: started_at ?? 0,
    total_paused_ms: total_paused_ms ?? 0,
    score_before_hints: score_before_hints ?? null,
  });

  return c.json({ status: 'synced' });
});

// ---------------------------------------------------------------------------
// POST /api/player/sync/progress — upsert state and derived stats together
// ---------------------------------------------------------------------------

sync.post('/progress', async (c) => {
  const { playerId } = c.get('player');
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }

  const payload = sanitizeProgressPayload(body);
  if (!payload) {
    return c.json({ error: 'Virheellinen pyyntö' }, 400);
  }

  const db = getDb();
  db.transaction(() => {
    const mergedState = mergeAndStorePuzzleState(db, playerId, payload);
    const derivedStats = deriveStatsFromProgress(payload, mergedState);
    mergeAndStoreStatsRecord(db, playerId, derivedStats);
  })();

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
