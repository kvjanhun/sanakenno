/**
 * E2E tests for the paginated puzzle archive.
 *
 * Covers: archive button visibility, modal open/close, today highlight,
 * puzzle loading on click, header date display, "Tänään" navigation,
 * and the reveal-answers flow for past puzzles.
 *
 * Corresponds to: archive.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame, mockArchiveApi, TEST_WORDS } from './helpers';

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

  test('clicking a past date opens an action sheet with Pelaa / Näytä vastaukset', async ({
    page,
  }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    await expect(page.getByText('Arkisto')).toBeVisible();

    // Click the second entry (yesterday)
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();

    // Action sheet appears with both options; archive list is still mounted
    // beneath but the sheet is a separate dialog.
    await expect(
      page.getByRole('button', { name: 'Pelaa', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Näytä vastaukset' }),
    ).toBeVisible();
  });

  test('choosing Pelaa from the action sheet loads that puzzle', async ({
    page,
  }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();

    await page.getByRole('button', { name: 'Pelaa', exact: true }).click();

    // Modal should close
    await expect(page.getByText('Arkisto')).not.toBeVisible();

    // Header should show back arrow (indicating archive mode)
    const backBtn = page.locator('button[aria-label="Takaisin tähän päivään"]');
    await expect(backBtn).toBeVisible();
  });

  test('choosing Näytä vastaukset opens the word list for that puzzle', async ({
    page,
  }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    await page.locator('button[aria-label="Arkisto"]').click();
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();

    await page.getByRole('button', { name: 'Näytä vastaukset' }).click();

    // Words modal opens with the puzzle title and the full word list
    const wordsDialog = page.getByRole('dialog', {
      name: /Kenno #/,
    });
    await expect(wordsDialog).toBeVisible();
    for (const word of TEST_WORDS) {
      await expect(wordsDialog.getByText(word, { exact: true })).toBeVisible();
    }
  });

  test('a previously revealed past puzzle shows an eye indicator', async ({
    page,
  }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    // Reveal yesterday's puzzle once
    await page.locator('button[aria-label="Arkisto"]').click();
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();
    await page.getByRole('button', { name: 'Näytä vastaukset' }).click();
    await page
      .getByRole('dialog', { name: /Kenno #/ })
      .getByLabel('Sulje')
      .click();

    // Re-open the archive — the row should now show the indicator
    await page.locator('button[aria-label="Arkisto"]').click();
    const revealedRow = page.locator('button:has-text("Kenno #")').nth(1);
    await expect(
      revealedRow.locator('[aria-label="Vastaukset paljastettu"]'),
    ).toBeVisible();

    // And re-opening that row's action sheet shows the stats notice
    await revealedRow.click();
    await expect(
      page.getByText('Vastaukset on jo paljastettu', { exact: false }),
    ).toBeVisible();
  });

  test("back arrow returns to today's puzzle", async ({ page }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    // Open archive, pick a past entry, then choose Pelaa
    await page.locator('button[aria-label="Arkisto"]').click();
    const entries = page.locator('button:has-text("Kenno #")');
    await entries.nth(1).click();
    await page.getByRole('button', { name: 'Pelaa', exact: true }).click();

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
