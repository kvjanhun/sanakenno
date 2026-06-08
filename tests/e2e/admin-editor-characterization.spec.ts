import { test, expect, type Page } from '@playwright/test';

type Variation = {
  center: string;
  word_count: number;
  max_score: number;
  pangram_count: number;
  is_active?: boolean;
};

function variations(letters: string[], center: string): Variation[] {
  return letters.map((letter) => ({
    center: letter,
    word_count: letter === center ? 36 : 12,
    max_score: letter === center ? 120 : 40,
    pangram_count: letter === center ? 1 : 0,
    is_active: letter === center,
  }));
}

function slotPayload(slot: number) {
  const letters =
    slot === 2
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g']
      : ['k', 'a', 'l', 'n', 's', 't', 'e'];
  const center = slot === 2 ? 'c' : 'a';

  return {
    letters,
    variations: variations(letters, center),
    is_active: true,
  };
}

async function mockAdminEditor(page: Page) {
  const requestedSlots: number[] = [];
  const previewPayloads: unknown[] = [];
  const puzzlePayloads: unknown[] = [];
  const blockedWords: string[] = [];

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
        total_puzzles: 3,
        schedule: [{ slot: 1, display_number: 2, is_today: true }],
      }),
    });
  });

  await page.route('**/api/admin/puzzle/variations**', async (route) => {
    const slot = Number(
      new URL(route.request().url()).searchParams.get('slot') ?? '0',
    );
    requestedSlots.push(slot);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(slotPayload(slot)),
    });
  });

  await page.route('**/api/admin/preview', async (route) => {
    const body = await route.request().postDataJSON();
    previewPayloads.push(body);
    const letters = body.letters as string[];
    const center = (body.center as string | undefined) ?? letters[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        letters,
        variations: variations(letters, center),
        words: center === 'i' ? ['hiij', 'hiji'] : ['kala', 'kana', 'lakana'],
      }),
    });
  });

  await page.route('**/api/admin/combinations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        combinations: [
          {
            letters: 'hijklmn',
            total_pangrams: 2,
            min_word_count: 12,
            max_word_count: 44,
            min_max_score: 40,
            max_max_score: 180,
            in_rotation: false,
            variations: variations(['h', 'i', 'j', 'k', 'l', 'm', 'n'], 'h'),
          },
        ],
        total: 1,
        page: 1,
        pages: 1,
        per_page: 50,
      }),
    });
  });

  await page.route('**/api/admin/suggestion**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Ei ehdotuksia' }),
    });
  });

  await page.route('**/api/admin/block', async (route) => {
    const body = await route.request().postDataJSON();
    blockedWords.push(body.word);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'blocked', id: 1, word: body.word }),
    });
  });

  await page.route('**/api/admin/puzzle', async (route) => {
    const body = await route.request().postDataJSON();
    puzzlePayloads.push(body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slot: typeof body.slot === 'number' ? body.slot : 3,
        total_puzzles: typeof body.slot === 'number' ? 3 : 4,
        next_date: '2026-06-09',
        is_new: typeof body.slot !== 'number',
      }),
    });
  });

  return { requestedSlots, previewPayloads, puzzlePayloads, blockedWords };
}

test('admin editor preserves core editing workflows', async ({ page }) => {
  const calls = await mockAdminEditor(page);
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/#/admin');

  await expect(page.getByText('Peli 2 / 3')).toBeVisible();
  expect(calls.requestedSlots).toContain(1);

  await page.getByLabel('Siirry pelinumeroon').fill('3');
  await page.getByRole('button', { name: 'Siirry' }).click();
  await expect(page.getByText('Peli 3 / 3')).toBeVisible();
  expect(calls.requestedSlots).toContain(2);

  await page.getByTitle('Valitse B keskuskirjaimeksi').click();
  await expect(page.getByText('Muutoksia')).toBeVisible();
  await page.getByTitle('Kumoa muutokset').first().click();
  await expect(page.getByText('Muutoksia')).toHaveCount(0);

  await page.getByTitle('Valitse B keskuskirjaimeksi').click();
  await page.getByRole('button', { name: 'Tallenna muutokset' }).click();
  await expect(page.getByRole('alert').getByText('Tallennettu')).toBeVisible();
  expect(calls.puzzlePayloads).toContainEqual({
    slot: 2,
    letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    center: 'b',
  });

  await page.getByRole('cell', { name: /hijklmn/i }).click();
  await page.getByTitle('Valitse I keskuskirjaimeksi').click();
  await expect(page.getByText('Esikatseltava peli')).toBeVisible();
  await expect(page.getByText(/valittu keskuksella/i)).toBeVisible();
  expect(calls.previewPayloads).toContainEqual({
    letters: ['h', 'i', 'j', 'k', 'l', 'm', 'n'],
    center: 'i',
  });
  await page.getByRole('button', { name: 'Lisää uutena pelinä' }).click();
  expect(calls.puzzlePayloads).toContainEqual({
    letters: ['h', 'i', 'j', 'k', 'l', 'm', 'n'],
    center: 'i',
  });

  await page.getByRole('button', { name: 'Uusi peli' }).click();
  await page.getByPlaceholder(/7 kirjainta/).fill('m,n,o,p,r,s,t');
  await page.getByPlaceholder('Keskus').fill('m');
  await page.getByRole('button', { name: 'Luo' }).click();
  expect(calls.puzzlePayloads).toContainEqual({
    letters: ['m', 'n', 'o', 'p', 'r', 's', 't'],
    center: 'm',
  });

  await expect(page.getByText('kala')).toBeVisible();
  await page.getByRole('button', { name: 'Estä kala' }).click();
  await expect(page.getByText('kala')).toHaveCount(0);
  expect(calls.blockedWords).toEqual(['kala']);
});
