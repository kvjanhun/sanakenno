import { useEffect, useRef } from 'react';

/** Configuration for the global keyboard handler. */
export interface UseKeyboardOptions {
  /** Called when a valid letter key (a-z, ä, ö, hyphen) is pressed. */
  onLetter: (key: string) => void;
  /** Called when Backspace is pressed. */
  onBackspace: () => void;
  /** Called when Enter is pressed. */
  onEnter: () => void;
  /** Called when Escape is pressed. */
  onEscape: () => void;
  /** When false, all keyboard events are ignored. */
  enabled: boolean;
}

/** Finnish letter pattern: a-z plus ä, ö, and hyphen. */
const LETTER_PATTERN = /^[a-zäö-]$/;

/**
 * Attaches a global keydown listener for game input.
 * Handles letter entry (a-z, ä, ö, hyphen), Backspace, Enter, and Escape.
 * Ignores events with modifier keys, events targeting input elements,
 * and all events when disabled.
 * @param options - Callback handlers and enabled flag.
 */
export function useKeyboard(options: UseKeyboardOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const opts = optionsRef.current;

      if (e.key === 'Escape') {
        opts.onEscape();
        return;
      }

      if (!opts.enabled) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();

      if (key === 'enter') {
        e.preventDefault();
        opts.onEnter();
      } else if (key === 'backspace') {
        e.preventDefault();
        opts.onBackspace();
      } else if (LETTER_PATTERN.test(key)) {
        opts.onLetter(key);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);
}

export default useKeyboard;
