/**
 * E2E tests for theme toggle functionality.
 *
 * Covers: system preference default, manual toggle, localStorage persistence.
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

    const toggleButton = page.locator('button[aria-label*="teemaan"]');
    await toggleButton.click();

    expect(await effectiveScheme(page)).toBe('dark');
  });

  test('theme preference persists in localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    // Toggle to dark
    const toggleButton = page.locator('button[aria-label*="teemaan"]');
    await toggleButton.click();

    // Check localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem('sanakenno_theme'),
    );
    expect(stored).toBe('"dark"');
  });

  test('theme preference survives page reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    await page.locator('button[aria-label*="teemaan"]').click();
    expect(await effectiveScheme(page)).toBe('dark');

    await loadGame(page);

    expect(await effectiveScheme(page)).toBe('dark');
  });
});
