/**
 * Automatically reload the page at midnight (Helsinki time) so the
 * player always sees the current day's puzzle. Also reloads if
 * the tab becomes visible after midnight has passed.
 *
 * @module src/hooks/useMidnightRollover
 */

import { useEffect } from 'react';

/** Return ms from now until the next midnight in Helsinki timezone. */
export function msUntilMidnight(): number {
  const now = new Date();
  // Convert to Helsinki timezone to match server's puzzle rotation
  const helsinki = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  const midnight = new Date(helsinki);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - helsinki.getTime();
}

/**
 * Schedule a page reload at midnight (Helsinki time). If the page was hidden
 * across midnight, reload as soon as it becomes visible again.
 */
export function useMidnightRollover(): void {
  useEffect(() => {
    const getHelsinkiDate = (): string => {
      const now = new Date();
      const helsinki = new Date(
        now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
      );
      return helsinki.toDateString();
    };

    const mountDate = getHelsinkiDate();

    const timerId = window.setTimeout(() => {
      window.location.reload();
    }, msUntilMidnight());

    const handleVisibility = (): void => {
      if (!document.hidden && getHelsinkiDate() !== mountDate) {
        window.location.reload();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
