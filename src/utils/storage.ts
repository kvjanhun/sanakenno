/**
 * LocalStorage wrapper with quota-exceeded handling and parse-error safety.
 *
 * @module src/utils/storage
 */

/**
 * Persist a JSON-serialisable value to localStorage.
 * Silently swallows QuotaExceededError so callers don't need to handle it.
 *
 * @param key  - Storage key
 * @param data - Value to serialise (must be JSON-safe)
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn(`[storage] QuotaExceededError writing key "${key}"`);
      return;
    }
    throw err;
  }
}

/**
 * Read and parse a JSON value from localStorage.
 * Returns `null` when the key is missing or the stored value is not valid JSON.
 *
 * @param key - Storage key
 * @returns Parsed value or `null`
 */
export function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[storage] Failed to parse key "${key}", returning null`);
    return null;
  }
}

/**
 * Remove a key from localStorage.
 *
 * @param key - Storage key to remove
 */
export function removeFromStorage(key: string): void {
  window.localStorage.removeItem(key);
}
