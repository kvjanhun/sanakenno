/**
 * E2E tests for keyboard accessibility and touch behaviour.
 *
 * Covers: modifier keys ignored, Tab key passthrough,
 * Finnish-only input, touch-action CSS.
 *
 * Corresponds to: accessibility.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame, submitWord } from './helpers';

test.describe('Keyboard accessibility', () => {
  test('modifier keys do not add letters', async ({ page }) => {
    await loadGame(page);

    // Ctrl+A should not add 'a'
    await page.keyboard.press('Control+a');
    // Alt+K should not add 'k'
    await page.keyboard.press('Alt+k');
    // Meta+S should not add 's'
    await page.keyboard.press('Meta+s');

    const display = page.locator('[aria-atomic="true"]').first();
    // Should show the idle cursor, not any letters
    await expect(display).not.toContainText('A');
    await expect(display).not.toContainText('K');
    await expect(display).not.toContainText('S');
  });

  test('Tab key does not add a letter', async ({ page }) => {
    await loadGame(page);
    await page.keyboard.press('Tab');

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).not.toContainText('TAB');
  });

  test('only Finnish letter keys produce input', async ({ page }) => {
    await loadGame(page);

    // Numbers and symbols should be ignored
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('+');
    await page.keyboard.press('=');

    // Finnish letters should work
    await page.keyboard.press('k');

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('K');
    // Should only have 'K', not numbers
    const text = await display.textContent();
    expect(text?.replace(/\s/g, '')).toBe('K');
  });
});

test.describe('Touch behaviour', () => {
  test('main container has touch-action: manipulation', async ({ page }) => {
    await loadGame(page);

    // Target the main content container (has inline touch-action style), not the header
    const container = page.locator('div.max-w-sm[style*="touch-action"]');
    const touchAction = await container.evaluate(
      (el) => getComputedStyle(el).touchAction,
    );
    expect(touchAction).toBe('manipulation');
  });

  test('safe area padding is applied by app layout', async ({ page }) => {
    await loadGame(page);

    // The main container should have paddingBottom using env(safe-area-inset-bottom)
    const container = page.locator('div.max-w-sm[style*="safe-area"]');
    const style = await container.getAttribute('style');
    expect(style).toContain('safe-area-inset-bottom');

    const htmlHasSafeAreaPadding = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRule[];
        try {
          rules = Array.from(sheet.cssRules);
        } catch {
          continue;
        }

        for (const rule of rules) {
          if (
            rule instanceof CSSStyleRule &&
            rule.selectorText === 'html' &&
            rule.style.padding.includes('safe-area-inset')
          ) {
            return true;
          }
        }
      }

      return false;
    });
    expect(htmlHasSafeAreaPadding).toBe(false);
  });

  test('normal phone viewport does not scroll collapsed gameplay', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadGame(page);
    await submitWord(page, 'kala');

    await expect(page.getByText(/löydetty/i)).toBeVisible();

    const metrics = await page.evaluate(() => {
      const scrollingElement =
        document.scrollingElement ?? document.documentElement;
      return {
        clientHeight: scrollingElement.clientHeight,
        scrollHeight: scrollingElement.scrollHeight,
      };
    });

    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);

    const gameSurface = await page
      .locator('[data-game-scroll]')
      .evaluate((el) => ({
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      }));
    expect(gameSurface.scrollHeight).toBeLessThanOrEqual(
      gameSurface.clientHeight + 1,
    );
  });

  test('small phone viewport scrolls the game surface', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 560 });
    await loadGame(page);
    await submitWord(page, 'kala');

    await expect(page.getByText(/löydetty/i)).toBeVisible();

    const scrollTop = await page
      .locator('[data-game-scroll]')
      .evaluate((el) => {
        el.scrollTop = el.scrollHeight;
        return el.scrollTop;
      });

    expect(scrollTop).toBeGreaterThan(0);
  });
});
