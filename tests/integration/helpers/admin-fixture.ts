/**
 * Shared admin fixture: in-memory DB seeded like production (41 slots,
 * one combination row, word list), a real argon2-hashed admin account,
 * and a real login for session cookie + CSRF token.
 */
import argon2 from 'argon2';
import app from '../../../server/index';
import { getDb, closeDb, setDb } from '../../../server/db/connection';
import { resetLoginRateLimit } from '../../../server/auth/routes';
import { resetPreviewRateLimit } from '../../../server/routes/admin';
import { SESSION_COOKIE } from '../../../server/auth/middleware';
import { invalidateAll, setWordlist } from '../../../server/puzzle-engine';
import { setSuggestionQualityForTesting } from '../../../server/puzzle-suggestions';

export const TEST_LETTERS = ['a', 'e', 'k', 'l', 'n', 's', 'ö'];
export const TEST_LETTERS_STR = 'a,e,k,l,n,s,ö';
export const ALT_LETTERS = ['a', 'd', 'e', 'h', 'l', 'r', 's'];
const TEST_USERNAME = 'testadmin';
const TEST_PASSWORD = 'securepassword123';

export interface AdminSession {
  sessionCookie: string;
  csrfToken: string;
}

export function adminGet(session: AdminSession): Record<string, string> {
  return { Cookie: `${SESSION_COOKIE}=${session.sessionCookie}` };
}

export function adminHeaders(session: AdminSession): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Cookie: `${SESSION_COOKIE}=${session.sessionCookie}`,
    'X-CSRF-Token': session.csrfToken,
  };
}

export async function setupAdmin(): Promise<AdminSession> {
  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });
  resetLoginRateLimit();
  resetPreviewRateLimit();
  invalidateAll();

  for (let i = 0; i < 41; i++) {
    const letters = i === 4 ? TEST_LETTERS_STR : 'a,e,k,l,n,s,t';
    const center = i === 4 ? 'k' : 'a';
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
    ).run(i, letters, center);
  }
  db.prepare(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', '2026-02-24')",
  ).run();

  db.prepare(
    `INSERT OR REPLACE INTO combinations
     (letters, total_pangrams, min_word_count, max_word_count, min_max_score, max_max_score, variations, in_rotation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'aeklnöst',
    3,
    20,
    50,
    80,
    200,
    JSON.stringify(
      ['a', 'e', 'k', 'l', 'n', 's', 'ö'].map((center, i) => ({
        center,
        word_count: 25 + i * 5,
        max_score: 100 + i * 20,
        pangram_count: 1 + (i % 3),
      })),
    ),
    1,
  );
  db.prepare(
    `INSERT OR REPLACE INTO combinations
     (letters, total_pangrams, min_word_count, max_word_count, min_max_score, max_max_score, variations, in_rotation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run('adehlrs', 5, 30, 60, 100, 250, '[]', 0);

  setWordlist(
    new Set([
      'kala',
      'sanka',
      'taka',
      'kana',
      'lakana',
      'kanat',
      'kaste',
      'alat',
      'alka',
      'saat',
      'alas',
      'akat',
      'testi',
    ]),
  );

  const hash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id });
  db.prepare(
    'INSERT OR REPLACE INTO admins (username, password_hash) VALUES (?, ?)',
  ).run(TEST_USERNAME, hash);

  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const json = (await res.json()) as { csrf_token?: string };
  return {
    sessionCookie: cookieMatch ? cookieMatch[1] : '',
    csrfToken: json.csrf_token || '',
  };
}

export function teardownAdmin(): void {
  setSuggestionQualityForTesting(null);
  invalidateAll();
  closeDb();
  setDb(null);
}
