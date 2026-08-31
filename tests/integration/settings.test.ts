/**
 * Theme preference settings through the real web store.
 *
 * Replaces the surviving settings.feature BDD scenarios. The haptics and
 * mobile-settings-screen scenarios were retired with the native app
 * (archived at the mobile-archive tag); live theme switching is covered by
 * tests/e2e/theme.spec.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'sanakenno_theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.resetModules();
});

async function freshStore() {
  const mod =
    await import('../../packages/web/src/store/useThemePreferenceStore');
  return mod.useThemePreferenceStore;
}

describe('theme preference', () => {
  it('defaults to "system" when nothing has been saved', async () => {
    const store = await freshStore();
    expect(store.getState().preference).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('persists a changed preference and applies it to the document root', async () => {
    const store = await freshStore();
    store.getState().setPreference('dark');
    expect(store.getState().preference).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toBe('dark');
  });

  it('restores a persisted preference on initialisation', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('light'));
    const store = await freshStore();
    expect(store.getState().preference).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('selecting "system" clears the explicit document theme', async () => {
    const store = await freshStore();
    store.getState().setPreference('dark');
    store.getState().setPreference('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toBe('system');
  });
});
