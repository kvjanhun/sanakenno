/**
 * Cross-device progress sync over the real API: full pull, merge-on-push
 * stats, puzzle state replacement, combined progress push (with busy-retry),
 * and the first-pair local upload.
 *
 * Replaces the former sync.feature BDD scenarios; the client-side merge
 * rules themselves are covered in tests/sync-merge.test.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import type BetterSqlite3 from 'better-sqlite3';
import app from '../../server/index';
import { getDb, setDb, closeDb } from '../../server/db/connection';
import { setWordlist, invalidateAll } from '../../server/puzzle-engine';
import { createPlayerSession } from '../../server/player-auth/session';
import {
  isStatsRecordBetterThanServer,
  isPuzzleStateBetterThanServer,
} from '@sanakenno/shared';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function bearer(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function insertPlayer(playerKeyHash: string): number {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO players (player_key_hash) VALUES (?)').run(
    playerKeyHash,
  );
  return (
    db
      .prepare('SELECT id FROM players WHERE player_key_hash = ?')
      .get(playerKeyHash) as { id: number }
  ).id;
}

function makeStatsRecord(
  puzzleNumber: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    puzzle_number: puzzleNumber,
    date: '2026-04-10',
    best_rank: 'Onnistuja',
    best_score: 30,
    max_score: 100,
    words_found: 5,
    hints_used: 0,
    elapsed_ms: 60000,
    ...overrides,
  };
}

/** Seed a server-side stats row directly, mirroring production columns. */
function seedServerStats(
  playerId: number,
  puzzleNumber: number,
  overrides: Record<string, unknown> = {},
): void {
  const row = {
    date: '2026-04-10',
    best_rank: 'Onnistuja',
    best_score: 30,
    max_score: 100,
    words_found: 5,
    hints_used: 0,
    elapsed_ms: 60000,
    longest_word: null as string | null,
    pangrams_found: 0,
    best_no_hint_score: 0,
    ...overrides,
  };
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO player_stats
        (player_id, puzzle_number, date, best_rank, best_score, max_score,
         words_found, hints_used, elapsed_ms, longest_word, pangrams_found,
         best_no_hint_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      playerId,
      puzzleNumber,
      row.date,
      row.best_rank,
      row.best_score,
      row.max_score,
      row.words_found,
      row.hints_used,
      row.elapsed_ms,
      row.longest_word,
      row.pangrams_found,
      row.best_no_hint_score,
    );
}

function serverStats(
  playerId: number,
  puzzleNumber: number,
): Record<string, unknown> | undefined {
  return getDb()
    .prepare(
      'SELECT * FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
    )
    .get(playerId, puzzleNumber) as Record<string, unknown> | undefined;
}

async function pushStats(
  token: string,
  record: Record<string, unknown>,
): Promise<Response> {
  return app.request('/api/player/sync/stats', {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(record),
  });
}

function progressBody(
  puzzleNumber: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    puzzle_number: puzzleNumber,
    date: '2026-04-10',
    found_words: ['kala', 'sanka'],
    score: 6,
    hints_unlocked: [],
    started_at: Date.now() - 60_000,
    total_paused_ms: 0,
    score_before_hints: null,
    max_score: 20,
    ...overrides,
  };
}

/** Fail the first write transaction with SQLITE_BUSY, then behave normally. */
function wrapWithTransientBusyWrite(
  db: BetterSqlite3.Database,
): BetterSqlite3.Database {
  let shouldFail = true;
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'exec') {
        return (sql: string) => {
          if (shouldFail && /^\s*BEGIN\s+IMMEDIATE\b/i.test(sql)) {
            shouldFail = false;
            const error = new Error('database is locked') as Error & {
              code: string;
            };
            error.code = 'SQLITE_BUSY';
            throw error;
          }
          return target.exec(sql);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as BetterSqlite3.Database;
}

let playerId: number;
let token: string;

beforeEach(() => {
  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });
  invalidateAll();
  db.prepare(
    'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
  ).run(42, 'a,e,k,l,n,s,t', 'a');
  setWordlist(new Set(['kala', 'sanka', 'laskenta']));

  playerId = insertPlayer(sha256(`player-${Date.now()}-${Math.random()}`));
  token = createPlayerSession(playerId);
});

