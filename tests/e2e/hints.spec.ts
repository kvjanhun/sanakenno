/**
 * E2E tests for hint panel persistence and share integration.
 *
 * Covers: unlock state persists across reload, active tab state does not
 * persist, unlocked hints appear as icons in the share text.
 *
 * Corresponds to: hints.feature (@e2e scenarios)
 */

import { test, expect } from '@playwright/test';
import { loadGame } from './helpers';

/** Open a hint tab and unlock it via the "Aktivoi apu" button. */
async function unlockHint(
  page: import('@playwright/test').Page,
  tabLabel: string,
) {
  await page.getByText(tabLabel).click();
  await page.getByText('Aktivoi apu').click();
}

test.describe('Hint unlock persistence', () => {
  test('unlock state survives a page reload', async ({ page }) => {
    await loadGame(page);
    await unlockHint(page, 'Yleiskuva');

    // Close the tab, reload, then reopen
    await page.getByText('Yleiskuva').click(); // close
    await loadGame(page);

    await page.getByText('Yleiskuva').click(); // reopen after reload
    // Content should appear immediately — no "Aktivoi apu" prompt
    await expect(page.getByText('Aktivoi apu')).not.toBeVisible();
    await expect(page.getByText('Pisin jäljellä', { exact: false })).toBeVisible();
  });

  test('active tab state does not persist across reload', async ({ page }) => {
    await loadGame(page);
    await unlockHint(page, 'Yleiskuva');
    // Tab is now open and unlocked — content is visible

    await loadGame(page); // reload

    // After reload, no tab should be active — the content box should be gone
    await expect(
      page.getByText('jäljellä', { exact: false }),
    ).not.toBeVisible();
    await expect(page.getByText('Sanoja jäljellä')).not.toBeVisible();
  });
});

test.describe('Hint share integration', () => {
  test('unlocked summary hint appears as 📊 in share text', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadGame(page);
    await unlockHint(page, 'Yleiskuva');

    // Click share — first instance of "Jaa tulos" (in RankProgress, not Celebration)
    await page.getByText('Jaa tulos').first().click();

    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).toContain('\u{1F4CA}'); // 📊
  });

  test('unlocked pairs hint appears as 🔠 in share text', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadGame(page);
    await unlockHint(page, 'Alkuparit');

    await page.getByText('Jaa tulos').first().click();

    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).toContain('\u{1F520}'); // 🔠
  });

  test('no hints unlocked means no hint icon line in share text', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadGame(page);

    await page.getByText('Jaa tulos').first().click();

    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).not.toContain('Avut:');
  });
});
