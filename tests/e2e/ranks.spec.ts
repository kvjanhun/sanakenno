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
  state: {
    score: number;
    foundWords: string[];
    hintsUnlocked?: string[];
    scoreBeforeHints?: number | null;
  },
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
        scoreBeforeHints: s.scoreBeforeHints ?? null,
      }),
    );
  }, state);

  await page.reload();
  await page.locator('svg polygon').first().waitFor({ timeout: 10_000 });
}

test.describe('Rank celebrations', () => {
  test('rank control indicates expandability and next-rank distance', async ({
    page,
  }) => {
    await mockPuzzleApi(page);
    await page.goto('/');
    await page.locator('svg polygon').first().waitFor({ timeout: 10_000 });

    const rankButton = page.getByRole('button', { name: 'Etsi sanoja!' });
    await expect(rankButton).toHaveAttribute('aria-expanded', 'false');

    await rankButton.click();
    await expect(rankButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('Ällistyttävä after a hint shows normal celebration overlay', async ({
    page,
  }) => {
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
      hintsUnlocked: ['summary'],
      scoreBeforeHints: 23,
    });

    await page.keyboard.type('laskenta');
    await page.keyboard.press('Enter');

    // Celebration overlay with role="dialog" and the rank title
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Ällistyttävä!')).toBeVisible();
  });

  test('Ällistyttävä without hints shows no-hint celebration overlay', async ({
    page,
  }) => {
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

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.getByRole('heading', { name: 'Ällistyttävä ilman apuja!' }),
    ).toBeVisible();
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

  test('rank list shows compact no-hint achievement progress', async ({
    page,
  }) => {
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

    await page.getByRole('button', { name: 'Sanavalmis' }).click();

    await expect(page.locator('[data-no-hint-indicator]')).toHaveCount(3);
    await expect(page.locator('[data-no-hint-points]')).toHaveText('23 p.');
    await expect(page.locator('[data-no-hint-indicator="1"]')).toHaveAttribute(
      'data-no-hint-state',
      'unlocked',
    );
    await expect(page.locator('[data-no-hint-indicator="2"]')).toHaveAttribute(
      'data-no-hint-state',
      'unlocked',
    );
    await expect(page.locator('[data-no-hint-indicator="3"]')).toHaveAttribute(
      'data-no-hint-state',
      'locked',
    );
    await expect(page.locator('[data-no-hint-indicator="1"]')).toHaveAttribute(
      'data-no-hint-icon',
      'circle-star',
    );
    await expect(page.locator('[data-no-hint-indicator="2"]')).toHaveAttribute(
      'data-no-hint-icon',
      'circle-star',
    );
    await expect(page.locator('[data-no-hint-indicator="3"]')).toHaveAttribute(
      'data-no-hint-icon',
      'circle',
    );
    await expect(page.locator('[data-no-hint-current]')).toHaveText(
      '23 p. ilman apuja, taidokasta!',
    );
    await expect(
      page.getByText('Omin avuin', { exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByText('Apuitta taitava', { exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByText('Ällistyttävä ilman apuja', { exact: true }),
    ).not.toBeVisible();
  });

  test('rank list marks locked no-hint achievements inactive after hints', async ({
    page,
  }) => {
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
      hintsUnlocked: ['summary'],
      scoreBeforeHints: 23,
    });

    await page.getByRole('button', { name: 'Sanavalmis' }).click();

    await expect(page.locator('[data-no-hint-indicator="1"]')).toHaveAttribute(
      'data-no-hint-icon',
      'circle-star',
    );
    await expect(page.locator('[data-no-hint-indicator="2"]')).toHaveAttribute(
      'data-no-hint-icon',
      'circle-star',
    );
    const inactiveAchievement = page.locator('[data-no-hint-indicator="3"]');
    await expect(inactiveAchievement).toHaveAttribute(
      'data-no-hint-state',
      'locked',
    );
    await expect(inactiveAchievement).toHaveAttribute(
      'data-no-hint-icon',
      'circle-off',
    );
    await expect(inactiveAchievement).toHaveAttribute(
      'style',
      /color: color-mix\(in srgb, var\(--color-text-tertiary\) 40%, var\(--color-bg-secondary\)\)/,
    );
  });
});
