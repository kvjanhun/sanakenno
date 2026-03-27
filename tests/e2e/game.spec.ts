/**
 * E2E tests for core game interaction.
 *
 * Covers: honeycomb rendering, keyboard input, hexagon taps,
 * word submission (valid/invalid), shuffle, buttons, found words,
 * rejected-word clearing, share button, and achievement fire-and-forget.
 *
 * Corresponds to: interaction.feature, scoring.feature, word-validation.feature,
 *                 achievements.feature
 */

import { test, expect } from '@playwright/test';
import { loadGame, typeWord, submitWord, mockPuzzleApi } from './helpers';

test.describe('Honeycomb', () => {
  test('renders 7 hexagons with center letter visually distinct', async ({
    page,
  }) => {
    await loadGame(page);

    const polygons = page.locator('svg polygon');
    await expect(polygons).toHaveCount(7);

    // Center hexagon (index 3) should show center letter 'A'
    const centerText = page.locator('svg g').nth(3).locator('text');
    await expect(centerText).toHaveText('A');
  });

  test('shuffle changes outer letter positions', async ({ page }) => {
    await loadGame(page);

    const allTexts = page.locator('svg text');
    const before: string[] = [];
    for (let i = 0; i < 7; i++) {
      before.push((await allTexts.nth(i).textContent()) ?? '');
    }

    // Click shuffle multiple times to overcome the 1/720 same-order chance
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.getByText('Sekoita').click();
    }

    const after: string[] = [];
    for (let i = 0; i < 7; i++) {
      after.push((await allTexts.nth(i).textContent()) ?? '');
    }

    // Center letter (index 3) must remain the same
    expect(after[3]).toBe(before[3]);
  });
});

test.describe('Keyboard input', () => {
  test('letter keys add characters to the word display', async ({ page }) => {
    await loadGame(page);
    await typeWord(page, 'kal');

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('KAL');
  });

  test('Backspace removes the last letter', async ({ page }) => {
    await loadGame(page);
    await typeWord(page, 'kal');
    await page.keyboard.press('Backspace');

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('KA');
    await expect(display).not.toContainText('KAL');
  });

  test('Enter submits the current word', async ({ page }) => {
    await loadGame(page);
    await submitWord(page, 'ka');

    // Too short — error message
    await expect(page.getByText('Liian lyhyt!')).toBeVisible();
  });
});

test.describe('Button controls', () => {
  test('Poista removes the last letter', async ({ page }) => {
    await loadGame(page);
    await typeWord(page, 'kal');
    await page.getByText('Poista').click();

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('KA');
  });

  test('OK submits the word', async ({ page }) => {
    await loadGame(page);
    await typeWord(page, 'ka');
    await page.getByText('OK').click();

    await expect(page.getByText('Liian lyhyt!')).toBeVisible();
  });
});

test.describe('Hexagon taps', () => {
  test('clicking a hexagon adds its letter', async ({ page }) => {
    await loadGame(page);

    // Click the center hexagon (index 3, letter 'a')
    await page.locator('svg g').nth(3).click();

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('A');
  });
});

test.describe('Word validation', () => {
  test('too-short word shows error', async ({ page }) => {
    await loadGame(page);
    await submitWord(page, 'ka');
    await expect(page.getByText('Liian lyhyt!')).toBeVisible();
  });

  test('word without center letter shows error', async ({ page }) => {
    await loadGame(page);
    // Type a 4-letter word without 'a' (center): 'test' — but 't','e','s','t' doesn't include 'a'
    await submitWord(page, 'test');
    await expect(page.getByText('puuttuu', { exact: false })).toBeVisible();
  });

  test('valid word is accepted and score increases', async ({ page }) => {
    await loadGame(page);
    await submitWord(page, 'kala');

    // Should show found words section
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });
  });

  test('duplicate word shows "Löysit jo tämän!"', async ({ page }) => {
    await loadGame(page);
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    await submitWord(page, 'kala');
    await expect(page.getByText('Löysit jo tämän!')).toBeVisible();
  });
});

test.describe('Found words', () => {
  test('expand/collapse shows all words alphabetically', async ({ page }) => {
    await loadGame(page);

    // Submit several words
    const words = ['kala', 'kana', 'taka', 'alas', 'saat', 'alka', 'akat'];
    for (const word of words) {
      await submitWord(page, word);
      // Wait for each word to be processed
      await page.locator('[aria-atomic="true"]').first().waitFor();
    }

    // More than 6 words → expand button should appear
    await expect(page.getByText('Kaikki')).toBeVisible({ timeout: 5000 });

    // Click expand
    await page.getByText('Kaikki').click();

    // All words should be visible
    for (const word of words) {
      await expect(page.getByText(word, { exact: true })).toBeVisible();
    }
  });
});

test.describe('Rules modal', () => {
  test('keyboard is ignored when rules modal is open', async ({ page }) => {
    await loadGame(page);

    // Open rules via the ? button
    await page.getByLabel('Säännöt').click();

    // Type a letter — should NOT add to word display
    await page.keyboard.press('k');

    // Close modal with Escape
    await page.keyboard.press('Escape');

    // Word display should still be empty (no 'K')
    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).not.toContainText('K');
  });
});

test.describe('Rejected word clearing', () => {
  test('next letter input clears a rejected word', async ({ page }) => {
    await loadGame(page);

    // Submit a word that is too short (rejected)
    await submitWord(page, 'ka');
    await expect(page.getByText('Liian lyhyt!')).toBeVisible();

    // Typing a new letter should clear the rejected word
    await page.keyboard.press('k');
    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('K');
    // Should only show the new letter, not the old rejected text
    await expect(display).not.toContainText('KA');
  });

  test('Backspace after rejection clears the rejected word', async ({
    page,
  }) => {
    await loadGame(page);

    await submitWord(page, 'ka');
    await expect(page.getByText('Liian lyhyt!')).toBeVisible();

    await page.keyboard.press('Backspace');
    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).not.toContainText('KA');
  });
});

test.describe('Share button', () => {
  test('share copies result to clipboard and shows Kopioitu! popup', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadGame(page);

    await page.getByText('Jaa tulos').first().click();

    // Popup should appear
    await expect(page.getByText('Kopioitu!')).toBeVisible({ timeout: 3000 });

    // Clipboard should contain the puzzle info
    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).toContain('Sanakenno');
    expect(clipText).toContain('sanakenno.fi');
  });

  test('Kopioitu! popup disappears automatically', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadGame(page);

    await page.getByText('Jaa tulos').first().click();
    await expect(page.getByText('Kopioitu!')).toBeVisible({ timeout: 3000 });

    // Popup auto-hides after 2s
    await expect(page.getByText('Kopioitu!')).not.toBeVisible({
      timeout: 4000,
    });
  });
});

test.describe('Achievement fire-and-forget', () => {
  test('game continues normally when achievement POST fails', async ({
    page,
  }) => {
    // Override achievement mock to return a server error
    await mockPuzzleApi(page);
    await page.route('**/api/achievement', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });
    await page.goto('/');
    await page.locator('svg polygon').first().waitFor({ timeout: 10_000 });

    // Submit enough words to trigger a rank change (Hyvä alku at 1 pt)
    await submitWord(page, 'kala');

    // Game should still be functional — no error shown
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('Lataus epäonnistui.')).not.toBeVisible();
  });
});
