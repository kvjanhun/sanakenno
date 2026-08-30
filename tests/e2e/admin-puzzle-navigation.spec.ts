import { test, expect } from '@playwright/test';

function variationsForSlot(slot: number) {
  const letters =
    slot === 3
      ? ['h', 'e', 'i', 'n', 'm', 'y', 'ä']
      : ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const center = slot === 3 ? 'n' : 'a';

  // No soft-deleted puzzles in this fixture, so display number is slot + 1.
  return {
    slot,
    display_number: slot + 1,
    total_puzzles: TOTAL_PUZZLES,
    prev_slot: slot > 0 ? slot - 1 : null,
    next_slot: slot < TOTAL_PUZZLES - 1 ? slot + 1 : null,
    is_active: true,
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

const TOTAL_PUZZLES = 10;

/** The editor addresses puzzles by display number; the server resolves the slot. */
function slotFromRequest(url: string): number {
  const params = new URL(url).searchParams;
  const display = params.get('display_number');
  if (display !== null) return Number(display) - 1;
  return Number(params.get('slot') ?? '0');
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

  await page.route('**/api/admin/puzzle/slots', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slots: Array.from({ length: TOTAL_PUZZLES }, (_, i) => i),
        total_puzzles: TOTAL_PUZZLES,
      }),
    });
  });

  await page.route('**/api/admin/puzzle/variations**', async (route) => {
    const slot = slotFromRequest(route.request().url());
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
