/**
 * E2E tests for player stats modal.
 *
 * Covers: stats button visibility, modal open/close, display of
 * summary statistics, and stats recording after word submission.
 *
 * Corresponds to: stats.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame, submitWord } from './helpers';

test.describe('Stats', () => {
  test('stats button is visible in the header', async ({ page }) => {
    await loadGame(page);
    const btn = page.locator('button[aria-label="Tilastot"]');
    await expect(btn).toBeVisible();
  });

  test('stats modal opens and shows empty state', async ({ page }) => {
    await loadGame(page);
    await page.locator('button[aria-label="Tilastot"]').click();
    await expect(page.getByText('Tilastot')).toBeVisible();
    await expect(page.getByText('Ei vielä tilastoja')).toBeVisible();
  });

  test('stats modal shows data after playing', async ({ page }) => {
    await loadGame(page);

    // Submit some words to generate stats
    await submitWord(page, 'kala');
    await page.waitForTimeout(200);
    await submitWord(page, 'kana');
    await page.waitForTimeout(200);

    // Open stats
    await page.locator('button[aria-label="Tilastot"]').click();
    await expect(page.getByText('Tilastot')).toBeVisible();

    // Should show "Pelattu" section with at least 1 puzzle
    await expect(page.getByText('Pelattu')).toBeVisible();
    // Should show streak section
    await expect(page.getByText('Paras putki')).toBeVisible();
  });

  test('stats modal shows lifetime totals from localStorage', async ({
    page,
  }) => {
    await loadGame(page);
    await page.evaluate(() => {
      localStorage.setItem(
        'sanakenno_player_stats',
        JSON.stringify({
          version: 1,
          records: [
            {
              puzzle_number: 1,
              date: '2026-04-01',
              best_rank: 'Onnistuja',
              best_score: 12,
              max_score: 43,
              words_found: 4,
              hints_used: 0,
              elapsed_ms: 60000,
              longest_word: 'kala',
              pangrams_found: 1,
            },
            {
              puzzle_number: 2,
              date: '2026-04-02',
              best_rank: 'Sanavalmis',
              best_score: 24,
              max_score: 43,
              words_found: 7,
              hints_used: 1,
              elapsed_ms: 90000,
              longest_word: 'laskenta',
              pangrams_found: 2,
            },
          ],
        }),
      );
    });

    await page.locator('button[aria-label="Tilastot"]').click();

    await expect(page.getByText('Kaikki pelit')).toBeVisible();
    await expect(page.getByText('Sanoja', { exact: true })).toBeVisible();
    await expect(page.getByText('Pangrammeja')).toBeVisible();
    await expect(page.getByText('laskenta')).toBeVisible();
    await expect(page.getByText('11')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
  });

  test('stats modal closes on Escape', async ({ page }) => {
    await loadGame(page);
    await page.locator('button[aria-label="Tilastot"]').click();
    await expect(page.getByText('Tilastot')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Tilastot')).not.toBeVisible();
  });

  test('stats modal closes on background click', async ({ page }) => {
    await loadGame(page);
    await page.locator('button[aria-label="Tilastot"]').click();
    await expect(page.getByText('Tilastot')).toBeVisible();

    await page.mouse.click(10, 10);
    await expect(page.getByText('Tilastot')).not.toBeVisible();
  });
});
