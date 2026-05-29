/**
 * Shared shell for compact web modal overlays.
 *
 * @module src/components/ModalShell
 */

import { useEffect, type CSSProperties, type ReactNode } from 'react';

/** Props for {@link ModalShell}. */
export interface ModalShellProps {
  /** Dialog title text. */
  title: string;
  /** ID used by aria-labelledby. */
  titleId: string;
  /** Close the modal. */
  onClose: () => void;
  /** Optional Escape handler when Escape should close nested state first. */
  onEscape?: () => void;
  /** Modal contents below the shared header. */
  children: ReactNode;
  /** Extra classes for the content panel. */
  className?: string;
  /** Extra styles for the content panel. */
  style?: CSSProperties;
  /** Extra classes for the shared header. */
  headerClassName?: string;
}

/**
 * Render a consistent centered modal with shared close affordance.
 */
export function ModalShell({
  title,
  titleId,
  onClose,
  onEscape,
  children,
  className = '',
  style,
  headerClassName = 'mb-1',
}: ModalShellProps): React.JSX.Element {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (onEscape ?? onClose)();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onEscape]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-xl p-4 overflow-y-auto max-h-[90vh] ${className}`}
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          ...style,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between ${headerClassName}`}>
          <h2
            id={titleId}
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-xl leading-none bg-transparent border-none cursor-pointer"
            style={{
              color: 'var(--color-accent)',
              height: '32px',
              padding: 0,
              width: '32px',
            }}
            aria-label="Sulje"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
