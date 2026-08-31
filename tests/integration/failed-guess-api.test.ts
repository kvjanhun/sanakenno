/**
 * POST /api/failed-guess over the real API. Replaces the failed-guess
 * scenarios from the former api.feature BDD suite.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import { setupServerDb, teardownServerDb } from './helpers/server-fixture';

async function post(body: unknown): Promise<Response> {
  return app.request('/api/failed-guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setupServerDb();
});

afterEach(() => {
  teardownServerDb();
});

describe('POST /api/failed-guess', () => {
  it('records a valid failed guess', async () => {
    const res = await post({ word: 'xyzxyz', date: '2025-01-01' });
    expect(res.status).toBe(200);
    const row = getDb()
      .prepare('SELECT count FROM failed_guesses WHERE word = ?')
      .get('xyzxyz') as { count: number };
    expect(row.count).toBe(1);
  });

  it('increments the count for a duplicate failed guess', async () => {
    await post({ word: 'xyzxyz', date: '2025-01-01' });
    const res = await post({ word: 'xyzxyz', date: '2025-01-01' });
    expect(res.status).toBe(200);
    const row = getDb()
      .prepare('SELECT count FROM failed_guesses WHERE word = ?')
      .get('xyzxyz') as { count: number };
    expect(row.count).toBe(2);
  });

  it('rejects a word exceeding 20 characters', async () => {
    const res = await post({
      word: 'aaaaabbbbbcccccddddde',
      date: '2025-01-01',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a body missing the word', async () => {
    const res = await post({ date: '2025-01-01' });
    expect(res.status).toBe(400);
  });

  it('rate-limits to 30 requests per minute', async () => {
    for (let i = 0; i < 30; i++) {
      const res = await post({ word: `sana${i}`, date: '2025-01-01' });
      expect(res.status).toBe(200);
    }
    const res = await post({ word: 'sana30', date: '2025-01-01' });
    expect(res.status).toBe(429);
  });
});
