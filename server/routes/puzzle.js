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
  getTotalPuzzles,
  getPuzzleForDate,
} from '../puzzle-engine-stub.js';

const puzzle = new Hono();

/**
 * Build the standard puzzle response shape.
 *
 * @param {number} slot - The 0-indexed puzzle slot
 * @returns {object} The puzzle response payload
 */
function buildPuzzleResponse(slot) {
  const totalPuzzles = getTotalPuzzles();
  const wrappedSlot = ((slot % totalPuzzles) + totalPuzzles) % totalPuzzles;
  const data = getPuzzleBySlot(wrappedSlot);

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
 *
 * Returns today's puzzle based on Helsinki timezone date rotation.
 * The rotation formula: (days since epoch in Helsinki TZ) % totalPuzzles.
 */
puzzle.get('/', (c) => {
  const slot = getPuzzleForDate(new Date());
  return c.json(buildPuzzleResponse(slot));
});

/**
 * GET /api/puzzle/:number
 *
 * Returns a specific puzzle by slot number.
 * The number wraps around if it exceeds the total puzzle count.
 */
puzzle.get('/:number', (c) => {
  const number = parseInt(c.req.param('number'), 10);

  if (isNaN(number) || number < 0) {
    return c.json({ error: 'Invalid puzzle number' }, 400);
  }

  return c.json(buildPuzzleResponse(number));
});

export default puzzle;
