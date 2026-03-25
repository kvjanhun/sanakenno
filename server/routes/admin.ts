/**
 * Admin API routes for puzzle management.
 *
 * All routes require authentication (requireAuth middleware) and CSRF
 * verification on state-changing requests (requireCsrf middleware),
 * applied in server/index.ts.
 *
 * Endpoints:
 *   POST   /api/admin/puzzle             - Create or update a puzzle
 *   DELETE /api/admin/puzzle/:slot        - Delete a puzzle and renumber slots
 *   POST   /api/admin/puzzle/swap         - Swap two puzzle slots
 *   POST   /api/admin/puzzle/center       - Change center letter for a puzzle
 *   GET    /api/admin/puzzle/variations   - Get 7 center variations for a slot
 *   POST   /api/admin/preview             - Preview word list without saving
 *   POST   /api/admin/block               - Block a word permanently
 *   DELETE /api/admin/block/:id           - Unblock a word
 *   GET    /api/admin/blocked             - List all blocked words
 *   GET    /api/admin/combinations        - Filterable/sortable combinations browser
 *   GET    /api/admin/schedule            - 14-day upcoming puzzle rotation
 *   GET    /api/admin/achievements        - Daily achievement breakdown by rank
 *
 * @module server/routes/admin
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { getDb } from '../db/connection.js';
import type { AdminVariables } from '../auth/middleware.js';
import type { SessionData } from '../auth/session.js';
import {
  computePuzzle,
  computeVariations,
  getBlockedWords,
  getPuzzleBySlot,
  getPuzzleForDate,
  getRotationEpoch,
  invalidate,
  invalidateAll,
  totalPuzzles,
  FINNISH_LETTERS,
} from '../puzzle-engine.js';

const admin = new Hono<{ Variables: AdminVariables }>();

// --- Helpers ---

interface PuzzleRow {
  slot: number;
  letters: string;
  center: string;
}

interface BlockedWordRow {
  id: number;
  word: string;
  blocked_at: string;
}

interface AchievementRow {
  puzzle_number: number;
  rank: string;
  score: number;
  max_score: number;
  words_found: number;
  elapsed_ms: number | null;
  achieved_at: string;
}

/**
 * Log an admin action to the audit trail.
 */
function logAction(adminId: number, action: string, detail?: string): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO admin_log (admin_id, action, detail) VALUES (?, ?, ?)',
  ).run(adminId, action, detail ?? null);
}

/**
 * Get today's puzzle slot number using Helsinki timezone.
 */
function todaysSlot(): number {
  const now = new Date();
  const helsinki = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  return getPuzzleForDate(helsinki);
}

/**
 * Check if a slot is today's live puzzle.
 */
function isTodaysPuzzle(slot: number): boolean {
  return slot === todaysSlot();
}

/**
 * Validate that letters are 7 distinct Finnish characters.
 */
function validateLetters(letters: unknown): letters is string[] {
  if (!Array.isArray(letters) || letters.length !== 7) return false;
  const unique = new Set(letters);
  if (unique.size !== 7) return false;
  for (const l of letters) {
    if (typeof l !== 'string' || l.length !== 1 || !FINNISH_LETTERS.has(l)) {
      return false;
    }
  }
  return true;
}

/**
 * Today's puzzle protection: returns 409 response if the slot is today's
 * and force is not true.
 */
function checkTodayProtection(
  c: Context,
  slot: number,
  force?: boolean,
): Response | null {
  if (isTodaysPuzzle(slot) && !force) {
    return c.json(
      {
        error: 'Tämä on tämän päivän peli',
        requires_force: true,
      },
      409,
    );
  }
  return null;
}

/**
 * Compute the next date a slot will be active.
 */
function nextDateForSlot(slot: number): string {
  const epoch = getRotationEpoch();
  const total = totalPuzzles();
  if (total === 0) return 'unknown';

  const now = new Date();
  const today = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  today.setHours(0, 0, 0, 0);

  // Search up to total days + 1 to find next occurrence
  for (let d = 0; d <= total; d++) {
    const candidate = new Date(today.getTime() + d * 86400000);
    if (getPuzzleForDate(candidate) === slot) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return 'unknown';
}

// --- Rate limiting for preview ---

const previewRateLimitMap = new Map<string, number>();
const PREVIEW_RATE_LIMIT = 20;

const previewRateLimitInterval = setInterval(() => {
  previewRateLimitMap.clear();
}, 60_000);

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__previewRateLimitInterval =
    previewRateLimitInterval;
}

