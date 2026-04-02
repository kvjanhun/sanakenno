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
