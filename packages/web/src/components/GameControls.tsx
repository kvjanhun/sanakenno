/**
 * Row of action buttons below the honeycomb: delete, shuffle, submit.
 *
 * All buttons use `onPointerDown` with `preventDefault` to avoid
 * stealing focus from the (virtual) keyboard input area.
 *
 * @module src/components/GameControls
 */

import {
  getHoneycombCenterOverlayStops,
  getHoneycombCenterOverlayVariant,
} from '@sanakenno/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent,
} from 'react';
import { usePaletteStore } from '../store/usePaletteStore';
import {
  resolveScheme,
  useThemePreferenceStore,
} from '../store/useThemePreferenceStore';

/** Prevent default and release implicit pointer capture so concurrent
 *  touches on other elements fire on their correct targets. */
const prepare = (e: PointerEvent<HTMLButtonElement>): void => {
  e.preventDefault();
  e.currentTarget.releasePointerCapture(e.pointerId);
};

function overlayColor(color: '#ffffff' | '#000000', opacity: number): string {
  const channel = color === '#ffffff' ? '255 255 255' : '0 0 0';
  return `rgb(${channel} / ${opacity})`;
}

function buildOverlayGradient(
  themeId: ReturnType<typeof usePaletteStore.getState>['themeId'],
  preference: ReturnType<typeof useThemePreferenceStore.getState>['preference'],
): string {
  return `linear-gradient(180deg, ${getHoneycombCenterOverlayStops(
    getHoneycombCenterOverlayVariant(themeId, resolveScheme(preference)),
  )
    .map((stop) => `${overlayColor(stop.color, stop.opacity)} ${stop.offset}`)
    .join(', ')})`;
}

type ControlVariant = 'neutral' | 'accent';

/** Raised puzzle control button styled to match the honeycomb depth. */
function ControlButton({
  label,
  variant,
  onPointerDown,
  accentGloss,
}: {
  label: string;
  variant: ControlVariant;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  accentGloss: string;
}): React.JSX.Element {
  const isAccent = variant === 'accent';

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className="relative min-w-0 flex-1 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer transition-transform duration-100 active:translate-y-px active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        backgroundColor: 'transparent',
        color: isAccent
          ? 'var(--color-on-accent)'
          : 'var(--color-text-primary)',
        border: `1px solid ${isAccent ? 'var(--color-accent-faded)' : 'var(--color-hex-stroke)'}`,
        boxShadow:
          '0 2px 5px -4px var(--color-button-shadow), 0 10px 20px -16px var(--color-button-shadow)',
        outlineColor: 'var(--color-accent)',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isAccent
            ? 'var(--color-accent)'
            : 'linear-gradient(180deg, var(--color-hex-hi) 0%, var(--color-hex-lo) 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isAccent
            ? accentGloss
            : 'linear-gradient(180deg, rgb(255 255 255 / 0.12) 0%, rgb(255 255 255 / 0.03) 40%, transparent 70%)',
          opacity: isAccent ? 0.7 : 1,
        }}
      />
      <span className="pointer-events-none relative z-10">{label}</span>
    </button>
  );
}

/** Props for {@link GameControls}. */
export interface GameControlsProps {
  /** Delete the last character. */
  onDelete: () => void;
  /** Shuffle the outer letters. */
  onShuffle: () => void;
  /** Submit the current word. */
  onSubmit: () => void;
}

/**
 * Render the three game action buttons.
 */
export function GameControls({
  onDelete,
  onShuffle,
  onSubmit,
}: GameControlsProps): React.JSX.Element {
  const themeId = usePaletteStore((s) => s.themeId);
  const preference = useThemePreferenceStore((s) => s.preference);
  const accentGloss = useMemo(
    () => buildOverlayGradient(themeId, preference),
    [themeId, preference],
  );
  // Native non-passive touch listener to suppress iOS magnifier loupe.
  const ref = useRef<HTMLDivElement>(null);
  const preventTouch = useCallback((e: TouchEvent) => e.preventDefault(), []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('touchstart', preventTouch, { passive: false });
    return () => el.removeEventListener('touchstart', preventTouch);
  }, [preventTouch]);

  return (
    <div
      ref={ref}
      className="flex items-center justify-center gap-3"
      style={{ touchAction: 'none' }}
    >
      <ControlButton
        label="Poista"
        variant="neutral"
        accentGloss={accentGloss}
        onPointerDown={(e) => {
          prepare(e);
          onDelete();
        }}
      />
      <ControlButton
        label="Sekoita"
        variant="neutral"
        accentGloss={accentGloss}
        onPointerDown={(e) => {
          prepare(e);
          onShuffle();
        }}
      />
      <ControlButton
        label="OK"
        variant="accent"
        accentGloss={accentGloss}
        onPointerDown={(e) => {
          prepare(e);
          onSubmit();
        }}
      />
    </div>
  );
}
