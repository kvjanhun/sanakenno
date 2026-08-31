/**
 * Kotus dictionary URL construction. Replaces the former definitions.feature
 * BDD scenarios (link rendering is covered by tests/e2e/definitions.spec.ts).
 */
import { describe, it, expect } from 'vitest';
import { buildKotusUrl } from '@sanakenno/shared';

describe('Kotus definition URLs', () => {
  it('builds the URL for a simple word', () => {
    expect(buildKotusUrl('kissa')).toBe(
      'https://www.kielitoimistonsanakirja.fi/#/kissa',
    );
  });

  it('preserves hyphens for compound words', () => {
    expect(buildKotusUrl('palo-ovi')).toBe(
      'https://www.kielitoimistonsanakirja.fi/#/palo-ovi',
    );
  });

  it('works for unhyphenated compound forms', () => {
    expect(buildKotusUrl('paloovi')).toBe(
      'https://www.kielitoimistonsanakirja.fi/#/paloovi',
    );
  });
});
