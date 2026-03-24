#!/usr/bin/env node

/**
 * One-time migration script: reads web_kontissa's SQLite DB and populates
 * the standalone sanakenno database with puzzles, blocked words, combinations,
 * and config.
 *
 * Usage: node scripts/migrate-from-kontissa.js
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

// Source paths in web_kontissa
const SOURCE_DB_PATH = join(PROJECT_ROOT, '..', 'web_kontissa', 'app', 'data', 'site.db');
const SOURCE_WORDLIST = join(PROJECT_ROOT, '..', 'web_kontissa', 'app', 'wordlists', 'kotus_words.txt');
const DEST_WORDLIST = join(PROJECT_ROOT, 'server', 'data', 'kotus_words.txt');

/**
 * Copy the Finnish wordlist from web_kontissa to server/data/.
 */
function copyWordlist() {
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
function migrate() {
  console.log('Sanakenno migration: web_kontissa → sanakenno\n');

  // Verify source DB exists
  if (!existsSync(SOURCE_DB_PATH)) {
    console.error('ERROR: Source database not found at', SOURCE_DB_PATH);
    console.error('  Ensure web_kontissa is checked out at ../web_kontissa');
    process.exit(1);
  }

  // Open source DB read-only
  const sourceDb = new Database(SOURCE_DB_PATH, { readonly: true });

  // Initialize destination DB
  const destDb = initDb();

  let puzzleCount = 0;
  let blockedCount = 0;
  let combinationCount = 0;

  // --- Migrate puzzles ---
  // Read bee_puzzles (slot, letters) + bee_config (center_N) → puzzles table
  const puzzles = sourceDb.prepare('SELECT slot, letters, created_at, updated_at FROM bee_puzzles').all();

  const insertPuzzle = destDb.prepare(`
    INSERT OR REPLACE INTO puzzles (slot, letters, center, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const getCenterStmt = sourceDb.prepare('SELECT value FROM bee_config WHERE key = ?');

  const insertPuzzles = destDb.transaction(() => {
    for (const puzzle of puzzles) {
      // Look up center letter from bee_config
      const centerRow = getCenterStmt.get(`center_${puzzle.slot}`);
      let center;
      if (centerRow) {
        center = centerRow.value;
      } else {
        // Fallback: first letter alphabetically
        const letters = puzzle.letters.split(',').map((l) => l.trim());
        center = letters.sort()[0];
      }

      insertPuzzle.run(puzzle.slot, puzzle.letters, center, puzzle.created_at, puzzle.updated_at);
      puzzleCount++;
    }
  });
  insertPuzzles();

  // --- Migrate blocked words ---
  const blockedWords = sourceDb.prepare('SELECT word, blocked_at FROM blocked_words').all();

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
    .all();

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
  let achievementCount = 0;
  const achievements = sourceDb
    .prepare(
      `SELECT puzzle_number, rank, score, max_score, words_found, elapsed_ms, achieved_at
       FROM bee_achievements`,
    )
    .all();

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

  // Close source DB
  sourceDb.close();

  // Copy wordlist
  const wordlistCopied = copyWordlist();

  // Print summary
  console.log('\n--- Migration Summary ---');
  console.log(`Puzzles migrated:      ${puzzleCount}`);
  console.log(`Blocked words:         ${blockedCount}`);
  console.log(`Combinations:          ${combinationCount}`);
  console.log(`Achievements:          ${achievementCount}`);
  console.log(`Config:                rotation_epoch = 2026-02-24`);
  console.log(`Wordlist copied:       ${wordlistCopied ? 'yes' : 'NO (missing)'}`);
  console.log('');

  // Close destination DB
  closeDb();

  console.log('Migration complete.');
}

migrate();
