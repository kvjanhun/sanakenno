/**
 * Generate fallback pangram screening metadata for admin suggestions.
 *
 * This script inspects pangram words locally, but writes only screening grades.
 * It is a conservative automated prefilter, not a Finnish naturalness review.
 * Do not include the pangram strings in the generated output.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb } from '../server/db/connection';
import { computePuzzle, getBlockedWords } from '../server/puzzle-engine';
import {
  normalizeLettersKey,
  suggestionKey,
  type PangramQualityGrade,
} from '../server/puzzle-suggestions';

interface CombinationRow {
  letters: string;
  variations: string;
}

interface VariationRow {
  center: string;
  word_count: number;
  max_score: number;
  pangram_count: number;
}

interface GeneratedQualityFile {
  version: number;
  classifier_version: number;
  eligible_count: number;
  grades: Record<string, PangramQualityGrade>;
}

const MIN_WORDS = 18;
const MAX_WORDS = 80;
const MAX_PANGRAMS = 5;
const OUTPUT_PATH = join(
  process.cwd(),
  'server',
  'data',
  'pangram-quality.generated.json',
);
const RARE_LETTERS = new Set(['b', 'c', 'f', 'g', 'q', 'w', 'x', 'z']);
const VERY_RARE_LETTERS = new Set(['c', 'q', 'w', 'x', 'z']);

function rareLetterCount(word: string): number {
  return Array.from(word).filter((letter) => RARE_LETTERS.has(letter)).length;
}

function hasVeryRareLetter(word: string): boolean {
  return Array.from(word).some((letter) => VERY_RARE_LETTERS.has(letter));
}

function longestRun(word: string): number {
  let longest = 0;
  let current = 0;
  let previous = '';
  for (const letter of Array.from(word)) {
    current = letter === previous ? current + 1 : 1;
    previous = letter;
    longest = Math.max(longest, current);
  }
  return longest;
}

function wordScore(word: string): number {
  let score = 0;
  const length = Array.from(word).length;
  const rare = rareLetterCount(word);

  if (length <= 8) score += 3;
  else if (length <= 10) score += 4;
  else if (length <= 12) score += 3;
  else if (length <= 14) score += 1;
  else if (length <= 17) score -= 1;
  else score -= 3;

  if (rare === 0) score += 3;
  else if (rare === 1) score += 1;
  else if (rare >= 3) score -= 2;

  if (hasVeryRareLetter(word)) score -= 2;
  if (/[qxz]/u.test(word)) score -= 3;

  const run = longestRun(word);
  if (run >= 4) score -= 3;
  else if (run === 3) score -= 1;

  if (/^(epä|esi|jälki|lisä|nyky|pää|sivu|suur|työ|yleis)/u.test(word)) {
    score += 1;
  }
  if (/(nen|inen|llinen|mainen|ttaa|ttää|minen|uus|yys)$/u.test(word)) {
    score += 1;
  }

  return score;
}

function classifyPangrams(pangrams: string[]): PangramQualityGrade {
  if (pangrams.length === 0) return 'reject';
  if (pangrams.some((word) => !/^[a-zåäö]+$/u.test(word))) return 'reject';

  const scores = pangrams.map(wordScore);
  const best = Math.max(...scores);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const severeCount = pangrams.filter(
    (word) =>
      /[qxz]/u.test(word) ||
      Array.from(word).length > 19 ||
      rareLetterCount(word) >= 4,
  ).length;
  const allClearlyNatural = pangrams.every(
    (word) => Array.from(word).length <= 14 && rareLetterCount(word) <= 1,
  );

  if (
    best >= 5 &&
    average >= 2 &&
    allClearlyNatural &&
    severeCount <= Math.max(1, pangrams.length - 1)
  ) {
    return 'ok';
  }
  return 'risky';
}

function parseVariations(value: string): VariationRow[] {
  const parsed = JSON.parse(value) as VariationRow[];
  return Array.isArray(parsed) ? parsed : [];
}

const db = getDb();
const blockedWords = getBlockedWords();
const rows = db
  .prepare(
    `SELECT letters, variations
     FROM combinations
     WHERE max_word_count >= ?
       AND min_word_count <= ?
       AND total_pangrams BETWEEN 1 AND ?
     ORDER BY letters ASC`,
  )
  .all(MIN_WORDS, MAX_WORDS, MAX_PANGRAMS) as CombinationRow[];

const grades: Record<string, PangramQualityGrade> = {};

for (const row of rows) {
  const letters = Array.from(normalizeLettersKey(row.letters));
  for (const variation of parseVariations(row.variations)) {
    if (
      variation.word_count < MIN_WORDS ||
      variation.word_count > MAX_WORDS ||
      variation.pangram_count < 1 ||
      variation.pangram_count > MAX_PANGRAMS
    ) {
      continue;
    }

    const puzzle = computePuzzle(letters, variation.center, blockedWords);
    const pangrams = puzzle.words.filter((word) =>
      letters.every((letter) => word.includes(letter)),
    );
    grades[suggestionKey(letters, variation.center)] =
      classifyPangrams(pangrams);
  }
}

const sortedGrades = Object.fromEntries(
  Object.entries(grades).sort(([a], [b]) => a.localeCompare(b, 'fi')),
);
const output: GeneratedQualityFile = {
  version: 1,
  classifier_version: 1,
  eligible_count: Object.keys(sortedGrades).length,
  grades: sortedGrades,
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.eligible_count} generated screening grades`);
