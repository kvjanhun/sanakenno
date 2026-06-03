/**
 * Color palette and theme preference state for the admin panel.
 *
 * Saves setting separately in localStorage under 'sanakenno_admin_palette'
 * and 'sanakenno_admin_theme', isolating them from the main game state.
 *
 * @module src/store/useAdminThemeStore
 */

import { create } from 'zustand';
import { THEME_IDS } from '@sanakenno/shared';
import type { ThemeId, ThemePreference } from '@sanakenno/shared';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const STORAGE_KEY_PALETTE = 'sanakenno_admin_palette';
const STORAGE_KEY_THEME = 'sanakenno_admin_theme';
const DEFAULT_THEME_ID: ThemeId = 'hehku';

interface AdminThemeState {
  themeId: ThemeId;
  preference: ThemePreference;
  setThemeId(id: ThemeId): void;
  setPreference(pref: ThemePreference): void;
}

function resolveInitialPalette(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const stored = loadFromStorage<string>(STORAGE_KEY_PALETTE);
  if (stored && (THEME_IDS as readonly string[]).includes(stored)) {
    return stored as ThemeId;
  }
  return DEFAULT_THEME_ID;
}

function resolveInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = loadFromStorage<string>(STORAGE_KEY_THEME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export const useAdminThemeStore = create<AdminThemeState>((set) => ({
  themeId: resolveInitialPalette(),
  preference: resolveInitialPreference(),

  setThemeId(id) {
    saveToStorage(STORAGE_KEY_PALETTE, id);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-palette', id);
    }
    set({ themeId: id });
  },

  setPreference(pref) {
    saveToStorage(STORAGE_KEY_THEME, pref);
    if (typeof document !== 'undefined') {
      if (pref === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', pref);
      }
    }
    set({ preference: pref });
  },
}));
