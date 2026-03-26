/**
 * Puzzle routes.
 *
 * Endpoints:
 *   GET /api/puzzle         - Serve today's puzzle (Helsinki timezone rotation)
 *   GET /api/puzzle/:number - Serve a specific puzzle by slot number
 *
 * @module server/routes/puzzle
 */

import { Hono } from 'hono';
import {
  getPuzzleBySlot,
  totalPuzzles as getTotalPuzzles,
  getPuzzleForDate,
} from '../puzzle-engine.js';
import type { FullPuzzleData } from '../puzzle-engine.js';

interface PuzzleResponse {
  center: string;
  letters: string[];
  word_hashes: string[];
  hint_data: FullPuzzleData['hint_data'];
  max_score: number;
  puzzle_number: number;
  total_puzzles: number;
}

const puzzle = new Hono();

/**
 * Build the standard puzzle response shape.
 */
function buildPuzzleResponse(slot: number): PuzzleResponse {
  const totalPuzzles = getTotalPuzzles();
  const wrappedSlot = ((slot % totalPuzzles) + totalPuzzles) % totalPuzzles;
  const data = getPuzzleBySlot(wrappedSlot)!;

  return {
    center: data.center,
    letters: data.letters,
    word_hashes: data.word_hashes,
    hint_data: data.hint_data,
    max_score: data.max_score,
    puzzle_number: wrappedSlot,
    total_puzzles: totalPuzzles,
  };
}

/**
 * GET /api/puzzle
 * Returns today's puzzle based on Helsinki timezone date rotation.
 */
puzzle.get('/', (c) => {
  // Convert to Helsinki timezone so rotation aligns with Finnish midnight
  const now = new Date();
  const helsinki = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  const slot = getPuzzleForDate(helsinki);
  return c.json(buildPuzzleResponse(slot));
});

/**
 * GET /api/puzzle/:number
 * Returns a specific puzzle by slot number (wraps around).
 */
puzzle.get('/:number', (c) => {
  const number = parseInt(c.req.param('number'), 10);

  if (isNaN(number) || number < 0) {
    return c.json({ error: 'Invalid puzzle number' }, 400);
  }

  return c.json(buildPuzzleResponse(number));
});

export default puzzle;
