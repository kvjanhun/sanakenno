/**
 * Design tokens for the mobile app, mirroring the web CSS custom properties.
 *
 * Two dimensions of variation:
 *   - scheme:  'light' | 'dark'  — driven by system or user preference
 *   - palette: ThemeId           — user-selected color palette ("Väriteema")
 *
 * Neutral tokens (text, bg, border, hex cells) are shared across palettes.
 * Only `accent` and `accentFaded` vary per palette.
 */

import { useColorScheme } from 'react-native';
import type { ThemeId } from '@sanakenno/shared';
import { useSettingsStore } from './store/useSettingsStore';

export type { ThemeId };

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

export interface PaletteMeta {
  id: ThemeId;
  label: string;
}

export const PALETTE_ORDER: ReadonlyArray<PaletteMeta> = [
  { id: 'hehku', label: 'Hehku' },
  { id: 'meri', label: 'Meri' },
  { id: 'metsa', label: 'Metsä' },
  { id: 'yo', label: 'Yö' },
  { id: 'aamu', label: 'Aamu' },
  { id: 'mono', label: 'Mustavalko' },
];

export const DEFAULT_THEME_ID: ThemeId = 'hehku';

interface PaletteOverride {
  accent: string;
  accentFaded: string;
  /** Override for text on accent — defaults to white. */
  onAccent?: string;
}

type SchemeKey = 'light' | 'dark';

const PALETTES: Record<ThemeId, Record<SchemeKey, PaletteOverride>> = {
  hehku: {
    light: { accent: '#ff643e', accentFaded: '#ffb2a0' },
    dark: { accent: '#e05030', accentFaded: '#7d3525' },
  },
  meri: {
    light: { accent: '#0d9488', accentFaded: '#99e3d9' },
    dark: { accent: '#2dd4bf', accentFaded: '#115e57' },
  },
  metsa: {
    light: { accent: '#15803d', accentFaded: '#a7dcba' },
    dark: { accent: '#22c55e', accentFaded: '#14452a' },
  },
  yo: {
    light: { accent: '#6366f1', accentFaded: '#c7c8f7' },
    dark: { accent: '#818cf8', accentFaded: '#353680' },
  },
  aamu: {
    light: { accent: '#d97706', accentFaded: '#fad591' },
    dark: { accent: '#f59e0b', accentFaded: '#78350f' },
  },
  // Mono inverts the accent per scheme; white accent needs black onAccent.
  mono: {
    light: { accent: '#111827', accentFaded: '#9ca3af', onAccent: '#ffffff' },
    dark: { accent: '#f3f4f6', accentFaded: '#4b5563', onAccent: '#000000' },
  },
};

const baseLight: Omit<Theme, 'accent' | 'accentFaded'> = {
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
  onAccent: '#ffffff',
  error: '#FF6B6B',
  golden: '#fbbf24',
  goldenShadow: '#f59e0b',
  backdrop: '#000000',
};

const baseDark: Omit<Theme, 'accent' | 'accentFaded'> = {
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
  onAccent: '#ffffff',
  error: '#FF6B6B',
  golden: '#fbbf24',
  goldenShadow: '#f59e0b',
  backdrop: '#000000',
};

function buildTheme(scheme: SchemeKey, paletteId: ThemeId): Theme {
  const base = scheme === 'dark' ? baseDark : baseLight;
  const override = PALETTES[paletteId][scheme];
  return {
    ...base,
    accent: override.accent,
    accentFaded: override.accentFaded,
    onAccent: override.onAccent ?? base.onAccent,
  };
}

/** Returns the accent color for a palette in the given scheme — for swatches. */
export function getPaletteAccent(
  paletteId: ThemeId,
  scheme: SchemeKey,
): string {
  return PALETTES[paletteId][scheme].accent;
}

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const paletteId = useSettingsStore((s) => s.themeId);
  const scheme = pref === 'system' ? systemScheme : pref;
  return buildTheme(scheme === 'dark' ? 'dark' : 'light', paletteId);
}

/** Resolve the scheme string ('light' | 'dark') for StatusBar / non-hook contexts. */
export function useResolvedScheme(): SchemeKey {
  const systemScheme = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const scheme = pref === 'system' ? systemScheme : pref;
  return scheme === 'dark' ? 'dark' : 'light';
}

/** Get theme object without hooks (for class components). */
export function getTheme(scheme: SchemeKey, paletteId: ThemeId): Theme {
  return buildTheme(scheme, paletteId);
}
