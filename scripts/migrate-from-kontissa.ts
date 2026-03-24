#!/usr/bin/env -S npx tsx

/**
 * One-time migration script: reads web_kontissa's SQLite DB and populates
 * the standalone sanakenno database with puzzles, blocked words, combinations,
 * and config.
 *
 * Usage: npx tsx scripts/migrate-from-kontissa.ts
 *
 * The script is idempotent — uses INSERT OR REPLACE so it can be re-run safely.
 *
 * @module scripts/migrate-from-kontissa
 */

import Database from 'better-sqlite3';
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, closeDb } from '../server/db/connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SOURCE_DB_PATH = join(PROJECT_ROOT, '..', 'web_kontissa', 'app', 'data', 'site.db');
const SOURCE_WORDLIST = join(PROJECT_ROOT, '..', 'web_kontissa', 'app', 'wordlists', 'kotus_words.txt');
const DEST_WORDLIST = join(PROJECT_ROOT, 'server', 'data', 'kotus_words.txt');

interface PuzzleRow {
  slot: number;
  letters: string;
  created_at: string;
  updated_at: string;
}

interface CenterRow {
  value: string;
}

interface BlockedWordRow {
  word: string;
  blocked_at: string;
}

interface CombinationRow {
  letters: string;
  total_pangrams: number;
  min_word_count: number;
  max_word_count: number;
  min_max_score: number;
  max_max_score: number;
  variations: number;
  in_rotation: number | boolean;
}

interface AchievementRow {
  puzzle_number: number;
  rank: string;
  score: number;
  max_score: number;
  words_found: number;
  elapsed_ms: number;
  achieved_at: string;
}

/**
 * Copy the Finnish wordlist from web_kontissa to server/data/.
 */
function copyWordlist(): boolean {
  if (!existsSync(SOURCE_WORDLIST)) {
    console.warn('WARNING: Wordlist not found at', SOURCE_WORDLIST);
    console.warn('  The puzzle engine requires kotus_words.txt in server/data/');
    return false;
  }

  mkdirSync(dirname(DEST_WORDLIST), { recursive: true });
  copyFileSync(SOURCE_WORDLIST, DEST_WORDLIST);
  console.log('Copied kotus_words.txt to server/data/');
  return true;
}

/**
 * Run the full migration from web_kontissa's site.db to sanakenno.db.
 */
function migrate(): void {
  console.log('Sanakenno migration: web_kontissa → sanakenno\n');

  if (!existsSync(SOURCE_DB_PATH)) {
    console.error('ERROR: Source database not found at', SOURCE_DB_PATH);
    console.error('  Ensure web_kontissa is checked out at ../web_kontissa');
    process.exit(1);
  }

  const sourceDb: Database.Database = new Database(SOURCE_DB_PATH, { readonly: true });
  const destDb = initDb();

  let puzzleCount: number = 0;
  let blockedCount: number = 0;
  let combinationCount: number = 0;

  // --- Migrate puzzles ---
  const puzzles = sourceDb.prepare('SELECT slot, letters, created_at, updated_at FROM bee_puzzles').all() as PuzzleRow[];

  const insertPuzzle = destDb.prepare(`
    INSERT OR REPLACE INTO puzzles (slot, letters, center, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const getCenterStmt = sourceDb.prepare('SELECT value FROM bee_config WHERE key = ?');

  const insertPuzzles = destDb.transaction(() => {
    for (const puzzle of puzzles) {
      const centerRow = getCenterStmt.get(`center_${puzzle.slot}`) as CenterRow | undefined;
      let center: string;
      if (centerRow) {
        center = centerRow.value;
      } else {
        const letters = puzzle.letters.split(',').map((l: string) => l.trim());
        center = letters.sort()[0];
      }

      insertPuzzle.run(puzzle.slot, puzzle.letters, center, puzzle.created_at, puzzle.updated_at);
      puzzleCount++;
    }
  });
  insertPuzzles();

  // --- Migrate blocked words ---
  const blockedWords = sourceDb.prepare('SELECT word, blocked_at FROM blocked_words').all() as BlockedWordRow[];

  const insertBlocked = destDb.prepare(`
    INSERT OR REPLACE INTO blocked_words (word, blocked_at)
    VALUES (?, ?)
  `);

  const insertBlockedWords = destDb.transaction(() => {
    for (const bw of blockedWords) {
      insertBlocked.run(bw.word, bw.blocked_at);
      blockedCount++;
    }
  });
  insertBlockedWords();

  // --- Migrate combinations ---
  const combinations = sourceDb
    .prepare(
      `SELECT letters, total_pangrams, min_word_count, max_word_count,
              min_max_score, max_max_score, variations, in_rotation
       FROM bee_combinations`,
    )
    .all() as CombinationRow[];

  const insertCombination = destDb.prepare(`
    INSERT OR REPLACE INTO combinations
      (letters, total_pangrams, min_word_count, max_word_count,
       min_max_score, max_max_score, variations, in_rotation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCombinations = destDb.transaction(() => {
    for (const combo of combinations) {
      insertCombination.run(
        combo.letters,
        combo.total_pangrams,
        combo.min_word_count,
        combo.max_word_count,
        combo.min_max_score,
        combo.max_max_score,
        combo.variations,
        combo.in_rotation ? 1 : 0,
      );
      combinationCount++;
    }
  });
  insertCombinations();

  // --- Migrate achievements ---
  let achievementCount: number = 0;
  const achievements = sourceDb
    .prepare(
      `SELECT puzzle_number, rank, score, max_score, words_found, elapsed_ms, achieved_at
       FROM bee_achievements`,
    )
    .all() as AchievementRow[];

  const insertAchievement = destDb.prepare(`
    INSERT OR REPLACE INTO achievements
      (puzzle_number, rank, score, max_score, words_found, elapsed_ms, achieved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAchievements = destDb.transaction(() => {
    for (const ach of achievements) {
      insertAchievement.run(
        ach.puzzle_number,
        ach.rank,
        ach.score,
        ach.max_score,
        ach.words_found,
        ach.elapsed_ms,
        ach.achieved_at,
      );
      achievementCount++;
    }
  });
  insertAchievements();

  // --- Insert config ---
  destDb
    .prepare(
      `INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', '2026-02-24')`,
    )
    .run();

  sourceDb.close();

  const wordlistCopied: boolean = copyWordlist();

  console.log('\n--- Migration Summary ---');
  console.log(`Puzzles migrated:      ${puzzleCount}`);
  console.log(`Blocked words:         ${blockedCount}`);
  console.log(`Combinations:          ${combinationCount}`);
  console.log(`Achievements:          ${achievementCount}`);
  console.log(`Config:                rotation_epoch = 2026-02-24`);
  console.log(`Wordlist copied:       ${wordlistCopied ? 'yes' : 'NO (missing)'}`);
  console.log('');

  closeDb();

  console.log('Migration complete.');
}

migrate();
