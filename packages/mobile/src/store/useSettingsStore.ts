import { create } from 'zustand';
import { storage } from '../platform';

export type ThemePreference = 'light' | 'dark' | 'system';

const SETTINGS_KEY = 'sanakenno_settings';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

function loadPreference(): ThemePreference {
  const saved = storage.load<{ themePreference?: ThemePreference }>(
    SETTINGS_KEY,
  );
  if (
    saved?.themePreference === 'light' ||
    saved?.themePreference === 'dark' ||
    saved?.themePreference === 'system'
  ) {
    return saved.themePreference;
  }
  return 'system';
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  themePreference: loadPreference(),

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    storage.save(SETTINGS_KEY, { themePreference: pref });
  },
}));
