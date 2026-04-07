import { create } from 'zustand';
import { storage } from '../platform';
import * as PreparedHaptics from 'prepared-haptics';

export type ThemePreference = 'light' | 'dark' | 'system';
export type HapticsIntensity = 'off' | 'light' | 'medium' | 'heavy';

const SETTINGS_KEY = 'sanakenno_settings';

interface PersistedSettings {
  themePreference?: ThemePreference;
  hapticsEnabled?: boolean;
  hapticsIntensity?: HapticsIntensity;
}

interface SettingsState {
  themePreference: ThemePreference;
  hapticsIntensity: HapticsIntensity;
  setThemePreference: (pref: ThemePreference) => void;
  setHapticsIntensity: (value: HapticsIntensity) => void;
}

function loadSettings(): {
  themePreference: ThemePreference;
  hapticsIntensity: HapticsIntensity;
} {
  const saved = storage.load<PersistedSettings>(SETTINGS_KEY);

  let themePreference: ThemePreference = 'system';
  if (
    saved?.themePreference === 'light' ||
    saved?.themePreference === 'dark' ||
    saved?.themePreference === 'system'
  ) {
    themePreference = saved.themePreference;
  }

  // Migrate old boolean hapticsEnabled to hapticsIntensity
  let hapticsIntensity: HapticsIntensity = 'heavy';
  if (saved?.hapticsIntensity != null) {
    const v = saved.hapticsIntensity;
    if (v === 'off' || v === 'light' || v === 'medium' || v === 'heavy') {
      hapticsIntensity = v;
    }
  } else if (saved?.hapticsEnabled === false) {
    hapticsIntensity = 'off';
  }
  PreparedHaptics.setIntensity(hapticsIntensity);

  return { themePreference, hapticsIntensity };
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...initial,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    storage.save(SETTINGS_KEY, {
      themePreference: pref,
      hapticsIntensity: get().hapticsIntensity,
    });
  },

  setHapticsIntensity: (value: HapticsIntensity) => {
    PreparedHaptics.setIntensity(value);
    set({ hapticsIntensity: value });
    storage.save(SETTINGS_KEY, {
      themePreference: get().themePreference,
      hapticsIntensity: value,
    });
  },
}));
