/**
 * E2E tests for modal and game typography polish.
 *
 * Covers: standard modal close affordance consistency, sync modal divider
 * removal, and game-area font alignment.
 */

import { test, expect, type Page } from '@playwright/test';
import { loadGame, mockArchiveApi } from './helpers';

async function computedAccent(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = getComputedStyle(
      document.documentElement,
    ).getPropertyValue('--color-accent');
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
}

async function expectStandardCloseButton(page: Page) {
  const dialog = page.getByRole('dialog').first();
  const close = dialog.getByRole('button', { name: 'Sulje' });
  await expect(close).toBeVisible();

  const box = await close.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(30);
  expect(box?.width).toBeLessThanOrEqual(34);
  expect(box?.height).toBeGreaterThanOrEqual(30);
  expect(box?.height).toBeLessThanOrEqual(34);

  expect(await close.evaluate((el) => getComputedStyle(el).color)).toBe(
    await computedAccent(page),
  );
}

test.describe('Modal polish', () => {
  test('header icon buttons use large touch targets', async ({ page }) => {
    await loadGame(page);

    for (const label of [
      'Lisää laite',
      'Arkisto',
      'Tilastot',
      'Säännöt',
      'Ulkoasu',
    ]) {
      const button = page.getByRole('button', { name: label });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('standard overlays share the same accent close button', async ({
    page,
  }) => {
    await mockArchiveApi(page);
    await loadGame(page);

    for (const label of ['Säännöt', 'Tilastot', 'Arkisto', 'Lisää laite']) {
      await page.getByRole('button', { name: label }).click();
      await expect(page.getByRole('dialog').first()).toBeVisible();
      await expectStandardCloseButton(page);
      await page.getByRole('dialog').first().getByLabel('Sulje').click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('modal focus is trapped and restored to the opener', async ({
    page,
  }) => {
    await loadGame(page);

    const opener = page.getByRole('button', { name: 'Säännöt' });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Pelin säännöt' });
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
      ).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  });

  test('sync modal linked view has no horizontal divider', async ({ page }) => {
    await loadGame(page);

    await page.getByRole('button', { name: 'Lisää laite' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Tallennus ja synkronointi' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Tallenna' }).click();
    await expect(
      page.getByRole('button', { name: 'Kopioi linkki' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog').locator('hr')).toHaveCount(0);
  });
});

test.describe('Game typography', () => {
  test('current word uses proportional game font with iOS-like spacing', async ({
    page,
  }) => {
    await loadGame(page);

    await page.keyboard.press('p');
    await page.keyboard.press('a');

    const display = page.locator('[aria-atomic="true"]').first();
    await expect(display).toContainText('PA');
    await expect(display.locator('span')).toHaveCount(2);

    const style = await display.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontKerning: computed.fontKerning,
        letterSpacing: computed.letterSpacing,
      };
    });
    const spacing = await display.locator('span').evaluateAll((spans) =>
      spans.map((span) => {
        const computed = getComputedStyle(span);
        return {
          marginLeft: computed.marginLeft,
          marginRight: computed.marginRight,
        };
      }),
    );

    expect(style.fontFamily.toLowerCase()).not.toContain('mono');
    expect(style.fontSize).toBe('30px');
    expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(600);
    expect(style.fontKerning).toBe('normal');
    expect(['0px', 'normal']).toContain(style.letterSpacing);
    expect(spacing).toEqual([
      { marginLeft: '1px', marginRight: '1px' },
      { marginLeft: '1px', marginRight: '1px' },
    ]);
  });
});
