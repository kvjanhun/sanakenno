/**
 * Midnight rollover for React Native.
 *
 * Detects when a new day starts (Helsinki timezone, matching server puzzle
 * rotation) and refetches the puzzle. On web this triggers a page reload;
 * on mobile we simply call fetchPuzzle() to load the new day's puzzle.
 *
 * Handles two scenarios:
 * 1. App is open at midnight → scheduled refetch via setTimeout
 * 2. App returns from background after midnight → immediate refetch
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getHelsinkiDateString } from '@sanakenno/shared';
import { useGameStore } from '../store/useGameStore';

/** Milliseconds until the next midnight in Helsinki timezone. */
function msUntilMidnight(): number {
  const now = new Date();
  const helsinki = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  const midnight = new Date(helsinki);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - helsinki.getTime();
}

export function useMidnightRollover(): void {
  const mountDate = useRef(getHelsinkiDateString());
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountDate.current = getHelsinkiDateString();

    const clearScheduledRollover = () => {
      if (timerId.current !== null) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
    };

    const refetchIfNewDay = () => {
      const currentDate = getHelsinkiDateString();
      if (currentDate !== mountDate.current) {
        mountDate.current = currentDate;
        useGameStore.getState().fetchPuzzle();
      }
    };

    const scheduleNextRollover = () => {
      clearScheduledRollover();
      timerId.current = setTimeout(() => {
        refetchIfNewDay();
        scheduleNextRollover();
      }, msUntilMidnight() + 500);
    };

    scheduleNextRollover();

    // Check on app foregrounding (reliable fallback for backgrounded JS timers)
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refetchIfNewDay();
        scheduleNextRollover();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearScheduledRollover();
      subscription.remove();
    };
  }, []);
}
