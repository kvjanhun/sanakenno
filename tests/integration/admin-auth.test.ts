/**
 * Admin authentication: provisioning, login, brute-force protection,
 * session cookies, CSRF, password management, and security headers —
 * all through the real Hono app and real argon2 hashing.
 *
 * Replaces the former auth.feature BDD scenarios.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import argon2 from 'argon2';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import { resetLoginRateLimit } from '../../server/auth/routes';
import { SESSION_COOKIE } from '../../server/auth/middleware';
import { setupServerDb, teardownServerDb } from './helpers/server-fixture';

const TEST_USERNAME = 'testadmin';
const TEST_PASSWORD = 'securepassword123';

function extractSessionCookie(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

function authHeaders(
  sessionCookie: string | null,
  csrfToken?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionCookie) headers['Cookie'] = `${SESSION_COOKIE}=${sessionCookie}`;
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
}

async function createTestAdmin(): Promise<void> {
  const hash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id });
  getDb()
    .prepare(
      'INSERT OR REPLACE INTO admins (username, password_hash) VALUES (?, ?)',
    )
    .run(TEST_USERNAME, hash);
}

async function login(
  username = TEST_USERNAME,
  password = TEST_PASSWORD,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  return app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ username, password }),
  });
}

async function loginAs(): Promise<{
  sessionCookie: string;
  csrfToken: string;
}> {
  const res = await login();
  const json = (await res.json()) as { csrf_token?: string };
  return {
    sessionCookie: extractSessionCookie(res) || '',
    csrfToken: json.csrf_token || '',
  };
}

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(async () => {
  setupServerDb(10);
  resetLoginRateLimit();
  await createTestAdmin();
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
  teardownServerDb();
});

describe('account provisioning', () => {
  it('stores the password as an argon2id hash, never in plaintext', () => {
    const row = getDb()
      .prepare('SELECT password_hash FROM admins WHERE username = ?')
      .get(TEST_USERNAME) as { password_hash: string };
    expect(row.password_hash.startsWith('$argon2id$')).toBe(true);
    expect(row.password_hash).not.toContain(TEST_PASSWORD);
  });
});

describe('login', () => {
  it('logs in with correct credentials and sets an HttpOnly session cookie', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain(SESSION_COOKIE);
    expect(setCookie.toLowerCase()).toContain('httponly');
    const json = await res.json();
    expect(json.username).toBe(TEST_USERNAME);
    expect(json.password_hash).toBeUndefined();
    expect(json.password).toBeUndefined();
  });

  it('rejects a wrong password with a generic 401', async () => {
    const res = await login(TEST_USERNAME, 'wrongpassword123');
    expect(res.status).toBe(401);
    const { error } = await res.json();
    expect(error.toLowerCase()).not.toContain('password');
    expect(error.toLowerCase()).not.toContain('username');
    expect(error.toLowerCase()).not.toContain('not found');
  });

  it('rejects a non-existent username with the same 401', async () => {
    const res = await login('nonexistent', 'somepassword123');
    expect(res.status).toBe(401);
  });
});

describe('brute-force protection', () => {
  it('rate-limits after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await login(TEST_USERNAME, 'wrongpassword');
    }
    const res = await login(TEST_USERNAME, 'wrongpassword');
    expect(res.status).toBe(429);
  });

  it('rate-limits per IP, not globally', async () => {
    for (let i = 0; i < 6; i++) {
      await login(TEST_USERNAME, 'wrong');
    }
    const res = await login(TEST_USERNAME, TEST_PASSWORD, {
      'X-Forwarded-For': '5.6.7.8',
    });
    expect(res.status).not.toBe(429);
  });
});

describe('session cookie properties', () => {
  it('is Secure with SameSite=Strict and a bounded max-age in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await login();
    const setCookie = (res.headers.get('set-cookie') || '').toLowerCase();
    expect(setCookie).toContain('httponly');
    expect(setCookie).toContain('secure');
    expect(setCookie).toContain('samesite=strict');
    const maxAge = parseInt(setCookie.match(/max-age=(\d+)/)![1], 10);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(604_800);
  });

  it('does not require HTTPS in local development', async () => {
    delete process.env.NODE_ENV;
    const res = await login();
    const setCookie = (res.headers.get('set-cookie') || '').toLowerCase();
    expect(setCookie).toContain('httponly');
    expect(setCookie).not.toContain('secure');
    expect(setCookie).toContain('samesite=strict');
  });
});

describe('session validation', () => {
  it('accepts a valid session on admin routes', async () => {
    const { sessionCookie } = await loginAs();
    const res = await app.request('/api/admin/schedule', {
      headers: authHeaders(sessionCookie),
    });
    expect(res.status).toBe(200);
  });

  it('rejects an expired session', async () => {
    const { sessionCookie } = await loginAs();
    getDb()
      .prepare("UPDATE sessions SET expires_at = datetime('now', '-1 day')")
      .run();
    const res = await app.request('/api/admin/schedule', {
      headers: authHeaders(sessionCookie),
    });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed session cookie', async () => {
    const res = await app.request('/api/admin/schedule', {
      headers: authHeaders('totally-invalid-session-id-12345'),
    });
    expect(res.status).toBe(401);
  });
});

describe('logout', () => {
  it('clears the session and invalidates subsequent requests', async () => {
    const { sessionCookie } = await loginAs();
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(sessionCookie),
    });
    expect(res.headers.get('set-cookie') || '').toContain(SESSION_COOKIE);
    const after = await app.request('/api/admin/schedule', {
      headers: authHeaders(sessionCookie),
    });
    expect(after.status).toBe(401);
  });
});

describe('CSRF protection', () => {
  it('rejects a state-changing request without a CSRF token', async () => {
    const { sessionCookie } = await loginAs();
    const res = await app.request('/api/admin/block', {
      method: 'POST',
      headers: authHeaders(sessionCookie, null),
      body: JSON.stringify({ word: 'testi' }),
    });
    expect(res.status).toBe(403);
  });

  it('processes a state-changing request with a valid CSRF token', async () => {
    const { sessionCookie, csrfToken } = await loginAs();
    const res = await app.request('/api/admin/block', {
      method: 'POST',
      headers: authHeaders(sessionCookie, csrfToken),
      body: JSON.stringify({ word: 'testi' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

describe('password management', () => {
  it('changes the password and invalidates other sessions', async () => {
    const other = await loginAs();
    const { sessionCookie, csrfToken } = await loginAs();
    const res = await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders(sessionCookie, csrfToken),
      body: JSON.stringify({
        current_password: TEST_PASSWORD,
        new_password: 'newpassword12345',
      }),
    });
    expect(res.status).toBe(200);

    const row = getDb()
      .prepare('SELECT password_hash FROM admins WHERE username = ?')
      .get(TEST_USERNAME) as { password_hash: string };
    expect(await argon2.verify(row.password_hash, 'newpassword12345')).toBe(
      true,
    );

    const otherRes = await app.request('/api/admin/schedule', {
      headers: authHeaders(other.sessionCookie),
    });
    expect(otherRes.status).toBe(401);
  });

  it('requires the current password', async () => {
    const { sessionCookie, csrfToken } = await loginAs();
    const res = await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders(sessionCookie, csrfToken),
      body: JSON.stringify({ new_password: 'newpassword12345' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects a new password shorter than 12 characters', async () => {
    const { sessionCookie, csrfToken } = await loginAs();
    const res = await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders(sessionCookie, csrfToken),
      body: JSON.stringify({
        current_password: TEST_PASSWORD,
        new_password: 'short',
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('security headers', () => {
  it('serves admin responses with nosniff, DENY, and no-store', async () => {
    const { sessionCookie } = await loginAs();
    const res = await app.request('/api/admin/schedule', {
      headers: authHeaders(sessionCookie),
    });
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