/** Clear preview rate limit map. Exposed for testing. */
export function resetPreviewRateLimit(): void {
  previewRateLimitMap.clear();
}

function previewRateLimit(c: Context, next: Next) {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown';
  const count = previewRateLimitMap.get(ip) || 0;
  if (count >= PREVIEW_RATE_LIMIT) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  previewRateLimitMap.set(ip, count + 1);
  return next();
}

// --- Puzzle CRUD ---

/**
 * POST /puzzle
 * Create or update a puzzle at a given slot.
 */
admin.post('/puzzle', async (c) => {
  const session = c.get('admin') as SessionData;

  let body: {
    slot?: number;
    letters?: string[];
    center?: string;
    force?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { letters, center, force } = body;

  if (!validateLetters(letters)) {
    return c.json({ error: '7 erillistä kirjainta vaaditaan (a-ö)' }, 400);
  }

  if (!center || typeof center !== 'string' || !letters.includes(center)) {
    return c.json(
      { error: 'Keskuskirjaimen on oltava yksi seitsemästä kirjaimesta' },
      400,
    );
  }

  const db = getDb();
  const total = totalPuzzles();
  const slot = body.slot !== undefined ? body.slot : total;
  const isNew = slot >= total;

  if (!isNew) {
    const blocked = checkTodayProtection(c, slot, force);
    if (blocked) return blocked;
  }

  const lettersStr = letters.sort().join(',');

  if (isNew) {
    db.prepare(
      'INSERT INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
    ).run(slot, lettersStr, center);
  } else {
    db.prepare(
      "UPDATE puzzles SET letters = ?, center = ?, updated_at = datetime('now') WHERE slot = ?",
    ).run(lettersStr, center, slot);
  }

  invalidate(slot);

  logAction(
    session.adminId,
    isNew ? 'puzzle_create' : 'puzzle_update',
    `slot=${slot} letters=${lettersStr} center=${center}`,
  );

  return c.json({
    slot,
    letters: letters.sort(),
    center,
    is_new: isNew,
    next_date: nextDateForSlot(slot),
    total_puzzles: totalPuzzles(),
  });
});

/**
 * DELETE /puzzle/:slot
 * Delete a puzzle and renumber subsequent slots.
 */
admin.delete('/puzzle/:slot', async (c) => {
  const session = c.get('admin') as SessionData;
  const slot = parseInt(c.req.param('slot'), 10);

  if (isNaN(slot) || slot < 0) {
    return c.json({ error: 'Invalid slot number' }, 400);
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT slot FROM puzzles WHERE slot = ?')
    .get(slot);
  if (!existing) {
    return c.json({ error: 'Puzzle not found' }, 404);
  }

  const force = c.req.query('force') === 'true';
  const blocked = checkTodayProtection(c, slot, force);
  if (blocked) return blocked;

  // Delete and renumber in a transaction
  db.transaction(() => {
    db.prepare('DELETE FROM puzzles WHERE slot = ?').run(slot);
    db.prepare('UPDATE puzzles SET slot = slot - 1 WHERE slot > ?').run(slot);
  })();

  invalidateAll();

  logAction(session.adminId, 'puzzle_delete', `slot=${slot}`);

  return c.json({
    status: 'deleted',
    slot,
    total_puzzles: totalPuzzles(),
  });
});

/**
 * POST /puzzle/swap
 * Swap two puzzle slots.
 */
admin.post('/puzzle/swap', async (c) => {
  const session = c.get('admin') as SessionData;

  let body: { slot_a?: number; slot_b?: number; force?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { slot_a, slot_b, force } = body;

  if (
    typeof slot_a !== 'number' ||
    typeof slot_b !== 'number' ||
    slot_a === slot_b
  ) {
    return c.json({ error: 'Kaksi eri slot-numeroa vaaditaan' }, 400);
  }

  const db = getDb();
  const puzzleA = db
    .prepare('SELECT slot, letters, center FROM puzzles WHERE slot = ?')
    .get(slot_a) as PuzzleRow | undefined;
  const puzzleB = db
    .prepare('SELECT slot, letters, center FROM puzzles WHERE slot = ?')
    .get(slot_b) as PuzzleRow | undefined;

  if (!puzzleA || !puzzleB) {
    return c.json({ error: 'Molemmat slotit on oltava olemassa' }, 404);
  }

  if (!force) {
    if (isTodaysPuzzle(slot_a) || isTodaysPuzzle(slot_b)) {
      return c.json(
        {
          error: 'Yksi sloteista on tämän päivän peli',
          requires_force: true,
        },
        409,
      );
    }
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE puzzles SET letters = ?, center = ?, updated_at = datetime('now') WHERE slot = ?",
    ).run(puzzleB.letters, puzzleB.center, slot_a);
    db.prepare(
      "UPDATE puzzles SET letters = ?, center = ?, updated_at = datetime('now') WHERE slot = ?",
    ).run(puzzleA.letters, puzzleA.center, slot_b);
  })();

  invalidate(slot_a);
  invalidate(slot_b);

  logAction(
    session.adminId,
    'puzzle_swap',
    `slot_a=${slot_a} slot_b=${slot_b}`,
  );

  return c.json({ status: 'swapped', slot_a, slot_b });
});

/**
 * POST /puzzle/center
 * Change the center letter of a puzzle.
 */
admin.post('/puzzle/center', async (c) => {
  const session = c.get('admin') as SessionData;

  let body: { slot?: number; center?: string; force?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { slot, center, force } = body;

  if (typeof slot !== 'number' || slot < 0) {
    return c.json({ error: 'Invalid slot number' }, 400);
  }

  const db = getDb();
  const puzzle = db
    .prepare('SELECT letters FROM puzzles WHERE slot = ?')
    .get(slot) as { letters: string } | undefined;

  if (!puzzle) {
    return c.json({ error: 'Puzzle not found' }, 404);
  }

  const letters = puzzle.letters.split(',').map((l) => l.trim());
  if (!center || !letters.includes(center)) {
    return c.json(
      { error: 'Keskuskirjaimen on oltava yksi pelin kirjaimista' },
      400,
    );
  }

  const blocked = checkTodayProtection(c, slot, force);
  if (blocked) return blocked;

  db.prepare(
    "UPDATE puzzles SET center = ?, updated_at = datetime('now') WHERE slot = ?",
  ).run(center, slot);

  invalidate(slot);

  logAction(session.adminId, 'center_change', `slot=${slot} center=${center}`);

  return c.json({ status: 'updated', slot, center });
});

/**
 * GET /puzzle/variations
 * Get all 7 center letter variations for a puzzle slot.
 */
admin.get('/puzzle/variations', (c) => {
  const slotStr = c.req.query('slot');
  if (!slotStr) {
    return c.json({ error: 'slot query parameter required' }, 400);
  }

  const slot = parseInt(slotStr, 10);
  if (isNaN(slot) || slot < 0) {
    return c.json({ error: 'Invalid slot number' }, 400);
  }

  const db = getDb();
  const puzzle = db
    .prepare('SELECT letters, center FROM puzzles WHERE slot = ?')
    .get(slot) as { letters: string; center: string } | undefined;

  if (!puzzle) {
    return c.json({ error: 'Puzzle not found' }, 404);
  }

  const letters = puzzle.letters.split(',').map((l) => l.trim());
  const blockedWords = getBlockedWords();
  const variations = computeVariations(letters, blockedWords).map((v) => ({
    ...v,
    is_active: v.center === puzzle.center,
  }));

  return c.json({ slot, letters, variations });
});

// --- Preview ---

/**
 * POST /preview
 * Preview word list for arbitrary letters without saving.
 */
admin.post('/preview', previewRateLimit, async (c) => {
  let body: { letters?: string[]; center?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { letters, center } = body;

  if (!validateLetters(letters)) {
    return c.json({ error: '7 erillistä kirjainta vaaditaan (a-ö)' }, 400);
  }

  const blockedWords = getBlockedWords();
  const variations = computeVariations(letters, blockedWords);

  const result: {
    letters: string[];
    variations: typeof variations;
    words?: string[];
  } = { letters, variations };

  if (center && letters.includes(center)) {
    const puzzleData = computePuzzle(letters, center, blockedWords);
    result.words = puzzleData.words;
  }

  return c.json(result);
});

// --- Blocked words ---

/**
 * POST /block
 * Block a word permanently.
 */
admin.post('/block', async (c) => {
  const session = c.get('admin') as SessionData;

  let body: { word?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { word } = body;
  if (!word || typeof word !== 'string' || word.trim().length === 0) {
    return c.json({ error: 'Word is required' }, 400);
  }

  const normalized = word.trim().toLowerCase();
  const db = getDb();

  const result = db
    .prepare('INSERT OR IGNORE INTO blocked_words (word) VALUES (?)')
    .run(normalized);

  invalidateAll();

  logAction(session.adminId, 'word_block', normalized);

  if (result.changes === 0) {
    return c.json({ status: 'already_blocked', word: normalized });
  }

  const row = db
    .prepare('SELECT id FROM blocked_words WHERE word = ?')
    .get(normalized) as { id: number };

  return c.json({ status: 'blocked', id: row.id, word: normalized });
});

/**
 * DELETE /block/:id
 * Unblock a word.
 */
admin.delete('/block/:id', async (c) => {
  const session = c.get('admin') as SessionData;
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const db = getDb();
  const row = db
    .prepare('SELECT word FROM blocked_words WHERE id = ?')
    .get(id) as { word: string } | undefined;

  if (!row) {
    return c.json({ error: 'Blocked word not found' }, 404);
  }

  db.prepare('DELETE FROM blocked_words WHERE id = ?').run(id);
  invalidateAll();

  logAction(session.adminId, 'word_unblock', row.word);

  return c.json({ status: 'unblocked', word: row.word });
});

/**
 * GET /blocked
 * List all blocked words.
 */
admin.get('/blocked', (c) => {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT id, word, blocked_at FROM blocked_words ORDER BY blocked_at DESC',
    )
    .all() as BlockedWordRow[];

  return c.json({ blocked_words: rows });
});

// --- Combinations browser ---

interface CombinationRow {
  letters: string;
  total_pangrams: number;
  min_word_count: number;
  max_word_count: number;
  min_max_score: number;
  max_max_score: number;
  variations: string;
  in_rotation: number;
}

/**
 * GET /combinations
 * Filterable, sortable, paginated combinations browser.
 */
admin.get('/combinations', (c) => {
  const requires = c.req.query('requires') || '';
  const excludes = c.req.query('excludes') || '';
  const minPangrams = c.req.query('min_pangrams');
  const maxPangrams = c.req.query('max_pangrams');
  const minWords = c.req.query('min_words');
  const maxWords = c.req.query('max_words');
  const minWordsMin = c.req.query('min_words_min');
  const maxWordsMin = c.req.query('max_words_min');
  const inRotation = c.req.query('in_rotation');
  const sort = c.req.query('sort') || 'letters';
  const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const perPage = Math.min(
    200,
    Math.max(1, parseInt(c.req.query('per_page') || '50', 10)),
  );

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // "requires" filter: every character must appear in the letters
  for (const ch of requires.toLowerCase()) {
    if (FINNISH_LETTERS.has(ch)) {
      conditions.push('letters LIKE ?');
      params.push(`%${ch}%`);
    }
  }

  // "excludes" filter: no character may appear in the letters
  for (const ch of excludes.toLowerCase()) {
    if (FINNISH_LETTERS.has(ch)) {
      conditions.push('letters NOT LIKE ?');
      params.push(`%${ch}%`);
    }
  }

  if (minPangrams) {
    conditions.push('total_pangrams >= ?');
    params.push(parseInt(minPangrams, 10));
  }
  if (maxPangrams) {
    conditions.push('total_pangrams <= ?');
    params.push(parseInt(maxPangrams, 10));
  }
  if (minWords) {
    conditions.push('max_word_count >= ?');
    params.push(parseInt(minWords, 10));
  }
  if (maxWords) {
    conditions.push('max_word_count <= ?');
    params.push(parseInt(maxWords, 10));
  }
  if (minWordsMin) {
    conditions.push('min_word_count >= ?');
    params.push(parseInt(minWordsMin, 10));
  }
  if (maxWordsMin) {
    conditions.push('min_word_count <= ?');
    params.push(parseInt(maxWordsMin, 10));
  }
  if (inRotation === 'true') {
    conditions.push('in_rotation = 1');
  } else if (inRotation === 'false') {
    conditions.push('in_rotation = 0');
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sort column mapping
  const sortMap: Record<string, string> = {
    letters: 'letters',
    pangrams: 'total_pangrams',
    words_max: 'max_word_count',
    words_min: 'min_word_count',
    score_max: 'max_max_score',
    score_min: 'min_max_score',
  };
  const sortColumn = sortMap[sort] || 'letters';

  const db = getDb();

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM combinations ${whereClause}`)
    .get(...params) as { total: number };

  const total = countRow.total;
  const pages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;

  const rows = db
    .prepare(
      `SELECT * FROM combinations ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, perPage, offset) as CombinationRow[];

  const combinations = rows.map((row) => ({
    letters: row.letters,
    total_pangrams: row.total_pangrams,
    min_word_count: row.min_word_count,
    max_word_count: row.max_word_count,
    min_max_score: row.min_max_score,
    max_max_score: row.max_max_score,
    variations: JSON.parse(row.variations),
    in_rotation: Boolean(row.in_rotation),
  }));

  return c.json({ combinations, total, page, pages, per_page: perPage });
});

// --- Schedule ---

/**
 * GET /schedule
 * Upcoming puzzle rotation for the next N days (default 14).
 */
admin.get('/schedule', (c) => {
  const days = Math.min(
    90,
    Math.max(1, parseInt(c.req.query('days') || '14', 10)),
  );

  const now = new Date();
  const today = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  today.setHours(0, 0, 0, 0);

  const todaySlot = todaysSlot();
  const db = getDb();
  const schedule: Array<{
    date: string;
    slot: number;
    display_number: number;
    letters: string[] | null;
    center: string | null;
    is_today: boolean;
  }> = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(today.getTime() + d * 86400000);
    const slot = getPuzzleForDate(date);
    const puzzle = db
      .prepare('SELECT letters, center FROM puzzles WHERE slot = ?')
      .get(slot) as { letters: string; center: string } | undefined;

    schedule.push({
      date: date.toISOString().slice(0, 10),
      slot,
      display_number: slot + 1,
      letters: puzzle ? puzzle.letters.split(',').map((l) => l.trim()) : null,
      center: puzzle?.center ?? null,
      is_today: d === 0,
    });
  }

  return c.json({ schedule, total_puzzles: totalPuzzles() });
});

// --- Achievement stats ---

/** Valid rank names for stats. */
const RANKS = [
  'Etsi sanoja!',
  'Hyvä alku',
  'Nyt mennään!',
  'Onnistuja',
  'Sanavalmis',
  'Ällistyttävä',
  'Täysi kenno',
];

/**
 * GET /achievements
 * Daily achievement breakdown by rank.
 */
admin.get('/achievements', (c) => {
  const days = Math.min(
    90,
    Math.max(1, parseInt(c.req.query('days') || '7', 10)),
  );

  const db = getDb();

  // Get achievements for the period
  const rows = db
    .prepare(
      `SELECT rank, achieved_at FROM achievements
       WHERE achieved_at >= datetime('now', ?)
       ORDER BY achieved_at DESC`,
    )
    .all(`-${days} days`) as Array<{ rank: string; achieved_at: string }>;

  // Group by Helsinki date
  const dailyMap = new Map<string, Record<string, number>>();
  const totals: Record<string, number> = {};
  for (const rank of RANKS) {
    totals[rank] = 0;
  }

  for (const row of rows) {
    // Convert UTC to Helsinki for date grouping
    const utcDate = new Date(row.achieved_at + 'Z');
    const helsinkiStr = utcDate.toLocaleDateString('en-CA', {
      timeZone: 'Europe/Helsinki',
    });

    if (!dailyMap.has(helsinkiStr)) {
      const counts: Record<string, number> = {};
      for (const rank of RANKS) {
        counts[rank] = 0;
      }
      dailyMap.set(helsinkiStr, counts);
    }

    const dayCounts = dailyMap.get(helsinkiStr)!;
    if (dayCounts[row.rank] !== undefined) {
      dayCounts[row.rank]++;
    }
    if (totals[row.rank] !== undefined) {
      totals[row.rank]++;
    }
  }

  // Convert to sorted array and fill missing days
  const now = new Date();
  const today = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  today.setHours(0, 0, 0, 0);

  const daily: Array<{
    date: string;
    counts: Record<string, number>;
    total: number;
  }> = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(today.getTime() - d * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    const counts =
      dailyMap.get(dateStr) || Object.fromEntries(RANKS.map((r) => [r, 0]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    daily.push({ date: dateStr, counts, total });
  }

  return c.json({ days, daily, totals });
});

export default admin;
