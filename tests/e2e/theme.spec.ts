/**
 * E2E tests for theme toggle functionality.
 *
 * Covers: system preference default, manual toggle, localStorage persistence.
 *
 * Corresponds to: theme.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('Theme toggle', () => {
  test('defaults to system preference', async ({ page }) => {
    // Emulate dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await loadGame(page);

    const theme = await page.getAttribute('html', 'data-theme');
    expect(theme).toBe('dark');
  });

  test('toggle switches from light to dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loadGame(page);

    const themeBefore = await page.getAttribute('html', 'data-theme');
    expect(themeBefore).toBe('light');

    // Click theme toggle button
    const toggleButton = page.locator('button[aria-label*="teemaan"]');
    await toggleButton.click();

    const themeAfter = await page.getAttribute('html', 'data-theme');
    expect(themeAfter).toBe('dark');
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

    // Toggle to dark
    await page.locator('button[aria-label*="teemaan"]').click();
    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');

    // Reload
    await loadGame(page);

    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
  });
});
