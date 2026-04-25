import type { ThemeId } from '@sanakenno/shared';

export const PALETTE_LABELS: Record<ThemeId, string> = {
  hehku: 'Hehku',
  meri: 'Meri',
  metsa: 'Metsä',
  yo: 'Yö',
  aamu: 'Aamu',
  mono: 'Hiili',
};

/** Accent swatch colour for a palette in the resolved scheme. */
export function paletteAccent(id: ThemeId, scheme: 'light' | 'dark'): string {
  const map: Record<ThemeId, { light: string; dark: string }> = {
    hehku: { light: '#ff643e', dark: '#e05030' },
    meri: { light: '#0d9488', dark: '#2dd4bf' },
    metsa: { light: '#15803d', dark: '#22c55e' },
    yo: { light: '#6366f1', dark: '#818cf8' },
    aamu: { light: '#d97706', dark: '#f59e0b' },
    mono: { light: '#111827', dark: '#f3f4f6' },
  };
  return map[id][scheme];
}
