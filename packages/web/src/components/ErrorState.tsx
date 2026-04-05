/**
 * Full-width error banner with a retry button.
 *
 * @module src/components/ErrorState
 */

/** Props for {@link ErrorState}. */
export interface ErrorStateProps {
  /** Error message to display. */
  message: string;
  /** Called when the user clicks retry. */
  onRetry: () => void;
}

/**
 * Render a centered error message with a retry action.
 */
export function ErrorState({
  message,
  onRetry,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div className="text-center py-16" role="alert">
      <p className="text-base mb-4" style={{ color: '#ef4444' }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-white font-semibold cursor-pointer border-none"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        Yritä uudelleen
      </button>
    </div>
  );
}
