/**
 * Structured request logging. Replaces the executable scenarios of the
 * former infrastructure.feature (the container/health scenarios are
 * covered by tests/api.test.ts and the Docker healthcheck).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../../server/index';
import { setupServerDb, teardownServerDb } from './helpers/server-fixture';

const originalLogLevel = process.env.LOG_LEVEL;

beforeEach(() => {
  setupServerDb();
});

afterEach(() => {
  process.env.LOG_LEVEL = originalLogLevel;
  vi.restoreAllMocks();
  teardownServerDb();
});

describe('request logging', () => {
  it('emits a Loki-compatible structured log line per request', async () => {
    process.env.LOG_LEVEL = 'info';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await app.request('/api/puzzle');

    const entry = logSpy.mock.calls
      .map(([line]) => {
        try {
          return JSON.parse(String(line));
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.path === '/api/puzzle');

    expect(entry).toBeDefined();
    expect(entry.level).toBe('info');
    expect(entry.method).toBe('GET');
    expect(entry.status).toBe(200);
    expect(typeof entry.response_time_ms).toBe('number');
  });
});
