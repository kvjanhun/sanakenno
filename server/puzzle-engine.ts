/**
 * Puzzle engine: word filtering, hashing, scoring, and hint computation.
 *
 * Loads the Finnish wordlist once at startup, computes puzzle data on demand,
 * and caches results in memory per puzzle slot. Admin writes invalidate the
 * cache via invalidate(slot) or invalidateAll().
 *
 * Ported from web_kontissa/app/api/kenno.py.
 *
 * @module server/puzzle-engine
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Interfaces ---

export interface HintData {
  word_count: number;
  pangram_count: number;
  by_letter: Record<string, number>;
  by_length: Record<string, number>;
  by_pair: Record<string, number>;
}

export interface PuzzleData {
  words: string[];
  word_hashes: string[];
  max_score: number;
  hint_data: HintData;
}

export interface FullPuzzleData extends PuzzleData {
  center: string;
  letters: string[];
  all_letters: string;
  slot: number;
  total_puzzles: number;
}

interface PuzzleRow {
  slot: number;
  letters: string;
  center: string;
}

interface MaxSlotRow {
  max_slot: number | null;
}

interface BlockedWordRow {
  word: string;
}

interface ConfigRow {
  value: string;
}

// --- Wordlist loading ---

const WORDLIST_PATH = join(__dirname, 'data', 'kotus_words.txt');

let _allWords: Set<string> = new Set();

/**
 * Load the Finnish wordlist from disk. Normalizes words by lowercasing
 * and stripping hyphens (e.g. "lahi-ita" becomes "lahiita").
 * Called once at startup.
 */
export function loadWordlist(): void {
  if (!existsSync(WORDLIST_PATH)) {
    console.warn('WARNING: Wordlist not found at', WORDLIST_PATH);
    console.warn('  Run: node scripts/migrate-from-kontissa.js');
    _allWords = new Set();
    return;
  }
  const content = readFileSync(WORDLIST_PATH, 'utf-8');
  const words = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) {
      words.add(trimmed.toLowerCase().replace(/-/g, ''));
    }
  }
  _allWords = words;
}

/**
 * Get the loaded wordlist (for testing).
 */
export function getWordlist(): Set<string> {
  return _allWords;
}

/**
 * Replace the wordlist with a custom set (for testing).
 */
export function setWordlist(words: Set<string>): void {
  _allWords = words;
}

// --- Scoring ---

/**
 * Score a single word. 4-letter words score 1, longer words score their length.
 * Pangrams (using all 7 letters) get a +7 bonus.
 */
export function scoreWord(word: string, allLetterSet: Set<string>): number {
  const pts = word.length === 4 ? 1 : word.length;
  const isPg = [...allLetterSet].every((c) => word.includes(c));
  return pts + (isPg ? 7 : 0);
}

/**
 * Check if a word is a pangram (uses all 7 puzzle letters).
 */
export function isPangram(word: string, allLetterSet: Set<string>): boolean {
  return [...allLetterSet].every((c) => word.includes(c));
}

/**
 * Compute the SHA-256 hash of a word.
 */
export function hashWord(word: string): string {
  return createHash('sha256').update(word).digest('hex');
}

// --- Puzzle computation ---

/**
 * Compute the full puzzle data for a given set of letters, center, and blocked words.
 *
 * Filters the wordlist for valid words (>= 4 chars, contains center, all chars
 * in letter set, not blocked), then computes hashes, scores, and hint data.
 */
