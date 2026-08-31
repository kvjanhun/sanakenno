/**
 * CORS allow-list. The API answers credentialed requests (admin cookie
 * sessions, player Bearer tokens), so the allowed origins must stay narrow
 * and localhost must never be allowed in production.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import { setupServerDb, teardownServerDb } from './helpers/server-fixture';

const originalNodeEnv = process.env.NODE_ENV;

async function allowedOriginFor(origin: string): Promise<string | null> {
  const res = await app.request('/api/health', {
    headers: { Origin: origin },
  });
  return res.headers.get('access-control-allow-origin');
}

beforeEach(() => {
  setupServerDb();
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
  teardownServerDb();
});

describe('CORS allow-list', () => {
  it('allows the production site', async () => {
    process.env.NODE_ENV = 'production';
    expect(await allowedOriginFor('https://sanakenno.fi')).toBe(
      'https://sanakenno.fi',
    );
  });

  it('rejects localhost origins in production', async () => {
    process.env.NODE_ENV = 'production';
    expect(await allowedOriginFor('http://localhost:5173')).toBe(null);
  });

  it('allows localhost origins in development', async () => {
    delete process.env.NODE_ENV;
    expect(await allowedOriginFor('http://localhost:5173')).toBe(
      'http://localhost:5173',
    );
  });

  it('rejects an unrelated origin in every environment', async () => {
    delete process.env.NODE_ENV;
    expect(await allowedOriginFor('https://evil.example')).toBe(null);
    process.env.NODE_ENV = 'production';
    expect(await allowedOriginFor('https://evil.example')).toBe(null);
  });
});
