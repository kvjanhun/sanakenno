import { describe, expect, it } from 'vitest';
import { pwaOptions } from '../packages/web/pwa.config.js';

function runtimeRuleFor(sampleUrl) {
  return pwaOptions.workbox.runtimeCaching.find((rule) =>
    rule.urlPattern.test(sampleUrl),
  );
}

describe('PWA configuration', () => {
  it('declares an installable Finnish game manifest', () => {
    expect(pwaOptions.manifest).toMatchObject({
      name: 'Sanakenno',
      short_name: 'Sanakenno',
      description: 'Suomalainen sanapeli',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      lang: 'fi',
      categories: ['games'],
    });
    expect(pwaOptions.manifest.icons.map((icon) => icon.sizes)).toContain(
      '192x192',
    );
    expect(pwaOptions.manifest.icons.map((icon) => icon.sizes)).toContain(
      '512x512',
    );
    expect(pwaOptions.manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: 'icons/sanakenno-maskable-512x512.png',
          purpose: 'maskable',
        }),
      ]),
    );
  });

  it('keeps API, static asset, and image runtime caching strategies distinct', () => {
    expect(runtimeRuleFor('/api/puzzle')).toMatchObject({
      handler: 'NetworkOnly',
    });
    expect(runtimeRuleFor('/assets/index-abc123.js')).toMatchObject({
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-assets' },
    });
    expect(runtimeRuleFor('/assets/index-abc123.css')).toMatchObject({
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-assets' },
    });
    expect(runtimeRuleFor('/icons/sanakenno-192x192.png')).toMatchObject({
      handler: 'CacheFirst',
      options: { cacheName: 'images' },
    });
  });
});
