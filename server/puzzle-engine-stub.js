/**
 * Puzzle engine stub for Phase 2 development.
 *
 * Provides hardcoded test data implementing the puzzle engine interface.
 * This module will be replaced by the real puzzle engine from Phase 1
 * once it is merged.
 *
 * Expected interface:
 *   getPuzzleBySlot(slot) -> { center, letters, word_hashes, hint_data, max_score }
 *   getTotalPuzzles()     -> number
 *   getPuzzleForDate(date) -> slot number
 *
 * @module server/puzzle-engine-stub
 */

/**
 * Rotation epoch: the reference date for puzzle slot calculation.
 * Puzzles rotate starting from this date in Helsinki timezone.
 */
const ROTATION_EPOCH = '2026-02-24';

/**
 * Stub puzzle data pool. Each entry represents a puzzle definition
 * with realistic structure matching the real engine output.
 */
const STUB_PUZZLES = [
  {
    center: 'ä',
    letters: ['e', 'n', 'p', 'r', 's', 'y'],
    word_hashes: [
      'aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44',
      'bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55',
      'cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66',
      'dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11',
      'ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22',
    ],
    hint_data: {
      word_count: 5,
      pangram_count: 1,
      by_letter: { e: 2, n: 1, p: 1, r: 0, s: 1, y: 0, ä: 5 },
      by_length: { 4: 2, 5: 2, 7: 1 },
      by_pair: { en: 1, pä: 1, sä: 1, nä: 1, ey: 1 },
    },
    max_score: 42,
  },
  {
    center: 'k',
    letters: ['a', 'i', 'l', 'n', 'o', 'u'],
    word_hashes: [
      'ff11aa22bb33cc44dd55ee66ff11aa22bb33cc44dd55ee66ff11aa22bb33cc44',
      'aa22bb33cc44dd55ee66ff11aa22bb33cc44dd55ee66ff11aa22bb33cc44dd55',
      'bb33cc44dd55ee66ff11aa22bb33cc44dd55ee66ff11aa22bb33cc44dd55ee66',
    ],
    hint_data: {
      word_count: 3,
      pangram_count: 0,
      by_letter: { a: 2, i: 1, k: 3, l: 1, n: 1, o: 1, u: 0 },
      by_length: { 4: 1, 5: 1, 6: 1 },
      by_pair: { ka: 1, ki: 1, ko: 1 },
    },
    max_score: 24,
  },
];

/**
 * Get the total number of puzzles in the rotation pool.
 *
 * @returns {number} Total puzzle count
 */
export function getTotalPuzzles() {
  return STUB_PUZZLES.length;
}

/**
 * Get puzzle data for a specific slot (0-indexed).
 * Wraps around if the slot exceeds the total puzzle count.
 *
 * @param {number} slot - The puzzle slot index (0-based)
 * @returns {{ center: string, letters: string[], word_hashes: string[], hint_data: object, max_score: number }}
 */
export function getPuzzleBySlot(slot) {
  const total = getTotalPuzzles();
  const wrappedSlot = ((slot % total) + total) % total;
  return STUB_PUZZLES[wrappedSlot];
}

/**
 * Calculate the puzzle slot for a given date using Helsinki timezone.
 *
 * The slot is determined by the number of days between the rotation epoch
 * and the given date in Helsinki timezone, modulo the total puzzle count.
 *
 * @param {Date} [date] - The date to compute the slot for (defaults to now)
 * @returns {number} The 0-indexed puzzle slot number
 */
export function getPuzzleForDate(date = new Date()) {
  const epochDate = getHelsinkiDate(new Date(ROTATION_EPOCH + 'T00:00:00'));
  const currentDate = getHelsinkiDate(date);

  const diffMs = currentDate.getTime() - epochDate.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const total = getTotalPuzzles();
  return ((diffDays % total) + total) % total;
}

/**
 * Convert a Date to a Helsinki-local midnight Date for date arithmetic.
 *
 * Uses Intl.DateTimeFormat to extract the Helsinki date components,
 * then constructs a UTC Date representing that calendar date at midnight.
 * This avoids timezone library dependencies.
 *
 * @param {Date} date - The date to convert
 * @returns {Date} A Date object representing Helsinki midnight in UTC terms
 */
function getHelsinkiDate(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA formats as YYYY-MM-DD
  const helsinkiDateStr = formatter.format(date);
  return new Date(helsinkiDateStr + 'T00:00:00Z');
}
