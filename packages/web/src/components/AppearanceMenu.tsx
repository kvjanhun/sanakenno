/**
 * Header appearance menu for palette and light/dark/system theme choices.
 *
 * @module src/components/AppearanceMenu
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { THEME_IDS } from '@sanakenno/shared';
import type { ThemeId, ThemePreference } from '@sanakenno/shared';
import { usePaletteStore } from '../store/usePaletteStore';
import {
  resolveScheme,
  useThemePreferenceStore,
} from '../store/useThemePreferenceStore';
import { PALETTE_LABELS, paletteAccent } from '../utils/palette';

const THEME_CHOICES: readonly {
  id: ThemePreference;
  label: string;
  icon: typeof Monitor;
}[] = [
  { id: 'system', label: 'Laite', icon: Monitor },
  { id: 'light', label: 'Vaalea', icon: Sun },
  { id: 'dark', label: 'Tumma', icon: Moon },
];

/**
 * Render one compact header button that opens all appearance choices.
 */
export function AppearanceMenu(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const themeId = usePaletteStore((s) => s.themeId);
  const setThemeId = usePaletteStore((s) => s.setThemeId);
  const preference = useThemePreferenceStore((s) => s.preference);
  const setPreference = useThemePreferenceStore((s) => s.setPreference);
  const scheme = resolveScheme(preference);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-10 w-10 rounded-lg bg-transparent border-none cursor-pointer flex items-center justify-center"
        style={{ color: 'var(--color-text-primary)' }}
        aria-label="Ulkoasu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Palette size={20} strokeWidth={2.5} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Ulkoasu"
          className="absolute right-0 top-full mt-2 rounded-lg border p-3 shadow-lg"
          style={{
            zIndex: 80,
            width: 304,
            maxWidth: 'calc(100vw - 1rem)',
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 12px 30px var(--color-button-shadow)',
          }}
        >
          <div
            className="mb-2 text-xs font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Väriteema
          </div>
          <div className="flex items-start justify-between gap-2">
            {THEME_IDS.map((id: ThemeId) => {
              const selected = id === themeId;
              const isMonoDark = id === 'mono' && scheme === 'dark';
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={PALETTE_LABELS[id]}
                  onClick={() => {
                    setThemeId(id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                >
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 30,
                      height: 30,
                      backgroundColor: paletteAccent(id, scheme),
                      border: selected
                        ? '2px solid var(--color-text-primary)'
                        : '1px solid var(--color-border)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {selected ? (
                      <Check
                        size={14}
                        strokeWidth={3}
                        color={isMonoDark ? '#000' : '#fff'}
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      maxWidth: '100%',
                      fontSize: 10.5,
                      color: 'var(--color-text-primary)',
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {PALETTE_LABELS[id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="my-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          />

          <div
            className="mb-2 text-xs font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Teema
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THEME_CHOICES.map((choice) => {
              const selected = choice.id === preference;
              const Icon = choice.icon;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={choice.label}
                  onClick={() => {
                    setPreference(choice.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: selected
                      ? 'var(--color-accent)'
                      : 'var(--color-bg-secondary)',
                    borderColor: selected
                      ? 'var(--color-accent-faded)'
                      : 'var(--color-border)',
                    color: selected
                      ? 'var(--color-on-accent)'
                      : 'var(--color-text-primary)',
                  }}
                >
                  <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
                  <span className="truncate">{choice.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
