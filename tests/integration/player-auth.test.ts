/**
 * Player authentication: silent init, pairing-code email delivery, pairing,
 * key rotation, Bearer sessions, and logout — through the real Hono app.
 *
 * Replaces the former player-auth.feature BDD scenarios. The device-link UI
 * scenarios live in tests/web-clipboard.test.ts and
 * tests/web-auth-link-state.test.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import {
  resetTransferCreateRateLimit,
  resetEmailRateLimit,
  setEmailRateLimitEntry,
} from '../../server/player-auth/routes';
import { setupServerDb, teardownServerDb } from './helpers/server-fixture';

interface PlayerIdentity {
  token: string;
  player_id: number;
  player_key: string;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function initPlayer(): Promise<PlayerIdentity> {
  const res = await app.request('/api/player/auth/init', { method: 'POST' });
  expect(res.status).toBe(200);
  return (await res.json()) as PlayerIdentity;
}

async function transferCreate(
  token: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return app.request('/api/player/auth/transfer/create', {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function transferUse(body: Record<string, unknown>): Promise<Response> {
  return app.request('/api/player/auth/transfer/use', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setupServerDb(10);
  resetTransferCreateRateLimit();
  resetEmailRateLimit();
});

afterEach(() => {
  teardownServerDb();
});

describe('silent init', () => {
  it('creates a player identity and stores only the key hash', async () => {
    const identity = await initPlayer();
    expect(identity.token).toBeTruthy();
    expect(identity.player_id).toBeTypeOf('number');
    expect(identity.player_key).toMatch(/^[0-9a-f]{64}$/);

    const row = getDb()
      .prepare('SELECT player_key_hash FROM players WHERE id = ?')
      .get(identity.player_id) as { player_key_hash: string };
    expect(row.player_key_hash).toBe(
      createHash('sha256').update(identity.player_key).digest('hex'),
    );
    expect(row.player_key_hash).not.toBe(identity.player_key);
  });
});

describe('pairing-code email delivery', () => {
  it('sends the pairing code without storing the email address', async () => {
    const { token, player_key } = await initPlayer();
    const res = await transferCreate(token, {
      email: 'test@example.com',
      player_key,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBeDefined();

    const players = getDb().prepare('SELECT * FROM players').all();
    expect(JSON.stringify(players)).not.toContain('test@example.com');
  });

  it('rate-limits transfer creation per IP after 3 requests', async () => {
    const { token, player_key } = await initPlayer();
    for (let i = 0; i < 3; i++) {
      resetEmailRateLimit();
      const res = await transferCreate(token, {
        email: `ip${i}@example.com`,
        player_key,
      });
      expect(res.status).toBe(200);
    }
    resetEmailRateLimit();
    const res = await transferCreate(token, {
      email: 'ip4@example.com',
      player_key,
    });
    expect(res.status).toBe(429);
  });

  it('blocks a second email to the same address within 10 minutes', async () => {
    const { token, player_key } = await initPlayer();
    const first = await transferCreate(token, {
      email: 'cooldown@example.com',
      player_key,
    });
    expect(first.status).toBe(200);
    const second = await transferCreate(token, {
      email: 'cooldown@example.com',
      player_key,
    });
    expect(second.status).toBe(429);
  });

  it('blocks more than 10 emails to the same address per day', async () => {
    const { token, player_key } = await initPlayer();
    setEmailRateLimitEntry('daily@example.com', {
      lastSentMs: Date.now() - 11 * 60 * 1000,
      dailyCount: 10,
      dailyDate: new Date().toISOString().slice(0, 10),
    });
    const res = await transferCreate(token, {
      email: 'daily@example.com',
      player_key,
    });
    expect(res.status).toBe(429);
  });

  it('rejects delivery without a player_key', async () => {
    const { token } = await initPlayer();
    const res = await transferCreate(token, {
      email: 'missing-key@example.com',
    });
    expect(res.status).toBe(400);
  });

  it('rejects delivery with a mismatched player_key', async () => {
    const { token } = await initPlayer();
    const res = await transferCreate(token, {
      email: 'mismatch@example.com',
      player_key: 'f'.repeat(64),
    });
    expect(res.status).toBe(400);
  });
});

describe('pairing (transfer/use)', () => {
  it('exchanges a valid pairing code for a Bearer token with synced data', async () => {
    const { player_key } = await initPlayer();
    const res = await transferUse({ token: player_key });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBeTruthy();
    expect(json.player_id).toBeTypeOf('number');
    expect(json.stats).toBeDefined();
    expect(json.puzzle_states).toBeDefined();
  });

  it('allows the pairing code to be reused across multiple pairings', async () => {
    const { player_key } = await initPlayer();
    expect((await transferUse({ token: player_key })).status).toBe(200);
    expect((await transferUse({ token: player_key })).status).toBe(200);
  });

  it('rejects an invalid pairing code', async () => {
    const res = await transferUse({ token: 'totally-fake-token' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing pairing code', async () => {
    const res = await transferUse({});
    expect(res.status).toBe(400);
  });
});

describe('rotation', () => {
  it('mints a new key and keeps the current session valid', async () => {
    const { token, player_key } = await initPlayer();
    const res = await app.request('/api/player/auth/rotate', {
      method: 'POST',
      headers: bearer(token),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.player_key).toMatch(/^[0-9a-f]{64}$/);
    expect(json.player_key).not.toBe(player_key);

    const me = await app.request('/api/player/me', { headers: bearer(token) });
    expect(me.status).toBe(200);
  });

  it("invalidates other paired devices' sessions", async () => {
    const { token, player_key } = await initPlayer();
    const paired = await (await transferUse({ token: player_key })).json();

    const res = await app.request('/api/player/auth/rotate', {
      method: 'POST',
      headers: bearer(token),
    });
    expect(res.status).toBe(200);

    const otherMe = await app.request('/api/player/me', {
      headers: bearer(paired.token),
    });
    expect(otherMe.status).toBe(401);
  });

  it('invalidates the previous pairing code', async () => {
    const { token, player_key } = await initPlayer();
    await app.request('/api/player/auth/rotate', {
      method: 'POST',
      headers: bearer(token),
    });
    const res = await transferUse({ token: player_key });
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await app.request('/api/player/auth/rotate', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });
});

describe('authenticated endpoints', () => {
  it('accepts a valid Bearer token on /api/player/me', async () => {
    const { token } = await initPlayer();
    const res = await app.request('/api/player/me', { headers: bearer(token) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.player_id).toBeTypeOf('number');
  });

  it('rejects a missing Bearer token', async () => {
    const res = await app.request('/api/player/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid Bearer token', async () => {
    const res = await app.request('/api/player/me', {
      headers: bearer('invalid-bearer'),
    });
    expect(res.status).toBe(401);
  });
});

describe('logout', () => {
  it('invalidates the token', async () => {
    const { token } = await initPlayer();
    const res = await app.request('/api/player/auth/logout', {
      method: 'POST',
      headers: bearer(token),
    });
    expect(res.status).toBe(200);
    const me = await app.request('/api/player/me', { headers: bearer(token) });
    expect(me.status).toBe(401);
  });
});
