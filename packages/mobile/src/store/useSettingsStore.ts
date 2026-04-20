import { create } from 'zustand';
import { THEME_IDS } from '@sanakenno/shared';
import type { ThemeId, ThemePreference } from '@sanakenno/shared';
import { storage } from '../platform';
import * as PreparedHaptics from 'prepared-haptics';

export type { ThemePreference } from '@sanakenno/shared';
export type HapticsIntensity = 'off' | 'light' | 'medium' | 'heavy';

const SETTINGS_KEY = 'sanakenno_settings';

const VALID_THEME_IDS: readonly ThemeId[] = THEME_IDS;
const DEFAULT_THEME_ID: ThemeId = 'hehku';

interface PersistedSettings {
  themePreference?: ThemePreference;
  themeId?: ThemeId;
  hapticsEnabled?: boolean;
  hapticsIntensity?: HapticsIntensity;
}

interface SettingsState {
  themePreference: ThemePreference;
  themeId: ThemeId;
  hapticsIntensity: HapticsIntensity;
  /** User action: persist, then trigger a cross-device push. */
  setThemePreference: (pref: ThemePreference) => void;
  /** User action: persist, then trigger a cross-device push. */
  setThemeId: (id: ThemeId) => void;
  /** Apply a server-pushed value without echoing it back. */
  setThemePreferenceLocal: (pref: ThemePreference) => void;
  /** Apply a server-pushed value without echoing it back. */
  setThemeIdLocal: (id: ThemeId) => void;
  setHapticsIntensity: (value: HapticsIntensity) => void;
}

function loadSettings(): {
  themePreference: ThemePreference;
  themeId: ThemeId;
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

  let themeId: ThemeId = DEFAULT_THEME_ID;
  if (saved?.themeId && VALID_THEME_IDS.includes(saved.themeId)) {
    themeId = saved.themeId;
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

  return { themePreference, themeId, hapticsIntensity };
}

const initial = loadSettings();

function persist(state: {
  themePreference: ThemePreference;
  themeId: ThemeId;
  hapticsIntensity: HapticsIntensity;
}): void {
  storage.save(SETTINGS_KEY, {
    themePreference: state.themePreference,
    themeId: state.themeId,
    hapticsIntensity: state.hapticsIntensity,
  });
}

/**
 * Notify the auth store that a display preference changed locally so it can
 * push to the server. Resolved lazily via dynamic require to avoid a circular
 * import at module eval time (auth store imports this settings store).
 */
function notifyAuthOfPreferenceChange(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./useAuthStore') as {
    markLocalPreferencesUpdated: () => void;
  };
  mod.markLocalPreferencesUpdated();
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...initial,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    persist({
      themePreference: pref,
      themeId: get().themeId,
      hapticsIntensity: get().hapticsIntensity,
    });
    notifyAuthOfPreferenceChange();
  },

  setThemeId: (id: ThemeId) => {
    set({ themeId: id });
    persist({
      themePreference: get().themePreference,
      themeId: id,
      hapticsIntensity: get().hapticsIntensity,
    });
    notifyAuthOfPreferenceChange();
  },

  setThemePreferenceLocal: (pref: ThemePreference) => {
    set({ themePreference: pref });
    persist({
      themePreference: pref,
      themeId: get().themeId,
      hapticsIntensity: get().hapticsIntensity,
    });
  },

  setThemeIdLocal: (id: ThemeId) => {
    set({ themeId: id });
    persist({
      themePreference: get().themePreference,
      themeId: id,
      hapticsIntensity: get().hapticsIntensity,
    });
  },

  setHapticsIntensity: (value: HapticsIntensity) => {
    PreparedHaptics.setIntensity(value);
    set({ hapticsIntensity: value });
    persist({
      themePreference: get().themePreference,
      themeId: get().themeId,
      hapticsIntensity: value,
    });
  },
}));
