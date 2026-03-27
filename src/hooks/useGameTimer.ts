/**
 * Game timer hook that tracks elapsed play time, pausing when
 * the page is hidden or blurred to exclude inactive time.
 *
 * Uses refs internally to avoid triggering re-renders. The Zustand
 * store is responsible for persisting startedAt / totalPausedMs.
 *
 * @module src/hooks/useGameTimer
 */

import { useEffect, useRef } from 'react';

/** Public API surface returned by {@link useGameTimer}. */
export interface GameTimerApi {
  /** Idempotently start the timer (no-op if already running). */
  start: () => void;
  /** Milliseconds of active play time since start, excluding pauses. */
  getElapsedMs: () => number;
  /** Reset all internal state. */
  reset: () => void;
  /** Restore timer state from persisted values (e.g. after page reload). */
  restore: (startedAt: number | null, totalPausedMs: number) => void;
  /** Current startedAt timestamp, or null if not started. */
  getStartedAt: () => number | null;
  /** Total milliseconds spent paused. */
  getTotalPausedMs: () => number;
}

/**
 * Create a game timer that pauses automatically when the tab is
 * hidden or the window loses focus.
 *
 * @returns Timer control API (all ref-based, no re-renders).
 */
export function useGameTimer(): GameTimerApi {
  const startedAt = useRef<number | null>(null);
  const totalPausedMs = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  const start = (): void => {
    if (startedAt.current === null) {
      startedAt.current = Date.now();
    }
  };

  const getElapsedMs = (): number => {
    if (startedAt.current === null) return 0;
    const end = hiddenAt.current !== null ? hiddenAt.current : Date.now();
    return end - startedAt.current - totalPausedMs.current;
  };

  const reset = (): void => {
    startedAt.current = null;
    totalPausedMs.current = 0;
    hiddenAt.current = null;
  };

  const restore = (saved: number | null, paused: number): void => {
    startedAt.current = saved;
    totalPausedMs.current = paused;
  };

  const getStartedAt = (): number | null => startedAt.current;
  const getTotalPausedMs = (): number => totalPausedMs.current;

  useEffect(() => {
    const pause = (): void => {
      if (startedAt.current !== null && hiddenAt.current === null) {
        hiddenAt.current = Date.now();
      }
    };

    const resume = (): void => {
      if (hiddenAt.current !== null) {
        totalPausedMs.current += Date.now() - hiddenAt.current;
        hiddenAt.current = null;
      }
    };

    const handleVisibility = (): void => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    const handleBlur = (): void => pause();
    const handleFocus = (): void => resume();
    const handlePageHide = (): void => pause();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const api = useRef<GameTimerApi | null>(null);
  if (!api.current) {
    api.current = {
      start,
      getElapsedMs,
      reset,
      restore,
      getStartedAt,
      getTotalPausedMs,
    };
  }
  return api.current;
}
