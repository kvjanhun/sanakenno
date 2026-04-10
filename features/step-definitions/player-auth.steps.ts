/**
 * BDD step definitions for player-auth.feature.
 *
 * Tests player magic link auth: request, verify, logout, and token validation
 * via Hono app.request(). Uses in-memory SQLite and stubs out Resend
 * by setting RESEND_API_KEY=test (sendMagicLink is a no-op in that mode).
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
import { resetRequestRateLimit } from '../../server/player-auth/routes';
import type { SanakennoWorld } from './types';

interface PlayerAuthWorld extends SanakennoWorld {
  playerBearerToken: string | null;
  lastRawToken: string | null;
  lastEmail: string | null;
  lastPlayerId: number | null;
}

/** Build Authorization header for a Bearer token. */
function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Compute SHA-256 hex digest of a string. */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Request a magic link for the given email and inject a known raw token into
 * the DB so tests can verify it. Bypasses actual email sending (RESEND_API_KEY=test).
 */
async function requestAndCaptureToken(
  world: PlayerAuthWorld,
  email: string,
): Promise<string> {
  // Request the link (email is a no-op in test mode)
  await app.request('/api/player/auth/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  // Replace the server-generated token with a known one so we can verify it
  const db = getDb();
  const knownRawToken = `test-token-${email}-${Date.now()}`;
  const tokenHash = sha256(knownRawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  interface PlayerRow {
    id: number;
  }
  const player = db
    .prepare('SELECT id FROM players WHERE email = ?')
    .get(email) as PlayerRow;

  db.prepare('DELETE FROM player_magic_tokens WHERE player_id = ?').run(
    player.id,
  );
  db.prepare(
    'INSERT INTO player_magic_tokens (player_id, token_hash, expires_at) VALUES (?, ?, ?)',
  ).run(player.id, tokenHash, expiresAt);

  world.lastRawToken = knownRawToken;
  world.lastEmail = email;
  return knownRawToken;
}

/** Verify a raw token and store the Bearer token on world. */
async function verifyToken(
  world: PlayerAuthWorld,
  rawToken: string,
  extra: Record<string, unknown> = {},
): Promise<Response> {
  const res = await app.request('/api/player/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken, ...extra }),
  });
  if (res.status === 200) {
    interface VerifyBody {
      token: string;
      player_id: number;
    }
    const body = (await res.clone().json()) as VerifyBody;
    world.playerBearerToken = body.token;
    world.lastPlayerId = body.player_id;
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
  resetRequestRateLimit();
  invalidateAll();
  setWordlist(new Set(['kala', 'sanka']));

  this.playerBearerToken = null;
  this.lastRawToken = null;
  this.lastEmail = null;
  this.lastPlayerId = null;
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
    resetRequestRateLimit();
  },
);

Given(
  'no player account exists for {string}',
  function (this: PlayerAuthWorld, email: string) {
    const db = getDb();
    db.prepare('DELETE FROM players WHERE email = ?').run(email);
  },
);

Given(
  'a magic link token was requested for {string}',
  async function (this: PlayerAuthWorld, email: string) {
    await requestAndCaptureToken(this, email);
  },
);

Given('the token has already been used', function (this: PlayerAuthWorld) {
  assert.ok(this.lastRawToken, 'No token in context');
  const db = getDb();
  const hash = sha256(this.lastRawToken);
  db.prepare(
    'UPDATE player_magic_tokens SET used = 1 WHERE token_hash = ?',
  ).run(hash);
});

Given(
  'an expired magic link token exists for {string}',
  async function (this: PlayerAuthWorld, email: string) {
    await requestAndCaptureToken(this, email);
    const db = getDb();
    const hash = sha256(this.lastRawToken!);
    db.prepare(
      "UPDATE player_magic_tokens SET expires_at = datetime('now', '-1 minute') WHERE token_hash = ?",
    ).run(hash);
  },
);

Given(
  'a player has verified their magic link token',
  async function (this: PlayerAuthWorld) {
    const email = 'verified@example.com';
    const rawToken = await requestAndCaptureToken(this, email);
    const res = await verifyToken(this, rawToken);
    assert.equal(res.status, 200, 'Token verification failed in Given step');
  },
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  /^a POST is made to \/api\/player\/auth\/request with email "([^"]*)"$/,
  async function (this: PlayerAuthWorld, email: string) {
    this.response = await app.request('/api/player/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^(\d+) POST requests are made to \/api\/player\/auth\/request from the same IP$/,
  async function (this: PlayerAuthWorld, count: number) {
    for (let i = 0; i < count; i++) {
      this.response = await app.request('/api/player/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `ratelimit${i}@example.com` }),
      });
    }
  },
);

