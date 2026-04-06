import { create } from 'zustand';
import { storage } from '../platform';
import * as PreparedHaptics from 'prepared-haptics';

export type ThemePreference = 'light' | 'dark' | 'system';

const SETTINGS_KEY = 'sanakenno_settings';

interface PersistedSettings {
  themePreference?: ThemePreference;
  hapticsEnabled?: boolean;
}

interface SettingsState {
  themePreference: ThemePreference;
  hapticsEnabled: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  setHapticsEnabled: (value: boolean) => void;
}

function loadSettings(): { themePreference: ThemePreference; hapticsEnabled: boolean } {
  const saved = storage.load<PersistedSettings>(SETTINGS_KEY);

  let themePreference: ThemePreference = 'system';
  if (
    saved?.themePreference === 'light' ||
    saved?.themePreference === 'dark' ||
    saved?.themePreference === 'system'
  ) {
    themePreference = saved.themePreference;
  }

  const hapticsEnabled = saved?.hapticsEnabled !== false;
  PreparedHaptics.setEnabled(hapticsEnabled);

  return { themePreference, hapticsEnabled };
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...initial,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    storage.save(SETTINGS_KEY, {
      themePreference: pref,
      hapticsEnabled: get().hapticsEnabled,
    });
  },

  setHapticsEnabled: (value: boolean) => {
    PreparedHaptics.setEnabled(value);
    set({ hapticsEnabled: value });
    storage.save(SETTINGS_KEY, {
      themePreference: get().themePreference,
      hapticsEnabled: value,
    });
  },
}));
