/**
 * E2E tests for the game timer (startedAt persistence, pause/resume events).
 *
 * The timer tracks play time in React refs and persists startedAt /
 * totalPausedMs to localStorage when game state is saved (on word submit).
 *
 * These tests verify the observable surface: localStorage values after
 * submission and correct restoration after a page reload.
 *
 * Corresponds to: timer.feature (@e2e scenarios)
 */

import { test, expect } from '@playwright/test';
import { loadGame, submitWord } from './helpers';

test.describe('Timer persistence', () => {
  test('startedAt is saved to localStorage when the puzzle loads', async ({
    page,
  }) => {
    const before = Date.now();
    await loadGame(page);

    // Submit a word to trigger saveState (which persists startedAt)
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    const stored = await page.evaluate(() =>
      localStorage.getItem('sanakenno_state_0'),
    );
    expect(stored).not.toBeNull();
    const { startedAt } = JSON.parse(stored!);
    expect(startedAt).toBeGreaterThanOrEqual(before);
    expect(startedAt).toBeLessThanOrEqual(Date.now());
  });

  test('startedAt is restored after page reload', async ({ page }) => {
    await loadGame(page);

    // Submit to persist state
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    const stored = await page.evaluate(() =>
      localStorage.getItem('sanakenno_state_0'),
    );
    const { startedAt: originalStartedAt } = JSON.parse(stored!);

    // Reload — app should restore from localStorage
    await loadGame(page);

    await expect(page.getByText('kala')).toBeVisible({ timeout: 5000 });

    const storedAfter = await page.evaluate(() =>
      localStorage.getItem('sanakenno_state_0'),
    );
    const { startedAt: restoredStartedAt } = JSON.parse(storedAfter!);
    expect(restoredStartedAt).toBe(originalStartedAt);
  });
});

test.describe('Timer pause/resume events', () => {
  test('game continues normally when tab visibility changes', async ({
    page,
  }) => {
    await loadGame(page);

    // Simulate tab hidden → visible cycle
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Game should still be fully functional after the events
    await page.keyboard.type('kala');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });
  });

  test('game continues normally after pagehide fires', async ({ page }) => {
    await loadGame(page);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    // Should still be usable
    await page.keyboard.type('kala');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });
  });

  test('game continues normally after window blur and focus', async ({
    page,
  }) => {
    await loadGame(page);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });

    await page.keyboard.type('kala');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });
  });
});
