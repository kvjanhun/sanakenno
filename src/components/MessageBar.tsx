/**
 * Ephemeral status bar that displays feedback messages
 * (validation errors, success confirmations, special alerts).
 *
 * @module src/components/MessageBar
 */

/** Props for {@link MessageBar}. */
export interface MessageBarProps {
  /** Text to display. Empty string hides the bar via opacity. */
  message: string;
  /** Visual style: 'error' (red), 'special' (accent), 'ok' (muted). */
  type: 'ok' | 'error' | 'special';
}

const TYPE_COLORS: Record<MessageBarProps['type'], string> = {
  error: '#ef4444',
  special: 'var(--color-accent)',
  ok: 'var(--color-text-secondary)',
};

/**
 * Render a single-line status message with a fade transition.
 */
export function MessageBar({
  message,
  type,
}: MessageBarProps): React.JSX.Element {
  return (
    <div
      className="text-center text-sm font-medium min-h-[1.5rem] transition-opacity duration-300"
      style={{
        color: TYPE_COLORS[type],
        opacity: message ? 1 : 0,
      }}
      role="status"
      aria-live="polite"
    >
      {message || '\u00A0'}
    </div>
  );
}
