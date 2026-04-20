/**
 * Color palette ("Väriteema") state for the web app.
 *
 * Mirrors the mobile `useSettingsStore.themeId` field. Applies the selection
 * to the document root as `data-palette` so index.css token overrides take
 * effect. Persists to localStorage; when the player is linked, changes are
 * pushed to the server by the auth store.
 *
 * @module src/store/usePaletteStore
 */

import { create } from 'zustand';
import { THEME_IDS } from '@sanakenno/shared';
import type { ThemeId } from '@sanakenno/shared';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { markLocalPreferencesUpdated } from './useAuthStore';

const STORAGE_KEY = 'sanakenno_palette';
const DEFAULT_THEME_ID: ThemeId = 'hehku';

interface PaletteState {
  themeId: ThemeId;
  /** Set without pushing to the server — used when applying a server value. */
  setLocal(id: ThemeId): void;
  /** Set locally; the auth store listens and pushes when linked. */
  setThemeId(id: ThemeId): void;
}

function applyToRoot(id: ThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-palette', id);
}

function resolveInitial(): ThemeId {
  const stored = loadFromStorage<string>(STORAGE_KEY);
  if (stored && (THEME_IDS as readonly string[]).includes(stored)) {
    return stored as ThemeId;
  }
  return DEFAULT_THEME_ID;
}

const initialId = resolveInitial();
applyToRoot(initialId);

export const usePaletteStore = create<PaletteState>((set) => ({
  themeId: initialId,

  setLocal(id) {
    saveToStorage(STORAGE_KEY, id);
    applyToRoot(id);
    set({ themeId: id });
  },

  setThemeId(id) {
    saveToStorage(STORAGE_KEY, id);
    applyToRoot(id);
    set({ themeId: id });
    markLocalPreferencesUpdated();
  },
}));
