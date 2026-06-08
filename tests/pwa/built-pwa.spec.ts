import { test, expect, type Page } from '@playwright/test';
import { mockPuzzleApi } from '../e2e/helpers';

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

async function cacheUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const keys = await caches.keys();
    const urls: string[] = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      urls.push(...requests.map((request) => request.url));
    }
    return urls;
  });
}

test('built PWA manifest, service worker, offline shell, and cache contract work', async ({
  context,
  page,
  baseURL,
}) => {
  await mockPuzzleApi(page);
  await page.goto('/');
  await expect(page.locator('svg polygon').first()).toBeVisible();

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const manifestUrl = new URL(manifestHref!, baseURL!).toString();
  const manifestResponse = await page.request.get(manifestUrl);
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse).toBeOK();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: 'Sanakenno',
    display: 'standalone',
    start_url: '/',
  });

  await waitForServiceWorkerControl(page);
  await expect(page.locator('svg polygon').first()).toBeVisible();

  await page.evaluate(async () => {
    const assets = [
      ...Array.from(document.scripts, (script) => script.src),
      ...Array.from(
        document.querySelectorAll('link[rel="stylesheet"]'),
        (link) => (link as HTMLLinkElement).href,
      ),
    ].filter((url) => url.includes('/assets/'));

    await Promise.all(assets.map((url) => fetch(url)));
  });

  await page.evaluate(async () => {
    await fetch('/api/puzzle');
  });
  const urls = await cacheUrls(page);

  expect(urls.some((url) => /\/assets\/.+\.(?:js|css)(?:\?|$)/.test(url))).toBe(
    true,
  );
  expect(urls.filter((url) => url.includes('/api/'))).toEqual([]);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByText(/Sanakenno|Lataus epäonnistui/)).toBeVisible();
});
