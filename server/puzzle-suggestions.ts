/**
 * Admin-only puzzle suggestion scoring.
 *
 * The scorer may inspect solution words internally to avoid repeated short
 * word pools, but public/admin API responses must not expose solution words.
 * Pangram strings are included only for explicit admin spoiler requests.
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
  includePangrams?: boolean;
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
  pangrams?: string[];
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
  generatedGrade?: PangramQualityGrade;
  score: number;
}

interface WordCountBand {
  id: 'short' | 'regular' | 'open' | 'long';
  label: string;
  min: number;
  max: number;
  target: number;
}

interface SuggestionTarget {
  wordBand: WordCountBand['id'];
  pangrams: number;
}

const DEFAULT_MIN_WORDS = 18;
const DEFAULT_MAX_WORDS = 80;
const MAX_PANGRAMS = 5;
const SHORT_WORD_MAX_LENGTH = 5;
const PRELIMINARY_LIMIT = 300;
const QUALITY_PATH = join(__dirname, 'assets', 'pangram-quality.json');
const GENERATED_SCREENING_PATH = join(
  __dirname,
  'assets',
  'pangram-quality.generated.json',
);
const WORD_COUNT_BANDS: WordCountBand[] = [
  { id: 'short', label: 'lyhyt', min: 18, max: 27, target: 23 },
  { id: 'regular', label: 'tavallinen', min: 28, max: 39, target: 34 },
  { id: 'open', label: 'runsas', min: 40, max: 55, target: 46 },
  { id: 'long', label: 'pitkä', min: 56, max: 80, target: 64 },
];
const WORD_COUNT_BAND_BY_ID = new Map(
  WORD_COUNT_BANDS.map((band) => [band.id, band]),
);
const SUGGESTION_TARGET_SEQUENCE: SuggestionTarget[] = [
  { wordBand: 'regular', pangrams: 1 },
  { wordBand: 'open', pangrams: 2 },
  { wordBand: 'short', pangrams: 1 },
  { wordBand: 'regular', pangrams: 3 },
  { wordBand: 'open', pangrams: 1 },
  { wordBand: 'regular', pangrams: 2 },
  { wordBand: 'long', pangrams: 4 },
  { wordBand: 'regular', pangrams: 1 },
  { wordBand: 'open', pangrams: 2 },
  { wordBand: 'short', pangrams: 3 },
  { wordBand: 'regular', pangrams: 1 },
  { wordBand: 'open', pangrams: 4 },
  { wordBand: 'regular', pangrams: 2 },
  { wordBand: 'long', pangrams: 5 },
];

let qualityOverride: Record<string, PangramQualityGrade> | null = null;
let generatedScreeningOverride: Record<string, PangramQualityGrade> | null =
  null;
let cachedCuratedQuality: Record<string, PangramQualityGrade> | null = null;
let cachedGeneratedQuality: Record<string, PangramQualityGrade> | null = null;

export function setSuggestionQualityForTesting(
  quality: Record<string, PangramQualityGrade> | null,
): void {
  qualityOverride = quality;
  cachedCuratedQuality = null;
}

export function setGeneratedSuggestionScreeningForTesting(
  quality: Record<string, PangramQualityGrade> | null,
): void {
  generatedScreeningOverride = quality;
  cachedGeneratedQuality = null;
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

function readQualityFile(path: string): Record<string, PangramQualityGrade> {
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(readFileSync(path, 'utf-8')) as PangramQualityFile;
  return parsed.grades || {};
}

function loadCuratedPangramQuality(): Record<string, PangramQualityGrade> {
  if (qualityOverride) return qualityOverride;
  if (cachedCuratedQuality) return cachedCuratedQuality;
  cachedCuratedQuality = readQualityFile(QUALITY_PATH);
  return cachedCuratedQuality;
}

function loadGeneratedPangramScreening(): Record<string, PangramQualityGrade> {
  if (generatedScreeningOverride) return generatedScreeningOverride;
  if (cachedGeneratedQuality) return cachedGeneratedQuality;
  cachedGeneratedQuality = readQualityFile(GENERATED_SCREENING_PATH);
  return cachedGeneratedQuality;
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

function wordCountBandFor(wordCount: number): WordCountBand {
  return (
    WORD_COUNT_BANDS.find(
      (band) => wordCount >= band.min && wordCount <= band.max,
    ) ||
    (wordCount < WORD_COUNT_BANDS[0].min
      ? WORD_COUNT_BANDS[0]
      : WORD_COUNT_BANDS[WORD_COUNT_BANDS.length - 1])
  );
}

function preferredSuggestionTarget(
  total: number,
  declinedCount: number,
): SuggestionTarget {
  return SUGGESTION_TARGET_SEQUENCE[
    (total + declinedCount) % SUGGESTION_TARGET_SEQUENCE.length
  ];
}

function preferredWordCountBand(target: SuggestionTarget): WordCountBand {
  return WORD_COUNT_BAND_BY_ID.get(target.wordBand) || WORD_COUNT_BANDS[1];
}

function wordCountPenalty(wordCount: number, preferred: WordCountBand): number {
  if (wordCount >= preferred.min && wordCount <= preferred.max) {
    return Math.abs(wordCount - preferred.target) * 2;
  }
  const distance =
    wordCount < preferred.min
      ? preferred.min - wordCount
      : wordCount - preferred.max;
  return 70 + distance * 6;
}

function pangramPenalty(count: number, preferred: number): number {
  if (count === preferred) return 0;
  const distance = Math.abs(count - preferred);
  const onePangramPenalty = preferred > 1 && count === 1 ? 18 : 0;
  return 38 + distance * 12 + onePangramPenalty;
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

function isPreferredQuality(grade: SuggestionQualityGrade): boolean {
  return grade === 'good' || grade === 'ok';
}

function isGeneratedPreferred(grade: PangramQualityGrade | undefined): boolean {
  return grade === 'good' || grade === 'ok';
}

function generatedScreeningScore(
  grade: SuggestionQualityGrade,
  generatedGrade: PangramQualityGrade | undefined,
): number {
  if (grade !== 'unreviewed') return 0;
  switch (generatedGrade) {
    case 'good':
    case 'ok':
      return 5;
    case 'risky':
      return -90;
    default:
      return 0;
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

function pangramWords(words: string[], letters: string[]): string[] {
  const required = new Set(letters);
  return words
    .filter((word) => {
      const chars = new Set(Array.from(word));
      for (const letter of required) {
        if (!chars.has(letter)) return false;
      }
      return true;
    })
    .sort((a, b) => a.localeCompare(b, 'fi'));
}

function candidateReasons(
  candidate: PuzzleSuggestion,
  preferredBand: WordCountBand,
  preferredPangramCount: number,
): string[] {
  const reasons: string[] = [];
  const actualBand = wordCountBandFor(candidate.word_count);
  reasons.push(
    actualBand.id === preferredBand.id
      ? `sanamäärä tuo vaihtelua (${actualBand.label})`
      : `sanamäärä poikkeaa vaihtelutavoitteesta (${actualBand.label})`,
  );
  reasons.push(
    candidate.pangram_count === preferredPangramCount
      ? `${candidate.pangram_count} pangrammia osuu vaihteluun`
      : `${candidate.pangram_count} pangrammia`,
  );
  reasons.push(candidate.quality_label);
  reasons.push(
    `lyhyiden sanojen naapuri-osumat ${candidate.overlaps.previous.shared_short_words} + ${candidate.overlaps.next.shared_short_words}`,
  );
  return reasons;
}

function selectCandidatePool(
  candidates: PreliminaryCandidate[],
  preferredBand: WordCountBand,
  preferredPangramCount: number,
): PreliminaryCandidate[] {
  const rankedPools = [
    candidates.filter((candidate) => isPreferredQuality(candidate.grade)),
    candidates.filter((candidate) => candidate.grade === 'risky'),
    candidates.filter(
      (candidate) =>
        candidate.grade === 'unreviewed' &&
        isGeneratedPreferred(candidate.generatedGrade),
    ),
    candidates.filter(
      (candidate) =>
        candidate.grade === 'unreviewed' &&
        candidate.generatedGrade === undefined,
    ),
    candidates.filter(
      (candidate) =>
        candidate.grade === 'unreviewed' &&
        candidate.generatedGrade === 'risky',
    ),
  ];
  for (const pool of rankedPools) {
    if (pool.length === 0) continue;

    const preferred = pool.filter(
      (candidate) =>
        candidate.variation.word_count >= preferredBand.min &&
        candidate.variation.word_count <= preferredBand.max,
    );
    const preferredWithPangrams = preferred.filter(
      (candidate) =>
        candidate.variation.pangram_count === preferredPangramCount,
    );
    if (preferredWithPangrams.length > 0) return preferredWithPangrams;
    if (preferred.length > 0) return preferred;

    const pangramPreferred = pool.filter(
      (candidate) =>
        candidate.variation.pangram_count === preferredPangramCount,
    );
    if (pangramPreferred.length > 0) return pangramPreferred;
    if (pool.length > 0) return pool;
  }

  return candidates;
}

export function suggestPuzzle(
  options: SuggestionOptions = {},
): PuzzleSuggestion | null {
  const minWords = options.minWords ?? DEFAULT_MIN_WORDS;
  const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
  const curatedQuality = loadCuratedPangramQuality();
  const generatedScreening = loadGeneratedPangramScreening();
  const declined = parseDeclined(options.declined);
  const usedKeys = usedLetterKeys();
  const recentRows = recentPuzzleRows(7);
  const blockedWords = getBlockedWords();
  const total = totalPuzzles();
  const preferredTarget = preferredSuggestionTarget(total, declined.size);
  const preferredBand = preferredWordCountBand(preferredTarget);
  const preferredPangrams = preferredTarget.pangrams;
  const includePangrams = options.includePangrams === true;

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

      const qualityGrade = curatedQuality[key];
      if (qualityGrade === 'reject') continue;
      const generatedGrade = generatedScreening[key];
      if (!qualityGrade && generatedGrade === 'reject') continue;

      const grade: SuggestionQualityGrade = qualityGrade || 'unreviewed';
      const score =
        1000 -
        wordCountPenalty(variation.word_count, preferredBand) -
        pangramPenalty(variation.pangram_count, preferredPangrams) -
        recentPenalty(letters, variation.center, recentRows) +
        qualityScore(grade) +
        generatedScreeningScore(grade, generatedGrade);

      preliminary.push({
        letters,
        lettersKey,
        center: variation.center,
        variation,
        variations,
        grade,
        generatedGrade,
        score,
      });
    }
  }

  const eligible = selectCandidatePool(
    preliminary,
    preferredBand,
    preferredPangrams,
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, PRELIMINARY_LIMIT);

  if (eligible.length === 0) return null;

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
    if (includePangrams) {
      suggestion.pangrams = pangramWords(puzzle.words, candidate.letters);
    }
    suggestion.reasons = candidateReasons(
      suggestion,
      preferredBand,
      preferredPangrams,
    );

    if (!best || suggestion.score > best.score) {
      best = suggestion;
    }
  }

  return best;
}
