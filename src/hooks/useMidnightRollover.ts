/**
 * Automatically reload the page at midnight (Finnish time) so the
 * player always sees the current day's puzzle. Also reloads if
 * the tab becomes visible after midnight has passed.
 *
 * @module src/hooks/useMidnightRollover
 */

import { useEffect } from 'react';

/** Return ms from now until the next local midnight. */
function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * Schedule a page reload at midnight. If the page was hidden across
 * midnight, reload as soon as it becomes visible again.
 */
export function useMidnightRollover(): void {
  useEffect(() => {
    const mountDate = new Date().toDateString();

    const timerId = window.setTimeout(() => {
      window.location.reload();
    }, msUntilMidnight());

    const handleVisibility = (): void => {
      if (!document.hidden && new Date().toDateString() !== mountDate) {
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
