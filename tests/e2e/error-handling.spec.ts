/**
 * E2E tests for error handling.
 *
 * Covers: API unreachable, retry button, malformed response,
 * achievement POST failure (fire-and-forget).
 *
 * Corresponds to: error-handling.feature
 */

import { test, expect } from '@playwright/test';
import { submitWord, mockPuzzleApi, createMockPuzzle } from './helpers';

test.describe('Network errors', () => {
  test('shows error message and retry button when API is unreachable', async ({
    page,
  }) => {
    // Mock API to fail
    await page.route('**/api/puzzle', async (route) => {
      await route.abort('connectionrefused');
    });

    await page.goto('/');

    // Should show error state
    await expect(page.getByText('Lataus epäonnistui')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Yritä uudelleen')).toBeVisible();
  });

  test('retry button fetches the puzzle again', async ({ page }) => {
    let shouldFail = true;

    await page.route('**/api/puzzle', async (route) => {
      if (shouldFail) {
        await route.abort('connectionrefused');
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockPuzzle()),
        });
      }
    });

    await page.route('**/api/achievement', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');

    // Wait for error state
    await expect(page.getByText('Yritä uudelleen')).toBeVisible({
      timeout: 10000,
    });

    // Switch to success before clicking retry
    shouldFail = false;

    // Click retry
    await page.getByText('Yritä uudelleen').click();

    // Game should load
    await expect(page.locator('svg polygon').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('malformed API response shows error state', async ({ page }) => {
    await page.route('**/api/puzzle', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not-json{{{',
      });
    });

    await page.goto('/');

    await expect(page.getByText('Lataus epäonnistui')).toBeVisible({
      timeout: 10000,
    });
  });

  test('achievement POST failure does not interrupt gameplay', async ({
    page,
  }) => {
    // Mock puzzle API normally, but achievement always fails
    await mockPuzzleApi(page);

    await page.route('**/api/achievement', async (route) => {
      await route.abort('connectionrefused');
    });

    await page.goto('/');
    await page.locator('svg polygon').first().waitFor({ timeout: 10000 });

    // Submit enough words to trigger a rank transition
    const words = ['kala', 'kana', 'taka', 'alas', 'saat', 'alka', 'akat'];
    for (const word of words) {
      await submitWord(page, word);
      // Brief pause between submissions to allow state updates
      await page.waitForTimeout(300);
    }

    // Game should still work — found words visible, no crash
    await expect(page.getByText('Löydetyt sanat')).toBeVisible();
  });
});
