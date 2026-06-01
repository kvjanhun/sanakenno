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
  pangrams: ['abcdefg'],
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
  pangrams: ['opqrstu'],
};

const suggestionThree = {
  ...suggestionOne,
  letters: ['l', 'm', 'n', 'o', 'p', 'r', 's'],
  letters_key: 'lmnoprs',
  center: 'l',
  word_count: 42,
  pangram_count: 2,
  max_score: 160,
  overlaps: {
    previous: { slot: 100, shared_letters: 0, shared_short_words: 0 },
    next: { slot: 0, shared_letters: 1, shared_short_words: 0 },
  },
  pangrams: ['lmnoprs', 'slmnopr'],
};

function withoutPangrams<T extends { pangrams?: string[] }>(
  suggestion: T,
): Omit<T, 'pangrams'> {
  const { pangrams: _pangrams, ...rest } = suggestion;
  return rest;
}

test('admin can reject and accept no-spoiler game suggestions', async ({
  page,
}) => {
  const createPayloads: unknown[] = [];
  const suggestionUrls: string[] = [];
  const rejectedRows: Array<{
    id: number;
    letters_key: string;
    letters: string[];
    center: string;
    rejected_at: string;
  }> = [];

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
    const requestUrl = route.request().url();
    suggestionUrls.push(requestUrl);
    const hasDeclined = requestUrl.includes('declined=');
    const includesPangrams = requestUrl.includes('include_pangrams=true');
    const selected = createPayloads.length
      ? suggestionThree
      : hasDeclined
        ? suggestionTwo
        : suggestionOne;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggestion: includesPangrams ? selected : withoutPangrams(selected),
      }),
    });
  });

  await page.route('**/api/admin/suggestion-rejections**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rejections: rejectedRows }),
      });
      return;
    }

    if (request.method() === 'POST') {
      const body = await request.postDataJSON();
      const letters = [...body.letters].sort();
      const row = {
        id: rejectedRows.length + 1,
        letters_key: letters.join(''),
        letters,
        center: body.center,
        rejected_at: '2026-06-01 12:00:00',
      };
      rejectedRows.push(row);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'rejected', ...row }),
      });
      return;
    }

    if (request.method() === 'DELETE') {
      const id = Number(new URL(request.url()).pathname.split('/').pop());
      const index = rejectedRows.findIndex((row) => row.id === id);
      if (index >= 0) rejectedRows.splice(index, 1);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'restored' }),
      });
      return;
    }

    await route.continue();
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
  await expect(page.getByLabel('Pangrammien spoilerit')).toHaveCount(0);

  await page.getByRole('button', { name: 'Näytä pangrammit' }).click();
  await expect(
    page.getByLabel('Pangrammien spoilerit').getByText('abcdefg'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Piilota pangrammit' }).click();
  await expect(page.getByLabel('Pangrammien spoilerit')).toHaveCount(0);

  await page.getByRole('button', { name: 'Hylkää' }).click();
  await expect(page.getByText('34 sanaa')).toBeVisible();
  await expect(page.getByLabel('Hylätyt ehdotukset')).toContainText('abcdefg');

  await page.getByRole('button', { name: 'Palauta' }).click();
  await expect(page.getByLabel('Hylätyt ehdotukset')).toHaveCount(0);

  await page.getByRole('button', { name: 'Hyväksy' }).click();
  await expect(
    page.getByText('Lisätty. Haetaan seuraavaa ehdotusta...'),
  ).toBeVisible();
  await expect(page.getByText('42 sanaa')).toBeVisible();

  expect(suggestionUrls).toHaveLength(4);
  expect(suggestionUrls[1]).toContain('include_pangrams=true');
  expect(suggestionUrls[2]).toContain('declined=');
  expect(createPayloads).toEqual([
    {
      letters: ['o', 'p', 'q', 'r', 's', 't', 'u'],
      center: 'o',
    },
  ]);
});
