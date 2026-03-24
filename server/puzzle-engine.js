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

// --- Wordlist loading ---

const WORDLIST_PATH = join(__dirname, 'data', 'kotus_words.txt');

/** @type {Set<string>} All normalized words from the Finnish wordlist. */
let _allWords = new Set();

/**
 * Load the Finnish wordlist from disk. Normalizes words by lowercasing
 * and stripping hyphens (e.g. "lähi-itä" becomes "lähiitä").
 * Called once at startup.
 */
export function loadWordlist() {
  if (!existsSync(WORDLIST_PATH)) {
    console.warn('WARNING: Wordlist not found at', WORDLIST_PATH);
    console.warn('  Run: node scripts/migrate-from-kontissa.js');
    _allWords = new Set();
    return;
  }
  const content = readFileSync(WORDLIST_PATH, 'utf-8');
  const words = new Set();
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
 *
 * @returns {Set<string>} The loaded word set.
 */
export function getWordlist() {
  return _allWords;
}

/**
 * Replace the wordlist with a custom set (for testing).
 *
 * @param {Set<string>} words - Custom word set.
 */
export function setWordlist(words) {
  _allWords = words;
}

// --- Scoring ---

/**
 * Score a single word. 4-letter words score 1, longer words score their length.
 * Pangrams (using all 7 letters) get a +7 bonus.
 *
 * @param {string} word - The word to score.
 * @param {Set<string>} allLetterSet - The 7 puzzle letters as a Set.
 * @returns {number} The word's score.
 */
export function scoreWord(word, allLetterSet) {
  const pts = word.length === 4 ? 1 : word.length;
  const isPangram = [...allLetterSet].every((c) => word.includes(c));
  return pts + (isPangram ? 7 : 0);
}

/**
 * Check if a word is a pangram (uses all 7 puzzle letters).
 *
 * @param {string} word - The word to check.
 * @param {Set<string>} allLetterSet - The 7 puzzle letters as a Set.
 * @returns {boolean} True if the word is a pangram.
 */
export function isPangram(word, allLetterSet) {
  return [...allLetterSet].every((c) => word.includes(c));
}

/**
 * Compute the SHA-256 hash of a word.
 *
 * @param {string} word - The word to hash.
 * @returns {string} Lowercase hex SHA-256 hash.
 */
export function hashWord(word) {
  return createHash('sha256').update(word).digest('hex');
}

// --- Puzzle computation ---

/**
 * Compute the full puzzle data for a given set of letters, center, and blocked words.
 *
 * Filters the wordlist for valid words (>= 4 chars, contains center, all chars
 * in letter set, not blocked), then computes hashes, scores, and hint data.
 *
 * @param {string} letters - Comma-separated 7 letters (e.g. "a,e,k,l,n,s,t").
 * @param {string} center - The center letter.
 * @param {string[]} blockedWords - Array of blocked words to exclude.
 * @returns {{ words: string[], word_hashes: string[], max_score: number, hint_data: object }}
 */
export function computePuzzle(letters, center, blockedWords = []) {
  const letterList = typeof letters === 'string' ? letters.split(',').map((l) => l.trim()) : letters;
  const allLetterSet = new Set(letterList);
  const blockedSet = new Set(blockedWords);

  const words = [];
  let maxScore = 0;
  let pangramCount = 0;
  const byLetter = {};
  const byLength = {};
  const byPair = {};

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

    // Hint data: frequency by first letter
    const firstLetter = word[0];
    byLetter[firstLetter] = (byLetter[firstLetter] || 0) + 1;

    // Hint data: frequency by word length
    const len = word.length;
    byLength[String(len)] = (byLength[String(len)] || 0) + 1;

    // Hint data: frequency by first two characters
    const pair = word.slice(0, 2);
    byPair[pair] = (byPair[pair] || 0) + 1;
  }

  // Sort words alphabetically
  words.sort();
  const wordHashes = words.map((w) => hashWord(w));

  const hintData = {
    word_count: words.length,
    pangram_count: pangramCount,
    by_letter: byLetter,
    by_length: byLength,
    by_pair: byPair,
  };

  return { words, word_hashes: wordHashes, max_score: maxScore, hint_data: hintData };
}

// --- In-memory cache ---

/** @type {Map<string, object>} Cache keyed by "slot" string. */
const _cache = new Map();

/**
 * Invalidate cached puzzle data for a specific slot.
 *
 * @param {number} slot - The puzzle slot to invalidate.
 */
export function invalidate(slot) {
  _cache.delete(String(slot));
}

/**
 * Invalidate all cached puzzle data.
 */
export function invalidateAll() {
  _cache.clear();
}

// --- Database helpers ---

/**
 * Get the total number of puzzle slots in the DB.
 *
 * @returns {number} Total puzzle count.
 */
export function totalPuzzles() {
  const db = getDb();
  const row = db.prepare('SELECT MAX(slot) AS max_slot FROM puzzles').get();
  return row && row.max_slot !== null ? row.max_slot + 1 : 0;
}

/**
 * Get all blocked words from the database.
 *
 * @returns {string[]} Array of blocked words.
 */
export function getBlockedWords() {
  const db = getDb();
  const rows = db.prepare('SELECT word FROM blocked_words').all();
  return rows.map((r) => r.word);
}

/**
 * Get the rotation epoch from the config table.
 *
 * @returns {Date} The rotation epoch date.
 */
export function getRotationEpoch() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM config WHERE key = 'rotation_epoch'").get();
  if (row) {
    return new Date(row.value + 'T00:00:00');
  }
  // Fallback
  return new Date('2026-02-24T00:00:00');
}

/**
 * Compute the puzzle slot for a given date based on the rotation epoch.
 * Puzzles rotate sequentially: epoch date maps to slot determined by START_INDEX,
 * cycling through all puzzles.
 *
 * @param {Date} date - The date to compute the slot for.
 * @returns {number} The puzzle slot index.
 */
export function getPuzzleForDate(date) {
  const epoch = getRotationEpoch();
  const START_INDEX = 1;
  const total = totalPuzzles();
  if (total === 0) return 0;

  // Calculate days difference (date-only, ignore time)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const epochOnly = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate());
  const daysDiff = Math.round((dateOnly - epochOnly) / (1000 * 60 * 60 * 24));

  return ((START_INDEX + daysDiff) % total + total) % total;
}

/**
 * Get a puzzle by its slot number. Reads from cache or computes and caches.
 *
 * @param {number} slot - The puzzle slot index.
 * @returns {object | null} Puzzle data (without plaintext words for public API),
 *   or null if the slot doesn't exist.
 */
export function getPuzzleBySlot(slot) {
  const cacheKey = String(slot);
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  const db = getDb();
  const puzzle = db.prepare('SELECT slot, letters, center FROM puzzles WHERE slot = ?').get(slot);
  if (!puzzle) return null;

  const blockedWords = getBlockedWords();
  const result = computePuzzle(puzzle.letters, puzzle.center, blockedWords);

  // Store full result in cache (including words for admin use)
  const fullResult = {
    center: puzzle.center,
    letters: puzzle.letters.split(',').map((l) => l.trim()).filter((l) => l !== puzzle.center),
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
 *
 * @param {Date} date - The date.
 * @returns {object | null} Puzzle data, or null if not found.
 */
export function getPuzzleForDateFull(date) {
  const slot = getPuzzleForDate(date);
  return getPuzzleBySlot(slot);
}
