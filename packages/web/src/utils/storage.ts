/**
 * Storage helpers — delegates to the platform storage service.
 *
 * Existing consumers can keep importing from here. The actual
 * implementation lives in src/platform/.
 *
 * @module src/utils/storage
 */

import { storage } from '../platform/index';

export function saveToStorage<T>(key: string, data: T): void {
  storage.save(key, data);
}

export function loadFromStorage<T>(key: string): T | null {
  return storage.load<T>(key);
}

export function removeFromStorage(key: string): void {
  storage.remove(key);
}