afterEach(() => {
  invalidateAll();
  closeDb();
  setDb(null);
});

describe('GET /api/player/sync', () => {
  it('returns all server-side data', async () => {
    for (let i = 1; i <= 3; i++) seedServerStats(playerId, i);
    const res = await app.request('/api/player/sync', {
      headers: bearer(token),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.records).toHaveLength(3);
    expect(Array.isArray(json.puzzle_states)).toBe(true);
  });

  it('returns empty arrays for a new player', async () => {
    const res = await app.request('/api/player/sync', {
      headers: bearer(token),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.records).toHaveLength(0);
    expect(json.puzzle_states).toHaveLength(0);
  });

  it('requires authentication', async () => {
    const res = await app.request('/api/player/sync');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/player/sync/stats', () => {
  it('stores a new stats record', async () => {
    const res = await pushStats(token, makeStatsRecord(42));
    expect(res.status).toBe(200);
    expect(serverStats(playerId, 42)).toBeDefined();
  });

  it.each([
    // [seed overrides, push overrides, column, expected]
    [
      { best_rank: 'Onnistuja' },
      { best_rank: 'Sanavalmis' },
      'best_rank',
      'Sanavalmis',
    ],
    [
      { best_rank: 'Sanavalmis' },
      { best_rank: 'Onnistuja' },
      'best_rank',
      'Sanavalmis',
    ],
    [{ best_score: 50 }, { best_score: 80 }, 'best_score', 80],
    [{ best_score: 80 }, { best_score: 50 }, 'best_score', 80],
    [
      { longest_word: 'kala' },
      { longest_word: 'lakana' },
      'longest_word',
      'lakana',
    ],
    [
      { longest_word: 'lakana' },
      { longest_word: 'kala' },
      'longest_word',
      'lakana',
    ],
    [{ pangrams_found: 1 }, { pangrams_found: 3 }, 'pangrams_found', 3],
    [{ pangrams_found: 3 }, { pangrams_found: 1 }, 'pangrams_found', 3],
    [
      { best_no_hint_score: 70 },
      { best_no_hint_score: 50 },
      'best_no_hint_score',
      70,
    ],
  ])(
    'merges server %o with pushed %o → %s = %o',
    async (seed, push, column, expected) => {
      seedServerStats(playerId, 10, seed);
      const res = await pushStats(token, makeStatsRecord(10, push));
      expect(res.status).toBe(200);
      expect(serverStats(playerId, 10)![column]).toBe(expected);
    },
  );

  it('stores longest_word, pangrams_found, and best_no_hint_score on first push', async () => {
    const res = await pushStats(
      token,
      makeStatsRecord(42, {
        longest_word: 'sanake',
        pangrams_found: 2,
        best_no_hint_score: 70,
      }),
    );
    expect(res.status).toBe(200);
    const row = serverStats(playerId, 42)!;
    expect(row.longest_word).toBe('sanake');
    expect(row.pangrams_found).toBe(2);
    expect(row.best_no_hint_score).toBe(70);
  });

  it('requires authentication', async () => {
    const res = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeStatsRecord(42)),
    });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid body', async () => {
    const res = await pushStats(token, { nonsense: true });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/player/sync/state', () => {
  async function pushState(words: string[]): Promise<Response> {
    return app.request('/api/player/sync/state', {
      method: 'POST',
      headers: bearer(token),
      body: JSON.stringify({
        puzzle_number: 42,
        found_words: words,
        score: words.length * 5,
        hints_unlocked: [],
        started_at: 0,
        total_paused_ms: 0,
        score_before_hints: null,
      }),
    });
  }

  it('stores a puzzle state', async () => {
    const res = await pushState(['kala']);
    expect(res.status).toBe(200);
    const row = getDb()
      .prepare(
        'SELECT found_words FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = 42',
      )
      .get(playerId) as { found_words: string };
    expect(JSON.parse(row.found_words)).toEqual(['kala']);
  });

  it('replaces the previous state', async () => {
    await pushState(['w0', 'w1', 'w2']);
    const res = await pushState(['w0', 'w1', 'w2', 'w3', 'w4']);
    expect(res.status).toBe(200);
    const row = getDb()
      .prepare(
        'SELECT found_words FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = 42',
      )
      .get(playerId) as { found_words: string };
    expect(JSON.parse(row.found_words)).toHaveLength(5);
  });

  it('requires authentication', async () => {
    const res = await app.request('/api/player/sync/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle_number: 42, found_words: [] }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid body', async () => {
    const res = await app.request('/api/player/sync/state', {
      method: 'POST',
      headers: bearer(token),
      body: JSON.stringify({ nonsense: true }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/player/sync/progress', () => {
  async function pushProgress(
    body: Record<string, unknown>,
  ): Promise<Response> {
    return app.request('/api/player/sync/progress', {
      method: 'POST',
      headers: bearer(token),
      body: JSON.stringify(body),
    });
  }

  it('stores puzzle state and derived stats', async () => {
    const res = await pushProgress(progressBody(42));
    expect(res.status).toBe(200);
    const state = getDb()
      .prepare(
        'SELECT * FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = 42',
      )
      .get(playerId);
    expect(state).toBeDefined();
    expect(serverStats(playerId, 42)!.best_score).toBe(6);
  });

  it('derives longest word and pangrams from found words', async () => {
    const res = await pushProgress(
      progressBody(42, { found_words: ['laskenta'], score: 15, max_score: 43 }),
    );
    expect(res.status).toBe(200);
    const row = serverStats(playerId, 42)!;
    expect(row.longest_word).toBe('laskenta');
    expect(row.pangrams_found).toBe(1);
  });

  it('derives the no-hint score from the puzzle state', async () => {
    const res = await pushProgress(
      progressBody(42, { score: 70, max_score: 100 }),
    );
    expect(res.status).toBe(200);
    expect(serverStats(playerId, 42)!.best_no_hint_score).toBe(70);
  });

  it('retries after a transient database lock', async () => {
    setDb(wrapWithTransientBusyWrite(getDb()));
    const res = await pushProgress(progressBody(42));
    expect(res.status).toBe(200);
    expect(serverStats(playerId, 42)).toBeDefined();
  });

  it('requires authentication', async () => {
    const res = await app.request('/api/player/sync/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressBody(42)),
    });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid body', async () => {
    const res = await pushProgress({ nonsense: true });
    expect(res.status).toBe(400);
  });
});

describe('client push-back decisions', () => {
  it('selects stale same-puzzle server records for push-back', () => {
    const serverRecord = {
      puzzle_number: 12,
      date: '2026-04-10',
      best_rank: 'Hyvä alku',
      best_score: 10,
      max_score: 100,
      words_found: 2,
      hints_used: 0,
      elapsed_ms: 30_000,
      longest_word: 'kala',
      pangrams_found: 0,
    };
    const localRecord = {
      ...serverRecord,
      best_rank: 'Onnistuja',
      best_score: 30,
      words_found: 4,
      hints_used: 1,
      elapsed_ms: 45_000,
      longest_word: 'lakana',
      pangrams_found: 1,
    };
    expect(isStatsRecordBetterThanServer(localRecord, serverRecord)).toBe(true);

    const serverState = {
      puzzle_number: 12,
      found_words: ['kala'],
      score: 10,
      hints_unlocked: [],
      started_at: 1_800_000_000_000,
      total_paused_ms: 0,
      score_before_hints: null,
    };
    const localState = {
      ...serverState,
      found_words: ['kala', 'sanka'],
      score: 30,
      hints_unlocked: ['summary'],
      started_at: 1_700_000_000_000,
      total_paused_ms: 5_000,
      score_before_hints: 20,
    };
    expect(isPuzzleStateBetterThanServer(localState, serverState)).toBe(true);
  });
});

describe('first-time pair upload', () => {
  it('uploads local stats to the server when pairing', async () => {
    const rawKey = randomBytes(32).toString('hex');
    const newPlayerId = insertPlayer(sha256(rawKey));
    const stats = {
      records: Array.from({ length: 5 }, (_, i) => makeStatsRecord(i + 1)),
      version: 1,
    };
    const res = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawKey, stats, puzzle_states: [] }),
    });
    expect(res.status).toBe(200);
    const count = getDb()
      .prepare('SELECT COUNT(*) as count FROM player_stats WHERE player_id = ?')
      .get(newPlayerId) as { count: number };
    expect(count.count).toBe(5);
  });
});
