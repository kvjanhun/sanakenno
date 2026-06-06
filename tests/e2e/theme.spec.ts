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

    await page.getByRole('button', { name: 'Ulkoasu' }).click();
    await page.getByRole('menuitemradio', { name: 'Tumma' }).click();

    expect(await effectiveScheme(page)).toBe('dark');
  });

  test('theme preference persists in localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    await page.getByRole('button', { name: 'Ulkoasu' }).click();
    await page.getByRole('menuitemradio', { name: 'Tumma' }).click();

    // Check localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem('sanakenno_theme'),
    );
    expect(stored).toBe('"dark"');
  });

  test('theme preference survives page reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    await page.getByRole('button', { name: 'Ulkoasu' }).click();
    await page.getByRole('menuitemradio', { name: 'Tumma' }).click();
    expect(await effectiveScheme(page)).toBe('dark');

    await loadGame(page);

    expect(await effectiveScheme(page)).toBe('dark');
  });

  test('appearance menu changes palette and persists selection', async ({
    page,
  }) => {
    await loadGame(page);

    const appearance = page.getByRole('button', { name: 'Ulkoasu' });
    await expect(appearance).toBeVisible();
    await appearance.click();

    const menu = page.getByRole('menu', { name: 'Ulkoasu' });
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('menuitemradio', { name: 'Hehku' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      menu.getByRole('menuitemradio', { name: 'Laite' }),
    ).toHaveAttribute('aria-checked', 'true');

    await menu.getByRole('menuitemradio', { name: 'Meri' }).click();

    await expect(menu).not.toBeVisible();
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

    await page.getByRole('button', { name: 'Ulkoasu' }).click();
    await page.getByRole('menuitemradio', { name: 'Tumma' }).click();
    expect(await effectiveScheme(page)).toBe('dark');

    await page.getByRole('button', { name: 'Ulkoasu' }).click();
    await page.getByRole('menuitemradio', { name: 'Laite' }).click();

    expect(await effectiveScheme(page)).toBe('light');
    expect(
      await page.evaluate(() => localStorage.getItem('sanakenno_theme')),
    ).toBe('"system"');
  });

  test('appearance menu closes on Escape and outside click', async ({
    page,
  }) => {
    await loadGame(page);

    const appearance = page.getByRole('button', { name: 'Ulkoasu' });
    await appearance.click();
    await expect(page.getByRole('menu', { name: 'Ulkoasu' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'Ulkoasu' })).not.toBeVisible();

    await appearance.click();
    await expect(page.getByRole('menu', { name: 'Ulkoasu' })).toBeVisible();
    await page.mouse.click(10, 200);
    await expect(page.getByRole('menu', { name: 'Ulkoasu' })).not.toBeVisible();
  });
});
