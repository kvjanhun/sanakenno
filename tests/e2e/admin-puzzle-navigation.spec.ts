import { test, expect } from '@playwright/test';

function variationsForSlot(slot: number) {
  const letters =
    slot === 3
      ? ['h', 'e', 'i', 'n', 'm', 'y', 'ä']
      : ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const center = slot === 3 ? 'n' : 'a';

  return {
    letters,
    variations: letters.map((letter) => ({
      center: letter,
      word_count: letter === center ? 36 : 12,
      max_score: letter === center ? 120 : 40,
      pangram_count: 1,
      is_active: letter === center,
    })),
  };
}

test('admin can select a puzzle by number with a form input', async ({
  page,
}) => {
  const requestedSlots: number[] = [];

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
        total_puzzles: 10,
        schedule: [{ slot: 0, is_today: true }],
      }),
    });
  });

  await page.route('**/api/admin/puzzle/variations**', async (route) => {
    const slot = Number(
      new URL(route.request().url()).searchParams.get('slot'),
    );
    requestedSlots.push(slot);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(variationsForSlot(slot)),
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

  await page.goto('/#/admin');

  await expect(page.getByText('1 / 10')).toBeVisible();
  await page.getByLabel('Siirry pelinumeroon').fill('4');
  await page.getByRole('button', { name: 'Siirry' }).click();

  await expect(page.getByText('4 / 10')).toBeVisible();
  expect(requestedSlots).toContain(3);
});
