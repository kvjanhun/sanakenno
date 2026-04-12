/**
 * BDD step definitions for sync.feature.
 *
 * Tests server-side sync endpoints: pull, push stats, push state.
 * All scenarios use in-memory SQLite and a pre-created player with a
 * valid Bearer token.
 */

import {
  Given,
  When,
  Then,
  Before,
  After,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import app from '../../server/index';
import { getDb, closeDb, setDb } from '../../server/db/connection';
import { invalidateAll, setWordlist } from '../../server/puzzle-engine';
import { createPlayerSession } from '../../server/player-auth/session';
import type { SanakennoWorld } from './types';

interface SyncWorld extends SanakennoWorld {
  playerBearerToken: string | null;
  lastPlayerId: number | null;
  _uploadRawToken?: string;
}

function bearerHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Insert a player directly and return their id. */
function insertPlayer(playerKeyHash: string): number {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO players (player_key_hash) VALUES (?)').run(
    playerKeyHash,
  );
  interface Row {
    id: number;
  }
  return (
    db
      .prepare('SELECT id FROM players WHERE player_key_hash = ?')
      .get(playerKeyHash) as Row
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

// ---------------------------------------------------------------------------

Before(function (this: SyncWorld, scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('sync.feature')) return;

  process.env['RESEND_API_KEY'] = 'test';

  closeDb();
  setDb(null);
  getDb({ inMemory: true });
  invalidateAll();
  setWordlist(new Set(['kala', 'sanka']));

  this.playerBearerToken = null;
  this.lastPlayerId = null;
  this.responses = [];
});

After(function (scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('sync.feature')) return;

  invalidateAll();
  closeDb();
  setDb(null);
});

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given(
  'a registered player identity and a valid Bearer token',
  function (this: SyncWorld) {
    const playerId = insertPlayer(sha256(`player-${Date.now()}`));
    const token = createPlayerSession(playerId);
    this.playerBearerToken = token;
    this.lastPlayerId = playerId;
  },
);

Given(
  'the player has {int} stats records on the server',
  function (this: SyncWorld, count: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO player_stats
        (player_id, puzzle_number, date, best_rank, best_score,
         max_score, words_found, hints_used, elapsed_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (let i = 1; i <= count; i++) {
      insert.run(
        this.lastPlayerId,
        i,
        '2026-04-10',
        'Onnistuja',
        20,
        100,
        4,
        0,
        30000,
      );
    }
  },
);

Given(
  'the server has a stats record for puzzle index {int} with rank {string}',
  function (this: SyncWorld, puzzleNumber: number, rank: string) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO player_stats
        (player_id, puzzle_number, date, best_rank, best_score,
         max_score, words_found, hints_used, elapsed_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      this.lastPlayerId,
      puzzleNumber,
      '2026-04-10',
      rank,
      30,
      100,
      5,
      0,
      60000,
    );
  },
);

Given(
  'the server has a stats record for puzzle index {int} with longest_word {string}',
  function (this: SyncWorld, puzzleNumber: number, word: string) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO player_stats
        (player_id, puzzle_number, date, best_rank, best_score,
         max_score, words_found, hints_used, elapsed_ms, longest_word)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      this.lastPlayerId,
      puzzleNumber,
      '2026-04-10',
      'Onnistuja',
      30,
      100,
      5,
      0,
      60000,
      word,
    );
  },
);

Given(
  'the server has a stats record for puzzle index {int} with pangrams_found {int}',
  function (this: SyncWorld, puzzleNumber: number, count: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO player_stats
        (player_id, puzzle_number, date, best_rank, best_score,
         max_score, words_found, hints_used, elapsed_ms, pangrams_found)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      this.lastPlayerId,
      puzzleNumber,
      '2026-04-10',
      'Onnistuja',
      30,
      100,
      5,
      0,
      60000,
      count,
    );
  },
);

Given(
  'the server has a stats record for puzzle index {int} with best_score {int}',
  function (this: SyncWorld, puzzleNumber: number, score: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO player_stats
        (player_id, puzzle_number, date, best_rank, best_score,
         max_score, words_found, hints_used, elapsed_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      this.lastPlayerId,
      puzzleNumber,
      '2026-04-10',
      'Onnistuja',
      score,
      100,
      5,
      0,
      60000,
    );
  },
);

Given(
  'the server has a puzzle state for puzzle index {int} with {int} found words',
  function (this: SyncWorld, puzzleNumber: number, wordCount: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const words = Array.from({ length: wordCount }, (_, i) => `word${i}`);
    const db = getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO player_puzzle_states
        (player_id, puzzle_number, found_words, score, hints_unlocked,
         started_at, total_paused_ms, score_before_hints)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      this.lastPlayerId,
      puzzleNumber,
      JSON.stringify(words),
      wordCount * 5,
      '[]',
      0,
      0,
      null,
    );
  },
);

