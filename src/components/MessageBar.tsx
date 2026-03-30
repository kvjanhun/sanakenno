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
  /** Visual style: 'error' (inverted chip), 'special' (accent chip), 'ok' (muted text). */
  type: 'ok' | 'error' | 'special';
  /** Optional second message shown alongside the primary. */
  secondaryMessage?: string;
  /** Visual style for the secondary message. */
  secondaryType?: 'ok' | 'error' | 'special';
}

type ChipStyle = { background: string; color: string; border?: string };

const CHIP: Record<'ok' | 'error' | 'special', ChipStyle> = {
  ok: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  special: {
    background: 'var(--color-accent)',
    color: '#ffffff',
  },
  error: {
    background: 'var(--color-text-primary)',
    color: 'var(--color-bg-primary)',
  },
};

function Chip({
  text,
  type,
}: {
  text: string;
  type: 'ok' | 'error' | 'special';
}): React.JSX.Element {
  const s = CHIP[type];
  const hasBg = type !== 'ok';
  return (
    <span
      style={{
        background: s.background,
        color: s.color,
        ...(hasBg ? { padding: '0.1rem 0.6rem', borderRadius: '999px' } : {}),
      }}
    >
      {text}
    </span>
  );
}

/**
 * Render a single-line status message with a fade transition.
 * Supports an optional secondary message shown side-by-side.
 */
export function MessageBar({
  message,
  type,
  secondaryMessage,
  secondaryType = 'ok',
}: MessageBarProps): React.JSX.Element {
  const visible = !!(message || secondaryMessage);
  return (
    <div
      className="flex justify-center items-center gap-2 text-sm font-medium min-h-[1.5rem] transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      role="status"
      aria-live="polite"
    >
      {message ? <Chip text={message} type={type} /> : null}
      {secondaryMessage ? (
        <Chip text={secondaryMessage} type={secondaryType} />
      ) : null}
      {!visible && '\u00A0'}
    </div>
  );
}
