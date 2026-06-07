/**
 * E2E tests for theme toggle functionality.
 *
 * Covers: system preference default, appearance menu changes, localStorage
 * persistence.
 *
 * Corresponds to: theme.feature
 */

import { test, expect, type Page } from '@playwright/test';
import { loadGame } from './helpers';

/** Return the resolved light/dark scheme, whether set explicitly or inherited from the OS. */
async function effectiveScheme(page: Page): Promise<'light' | 'dark'> {
  return page.evaluate(() => {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
}

test.describe('Theme toggle', () => {
  test('defaults to system preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await loadGame(page);

    expect(await effectiveScheme(page)).toBe('dark');
  });

  test('toggle switches from light to dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    expect(await effectiveScheme(page)).toBe('light');

    await page.getByRole('button', { name: 'Asetukset' }).click();
    await page.getByRole('radio', { name: 'Tumma' }).click();

    expect(await effectiveScheme(page)).toBe('dark');
  });

  test('theme preference persists in localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    await page.getByRole('button', { name: 'Asetukset' }).click();
    await page.getByRole('radio', { name: 'Tumma' }).click();

    // Check localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem('sanakenno_theme'),
    );
    expect(stored).toBe('"dark"');
  });

  test('theme preference survives page reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    await page.getByRole('button', { name: 'Asetukset' }).click();
    await page.getByRole('radio', { name: 'Tumma' }).click();
    expect(await effectiveScheme(page)).toBe('dark');

    await loadGame(page);

    expect(await effectiveScheme(page)).toBe('dark');
  });

  test('appearance menu changes palette and persists selection', async ({
    page,
  }) => {
    await loadGame(page);

    const settings = page.getByRole('button', { name: 'Asetukset' });
    await expect(settings).toBeVisible();
    await settings.click();

    const dialog = page.getByRole('dialog', { name: 'Asetukset' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Hehku' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(dialog.getByRole('radio', { name: 'Laite' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await dialog.getByRole('radio', { name: 'Meri' }).click();
    await dialog.getByRole('button', { name: 'Sulje' }).click();
    await expect(dialog).not.toBeVisible();

    expect(
      await page.evaluate(() =>
        document.documentElement.getAttribute('data-palette'),
      ),
    ).toBe('meri');
    expect(
      await page.evaluate(() => localStorage.getItem('sanakenno_palette')),
    ).toBe('"meri"');
  });

  test('appearance menu can save system theme preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    await page.getByRole('button', { name: 'Asetukset' }).click();
    const dialog = page.getByRole('dialog', { name: 'Asetukset' });
    await dialog.getByRole('radio', { name: 'Tumma' }).click();
    expect(await effectiveScheme(page)).toBe('dark');

    await dialog.getByRole('radio', { name: 'Laite' }).click();

    expect(await effectiveScheme(page)).toBe('light');
    expect(
      await page.evaluate(() => localStorage.getItem('sanakenno_theme')),
    ).toBe('"system"');
  });

  test('settings modal closes on Escape and outside click', async ({
    page,
  }) => {
    await loadGame(page);

    const settings = page.getByRole('button', { name: 'Asetukset' });
    await settings.click();
    const dialog = page.getByRole('dialog', { name: 'Asetukset' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    await settings.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(dialog).not.toBeVisible();
  });
});