Given(
  'a new player identity with an unused transfer token',
  function (this: SyncWorld) {
    const playerId = insertPlayer(sha256(`upload-${Date.now()}`));
    this.lastPlayerId = playerId;

    // Create a known transfer token so the When step can use it
    const rawToken = randomBytes(16).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const db = getDb();
    db.prepare(
      'INSERT INTO player_transfer_tokens (player_id, token_hash, expires_at) VALUES (?, ?, ?)',
    ).run(playerId, tokenHash, expiresAt);
    this._uploadRawToken = rawToken;
  },
);

Given(
  'the player has {int} local stats records',
  function (this: SyncWorld, _count: number) {
    // Local stats are provided in the When step — this is a label-only Given
  },
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  /^a GET request is made to \/api\/player\/sync with the Bearer token$/,
  async function (this: SyncWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync', {
      headers: { Authorization: `Bearer ${this.playerBearerToken}` },
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a GET request is made to \/api\/player\/sync without a token$/,
  async function (this: SyncWorld) {
    this.response = await app.request('/api/player/sync');
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats with a stats record for puzzle index (\d+)$/,
  async function (this: SyncWorld, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify(makeStatsRecord(puzzleNumber)),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats with rank "([^"]*)" for puzzle index (\d+)$/,
  async function (this: SyncWorld, rank: string, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify(makeStatsRecord(puzzleNumber, { best_rank: rank })),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats with longest_word "([^"]*)" for puzzle index (\d+)$/,
  async function (this: SyncWorld, word: string, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify(
        makeStatsRecord(puzzleNumber, { longest_word: word }),
      ),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats with pangrams_found (\d+) for puzzle index (\d+)$/,
  async function (this: SyncWorld, count: number, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify(
        makeStatsRecord(puzzleNumber, { pangrams_found: count }),
      ),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats with best_score (\d+) for puzzle index (\d+)$/,
  async function (this: SyncWorld, score: number, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify(
        makeStatsRecord(puzzleNumber, { best_score: score }),
      ),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats without a token$/,
  async function (this: SyncWorld) {
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeStatsRecord(1)),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/stats with an invalid body$/,
  async function (this: SyncWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/stats', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify({ not_a_valid: 'body' }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/state with a state for puzzle index (\d+)$/,
  async function (this: SyncWorld, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/state', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify({
        puzzle_number: puzzleNumber,
        found_words: ['kala', 'sanka'],
        score: 6,
        hints_unlocked: [],
        started_at: Date.now(),
        total_paused_ms: 0,
        score_before_hints: null,
      }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/state with (\d+) found words for puzzle index (\d+)$/,
  async function (this: SyncWorld, wordCount: number, puzzleNumber: number) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    const words = Array.from({ length: wordCount }, (_, i) => `word${i}`);
    this.response = await app.request('/api/player/sync/state', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify({
        puzzle_number: puzzleNumber,
        found_words: words,
        score: wordCount * 5,
        hints_unlocked: [],
        started_at: Date.now(),
        total_paused_ms: 0,
        score_before_hints: null,
      }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/state without a token$/,
  async function (this: SyncWorld) {
    this.response = await app.request('/api/player/sync/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puzzle_number: 1,
        found_words: ['kala'],
        score: 1,
        hints_unlocked: [],
        started_at: 0,
        total_paused_ms: 0,
        score_before_hints: null,
      }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/sync\/state with an invalid body$/,
  async function (this: SyncWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/sync/state', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
      body: JSON.stringify({ not_valid: true }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  'the player uses their transfer token with the local stats included',
  async function (this: SyncWorld) {
    const rawToken = this._uploadRawToken;
    assert.ok(rawToken, 'No upload token in context');

    const stats = {
      records: Array.from({ length: 5 }, (_, i) => ({
        puzzle_number: i + 1,
        date: '2026-04-10',
        best_rank: 'Onnistuja',
        best_score: 20,
        max_score: 100,
        words_found: 4,
        hints_used: 0,
        elapsed_ms: 30000,
      })),
      version: 1,
    };

    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, stats, puzzle_states: [] }),
    });
    this.responseJson = await this.response.clone().json();

    if (this.response.status === 200) {
      interface VerifyBody {
        token: string;
        player_id: number;
      }
      const body = this.responseJson as VerifyBody;
      this.playerBearerToken = body.token;
      this.lastPlayerId = body.player_id;
    }
  },
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

// Note: 'the response status should be {int}' is defined globally in archive.steps.ts

Then(
  'the response stats should contain {int} records',
  function (this: SyncWorld, count: number) {
    interface SyncBody {
      stats: { records: unknown[] };
    }
    const body = this.responseJson as SyncBody;
    assert.equal(body.stats?.records?.length, count);
  },
);

Then(
  'the response should include a {string} array',
  function (this: SyncWorld, field: string) {
    assert.ok(
      Array.isArray((this.responseJson as Record<string, unknown>)[field]),
      `Expected "${field}" to be an array`,
    );
  },
);

Then(
  'the response puzzle_states should contain {int} entries',
  function (this: SyncWorld, count: number) {
    interface SyncBody {
      puzzle_states: unknown[];
    }
    const body = this.responseJson as SyncBody;
    assert.equal(body.puzzle_states?.length, count);
  },
);

Then(
  'the server should have a stats record for puzzle index {int}',
  function (this: SyncWorld, puzzleNumber: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      puzzle_number: number;
    }
    const row = db
      .prepare(
        'SELECT puzzle_number FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
  },
);

Then(
  'the server stats for puzzle index {int} should have rank {string}',
  function (this: SyncWorld, puzzleNumber: number, rank: string) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      best_rank: string;
    }
    const row = db
      .prepare(
        'SELECT best_rank FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.best_rank, rank);
  },
);

Then(
  'the server stats for puzzle index {int} should still have rank {string}',
  function (this: SyncWorld, puzzleNumber: number, rank: string) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      best_rank: string;
    }
    const row = db
      .prepare(
        'SELECT best_rank FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.best_rank, rank);
  },
);

Then(
  'the server stats for puzzle index {int} should have best_score {int}',
  function (this: SyncWorld, puzzleNumber: number, score: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      best_score: number;
    }
    const row = db
      .prepare(
        'SELECT best_score FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.best_score, score);
  },
);

Then(
  'the server stats for puzzle index {int} should still have best_score {int}',
  function (this: SyncWorld, puzzleNumber: number, score: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      best_score: number;
    }
    const row = db
      .prepare(
        'SELECT best_score FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.best_score, score);
  },
);

Then(
  'the server should have a puzzle state for puzzle index {int}',
  function (this: SyncWorld, puzzleNumber: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      puzzle_number: number;
    }
    const row = db
      .prepare(
        'SELECT puzzle_number FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No puzzle state found for puzzle ${puzzleNumber}`);
  },
);

Then(
  'the server should have {int} found words for puzzle index {int}',
  function (this: SyncWorld, wordCount: number, puzzleNumber: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      found_words: string;
    }
    const row = db
      .prepare(
        'SELECT found_words FROM player_puzzle_states WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No puzzle state found for puzzle ${puzzleNumber}`);
    const words = JSON.parse(row.found_words) as string[];
    assert.equal(words.length, wordCount);
  },
);

Then(
  'the server stats for puzzle index {int} should have longest_word {string}',
  function (this: SyncWorld, puzzleNumber: number, word: string) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      longest_word: string | null;
    }
    const row = db
      .prepare(
        'SELECT longest_word FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.longest_word, word);
  },
);

Then(
  'the server stats for puzzle index {int} should still have longest_word {string}',
  function (this: SyncWorld, puzzleNumber: number, word: string) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      longest_word: string | null;
    }
    const row = db
      .prepare(
        'SELECT longest_word FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.longest_word, word);
  },
);

Then(
  'the server stats for puzzle index {int} should have pangrams_found {int}',
  function (this: SyncWorld, puzzleNumber: number, count: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      pangrams_found: number;
    }
    const row = db
      .prepare(
        'SELECT pangrams_found FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.pangrams_found, count);
  },
);

Then(
  'the server stats for puzzle index {int} should still have pangrams_found {int}',
  function (this: SyncWorld, puzzleNumber: number, count: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      pangrams_found: number;
    }
    const row = db
      .prepare(
        'SELECT pangrams_found FROM player_stats WHERE player_id = ? AND puzzle_number = ?',
      )
      .get(this.lastPlayerId, puzzleNumber) as Row | undefined;
    assert.ok(row, `No stats record found for puzzle ${puzzleNumber}`);
    assert.equal(row.pangrams_found, count);
  },
);

Then(
  'the server should have {int} stats records for that player',
  function (this: SyncWorld, count: number) {
    assert.ok(this.lastPlayerId, 'No player in context');
    const db = getDb();
    interface Row {
      cnt: number;
    }
    const row = db
      .prepare('SELECT COUNT(*) as cnt FROM player_stats WHERE player_id = ?')
      .get(this.lastPlayerId) as Row;
    assert.equal(row.cnt, count);
  },
);
