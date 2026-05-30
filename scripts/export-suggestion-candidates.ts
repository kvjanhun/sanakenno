/**
 * Export no-spoiler-suggester review candidates.
 *
 * This script intentionally prints pangram words for private admin/agent
 * review. Do not wire this output into public API responses or UI.
 */

import { getDb } from '../server/db/connection';
import { computePuzzle } from '../server/puzzle-engine';
import {
  normalizeLettersKey,
  suggestionKey,
} from '../server/puzzle-suggestions';

interface CombinationRow {
  letters: string;
  total_pangrams: number;
  variations: string;
}

interface VariationRow {
  center: string;
  word_count: number;
  max_score: number;
  pangram_count: number;
}

function argValue(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  const parsed = parseInt(process.argv[index + 1], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const limit = argValue('--limit', 80);
const minWords = argValue('--min-words', 20);
const maxWords = argValue('--max-words', 80);

const db = getDb();
const rows = db
  .prepare(
    `SELECT letters, total_pangrams, variations
     FROM combinations
     WHERE max_word_count >= ?
       AND min_word_count <= ?
       AND total_pangrams BETWEEN 1 AND 4
     ORDER BY total_pangrams ASC, max_word_count ASC`,
  )
  .all(minWords, maxWords) as CombinationRow[];

const seenKeys = new Set<string>();
let emitted = 0;

for (const row of rows) {
  const letters = Array.from(normalizeLettersKey(row.letters));
  const variations = JSON.parse(row.variations) as VariationRow[];
  for (const variation of variations) {
    if (
      variation.word_count < minWords ||
      variation.word_count > maxWords ||
      variation.pangram_count < 1 ||
      variation.pangram_count > 4
    ) {
      continue;
    }
    const key = suggestionKey(letters, variation.center);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const puzzle = computePuzzle(letters, variation.center);
    const letterSet = new Set(letters);
    const pangrams = puzzle.words.filter((word) =>
      letters.every((letter) => word.includes(letter)),
    );

    console.log(
      JSON.stringify({
        key,
        letters: letters.join(''),
        center: variation.center,
        word_count: puzzle.hint_data.word_count,
        pangram_count: puzzle.hint_data.pangram_count,
        max_score: puzzle.max_score,
        pangrams,
        unused_letter_set_size: letterSet.size,
      }),
    );

    emitted++;
    if (emitted >= limit) process.exit(0);
  }
}
