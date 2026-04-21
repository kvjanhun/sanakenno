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

const VISIBLE_HINT_TABS = ['Yleiskuva', 'Pituudet', 'Alkuparit'] as const;

/** Open a hint tab and unlock it via the "Aktivoi apu" button. */
async function unlockHint(
  page: import('@playwright/test').Page,
  tabLabel: string,
) {
  await page.getByText(tabLabel).click();
  await page.getByRole('button', { name: 'Aktivoi apu' }).click();
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
    await expect(
      page.getByText('sanaa löytämättä', { exact: false }),
    ).toBeVisible();
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

  test('opening any visible hint does not move the play area down', async ({
    page,
  }) => {
    await loadGame(page);

    const honeycomb = page.getByRole('img', { name: /Kirjainkenno:/ });
    const deleteButton = page.getByRole('button', { name: 'Poista' });
    const beforeBox = await honeycomb.boundingBox();
    const beforeDeleteBox = await deleteButton.boundingBox();
    if (!beforeBox)
      throw new Error('Honeycomb should be visible before opening hints');
    if (!beforeDeleteBox)
      throw new Error('Delete button should be visible before opening hints');

    for (const tabLabel of VISIBLE_HINT_TABS) {
      await page.getByRole('button', { name: tabLabel }).click();

      const afterBox = await honeycomb.boundingBox();
      const afterDeleteBox = await deleteButton.boundingBox();
      if (!afterBox)
        throw new Error('Honeycomb should stay visible after opening hints');
      if (!afterDeleteBox)
        throw new Error(
          'Delete button should stay visible after opening hints',
        );

      expect(afterBox.y).toBeCloseTo(beforeBox.y, 0);
      expect(afterDeleteBox.y).toBeCloseTo(beforeDeleteBox.y, 0);

      await page.getByRole('button', { name: tabLabel }).click();
    }
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

    // Click share — first instance of "Jaa" (in RankProgress, not Celebration)
    await page.getByText('Jaa').first().click();

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

    await page.getByText('Jaa').first().click();

    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).toContain('\u{1F520}'); // 🔠
  });

  test('no hints unlocked means no hint icon line in share text', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadGame(page);

    await page.getByText('Jaa').first().click();

    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).not.toContain('Avut:');
  });
});
