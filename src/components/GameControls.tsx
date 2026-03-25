/**
 * Row of action buttons below the honeycomb: delete, shuffle, submit.
 *
 * All buttons use `onPointerDown` with `preventDefault` to avoid
 * stealing focus from the (virtual) keyboard input area.
 *
 * @module src/components/GameControls
 */

import type { PointerEvent } from 'react';

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
  const prevent = (e: PointerEvent): void => e.preventDefault();

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onPointerDown={(e) => {
          prevent(e);
          onDelete();
        }}
        className="px-4 py-2 rounded-lg font-semibold cursor-pointer border-none"
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
          prevent(e);
          onShuffle();
        }}
        className="px-4 py-2 rounded-lg font-semibold cursor-pointer border-none"
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
          prevent(e);
          onSubmit();
        }}
        className="px-4 py-2 rounded-lg font-semibold cursor-pointer border-none text-white"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        OK
      </button>
    </div>
  );
}
