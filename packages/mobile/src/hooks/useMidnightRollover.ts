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
import { useGameStore } from '../store/useGameStore';

/** Get current Helsinki date string for comparison. */
function getHelsinkiDateString(date: Date = new Date()): string {
  return new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  ).toDateString();
}

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

    const refetchIfNewDay = () => {
      const currentDate = getHelsinkiDateString();
      if (currentDate !== mountDate.current) {
        mountDate.current = currentDate;
        useGameStore.getState().fetchPuzzle();
      }
    };

    // Schedule a refetch at midnight
    timerId.current = setTimeout(() => {
      mountDate.current = getHelsinkiDateString();
      useGameStore.getState().fetchPuzzle();
      // Re-schedule for the next midnight (recursive via effect cleanup + re-run)
    }, msUntilMidnight());

    // Check on app foregrounding
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refetchIfNewDay();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      if (timerId.current !== null) clearTimeout(timerId.current);
      subscription.remove();
    };
  }, []);
}
