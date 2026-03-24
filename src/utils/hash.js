/**
 * Client-side SHA-256 hashing using the Web Crypto API.
 *
 * Used to verify word guesses against the puzzle's word_hashes set
 * without revealing plaintext words.
 *
 * @module src/utils/hash
 */

/**
 * Compute the SHA-256 hash of a word using the Web Crypto API.
 *
 * @param {string} word - The word to hash.
 * @returns {Promise<string>} Lowercase hex SHA-256 hash.
 */
export async function hashWord(word) {
  const encoder = new TextEncoder();
  const data = encoder.encode(word);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