export function computePuzzle(
  letters: string | string[],
  center: string,
  blockedWords: string[] = [],
): PuzzleData {
  const letterList =
    typeof letters === 'string'
      ? letters.split(',').map((l) => l.trim())
      : letters;
  const allLetterSet = new Set(letterList);
  const blockedSet = new Set(blockedWords);

  const words: string[] = [];
  let maxScore = 0;
  let pangramCount = 0;
  const byLetter: Record<string, number> = {};
  const byLength: Record<string, number> = {};
  const byPair: Record<string, number> = {};

  for (const word of _allWords) {
    if (blockedSet.has(word)) continue;
    if (word.length < 4) continue;
    if (!word.includes(center)) continue;

    // Check every character is in the letter set
    let allValid = true;
    for (const c of word) {
      if (!allLetterSet.has(c)) {
        allValid = false;
        break;
      }
    }
    if (!allValid) continue;

    words.push(word);
    const wordScore = scoreWord(word, allLetterSet);
    maxScore += wordScore;

    if (isPangram(word, allLetterSet)) {
      pangramCount++;
    }

    const firstLetter = word[0];
    byLetter[firstLetter] = (byLetter[firstLetter] || 0) + 1;

    const len = word.length;
    byLength[String(len)] = (byLength[String(len)] || 0) + 1;

    const pair = word.slice(0, 2);
    byPair[pair] = (byPair[pair] || 0) + 1;
  }

  words.sort();
  const wordHashes = words.map((w) => hashWord(w));

  const hintData: HintData = {
    word_count: words.length,
    pangram_count: pangramCount,
    by_letter: byLetter,
    by_length: byLength,
    by_pair: byPair,
  };

  return {
    words,
    word_hashes: wordHashes,
    max_score: maxScore,
    hint_data: hintData,
  };
}

// --- In-memory cache ---

const _cache = new Map<string, FullPuzzleData>();

/**
 * Invalidate cached puzzle data for a specific slot.
 */
export function invalidate(slot: number): void {
  _cache.delete(String(slot));
}

/**
 * Invalidate all cached puzzle data.
 */
export function invalidateAll(): void {
  _cache.clear();
}

// --- Database helpers ---

/**
 * Get the total number of puzzle slots in the DB.
 */
export function totalPuzzles(): number {
  const db = getDb();
  const row = db.prepare('SELECT MAX(slot) AS max_slot FROM puzzles').get() as
    | MaxSlotRow
    | undefined;
  return row && row.max_slot !== null ? row.max_slot + 1 : 0;
}

/**
 * Get all blocked words from the database.
 */
export function getBlockedWords(): string[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT word FROM blocked_words')
    .all() as BlockedWordRow[];
  return rows.map((r) => r.word);
}

/**
 * Get the rotation epoch from the config table.
 */
export function getRotationEpoch(): Date {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM config WHERE key = 'rotation_epoch'")
    .get() as ConfigRow | undefined;
  if (row) {
    return new Date(row.value + 'T00:00:00');
  }
  return new Date('2026-02-24T00:00:00');
}

/**
 * Compute the puzzle slot for a given date based on the rotation epoch.
 * Puzzles rotate sequentially: epoch date maps to slot determined by START_INDEX,
 * cycling through all puzzles.
 */
export function getPuzzleForDate(date: Date): number {
  const epoch = getRotationEpoch();
  const START_INDEX = 1;
  const total = totalPuzzles();
  if (total === 0) return 0;

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const epochOnly = new Date(
    epoch.getFullYear(),
    epoch.getMonth(),
    epoch.getDate(),
  );
  const daysDiff = Math.round(
    (dateOnly.getTime() - epochOnly.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (((START_INDEX + daysDiff) % total) + total) % total;
}

/**
 * Get a puzzle by its slot number. Reads from cache or computes and caches.
 * Returns null if the slot doesn't exist in the DB.
 */
export function getPuzzleBySlot(slot: number): FullPuzzleData | null {
  const cacheKey = String(slot);
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey)!;
  }

  const db = getDb();
  const puzzle = db
    .prepare('SELECT slot, letters, center FROM puzzles WHERE slot = ?')
    .get(slot) as PuzzleRow | undefined;
  if (!puzzle) return null;

  const blockedWords = getBlockedWords();
  const result = computePuzzle(puzzle.letters, puzzle.center, blockedWords);

  const fullResult: FullPuzzleData = {
    center: puzzle.center,
    letters: puzzle.letters
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l !== puzzle.center),
    all_letters: puzzle.letters,
    slot: puzzle.slot,
    total_puzzles: totalPuzzles(),
    ...result,
  };

  _cache.set(cacheKey, fullResult);
  return fullResult;
}

/**
 * Get the puzzle for a specific date. Computes the slot from the rotation
 * and delegates to getPuzzleBySlot.
 */
export function getPuzzleForDateFull(date: Date): FullPuzzleData | null {
  const slot = getPuzzleForDate(date);
  return getPuzzleBySlot(slot);
}
