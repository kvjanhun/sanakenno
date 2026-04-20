/**
 * Row of action buttons below the honeycomb: delete, shuffle, submit.
 *
 * All buttons use `onPointerDown` with `preventDefault` to avoid
 * stealing focus from the (virtual) keyboard input area.
 *
 * @module src/components/GameControls
 */

import { useCallback, useEffect, useRef, type PointerEvent } from 'react';

/** Prevent default and release implicit pointer capture so concurrent
 *  touches on other elements fire on their correct targets. */
const prepare = (e: PointerEvent): void => {
  e.preventDefault();
  (e.target as Element).releasePointerCapture(e.pointerId);
};

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
      <button
        type="button"
        onPointerDown={(e) => {
          prepare(e);
          onDelete();
        }}
        className="px-4 py-2 rounded-lg font-normal cursor-pointer border-none"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
        }}
      >
        Poista
      </button>
      <button
        type="button"
        onPointerDown={(e) => {
          prepare(e);
          onShuffle();
        }}
        className="px-4 py-2 rounded-lg font-normal cursor-pointer border-none"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
        }}
      >
        Sekoita
      </button>
      <button
        type="button"
        onPointerDown={(e) => {
          prepare(e);
          onSubmit();
        }}
        className="px-4 py-2 rounded-lg font-normal cursor-pointer border-none"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-on-accent)',
        }}
      >
        OK
      </button>
    </div>
  );
}
