/**
 * Admin-only puzzle suggestion scoring.
 *
 * The scorer may inspect solution words internally to avoid repeated short
 * word pools, but public/admin API responses must not expose solution words
 * or pangram strings.
 *
 * @module server/puzzle-suggestions
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/connection';
import {
  computePuzzle,
  getBlockedWords,
  getPuzzleBySlot,
  totalPuzzles,
  type VariationData,
} from './puzzle-engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type PangramQualityGrade = 'reject' | 'risky' | 'ok' | 'good';
export type SuggestionQualityGrade = PangramQualityGrade | 'unreviewed';

export interface SuggestionOptions {
  declined?: string[];
  minWords?: number;
  maxWords?: number;
}

export interface SuggestionOverlap {
  slot: number | null;
  shared_letters: number;
  shared_short_words: number;
}

export interface PuzzleSuggestion {
  letters: string[];
  letters_key: string;
  center: string;
  word_count: number;
  pangram_count: number;
  max_score: number;
  quality_grade: SuggestionQualityGrade;
  quality_label: string;
  score: number;
  overlaps: {
    previous: SuggestionOverlap;
    next: SuggestionOverlap;
  };
  variations: VariationData[];
  reasons: string[];
}

interface CombinationRow {
  letters: string;
  total_pangrams: number;
  min_word_count: number;
  max_word_count: number;
  variations: string;
}

interface PuzzleLettersRow {
  slot: number;
  letters: string;
  center: string;
}

interface PangramQualityFile {
  version: number;
  grades: Record<string, PangramQualityGrade>;
}

interface PreliminaryCandidate {
  letters: string[];
  lettersKey: string;
  center: string;
  variation: VariationData;
  variations: VariationData[];
  grade: SuggestionQualityGrade;
  score: number;
}

const DEFAULT_MIN_WORDS = 20;
const DEFAULT_MAX_WORDS = 80;
const IDEAL_MIN_WORDS = 28;
const IDEAL_MAX_WORDS = 52;
const TARGET_WORDS = 39;
const MAX_PANGRAMS = 4;
const SHORT_WORD_MAX_LENGTH = 5;
const PRELIMINARY_LIMIT = 300;
const QUALITY_PATH = join(__dirname, 'data', 'pangram-quality.json');

let qualityOverride: Record<string, PangramQualityGrade> | null = null;
let cachedQuality: Record<string, PangramQualityGrade> | null = null;

export function setSuggestionQualityForTesting(
  quality: Record<string, PangramQualityGrade> | null,
): void {
  qualityOverride = quality;
  cachedQuality = null;
}

export function normalizeLettersKey(letters: string | string[]): string {
  const chars = Array.isArray(letters)
    ? letters
    : letters.includes(',')
      ? letters.split(',').map((l) => l.trim())
      : Array.from(letters);
  return chars
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('');
}

export function suggestionKey(
  letters: string | string[],
  center: string,
): string {
  return `${normalizeLettersKey(letters)}:${center.trim().toLowerCase()}`;
}

function loadPangramQuality(): Record<string, PangramQualityGrade> {
  if (qualityOverride) return qualityOverride;
  if (cachedQuality) return cachedQuality;
  if (!existsSync(QUALITY_PATH)) {
    cachedQuality = {};
    return cachedQuality;
  }

  const parsed = JSON.parse(
    readFileSync(QUALITY_PATH, 'utf-8'),
  ) as PangramQualityFile;
  cachedQuality = parsed.grades || {};
  return cachedQuality;
}

function parseDeclined(declined: string[] | undefined): Set<string> {
  const values = new Set<string>();
  for (const item of declined ?? []) {
    const trimmed = item.trim().toLowerCase();
    if (trimmed) values.add(trimmed);
  }
  return values;
}

function parseVariations(value: string): VariationData[] {
  try {
    const parsed = JSON.parse(value) as VariationData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function usedLetterKeys(): Set<string> {
  const db = getDb();
  const rows = db
    .prepare('SELECT slot, letters, center FROM puzzles')
    .all() as PuzzleLettersRow[];
  return new Set(rows.map((row) => normalizeLettersKey(row.letters)));
}

function recentPuzzleRows(limit: number): PuzzleLettersRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT slot, letters, center FROM puzzles
       ORDER BY slot DESC
       LIMIT ?`,
    )
    .all(limit) as PuzzleLettersRow[];
}

function qualityLabel(grade: SuggestionQualityGrade): string {
  switch (grade) {
    case 'good':
      return 'Hyvä pangrammilaatu';
    case 'ok':
      return 'Ok pangrammilaatu';
    case 'risky':
      return 'Riskialtis pangrammilaatu';
    default:
      return 'Ei arvioitu';
  }
}

function wordCountPenalty(wordCount: number): number {
  if (wordCount >= IDEAL_MIN_WORDS && wordCount <= IDEAL_MAX_WORDS) {
    return Math.abs(wordCount - TARGET_WORDS) * 2;
  }
  const distance =
    wordCount < IDEAL_MIN_WORDS
      ? IDEAL_MIN_WORDS - wordCount
      : wordCount - IDEAL_MAX_WORDS;
  return 30 + distance * 5;
}

function pangramPenalty(count: number): number {
  if (count === 1) return 0;
  if (count === 2) return 6;
  if (count === 3) return 18;
  return 34;
}

function qualityScore(grade: SuggestionQualityGrade): number {
  switch (grade) {
    case 'good':
      return 35;
    case 'ok':
      return 15;
    case 'risky':
      return -80;
    default:
      return -10;
  }
}

function recentPenalty(
  letters: string[],
  center: string,
  recent: PuzzleLettersRow[],
): number {
  const letterCounts = new Map<string, number>();
  let centerCount = 0;

  for (const row of recent) {
    if (row.center === center) centerCount++;
    for (const letter of Array.from(normalizeLettersKey(row.letters))) {
      letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
    }
  }

  const letterPenalty = letters.reduce((sum, letter) => {
    const count = letterCounts.get(letter) || 0;
    return sum + Math.max(0, count - 2) * 4;
  }, 0);

  return letterPenalty + centerCount * 8;
}

function shortWordSet(words: string[]): Set<string> {
  return new Set(
    words.filter(
      (word) => word.length >= 4 && word.length <= SHORT_WORD_MAX_LENGTH,
    ),
  );
}

function intersectCount<T>(a: Set<T>, b: Set<T>): number {
  let count = 0;
  for (const value of a) {
    if (b.has(value)) count++;
  }
  return count;
}

function letterOverlap(
  letters: string[],
  otherLetters: string[] | null,
): number {
  if (!otherLetters) return 0;
  return intersectCount(new Set(letters), new Set(otherLetters));
}

function neighborOverlap(
  slot: number | null,
  letters: string[],
  candidateShortWords: Set<string>,
  neighborShortWords: Set<string> | null,
  neighborLetters: string[] | null,
): SuggestionOverlap {
  return {
    slot,
    shared_letters: letterOverlap(letters, neighborLetters),
    shared_short_words: neighborShortWords
      ? intersectCount(candidateShortWords, neighborShortWords)
      : 0,
  };
}

function candidateReasons(candidate: PuzzleSuggestion): string[] {
  const reasons: string[] = [];
  const wordPart =
    candidate.word_count >= IDEAL_MIN_WORDS &&
    candidate.word_count <= IDEAL_MAX_WORDS
      ? 'sanamäärä osuu tavoitealueelle'
      : 'sanamäärä on sallittu mutta tavoitealueen reunalla';
  reasons.push(wordPart);
  reasons.push(`${candidate.pangram_count} pangrammia`);
  reasons.push(candidate.quality_label);
  reasons.push(
    `lyhyiden sanojen naapuri-osumat ${candidate.overlaps.previous.shared_short_words} + ${candidate.overlaps.next.shared_short_words}`,
  );
  return reasons;
}

export function suggestPuzzle(
  options: SuggestionOptions = {},
): PuzzleSuggestion | null {
  const minWords = options.minWords ?? DEFAULT_MIN_WORDS;
  const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
  const quality = loadPangramQuality();
  const declined = parseDeclined(options.declined);
  const usedKeys = usedLetterKeys();
  const recentRows = recentPuzzleRows(7);
  const blockedWords = getBlockedWords();

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT letters, total_pangrams, min_word_count, max_word_count, variations
       FROM combinations
       WHERE max_word_count >= ?
         AND min_word_count <= ?
         AND total_pangrams BETWEEN 1 AND ?
       ORDER BY max_word_count ASC`,
    )
    .all(minWords, maxWords, MAX_PANGRAMS) as CombinationRow[];

  const preliminary: PreliminaryCandidate[] = [];
  let hasReviewedCandidate = false;

  for (const row of rows) {
    const lettersKey = normalizeLettersKey(row.letters);
    if (usedKeys.has(lettersKey)) continue;

    const letters = Array.from(lettersKey);
    const variations = parseVariations(row.variations);
    for (const variation of variations) {
      const key = suggestionKey(letters, variation.center);
      if (declined.has(key)) continue;
      if (
        variation.word_count < minWords ||
        variation.word_count > maxWords ||
        variation.pangram_count < 1 ||
        variation.pangram_count > MAX_PANGRAMS
      ) {
        continue;
      }

      const qualityGrade = quality[key];
      if (qualityGrade === 'reject') continue;
      if (qualityGrade) hasReviewedCandidate = true;

      const grade: SuggestionQualityGrade = qualityGrade || 'unreviewed';
      const score =
        1000 -
        wordCountPenalty(variation.word_count) -
        pangramPenalty(variation.pangram_count) -
        recentPenalty(letters, variation.center, recentRows) +
        qualityScore(grade);

      preliminary.push({
        letters,
        lettersKey,
        center: variation.center,
        variation,
        variations,
        grade,
        score,
      });
    }
  }

  const eligible = (
    hasReviewedCandidate
      ? preliminary.filter((candidate) => candidate.grade !== 'unreviewed')
      : preliminary
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, PRELIMINARY_LIMIT);

  if (eligible.length === 0) return null;

  const total = totalPuzzles();
  const previousSlot = total > 0 ? total - 1 : null;
  const nextSlot = total > 0 ? 0 : null;
  const previousPuzzle =
    previousSlot !== null ? getPuzzleBySlot(previousSlot) : null;
  const nextPuzzle = nextSlot !== null ? getPuzzleBySlot(nextSlot) : null;
  const previousShortWords = previousPuzzle
    ? shortWordSet(previousPuzzle.words)
    : null;
  const nextShortWords = nextPuzzle ? shortWordSet(nextPuzzle.words) : null;
  const previousLetters = previousPuzzle
    ? Array.from(normalizeLettersKey(previousPuzzle.all_letters))
    : null;
  const nextLetters = nextPuzzle
    ? Array.from(normalizeLettersKey(nextPuzzle.all_letters))
    : null;

  let best: PuzzleSuggestion | null = null;

  for (const candidate of eligible) {
    const puzzle = computePuzzle(
      candidate.letters,
      candidate.center,
      blockedWords,
    );
    const shortWords = shortWordSet(puzzle.words);
    const previous = neighborOverlap(
      previousSlot,
      candidate.letters,
      shortWords,
      previousShortWords,
      previousLetters,
    );
    const next = neighborOverlap(
      nextSlot,
      candidate.letters,
      shortWords,
      nextShortWords,
      nextLetters,
    );

    const finalScore =
      candidate.score -
      (previous.shared_short_words + next.shared_short_words) * 34 -
      Math.max(0, previous.shared_letters - 3) * 14 -
      Math.max(0, next.shared_letters - 3) * 14;

    const suggestion: PuzzleSuggestion = {
      letters: candidate.letters,
      letters_key: candidate.lettersKey,
      center: candidate.center,
      word_count: puzzle.hint_data.word_count,
      pangram_count: puzzle.hint_data.pangram_count,
      max_score: puzzle.max_score,
      quality_grade: candidate.grade,
      quality_label: qualityLabel(candidate.grade),
      score: Math.round(finalScore),
      overlaps: {
        previous,
        next,
      },
      variations: candidate.variations,
      reasons: [],
    };
    suggestion.reasons = candidateReasons(suggestion);

    if (!best || suggestion.score > best.score) {
      best = suggestion;
    }
  }

  return best;
}
