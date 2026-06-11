/**
 * Shared shell for compact web modal overlays.
 *
 * @module src/components/ModalShell
 */

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { animated, useReducedMotion, useTransition } from '@react-spring/web';
import { X } from 'lucide-react';
import { PRESENCE_SPRING } from '../utils/motion';
import { TitlebarIconButton } from './TitlebarIconButton';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableChildren(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.offsetParent !== null,
  );
}

/**
 * Trap keyboard focus inside an active dialog and restore focus on close.
 */
export function useDialogFocusTrap(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  onEscape?: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = requestAnimationFrame(() => {
      const target = focusableChildren(dialog)[0] ?? dialog;
      target.focus({ preventScroll: true });
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        (onEscape ?? onClose)();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = focusableChildren(dialog);
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKey);
      if (opener && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [dialogRef, enabled, onClose, onEscape]);
}

/** Props for {@link ModalShell}. */
export interface ModalShellProps {
  /** Whether the dialog is visible. */
  show?: boolean;
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
  /** When false, disables focus trapping for temporarily covered nested dialogs. */
  trapFocus?: boolean;
}

/**
 * Render a consistent centered modal with shared close affordance.
 */
export function ModalShell({
  show = true,
  title,
  titleId,
  onClose,
  onEscape,
  children,
  className = '',
  style,
  headerClassName = 'mb-1',
  trapFocus = true,
}: ModalShellProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useDialogFocusTrap(dialogRef, onClose, onEscape, trapFocus && show);

  const transitions = useTransition(show, {
    from: { overlayOpacity: 0, panelOpacity: 0, scale: 0.985, y: 6 },
    enter: { overlayOpacity: 1, panelOpacity: 1, scale: 1, y: 0 },
    leave: { overlayOpacity: 0, panelOpacity: 0, scale: 0.985, y: 6 },
    config: PRESENCE_SPRING,
    immediate: prefersReducedMotion === true,
  });

  return (
    <>
      {transitions((spring, item) =>
        item ? (
          <animated.div
            aria-hidden={!show}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backgroundColor: spring.overlayOpacity.to(
                (opacity) => `rgba(0, 0, 0, ${opacity * 0.6})`,
              ),
              pointerEvents: show ? 'auto' : 'none',
            }}
            onClick={show ? onClose : undefined}
          >
            <animated.div
              ref={dialogRef}
              className={`w-full max-w-sm rounded-xl p-4 overflow-y-auto max-h-[90vh] ${className}`}
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                opacity: spring.panelOpacity,
                scale: spring.scale,
                transformOrigin: '50% 48%',
                y: spring.y,
                ...style,
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`flex items-center justify-between ${headerClassName}`}
              >
                <h2
                  id={titleId}
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {title}
                </h2>
                <TitlebarIconButton
                  label="Sulje"
                  onClick={onClose}
                  opened={show}
                  size={32}
                  style={{ color: 'var(--color-accent)' }}
                >
                  <X size={20} strokeWidth={2.5} />
                </TitlebarIconButton>
              </div>
              {children}
            </animated.div>
          </animated.div>
        ) : null,
      )}
    </>
  );
}
