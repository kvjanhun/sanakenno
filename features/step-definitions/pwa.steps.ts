/**
 * BDD step definitions for pwa.feature.
 *
 * PWA scenarios are primarily E2E (require a browser with SW support).
 * Manifest structure is validated against the Vite build output.
 * SW strategy tests are marked pending for Playwright E2E.
 */

import { When, Then } from '@cucumber/cucumber';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import type { SanakennoWorld } from './types.js';

/** Path to the built manifest (only available after `npm run build`). */
const DIST_DIR = resolve(process.cwd(), 'dist');

When('the browser loads the page', function (this: SanakennoWorld) {
  // Check that the manifest exists in the build output.
  // This step is skipped if the project hasn't been built yet.
  const manifestPath = resolve(DIST_DIR, 'manifest.webmanifest');
  if (!existsSync(manifestPath)) {
    return 'pending';
  }
  const raw = readFileSync(manifestPath, 'utf-8');
  this.responseJson = JSON.parse(raw);
});

Then('a valid web manifest should be served', function (this: SanakennoWorld) {
  if (!this.responseJson) return 'pending';
  assert.ok(this.responseJson.name, 'Manifest must have a name');
  assert.ok(this.responseJson.icons, 'Manifest must have icons');
});

Then(
  'it should declare standalone display mode',
  function (this: SanakennoWorld) {
    if (!this.responseJson) return 'pending';
    assert.equal(this.responseJson.display, 'standalone');
  },
);

Then(
  'it should include icons at 192x192 and 512x512',
  function (this: SanakennoWorld) {
    if (!this.responseJson) return 'pending';
    const icons = this.responseJson.icons as Array<{ sizes: string }>;
    const sizes = icons.map((i) => i.sizes);
    assert.ok(sizes.includes('192x192'), 'Missing 192x192 icon');
    assert.ok(sizes.includes('512x512'), 'Missing 512x512 icon');
  },
);

// --- Service worker strategies (E2E-only) ---

When('the player navigates to the app', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the service worker should try the network first',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('fall back to cache if offline', function (this: SanakennoWorld) {
  return 'pending';
});

When('the browser requests a JS or CSS file', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the service worker should serve from cache immediately',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('update the cache in the background', function (this: SanakennoWorld) {
  return 'pending';
});

When('the app fetches \\/api\\/puzzle', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the service worker should not intercept or cache the request',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

// --- iOS standalone quirks (E2E-only) ---

import { Given } from '@cucumber/cucumber';

Given(
  'the app is running in iOS standalone mode',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When('the player double-taps quickly', function (this: SanakennoWorld) {
  return 'pending';
});

// "the page should not zoom" and "letter input should still work normally"
// are defined in accessibility.steps.ts and reused here.
