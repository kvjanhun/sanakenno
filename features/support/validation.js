/**
 * Shared validation helper for BDD step definitions.
 *
 * @module features/support/validation
 */

import { createHash } from 'node:crypto';

/**
 * Hash a word using Node.js crypto (same algorithm as server-side).
 *
 * @param {string} word - The word to hash.
 * @returns {string} Lowercase hex SHA-256 hash.
 */
export function hashWordSync(word) {
  return createHash('sha256').update(word).digest('hex');
}

/**
 * Simulate the full word validation chain: length, center, letter set, hash.
 *
 * @param {string} word - The word to validate.
 * @param {string} center - The center letter.
 * @param {Set<string>} allLetters - All 7 puzzle letters.
 * @param {Set<string>} wordHashes - Set of valid word hashes.
 * @returns {{ accepted: boolean, reason: string|null }}
 */
export function validateWord(word, center, allLetters, wordHashes) {
  if (word.length < 4) {
    return { accepted: false, reason: 'too_short' };
  }
  if (!word.includes(center)) {
    return { accepted: false, reason: 'missing_center' };
  }
  for (const c of word) {
    if (!allLetters.has(c)) {
      return { accepted: false, reason: 'invalid_letters' };
    }
  }
  const hash = hashWordSync(word);
  if (!wordHashes.has(hash)) {
    return { accepted: false, reason: 'not_in_dictionary' };
  }
  return { accepted: true, reason: null };
}
