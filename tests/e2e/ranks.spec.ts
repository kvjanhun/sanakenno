/**
 * E2E tests for rank celebration overlays and rank-change toasts.
 *
 * Uses pre-seeded localStorage state to set the score near each rank
 * threshold, then submits one known test word to cross into the target rank.
 *
 * Mock puzzle max_score = 43. Rank thresholds (ceil %):
 *   Onnistuja (20%)  = 9 pts   → pre-seed 7 pts, submit sanka (+5)  → 12 pts
 *   Ällistyttävä (70%) = 31 pts → pre-seed 23 pts, submit laskenta (+15) → 38 pts
 *   Täysi kenno (100%) = 43 pts → pre-seed 38 pts, submit sanka (+5)   → 43 pts
 *
 * Corresponds to: ranks.feature (@e2e scenarios)
 */

import { test, expect } from '@playwright/test';
import { mockPuzzleApi } from './helpers';

/**
 * Pre-seed localStorage with game state, then load the game.
 * The state structure matches PersistedState in useGameStore.
 */
async function loadGameWithState(
  page: import('@playwright/test').Page,
  state: { score: number; foundWords: string[]; hintsUnlocked?: string[] },
) {
  // Route mock persists across page.reload() — attach once
  await mockPuzzleApi(page);
  await page.goto('/');

  // Wait for initial load so localStorage is accessible
  await page.locator('svg polygon').first().waitFor({ timeout: 10_000 });

  // Seed state, then reload so the app picks it up on init
  await page.evaluate((s) => {
    localStorage.setItem(
      'sanakenno_state_0',
      JSON.stringify({
        foundWords: s.foundWords,
        score: s.score,
        hintsUnlocked: s.hintsUnlocked ?? [],
        startedAt: Date.now() - 60_000,
        totalPausedMs: 0,
      }),
    );
  }, state);

  await page.reload();
  await page.locator('svg polygon').first().waitFor({ timeout: 10_000 });
}

test.describe('Rank celebrations', () => {
  test('Ällistyttävä rank shows celebration overlay', async ({ page }) => {
    // Pre-seed: 23 pts (Sanavalmis). Submit laskenta (pangram, +15) → 38 pts → Ällistyttävä
    await loadGameWithState(page, {
      score: 23,
      foundWords: [
        'kala',
        'kana',
        'taka',
        'alas',
        'saat',
        'alka',
        'akat',
        'kaste',
        'kanat',
        'lakana',
      ],
    });

    await page.keyboard.type('laskenta');
    await page.keyboard.press('Enter');

    // Celebration overlay with role="dialog" and the rank title
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Ällistyttävä!')).toBeVisible();
  });

  test('Täysi kenno rank shows golden celebration overlay', async ({
    page,
  }) => {
    // Pre-seed: 38 pts (Ällistyttävä). Submit sanka (+5) → 43 pts → Täysi kenno
    await loadGameWithState(page, {
      score: 38,
      foundWords: [
        'kala',
        'kana',
        'taka',
        'alas',
        'saat',
        'alka',
        'akat',
        'kaste',
        'kanat',
        'lakana',
        'laskenta',
      ],
    });

    await page.keyboard.type('sanka');
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Täysi kenno!')).toBeVisible();
  });

  test('other rank transitions update the rank pill', async ({ page }) => {
    // Pre-seed: 7 pts (Nyt mennään!). Submit sanka (+5) → 12 pts → Onnistuja
    await loadGameWithState(page, {
      score: 7,
      foundWords: ['kala', 'kana', 'taka', 'alas', 'saat', 'alka', 'akat'],
    });

    await page.keyboard.type('sanka');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('button', { name: 'Onnistuja' })).toBeVisible({
      timeout: 5000,
    });
  });
});
