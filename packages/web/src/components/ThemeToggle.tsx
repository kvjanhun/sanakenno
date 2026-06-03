/**
 * Button that flips between light and dark colour schemes.
 *
 * Reads / writes the shared {@link useThemePreferenceStore} so the preference
 * round-trips with mobile via cross-device sync. Clicking the toggle always
 * resolves to an explicit `'light'` or `'dark'` value — the `'system'` state
 * is reachable only by receiving a synced value from another device.
 *
 * @module src/components/ThemeToggle
 */

import { useCallback } from 'react';
import type { ThemePreference } from '@sanakenno/shared';
import {
  useThemePreferenceStore,
  resolveScheme,
} from '../store/useThemePreferenceStore';
import { SunIcon, MoonIcon } from './icons';

export interface ThemeToggleProps {
  preference?: ThemePreference;
  setPreference?: (pref: ThemePreference) => void;
}

/**
 * Render a small icon button that toggles dark/light mode.
 */
export function ThemeToggle({
  preference: propPreference,
  setPreference: propSetPreference,
}: ThemeToggleProps = {}): React.JSX.Element {
  const storePreference = useThemePreferenceStore((s) => s.preference);
  const storeSetPreference = useThemePreferenceStore((s) => s.setPreference);

  const preference =
    propPreference !== undefined ? propPreference : storePreference;
  const setPreference =
    propSetPreference !== undefined ? propSetPreference : storeSetPreference;
  const resolved = resolveScheme(preference);

  const toggle = useCallback(() => {
    setPreference(resolved === 'light' ? 'dark' : 'light');
  }, [resolved, setPreference]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="bg-transparent border-none cursor-pointer py-2 pl-1 leading-none flex items-center"
      style={{ color: 'var(--color-text-primary)' }}
      aria-label={
        resolved === 'dark'
          ? 'Vaihda vaaleaan teemaan'
          : 'Vaihda tummaan teemaan'
      }
    >
      {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
