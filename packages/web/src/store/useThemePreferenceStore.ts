/**
 * Light / dark / system preference for the web app.
 *
 * Holds the tri-state preference (`'light' | 'dark' | 'system'`) so it can
 * round-trip with mobile via sync. The existing `ThemeToggle` in the header
 * consumes this store and flips between explicit light / dark; a value of
 * `'system'` pushed from another device is respected on initial load.
 *
 * @module src/store/useThemePreferenceStore
 */

import { create } from 'zustand';
import type { ThemePreference } from '@sanakenno/shared';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { markLocalPreferencesUpdated } from './useAuthStore';

const STORAGE_KEY = 'sanakenno_theme';

interface ThemePreferenceState {
  preference: ThemePreference;
  /** Set without echoing to the server — used when applying a server value. */
  setLocal(pref: ThemePreference): void;
  /** Set locally; the auth store listens and pushes when linked. */
  setPreference(pref: ThemePreference): void;
}

function resolveInitial(): ThemePreference {
  const stored = loadFromStorage<string>(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function applyToRoot(pref: ThemePreference): void {
  if (typeof document === 'undefined') return;
  if (pref === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', pref);
  }
}

const initial = resolveInitial();
applyToRoot(initial);

export const useThemePreferenceStore = create<ThemePreferenceState>((set) => ({
  preference: initial,

  setLocal(pref) {
    saveToStorage(STORAGE_KEY, pref);
    applyToRoot(pref);
    set({ preference: pref });
  },

  setPreference(pref) {
    saveToStorage(STORAGE_KEY, pref);
    applyToRoot(pref);
    set({ preference: pref });
    markLocalPreferencesUpdated();
  },
}));

/** Resolve the current scheme to a concrete 'light' | 'dark' value. */
export function resolveScheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return pref;
}