Then(
  /^the (\d+)th request should return 429$/,
  async function (this: PlayerAuthWorld, _n: number) {
    const res = await app.request('/api/player/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ratelimit-extra@example.com' }),
    });
    assert.equal(res.status, 429);
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/verify with the expired token$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.lastRawToken, 'No token in context');
    this.response = await app.request('/api/player/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.lastRawToken }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/verify with the token$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.lastRawToken, 'No token in context');
    this.response = await verifyToken(this, this.lastRawToken);
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/verify with the token and local stats$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.lastRawToken, 'No token in context');
    const localStats = {
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
    this.response = await verifyToken(this, this.lastRawToken, {
      stats: localStats,
      puzzle_states: [],
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/verify with token "([^"]*)"$/,
  async function (this: PlayerAuthWorld, token: string) {
    this.response = await app.request('/api/player/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a POST is made to \/api\/player\/auth\/verify with an empty body$/,
  async function (this: PlayerAuthWorld) {
    this.response = await app.request('/api/player/auth/verify', {
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

// Note: 'the response status should be {int}' is defined globally in archive.steps.ts

Then(
  'the response should contain status {string}',
  function (this: PlayerAuthWorld, value: string) {
    assert.equal(
      (this.responseJson as Record<string, unknown>)['status'],
      value,
    );
  },
);

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
  'the response should contain {string} equal to {string}',
  function (this: PlayerAuthWorld, field: string, value: string) {
    assert.equal((this.responseJson as Record<string, unknown>)[field], value);
  },
);

Then(
  'a player account should exist for {string}',
  function (this: PlayerAuthWorld, email: string) {
    const db = getDb();
    interface Row {
      id: number;
    }
    const row = db
      .prepare('SELECT id FROM players WHERE email = ?')
      .get(email) as Row | undefined;
    assert.ok(row, `No player found for email "${email}"`);
  },
);

Then(
  /^the token should no longer be valid on \/api\/player\/me$/,
  async function (this: PlayerAuthWorld) {
    assert.ok(this.playerBearerToken, 'No Bearer token in context');
    const res = await app.request('/api/player/me', {
      headers: bearerHeader(this.playerBearerToken),
    });
    assert.equal(res.status, 401, 'Token should be invalidated after logout');
  },
);

Then(
  'the player_magic_tokens table should not contain the raw token',
  function (this: PlayerAuthWorld) {
    assert.ok(this.lastRawToken, 'No raw token in context');
    const db = getDb();
    interface Row {
      token_hash: string;
    }
    const rows = db
      .prepare('SELECT token_hash FROM player_magic_tokens')
      .all() as Row[];
    const found = rows.some((r) => r.token_hash === this.lastRawToken);
    assert.ok(!found, 'Raw token found in DB (should only store hash)');
  },
);

Then(
  'the player_magic_tokens table should contain the SHA-256 hash of the token',
  function (this: PlayerAuthWorld) {
    assert.ok(this.lastRawToken, 'No raw token in context');
    const expectedHash = sha256(this.lastRawToken);
    const db = getDb();
    interface Row {
      token_hash: string;
    }
    const rows = db
      .prepare('SELECT token_hash FROM player_magic_tokens')
      .all() as Row[];
    const found = rows.some((r) => r.token_hash === expectedHash);
    assert.ok(found, 'SHA-256 hash of token not found in DB');
  },
);
