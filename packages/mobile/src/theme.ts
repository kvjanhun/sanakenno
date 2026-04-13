/**
 * Design tokens for the mobile app, mirroring the web CSS custom properties.
 *
 * Supports light and dark themes via React Native's useColorScheme().
 */

import { useColorScheme } from 'react-native';
import { useSettingsStore } from './store/useSettingsStore';

export interface Theme {
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  bgPrimary: string;
  bgSecondary: string;
  border: string;
  hexHi: string;
  hexLo: string;
  hexStroke: string;
  /** Center hex text — always white. */
  hexCenterText: string;
  /** Faded / inactive accent — used for disabled center hex fill. */
  accentFaded: string;
  /** Text color on accent backgrounds. */
  onAccent: string;
  /** Error / destructive color. */
  error: string;
  /** Golden celebration color. */
  golden: string;
  /** Golden shadow / glow. */
  goldenShadow: string;
  /** Backdrop overlay color. */
  backdrop: string;
}

const light: Theme = {
  accent: '#ff643e',
  textPrimary: '#1a1a1a',
  textSecondary: '#4a4a4a',
  textTertiary: '#8a8a8a',
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f5',
  border: '#e0e0e0',
  hexHi: '#fbfbfb',
  hexLo: '#ececec',
  hexStroke: '#e0e0e0',
  hexCenterText: '#ffffff',
  accentFaded: '#ffb2a0',
  onAccent: '#ffffff',
  error: '#FF6B6B',
  golden: '#fbbf24',
  goldenShadow: '#f59e0b',
  backdrop: '#000000',
};

const dark: Theme = {
  accent: '#e05030',
  textPrimary: '#f0f0f0',
  textSecondary: '#b0b0b0',
  textTertiary: '#707070',
  bgPrimary: '#1a1a1a',
  bgSecondary: '#252525',
  border: '#3a3a3a',
  hexHi: '#343434',
  hexLo: '#252525',
  hexStroke: '#3e3e3e',
  hexCenterText: '#ffffff',
  accentFaded: '#7d3525',
  onAccent: '#ffffff',
  error: '#FF6B6B',
  golden: '#fbbf24',
  goldenShadow: '#f59e0b',
  backdrop: '#000000',
};

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const scheme = pref === 'system' ? systemScheme : pref;
  return scheme === 'dark' ? dark : light;
}

/** Resolve the scheme string ('light' | 'dark') for StatusBar / non-hook contexts. */
export function useResolvedScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const scheme = pref === 'system' ? systemScheme : pref;
  return scheme === 'dark' ? 'dark' : 'light';
}

/** Get theme object without hooks (for class components). */
export function getTheme(scheme: 'light' | 'dark'): Theme {
  return scheme === 'dark' ? dark : light;
}
