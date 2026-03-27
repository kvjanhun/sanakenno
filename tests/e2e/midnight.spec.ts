/**
 * E2E tests for midnight puzzle rollover.
 *
 * Uses Playwright's page.clock API to control Date and setTimeout without
 * waiting real time. The useMidnightRollover hook schedules a reload via
 * window.setTimeout(reload, msUntilMidnight()) and also reloads on
 * visibilitychange if the date has changed since mount.
 *
 * Corresponds to: puzzle.feature (@e2e midnight scenarios)
 */

import { test, expect } from '@playwright/test';
import { loadGame, mockPuzzleApi, submitWord } from './helpers';

/** Install the Playwright fake clock at a specific wall-clock time. */
async function installClockAt(
  page: import('@playwright/test').Page,
  isoTime: string,
) {
  await page.clock.install({ time: new Date(isoTime).getTime() });
}

test.describe('Midnight rollover', () => {
  test('timer fires at midnight and triggers page reload', async ({ page }) => {
    // Place clock 2 minutes before midnight
    await installClockAt(page, '2026-03-27T23:58:00');
    await loadGame(page);

    // Advance 3 minutes — past midnight — and wait for the reload navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10_000 }),
      page.clock.fastForward(3 * 60 * 1000),
    ]);

    // After reload the app should display a new puzzle request (mock still active)
    await expect(page.locator('svg polygon').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('app detects date change when suspended tab becomes visible', async ({
    page,
  }) => {
    // Start at 23:45 — well before midnight
    await installClockAt(page, '2026-03-27T23:45:00');
    await loadGame(page);

    // Simulate tab being hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance clock past midnight while tab is "hidden"
    await page.clock.fastForward(20 * 60 * 1000); // +20 min → 00:05

    // Reveal the tab — the hook should detect date mismatch and reload
    await Promise.all([
      page.waitForNavigation({ timeout: 10_000 }),
      page
        .evaluate(() => {
          Object.defineProperty(document, 'hidden', {
            value: false,
            configurable: true,
            writable: true,
          });
          document.dispatchEvent(new Event('visibilitychange'));
        })
        .catch((e) => {
          // Ignore context destruction error if navigation starts immediately
          if (!e.message.includes('context was destroyed')) throw e;
        }),
    ]);

    await expect(page.locator('svg polygon').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('today state is already saved in localStorage before rollover', async ({
    page,
  }) => {
    await installClockAt(page, '2026-03-27T23:58:00');
    await loadGame(page);

    // Submit a word so state is persisted
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    // Verify state is in localStorage before advancing clock
    const stored = await page.evaluate(() =>
      localStorage.getItem('sanakenno_state_0'),
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.foundWords).toContain('kala');

    // Advance past midnight — triggers reload
    await Promise.all([
      page.waitForNavigation({ timeout: 10_000 }),
      page.clock.fastForward(3 * 60 * 1000),
    ]);

    // Old puzzle state should still be in localStorage after reload
    const storedAfter = await page.evaluate(() =>
      localStorage.getItem('sanakenno_state_0'),
    );
    expect(storedAfter).not.toBeNull();
    const parsedAfter = JSON.parse(storedAfter!);
    expect(parsedAfter.foundWords).toContain('kala');
  });

  test('midnight rollover fetches the new puzzle', async ({ page }) => {
    await installClockAt(page, '2026-03-27T23:58:00');

    // First load: puzzle_number = 0
    await mockPuzzleApi(page);
    await page.goto('/');
    await page.locator('svg polygon').first().waitFor({ timeout: 10_000 });

    // Advance past midnight — triggers reload
    await Promise.all([
      page.waitForRequest('**/api/puzzle'),
      page.waitForNavigation({ timeout: 10_000 }),
      page.clock.fastForward(3 * 60 * 1000),
    ]);

    // The app made a new API request after reload
    await expect(page.locator('svg polygon').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
