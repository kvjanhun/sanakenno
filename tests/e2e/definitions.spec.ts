/**
 * E2E tests for word definitions (Kotus dictionary links).
 *
 * Covers: link rendering in expanded found-words list, correct href,
 * target/rel attributes, and collapsed view exclusion.
 *
 * Corresponds to: definitions.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame, submitWord } from './helpers';

/** Submit enough words to trigger the "Kaikki" expand toggle (needs >6). */
async function submitManyWords(page: import('@playwright/test').Page) {
  const words = ['kala', 'kana', 'taka', 'alas', 'saat', 'alka', 'akat'];
  for (const w of words) {
    await submitWord(page, w);
    // Brief pause to let state settle
    await page.waitForTimeout(150);
  }
}

test.describe('Word definitions', () => {
  test('expanded found word is a link to Kotus dictionary', async ({
    page,
  }) => {
    await loadGame(page);
    await submitManyWords(page);

    // Expand the found words list
    const expandBtn = page.getByText('Kaikki');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const link = page.locator('a[href*="kielitoimistonsanakirja.fi"]', {
      hasText: 'kala',
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      'https://www.kielitoimistonsanakirja.fi/#/kala',
    );
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('found word link has descriptive title', async ({ page }) => {
    await loadGame(page);
    await submitManyWords(page);

    const expandBtn = page.getByText('Kaikki');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const link = page.locator('a[href*="kielitoimistonsanakirja.fi"]', {
      hasText: 'kala',
    });
    await expect(link).toBeVisible();
    const title = await link.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toContain('kala');
  });

  test('collapsed chip view contains Kotus links', async ({ page }) => {
    await loadGame(page);
    await submitWord(page, 'kala');
    await expect(page.getByText('kala')).toBeVisible();

    const section = page.locator('section').filter({ hasText: 'kala' });
    const link = section.locator('a[href*="kielitoimistonsanakirja.fi"]', {
      hasText: 'kala',
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      'https://www.kielitoimistonsanakirja.fi/#/kala',
    );

    await page.keyboard.press('k');
    await expect(page.locator('[aria-atomic="true"]').first()).toContainText(
      'K',
    );
  });

  test('pangrams are bolded in collapsed and expanded found-word views', async ({
    page,
  }) => {
    await loadGame(page);
    await submitManyWords(page);
    await submitWord(page, 'laskenta');

    const collapsed = page.locator('section a', { hasText: 'laskenta' });
    await expect(collapsed).toBeVisible();
    expect(
      await collapsed.evaluate((el) => getComputedStyle(el).fontWeight),
    ).toMatch(/^(700|bold)$/);

    await page.getByText('Kaikki').click();
    const expanded = page.locator('section li a', { hasText: 'laskenta' });
    await expect(expanded).toBeVisible();
    expect(
      await expanded.evaluate((el) => getComputedStyle(el).fontWeight),
    ).toMatch(/^(700|bold)$/);
  });
});
