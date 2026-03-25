/**
 * Button that toggles between light and dark colour themes.
 * Persists the choice to localStorage and applies it via the
 * `data-theme` attribute on `<html>`.
 *
 * @module src/components/ThemeToggle
 */

import { useCallback, useEffect, useState } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage.js';

const STORAGE_KEY = 'sanakenno_theme';
type Theme = 'light' | 'dark';

/** Apply a theme to the document root element. */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Read the persisted theme, or fall back to the system preference.
 *
 * @returns The resolved theme.
 */
function resolveInitialTheme(): Theme {
  const stored = loadFromStorage<string>(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Render a small icon button that toggles dark/light mode.
 */
export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      saveToStorage(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="bg-transparent border-none cursor-pointer text-lg p-1 leading-none"
      style={{ color: 'var(--color-text-tertiary)' }}
      aria-label={
        theme === 'dark' ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'
      }
    >
      {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  );
}
