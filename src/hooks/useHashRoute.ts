/**
 * Lightweight hash-based routing hook.
 *
 * Returns the current hash path (e.g. '' for game, 'admin' for admin).
 * Listens for hashchange events and re-renders on navigation.
 *
 * @module src/hooks/useHashRoute
 */

import { useState, useEffect } from 'react';

/**
 * Extract the route from window.location.hash.
 * '#/admin' returns 'admin', '#/' or '' returns ''.
 */
function getRoute(): string {
  const hash = window.location.hash;
  return hash.replace(/^#\/?/, '').split('/')[0] || '';
}

/**
 * Subscribe to hash changes and return the current route segment.
 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return route;
}
