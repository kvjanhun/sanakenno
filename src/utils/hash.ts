/**
 * Word hashing — delegates to the platform crypto service.
 *
 * @module src/utils/hash
 */

import { crypto } from '../platform/index.js';

export function hashWord(word: string): Promise<string> {
  return crypto.hashSHA256(word);
}
