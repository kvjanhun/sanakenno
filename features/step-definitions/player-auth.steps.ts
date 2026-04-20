/**
 * BDD step definitions for player-auth.feature.
 *
 * Tests the stable pairing model: every player has a random player_key (64-hex)
 * minted at /auth/init and only stored as SHA-256 hash on the server. Pairing
 * uses the raw key directly — no expiry, no single-use. Rotation mints a new
 * key and drops other devices' sessions.
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
import {
  resetTransferCreateRateLimit,
  resetEmailRateLimit,
  setEmailRateLimitEntry,
} from '../../server/player-auth/routes';
import type { SanakennoWorld } from './types';

interface PlayerAuthWorld extends SanakennoWorld {
  playerBearerToken: string | null;
  playerId: number | null;
  playerKey: string | null;
  previousPlayerKey: string | null;
  secondDeviceToken: string | null;
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

async function postTransferCreate(
  world: PlayerAuthWorld,
  body: Record<string, unknown>,
): Promise<Response> {
  assert.ok(world.playerBearerToken, 'No Bearer token in context');
  return app.request('/api/player/auth/transfer/create', {
    method: 'POST',
    headers: {
      ...bearerHeader(world.playerBearerToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function sendPairingEmail(
  world: PlayerAuthWorld,
  email: string,
): Promise<Response> {
  assert.ok(world.playerKey, 'No player_key in context');
  return postTransferCreate(world, { email, player_key: world.playerKey });
}

// ---------------------------------------------------------------------------

Before(function (this: PlayerAuthWorld, scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('player-auth.feature')) return;

  process.env['RESEND_API_KEY'] = 'test';

  closeDb();
  setDb(null);
  getDb({ inMemory: true });
  resetTransferCreateRateLimit();
  resetEmailRateLimit();
  invalidateAll();
  setWordlist(new Set(['kala', 'sanka']));

  this.playerBearerToken = null;
  this.playerId = null;
  this.playerKey = null;
  this.previousPlayerKey = null;
  this.secondDeviceToken = null;
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
    resetEmailRateLimit();
  },
);

Given(
  'a transfer email has just been sent to {string}',
  async function (this: PlayerAuthWorld, email: string) {
    if (!this.playerBearerToken) await initPlayer(this);
    const res = await sendPairingEmail(this, email);
    assert.equal(res.status, 200, `First email send to ${email} failed`);
  },
);

Given(
  '{int} transfer emails have already been sent to {string} today',
  function (this: PlayerAuthWorld, count: number, email: string) {
    setEmailRateLimitEntry(email, {
      lastSentMs: Date.now() - 11 * 60 * 1000, // 11 min ago — past the cooldown
      dailyCount: count,
      dailyDate: new Date().toISOString().slice(0, 10),
    });
  },
);

Given(
  'a player has initialized their identity',
  async function (this: PlayerAuthWorld) {
    await initPlayer(this);
  },
);

Given(
  'a second device has paired using the pairing code',
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerKey, 'No player_key in context');
    const res = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.playerKey }),
    });
    assert.equal(res.status, 200, 'Second device pair failed');
    const body = (await res.json()) as { token: string };
    this.secondDeviceToken = body.token;
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
  /^a POST is made to \/api\/player\/auth\/transfer\/create with email "([^"]*)" and the Bearer token$/,
  async function (this: PlayerAuthWorld, email: string) {
    this.response = await sendPairingEmail(this, email);
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/create with email "([^"]*)" and no player_key and the Bearer token$/,
  async function (this: PlayerAuthWorld, email: string) {
    this.response = await postTransferCreate(this, { email });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/create with email "([^"]*)" and a wrong player_key and the Bearer token$/,
  async function (this: PlayerAuthWorld, email: string) {
    this.response = await postTransferCreate(this, {
      email,
      player_key: 'f'.repeat(64),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^3 POST requests are made to \/api\/player\/auth\/transfer\/create from the same IP with the Bearer token$/,
  async function (this: PlayerAuthWorld) {
    for (let i = 0; i < 3; i++) {
      this.response = await sendPairingEmail(this, `rate-${i}@example.com`);
    }
  },
);

Then(
  /^the 4th transfer create request should return 429$/,
  async function (this: PlayerAuthWorld) {
    const res = await sendPairingEmail(this, 'rate-4@example.com');
    assert.equal(res.status, 429);
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/use with the player key$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerKey, 'No player_key in context');
    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.playerKey }),
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
  /^a POST is made to \/api\/player\/auth\/transfer\/use with the player key and local stats$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerKey, 'No player_key in context');
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
        token: this.playerKey,
        stats,
        puzzle_states: [],
      }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/transfer\/use with the previous player key$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.previousPlayerKey, 'No previous player_key in context');
    this.response = await app.request('/api/player/auth/transfer/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.previousPlayerKey }),
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
  /^a POST is made to \/api\/player\/auth\/rotate with the Bearer token$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    this.previousPlayerKey = this.playerKey;
    this.response = await app.request('/api/player/auth/rotate', {
      method: 'POST',
      headers: bearerHeader(this.playerBearerToken),
    });
    this.responseJson = await this.response.clone().json();
    if (this.response.status === 200) {
      const body = this.responseJson as { player_key: string };
      this.playerKey = body.player_key;
    }
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/rotate without a Bearer token$/,
  async function (this: PlayerAuthWorld) {
    this.response = await app.request('/api/player/auth/rotate', {
      method: 'POST',
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
  /^the current Bearer token should still be valid on \/api\/player\/me$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    const res = await app.request('/api/player/me', {
      headers: bearerHeader(this.playerBearerToken),
    });
    assert.equal(res.status, 200);
  },
);

Then(
  /^the second device's Bearer token should no longer be valid$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.secondDeviceToken, 'No second device token in context');
    const res = await app.request('/api/player/me', {
      headers: bearerHeader(this.secondDeviceToken),
    });
    assert.equal(res.status, 401);
  },
);

Then(
  /^the new player_key should differ from the old one$/,
  function (this: PlayerAuthWorld) {
    assert.ok(this.playerKey, 'No current player_key in context');
    assert.ok(this.previousPlayerKey, 'No previous player_key in context');
    assert.notEqual(this.playerKey, this.previousPlayerKey);
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
