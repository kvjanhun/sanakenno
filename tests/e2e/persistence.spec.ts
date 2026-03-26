/**
 * E2E tests for game state persistence via localStorage.
 *
 * Covers: per-puzzle storage keys, state restoration on reload,
 * independent puzzle state, corrupt data handling.
 *
 * Corresponds to: persistence.feature
 */

import { test, expect } from '@playwright/test';
import {
  loadGame,
  submitWord,
  createMockPuzzle,
  mockPuzzleApi,
} from './helpers';

test.describe('State persistence', () => {
  test('state is saved under a puzzle-specific localStorage key', async ({
    page,
  }) => {
    await loadGame(page);
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    const key = 'sanakenno_state_0'; // puzzle_number = 0
    const stored = await page.evaluate((k) => localStorage.getItem(k), key);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.foundWords).toContain('kala');
    expect(parsed.score).toBeGreaterThan(0);
  });

  test('found words and score are restored after reload', async ({ page }) => {
    await loadGame(page);
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    // Reload the page
    await loadGame(page);

    // Found words should still be visible
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('kala')).toBeVisible();
  });

  test('different puzzles have independent state', async ({ page }) => {
    // Load puzzle 0 and submit a word
    await loadGame(page);
    await submitWord(page, 'kala');
    await expect(page.getByText('Löydetyt sanat')).toBeVisible({
      timeout: 5000,
    });

    // Now mock a different puzzle (puzzle_number = 1)
    const puzzle2 = createMockPuzzle();
    puzzle2.puzzle_number = 1;

    await page.route('**/api/puzzle', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(puzzle2),
      });
    });

    await page.goto('/');
    await page.locator('svg polygon').first().waitFor({ timeout: 10000 });

    // Puzzle 1 should have no found words
    await expect(page.getByText('Löydetyt sanat')).not.toBeVisible();
  });

  test('corrupt localStorage state is discarded gracefully', async ({
    page,
  }) => {
    // Pre-set corrupt data
    await mockPuzzleApi(page);
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('sanakenno_state_0', 'not-valid-json{{{');
    });

    // Reload — should start fresh without crashing
    await loadGame(page);

    // Game should load normally (honeycomb visible)
    await expect(page.locator('svg polygon').first()).toBeVisible();
  });
});
