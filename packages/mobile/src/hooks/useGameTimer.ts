/**
 * Native game timer that tracks elapsed play time.
 *
 * Pauses automatically when the app goes to background (via useAppState)
 * and resumes when it returns to foreground. Uses refs to avoid
 * unnecessary re-renders — the store owns the persisted values.
 */

import { useRef, useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useGameStore } from '../store/useGameStore';

export interface GameTimerApi {
  start: () => void;
  getElapsedMs: () => number;
  reset: () => void;
  restore: (startedAt: number | null, totalPausedMs: number) => void;
}

export function useGameTimer(): GameTimerApi {
  const startedAt = useRef<number | null>(null);
  const totalPausedMs = useRef(0);
  const backgroundAt = useRef<number | null>(null);

  const start = useCallback((): void => {
    if (startedAt.current === null) {
      startedAt.current = Date.now();
    }
  }, []);

  const getElapsedMs = useCallback((): number => {
    if (startedAt.current === null) return 0;
    const end =
      backgroundAt.current !== null ? backgroundAt.current : Date.now();
    return end - startedAt.current - totalPausedMs.current;
  }, []);

  const reset = useCallback((): void => {
    startedAt.current = null;
    totalPausedMs.current = 0;
    backgroundAt.current = null;
  }, []);

  const restore = useCallback(
    (saved: number | null, paused: number): void => {
      startedAt.current = saved;
      totalPausedMs.current = paused;
      backgroundAt.current = null;
    },
    [],
  );

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // App going to background — pause timer
        if (startedAt.current !== null && backgroundAt.current === null) {
          backgroundAt.current = Date.now();
          // Persist current timer state so it survives kills
          const store = useGameStore.getState();
          store.saveState();
        }
      } else if (nextState === 'active') {
        // App returning to foreground — resume timer
        if (backgroundAt.current !== null) {
          totalPausedMs.current += Date.now() - backgroundAt.current;
          backgroundAt.current = null;
          // Update store with new paused total
          useGameStore.setState({ totalPausedMs: totalPausedMs.current });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  const api = useRef<GameTimerApi | null>(null);
  if (!api.current) {
    api.current = { start, getElapsedMs, reset, restore };
  }
  return api.current;
}
