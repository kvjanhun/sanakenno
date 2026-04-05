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
};

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const scheme = pref === 'system' ? systemScheme : pref;
  return scheme === 'dark' ? dark : light;
}
