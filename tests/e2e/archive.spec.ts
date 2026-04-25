/**
 * E2E tests for the paginated puzzle archive.
 *
 * Covers: archive button visibility, modal open/close, today highlight,
 * puzzle loading on click, header date display, and "Tänään" navigation.
 *
 * Corresponds to: archive.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame, mockArchiveApi } from './helpers';

test.describe('Archive', () => {
  test('archive button is visible in the header', async ({ page }) => {
    await loadGame(page);
    const btn = page.locator('button[aria-label="Arkisto"]');
    await expect(btn).toBeVisible();
  });

  test('archive modal opens and shows today plus one page of past puzzles', async ({
    page,
  }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('Arkisto')).toBeVisible();

    // Today is pinned, and the first page contains 8 past entries.
    const entries = page.locator('button:has-text("Kenno #")');
    await expect(entries).toHaveCount(9);
  });

  test('archive pagination controls navigate pages', async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('1 / 3')).toBeVisible();

    const next = page.getByRole('button', { name: 'Seuraava' });
    await next.click();

    await expect(page.getByText('2 / 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edellinen' })).toBeEnabled();
  });

  test("today's puzzle is labelled in the archive", async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('tänään')).toBeVisible();
  });

  test('clicking a past date loads that puzzle', async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('Arkisto')).toBeVisible();

    // Click the second entry (yesterday)
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();

    // Modal should close
    await expect(page.getByText('Arkisto')).not.toBeVisible();

    // Header should show back arrow (indicating archive mode)
    const backBtn = page.locator('button[aria-label="Takaisin tähän päivään"]');
    await expect(backBtn).toBeVisible();
  });

  test("back arrow returns to today's puzzle", async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    // Open archive and select yesterday
    await page.locator('button[aria-label="Arkisto"]').click();
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();

    // Now click back arrow to return
    await page.locator('button[aria-label="Takaisin tähän päivään"]').click();

    // Should return to normal title
    await expect(page.getByText('Sanakenno')).toBeVisible();
  });

  test('archive modal closes on Escape', async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('Arkisto')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Arkisto')).not.toBeVisible();
  });

  test('archive modal closes on background click', async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('Arkisto')).toBeVisible();

    // Click the overlay (top-left corner, outside modal)
    await page.mouse.click(10, 10);
    await expect(page.getByText('Arkisto')).not.toBeVisible();
  });
});
