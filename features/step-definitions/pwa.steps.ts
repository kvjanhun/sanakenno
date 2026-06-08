/**
 * BDD step definitions for pwa.feature.
 *
 * Config scenarios inspect the shared Vite PWA options directly. Production
 * service-worker runtime behavior is covered by tests/pwa with a built preview.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { pwaOptions } from '../../packages/web/pwa.config.js';
import type { SanakennoWorld } from './types';

interface RuntimeCachingRule {
  urlPattern: RegExp;
  handler: string;
  options?: {
    cacheName?: string;
  };
}

interface PwaWorld extends SanakennoWorld {
  pwaConfig?: typeof pwaOptions;
}

function runtimeRuleFor(
  config: typeof pwaOptions,
  sampleUrl: string,
): RuntimeCachingRule | undefined {
  return config.workbox.runtimeCaching.find((rule) =>
    rule.urlPattern.test(sampleUrl),
  );
}

When('the PWA configuration is inspected', function (this: PwaWorld) {
  this.pwaConfig = pwaOptions;
});

Then('it should declare a valid web manifest', function (this: PwaWorld) {
  const manifest = this.pwaConfig?.manifest;
  assert.ok(manifest, 'Manifest config should exist');
  assert.equal(manifest.name, 'Sanakenno');
  assert.equal(manifest.short_name, 'Sanakenno');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.lang, 'fi');
});

Then('it should declare standalone display mode', function (this: PwaWorld) {
  assert.equal(this.pwaConfig?.manifest.display, 'standalone');
});

Then(
  'it should include icons at 192x192 and 512x512',
  function (this: PwaWorld) {
    const sizes = this.pwaConfig?.manifest.icons.map((icon) => icon.sizes);
    assert.ok(sizes?.includes('192x192'), 'Missing 192x192 icon');
    assert.ok(sizes?.includes('512x512'), 'Missing 512x512 icon');
  },
);

Then('API requests should use NetworkOnly caching', function (this: PwaWorld) {
  const rule = runtimeRuleFor(this.pwaConfig!, '/api/puzzle');
  assert.equal(rule?.handler, 'NetworkOnly');
});

Then(
  'JavaScript and CSS assets should use StaleWhileRevalidate caching',
  function (this: PwaWorld) {
    const jsRule = runtimeRuleFor(this.pwaConfig!, '/assets/app.js');
    const cssRule = runtimeRuleFor(this.pwaConfig!, '/assets/app.css');
    assert.equal(jsRule?.handler, 'StaleWhileRevalidate');
    assert.equal(cssRule?.handler, 'StaleWhileRevalidate');
    assert.equal(jsRule?.options?.cacheName, 'static-assets');
    assert.equal(cssRule?.options?.cacheName, 'static-assets');
  },
);

Then('image assets should use CacheFirst caching', function (this: PwaWorld) {
  const rule = runtimeRuleFor(this.pwaConfig!, '/icons/sanakenno-192x192.png');
  assert.equal(rule?.handler, 'CacheFirst');
  assert.equal(rule?.options?.cacheName, 'images');
});

When(
  'the production build is loaded in a browser',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('the web manifest should load', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the service worker should register after reload',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'static assets should enter CacheStorage',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'API responses should not enter CacheStorage',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the app shell should survive an offline reload',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the app is running in iOS standalone mode',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When('the player double-taps quickly', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'letter input should still work normally',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);
