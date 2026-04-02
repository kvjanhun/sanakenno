/**
 * E2E tests for the 7-day puzzle archive.
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

  test('archive modal opens and shows 7 days', async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('Arkisto')).toBeVisible();

    // Should have 7 day entries (each has "Kenno #" text)
    const entries = page.locator('button:has-text("Kenno #")');
    await expect(entries).toHaveCount(7);
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

    // Header should show "Tänään" link (indicating archive mode)
    await expect(page.getByText('Tänään →')).toBeVisible();
  });

  test('"Tänään" link returns to today\'s puzzle', async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    // Open archive and select yesterday
    await page.locator('button[aria-label="Arkisto"]').click();
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();

    // Now click "Tänään" to return
    await page.getByText('Tänään →').click();

    // Should return to normal title
    await expect(page.getByText('Sanakenno')).toBeVisible();
    await expect(page.getByText('Tänään →')).not.toBeVisible();
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
