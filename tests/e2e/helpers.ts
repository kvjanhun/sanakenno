/**
 * Shared helpers for Playwright E2E tests.
 *
 * All E2E tests use mocked API responses to ensure deterministic,
 * server-independent tests. Real API integration is covered by the
 * Cucumber BDD suite.
 *
 * @module tests/e2e/helpers
 */

import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';

/** Compute SHA-256 hex hash (matches both server and client implementations). */
function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Known test words for the mock puzzle (letters: a,e,k,l,n,s,t, center: a). */
export const TEST_WORDS = [
  'kala',
  'kana',
  'taka',
  'alas',
  'saat',
  'alka',
  'akat',
  'sanka',
  'kaste',
  'kanat',
  'lakana',
  'laskenta',
];

/** Build a deterministic mock puzzle response. */
export function createMockPuzzle() {
  return {
    center: 'a',
    letters: ['e', 'k', 'l', 'n', 's', 't'],
    word_hashes: TEST_WORDS.map(sha256),
    hint_data: {
      word_count: 12,
      pangram_count: 1,
      by_letter: { k: 4, a: 3, t: 1, s: 2, l: 2 },
      by_length: { '4': 7, '5': 3, '6': 1, '8': 1 },
      by_pair: { ka: 4, ta: 1, al: 2, sa: 2, ak: 1, la: 2 },
    },
    max_score: 43,
    puzzle_number: 0,
    total_puzzles: 1,
  };
}

/**
 * Intercept API routes with mock responses.
 * Must be called BEFORE page.goto().
 */
export async function mockPuzzleApi(page: Page) {
  const puzzle = createMockPuzzle();

  await page.route('**/api/puzzle', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(puzzle),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/achievement', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  return puzzle;
}

/** Set up mocks, navigate to the app, and wait for the honeycomb to render. */
export async function loadGame(page: Page) {
  const puzzle = await mockPuzzleApi(page);
  await page.goto('/');
  await page.locator('svg polygon').first().waitFor({ timeout: 10000 });
  return puzzle;
}

/** Press individual letter keys to type a word. */
export async function typeWord(page: Page, word: string) {
  for (const letter of word) {
    await page.keyboard.press(letter);
  }
}

/** Type a word and press Enter. */
export async function submitWord(page: Page, word: string) {
  await typeWord(page, word);
  await page.keyboard.press('Enter');
}
