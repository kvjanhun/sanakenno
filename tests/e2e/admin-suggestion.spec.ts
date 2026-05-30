import { test, expect } from '@playwright/test';

const suggestionOne = {
  letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  letters_key: 'abcdefg',
  center: 'a',
  word_count: 36,
  pangram_count: 1,
  max_score: 120,
  quality_label: 'Hyva pangrammilaatu',
  score: 980,
  overlaps: {
    previous: { slot: 99, shared_letters: 2, shared_short_words: 3 },
    next: { slot: 0, shared_letters: 1, shared_short_words: 0 },
  },
  reasons: ['sanamaara osuu tavoitealueelle'],
};

const suggestionTwo = {
  ...suggestionOne,
  letters: ['o', 'p', 'q', 'r', 's', 't', 'u'],
  letters_key: 'opqrstu',
  center: 'o',
  word_count: 34,
  max_score: 116,
  overlaps: {
    previous: { slot: 99, shared_letters: 1, shared_short_words: 0 },
    next: { slot: 0, shared_letters: 1, shared_short_words: 0 },
  },
};

test('admin can reject and accept no-spoiler game suggestions', async ({
  page,
}) => {
  const createPayloads: unknown[] = [];
  const suggestionUrls: string[] = [];

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        username: 'admin',
        csrf_token: 'csrf',
      }),
    });
  });

  await page.route('**/api/admin/schedule?days=1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_puzzles: 100,
        schedule: [{ slot: 0, is_today: true }],
      }),
    });
  });

  await page.route('**/api/admin/puzzle/variations?slot=0', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        variations: [
          {
            center: 'a',
            word_count: 36,
            max_score: 120,
            pangram_count: 1,
            is_active: true,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/preview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ variations: [], words: [] }),
    });
  });

  await page.route('**/api/admin/combinations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        combinations: [],
        total: 0,
        page: 1,
        pages: 0,
        per_page: 50,
      }),
    });
  });

  await page.route('**/api/admin/suggestion**', async (route) => {
    suggestionUrls.push(route.request().url());
    const hasDeclined = route.request().url().includes('declined=');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggestion: hasDeclined ? suggestionTwo : suggestionOne,
      }),
    });
  });

  await page.route('**/api/admin/puzzle', async (route) => {
    if (route.request().method() === 'POST') {
      createPayloads.push(await route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slot: 100,
          total_puzzles: 101,
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/#/admin');

  await page.getByRole('button', { name: 'Ehdota peliä' }).click();
  await expect(page.getByText('36 sanaa')).toBeVisible();
  await expect(page.getByText('spoilerword')).toHaveCount(0);

  await page.getByRole('button', { name: 'Hylkää' }).click();
  await expect(page.getByText('34 sanaa')).toBeVisible();

  await page.getByRole('button', { name: 'Hyväksy' }).click();

  expect(suggestionUrls).toHaveLength(2);
  expect(suggestionUrls[1]).toContain('declined=');
  expect(createPayloads).toEqual([
    {
      letters: ['o', 'p', 'q', 'r', 's', 't', 'u'],
      center: 'o',
    },
  ]);
});
