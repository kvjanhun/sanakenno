import { test, expect, type Page } from '@playwright/test';

function scheduleEntries(days: number) {
  return Array.from({ length: days }, (_, index) => ({
    date: new Date(Date.UTC(2026, 5, 2 + index)).toISOString().slice(0, 10),
    slot: index,
    display_number: index + 1,
    letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    center: 'a',
    is_today: index === 0,
  }));
}

async function mockAdminShell(page: Page) {
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

  await page.route('**/api/admin/puzzle/variations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        variations: [],
        words: [],
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
}

test('admin can select the schedule date range', async ({ page }) => {
  const requestedRanges: Array<{ start: string | null; days: number }> = [];

  await mockAdminShell(page);

  await page.route('**/api/admin/schedule**', async (route) => {
    const url = new URL(route.request().url());
    const days = Number(url.searchParams.get('days') ?? '14');
    const start = url.searchParams.get('start');
    requestedRanges.push({ start, days });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_puzzles: 100,
        schedule: scheduleEntries(days),
      }),
    });
  });

  await page.goto('/#/admin');
  await page.getByRole('button', { name: /Aikataulu/ }).click();
  await expect(page.getByText('14 päivää')).toBeVisible();

  await page.getByLabel('Alku').fill('2026-06-10');
  await page.getByLabel('Loppu').fill('2026-06-16');

  await expect(page.getByText('7 päivää')).toBeVisible();
  expect(requestedRanges).toContainEqual({ start: '2026-06-10', days: 7 });
});

test('word analytics have their own admin page', async ({ page }) => {
  await mockAdminShell(page);

  await page.route('**/api/admin/schedule**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_puzzles: 10,
        schedule: scheduleEntries(1),
      }),
    });
  });

  await page.route('**/api/admin/achievements**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        daily: scheduleEntries(7).map((entry) => ({
          date: entry.date,
          total: entry.display_number,
          counts: {
            'Etsi sanoja!': 0,
            'Hyvä alku': entry.display_number,
            'Nyt mennään!': 0,
            Onnistuja: 0,
            Sanavalmis: 0,
            Ällistyttävä: 0,
            'Täysi kenno': 0,
          },
        })),
        totals: { 'Hyvä alku': 28 },
      }),
    });
  });

  await page.route('**/api/admin/failed-guesses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        days: 7,
        grand_total: 3,
        daily: [
          {
            date: '2026-06-02',
            total_count: 3,
            words: [{ word: 'vieras', count: 3 }],
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/word-finds**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        puzzle_number: 0,
        display_number: 1,
        center: 'a',
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        total_words: 2,
        recorded_words: 1,
        total_finds: 5,
        words: [
          { word: 'kala', find_count: 5 },
          { word: 'kana', find_count: 0 },
        ],
      }),
    });
  });

  await page.goto('/#/admin');
  await page.getByRole('button', { name: /Tilastot/ }).click();
  await expect(page.getByText('Rankkijakauma')).toBeVisible();
  await expect(page.getByText('Vieraat sanat')).toHaveCount(0);
  await expect(page.getByText('Löydetyt sanat')).toHaveCount(0);

  await page.getByRole('button', { name: /Sanadata/ }).click();
  await expect(page.getByText('Yhteensä: 3 virhearvausta')).toBeVisible();

  await page.getByRole('button', { name: 'Löydetyt sanat' }).click();
  await expect(page.getByText('Löytöjä yhteensä')).toBeVisible();
  await expect(
    page.getByText('Löytöjä yhteensä').locator('..').getByText('5'),
  ).toBeVisible();
});
