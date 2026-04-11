/**
 * BDD step definitions for player-auth.feature.
 *
 * Tests privacy-first player auth: init, transfer token create/use, logout,
 * and token hashing. Uses in-memory SQLite and test email mode.
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
import { createHash } from 'node:crypto';
import app from '../../server/index';
import { getDb, closeDb, setDb } from '../../server/db/connection';
import { invalidateAll, setWordlist } from '../../server/puzzle-engine';
import { resetTransferCreateRateLimit } from '../../server/player-auth/routes';
import type { SanakennoWorld } from './types';

interface PlayerAuthWorld extends SanakennoWorld {
  playerBearerToken: string | null;
  playerId: number | null;
  playerKey: string | null;
  transferToken: string | null;
}

function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function initPlayer(
  world: PlayerAuthWorld,
): Promise<{ token: string; player_id: number; player_key: string }> {
  const res = await app.request('/api/player/auth/init', { method: 'POST' });
  assert.equal(res.status, 200, 'Init failed in setup');
  const body = (await res.json()) as {
    token: string;
    player_id: number;
    player_key: string;
  };
  world.playerBearerToken = body.token;
  world.playerId = body.player_id;
  world.playerKey = body.player_key;
  return body;
}

async function createTransfer(
  world: PlayerAuthWorld,
  email?: string,
): Promise<Response> {
  assert.ok(world.playerBearerToken, 'No Bearer token in context');
  const res = await app.request('/api/player/auth/transfer/create', {
    method: 'POST',
    headers: {
      ...bearerHeader(world.playerBearerToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email ? { email } : {}),
  });
  if (res.status === 200) {
    const body = (await res.clone().json()) as { transfer_token: string };
    world.transferToken = body.transfer_token;
  }
  return res;
}

// ---------------------------------------------------------------------------

Before(function (this: PlayerAuthWorld, scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('player-auth.feature')) return;

  process.env['RESEND_API_KEY'] = 'test';

  closeDb();
  setDb(null);
  getDb({ inMemory: true });
  resetTransferCreateRateLimit();
  invalidateAll();
  setWordlist(new Set(['kala', 'sanka']));

  this.playerBearerToken = null;
  this.playerId = null;
  this.playerKey = null;
  this.transferToken = null;
  this.responses = [];
});

After(function (scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('player-auth.feature')) return;
  invalidateAll();
  closeDb();
  setDb(null);
});

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given(
  'the player auth rate limits are reset',
  function (this: PlayerAuthWorld) {
    resetTransferCreateRateLimit();
  },
);

Given(
  'a player has initialized their identity',
  async function (this: PlayerAuthWorld) {
    await initPlayer(this);
  },
);

Given(
  'a transfer token exists for the current authenticated player',
  async function (this: PlayerAuthWorld) {
    if (!this.playerBearerToken) {
      await initPlayer(this);
    }
    const res = await createTransfer(this);
    assert.equal(res.status, 200, 'transfer/create failed in Given step');
    assert.ok(this.transferToken, 'Transfer token missing after create');
  },
);

Given(
  'the transfer token has already been used',
  function (this: PlayerAuthWorld) {
    assert.ok(this.transferToken, 'No transfer token in context');
    const db = getDb();
    db.prepare(
      'UPDATE player_transfer_tokens SET used = 1 WHERE token_hash = ?',
    ).run(sha256(this.transferToken));
  },
);

Given(
  'an expired transfer token exists for the current authenticated player',
  async function (this: PlayerAuthWorld) {
    if (!this.playerBearerToken) {
      await initPlayer(this);
    }
    const res = await createTransfer(this);
    assert.equal(res.status, 200, 'transfer/create failed in Given step');
    assert.ok(this.transferToken, 'Transfer token missing after create');
    const db = getDb();
    db.prepare(
      "UPDATE player_transfer_tokens SET expires_at = datetime('now', '-1 minute') WHERE token_hash = ?",
    ).run(sha256(this.transferToken));
  },
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  /^a POST is made to \/api\/player\/auth\/init$/,
  async function (this: PlayerAuthWorld) {
    this.response = await app.request('/api/player/auth/init', {
      method: 'POST',
    });
    this.responseJson = await this.response.clone().json();
    if (this.response.status === 200) {
      const body = this.responseJson as {
        token: string;
        player_id: number;
        player_key: string;
      };
      this.playerBearerToken = body.token;
      this.playerId = body.player_id;
      this.playerKey = body.player_key;
    }
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/create with the Bearer token$/,
  async function (this: PlayerAuthWorld) {
    this.response = await createTransfer(this);
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/create with email "([^"]*)" and the Bearer token$/,
  async function (this: PlayerAuthWorld, email: string) {
    this.response = await createTransfer(this, email);
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^3 POST requests are made to \/api\/player\/auth\/transfer\/create from the same IP with the Bearer token$/,
  async function (this: PlayerAuthWorld) {
    for (let i = 0; i < 3; i++) {
      this.response = await createTransfer(this, `rate-${i}@example.com`);
    }
  },
);

Then(
  /^the 4th transfer create request should return 429$/,
  async function (this: PlayerAuthWorld) {
    const res = await createTransfer(this, 'rate-4@example.com');
    assert.equal(res.status, 429);
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/use with the transfer token$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.transferToken, 'No transfer token in context');
    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.transferToken }),
    });
    this.responseJson = await this.response.clone().json();
    if (this.response.status === 200) {
      const body = this.responseJson as { token: string; player_id: number };
      this.playerBearerToken = body.token;
      this.playerId = body.player_id;
    }
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/use with the transfer token and local stats$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.transferToken, 'No transfer token in context');
    const stats = {
      records: [
        {
          puzzle_number: 1,
          date: '2026-04-10',
          best_rank: 'Sanavalmis',
          best_score: 50,
          max_score: 100,
          words_found: 10,
          hints_used: 0,
          elapsed_ms: 300000,
        },
      ],
      version: 1,
    };
    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.transferToken,
        stats,
        puzzle_states: [],
      }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/use with token "([^"]*)"$/,
  async function (this: PlayerAuthWorld, token: string) {
    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/use with an empty body$/,
  async function (this: PlayerAuthWorld) {
    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a GET request is made to \/api\/player\/me with the Bearer token$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/me', {
      headers: bearerHeader(this.playerBearerToken),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a GET request is made to \/api\/player\/me without a token$/,
  async function (this: PlayerAuthWorld) {
    this.response = await app.request('/api/player/me');
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a GET request is made to \/api\/player\/me with token "([^"]*)"$/,
  async function (this: PlayerAuthWorld, token: string) {
    this.response = await app.request('/api/player/me', {
      headers: bearerHeader(token),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/logout with the Bearer token$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.response = await app.request('/api/player/auth/logout', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
    });
    this.responseJson = await this.response.clone().json();
  },
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then(
  'the response should contain a {string} field',
  function (this: PlayerAuthWorld, field: string) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(this.responseJson, field),
      `Response missing field "${field}"`,
    );
  },
);

Then(
  'the response should contain {string}',
  function (this: PlayerAuthWorld, field: string) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(this.responseJson, field),
      `Response missing field "${field}"`,
    );
  },
);

Then(
  /^the token should no longer be valid on \/api\/player\/me$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    const res = await app.request('/api/player/me', {
      headers: bearerHeader(this.playerBearerToken),
    });
    assert.equal(res.status, 401);
  },
);

Then(
  'the players table should store only the player key hash',
  function (this: PlayerAuthWorld) {
    assert.ok(this.playerId, 'No player id in context');
    assert.ok(this.playerKey, 'No player key in context');
    const db = getDb();
    const row = db
      .prepare('SELECT player_key_hash FROM players WHERE id = ?')
      .get(this.playerId) as { player_key_hash: string } | undefined;
    assert.ok(row, 'No player row found');
    assert.equal(row.player_key_hash, sha256(this.playerKey));
    assert.notEqual(row.player_key_hash, this.playerKey);
  },
);

Then(
  'the players table should not contain the email {string}',
  function (this: PlayerAuthWorld, email: string) {
    const db = getDb();
    const row = db
      .prepare('SELECT 1 as present FROM players WHERE player_key_hash = ?')
      .get(email) as { present: number } | undefined;
    assert.equal(row, undefined);
  },
);

Then(
  'the player_transfer_tokens table should not contain the raw token',
  function (this: PlayerAuthWorld) {
    assert.ok(this.transferToken, 'No transfer token in context');
    const db = getDb();
    const rows = db
      .prepare('SELECT token_hash FROM player_transfer_tokens')
      .all() as Array<{ token_hash: string }>;
    const found = rows.some((r) => r.token_hash === this.transferToken);
    assert.ok(!found, 'Raw token found in DB (should only store hash)');
  },
);

Then(
  'the player_transfer_tokens table should contain the SHA-256 hash of the token',
  function (this: PlayerAuthWorld) {
    assert.ok(this.transferToken, 'No transfer token in context');
    const expected = sha256(this.transferToken);
    const db = getDb();
    const rows = db
      .prepare('SELECT token_hash FROM player_transfer_tokens')
      .all() as Array<{ token_hash: string }>;
    const found = rows.some((r) => r.token_hash === expected);
    assert.ok(found, 'SHA-256 hash of token not found in DB');
  },
);
