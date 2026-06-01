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
 *   GET    /api/admin/suggestion          - No-spoiler next-game suggestion
 *   GET    /api/admin/suggestion-rejections - List rejected suggestions
 *   POST   /api/admin/suggestion-rejections - Reject a suggestion permanently
 *   DELETE /api/admin/suggestion-rejections/:id - Restore a rejected suggestion
 *   GET    /api/admin/schedule            - 14-day upcoming puzzle rotation
 *   GET    /api/admin/achievements        - Daily achievement breakdown by rank
 *   GET    /api/admin/failed-guesses      - Daily failed-guess breakdown by word
 *   GET    /api/admin/word-finds          - Per-puzzle successful word-find counts
 *
 * @module server/routes/admin
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { getDb } from '../db/connection';
import type { AdminVariables } from '../auth/middleware';
import type { SessionData } from '../auth/session';
import {
  computePuzzle,
  computeVariations,
  getBlockedWords,
  getPuzzleBySlot,
  getPuzzleForDate,
  bumpPuzzleCacheGeneration,
  totalPuzzles,
  FINNISH_LETTERS,
} from '../puzzle-engine';
import {
  normalizeLettersKey,
  suggestionKey,
  suggestPuzzle,
} from '../puzzle-suggestions';

const admin = new Hono<{ Variables: AdminVariables }>();
const SUGGESTION_EXHAUSTED_ERROR =
  'Kaikki sopivat ehdotukset on jo käytetty tai hylätty';

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

interface SuggestionRejectionRow {
  id: number;
  letters_key: string;
  center: string;
  rejected_at: string;
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

interface FailedGuessStatRow {
  puzzle_date: string;
  word: string;
  count: number;
}

interface WordFindStatRow {
  word: string;
  count: number;
}

function parseOptionalPositiveInt(
  value: string | undefined,
): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizedSuggestionLetters(value: unknown): string | null {
  if (typeof value === 'string') return normalizeLettersKey(value);
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return normalizeLettersKey(value);
  }
  return null;
}

function parseSuggestionRejectionBody(body: Record<string, unknown>): {
  lettersKey: string;
  center: string;
} | null {
  const lettersKey = normalizedSuggestionLetters(
    body.letters ?? body.letters_key,
  );
  const center =
    typeof body.center === 'string' ? body.center.trim().toLowerCase() : '';

  if (!lettersKey || !center || Array.from(center).length !== 1) {
    return null;
  }

  const letters = Array.from(lettersKey);
  if (
    letters.length !== 7 ||
    new Set(letters).size !== 7 ||
    !letters.includes(center)
  ) {
    return null;
  }

  return { lettersKey, center };
}

function persistedSuggestionRejectionKeys(): string[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT letters_key, center FROM suggestion_rejections')
    .all() as Array<Pick<SuggestionRejectionRow, 'letters_key' | 'center'>>;
  return rows.map((row) => suggestionKey(row.letters_key, row.center));
}

/**
 * Refresh combination membership flags from the puzzles table.
 * Suggestions use puzzles as source of truth, but the admin browser displays
 * this flag and should stay consistent after create/update/delete writes.
 */
function syncCombinationRotationFlags(): void {
  const db = getDb();
  const rows = db.prepare('SELECT letters FROM puzzles').all() as Array<{
    letters: string;
  }>;
  const mark = db.prepare(
    'UPDATE combinations SET in_rotation = 1 WHERE letters = ?',
  );

  db.transaction(() => {
    db.prepare('UPDATE combinations SET in_rotation = 0').run();
    for (const row of rows) {
      mark.run(normalizeLettersKey(row.letters));
    }
  })();
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
  syncCombinationRotationFlags();

  bumpPuzzleCacheGeneration();

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
  syncCombinationRotationFlags();

  bumpPuzzleCacheGeneration();

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

  bumpPuzzleCacheGeneration();

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

  bumpPuzzleCacheGeneration();

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

  bumpPuzzleCacheGeneration();

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
  bumpPuzzleCacheGeneration();

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

// --- Suggestion rejections ---

/**
 * GET /suggestion-rejections
 * List game suggestions that should be skipped by future admin suggestions.
 */
admin.get('/suggestion-rejections', (c) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, letters_key, center, rejected_at
       FROM suggestion_rejections
       ORDER BY rejected_at DESC, id DESC`,
    )
    .all() as SuggestionRejectionRow[];

  return c.json({
    rejections: rows.map((row) => ({
      ...row,
      letters: Array.from(row.letters_key),
    })),
  });
});

/**
 * POST /suggestion-rejections
 * Persistently reject a game suggestion so it is skipped in future sessions.
 */
admin.post('/suggestion-rejections', async (c) => {
  const session = c.get('admin') as SessionData;

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const parsed = parseSuggestionRejectionBody(body);
  if (!parsed) {
    return c.json({ error: 'Suggestion letters and center are required' }, 400);
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO suggestion_rejections (letters_key, center)
       VALUES (?, ?)`,
    )
    .run(parsed.lettersKey, parsed.center);

  const row = db
    .prepare(
      `SELECT id, letters_key, center, rejected_at
       FROM suggestion_rejections
       WHERE letters_key = ? AND center = ?`,
    )
    .get(parsed.lettersKey, parsed.center) as SuggestionRejectionRow;

  if (result.changes > 0) {
    logAction(
      session.adminId,
      'suggestion_reject',
      `${parsed.lettersKey}:${parsed.center}`,
    );
  }

  return c.json({
    status: result.changes > 0 ? 'rejected' : 'already_rejected',
    ...row,
    letters: Array.from(row.letters_key),
  });
});

/**
 * DELETE /suggestion-rejections/:id
 * Restore a previously rejected game suggestion.
 */
admin.delete('/suggestion-rejections/:id', async (c) => {
  const session = c.get('admin') as SessionData;
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, letters_key, center, rejected_at
       FROM suggestion_rejections
       WHERE id = ?`,
    )
    .get(id) as SuggestionRejectionRow | undefined;

  if (!row) {
    return c.json({ error: 'Rejected suggestion not found' }, 404);
  }

  db.prepare('DELETE FROM suggestion_rejections WHERE id = ?').run(id);
  logAction(
    session.adminId,
    'suggestion_restore',
    `${row.letters_key}:${row.center}`,
  );

  return c.json({
    status: 'restored',
    ...row,
    letters: Array.from(row.letters_key),
  });
});

/**
 * GET /suggestion
 * Return one no-spoiler candidate for appending to the puzzle rotation.
 * Query include_pangrams=true exposes only the candidate's pangram words for
 * the admin spoiler toggle; full solution words are never returned.
 */
admin.get('/suggestion', (c) => {
  const declinedParam = c.req.query('declined') || '';
  const declined = declinedParam
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const persistedDeclined = persistedSuggestionRejectionKeys();
  const includePangrams = ['1', 'true', 'yes'].includes(
    (c.req.query('include_pangrams') || '').trim().toLowerCase(),
  );
  const suggestion = suggestPuzzle({
    declined: [...declined, ...persistedDeclined],
    minWords: parseOptionalPositiveInt(c.req.query('min_words')),
    maxWords: parseOptionalPositiveInt(c.req.query('max_words')),
    includePangrams,
  });

  if (!suggestion) {
    return c.json({ error: SUGGESTION_EXHAUSTED_ERROR }, 404);
  }

  return c.json({ suggestion });
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

  const _todaySlot = todaysSlot();
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

/** Valid rank names for stats, ordered lowest to highest. */
const RANKS = [
  'Etsi sanoja!',
  'Hyvä alku',
  'Nyt mennään!',
  'Onnistuja',
  'Sanavalmis',
  'Ällistyttävä',
  'Täysi kenno',
];

/** Map rank name to numeric index for comparison. */
const RANK_INDEX = new Map(RANKS.map((r, i) => [r, i]));

interface AchievementRow {
  rank: string;
  achieved_at: string;
  session_id: string | null;
}

/**
 * Group rows by Helsinki date, counting per rank.
 * When `bySession` is true, only the highest rank per session_id is counted.
 */
function groupByDay(
  rows: AchievementRow[],
  bySession: boolean,
): {
  dailyMap: Map<string, Record<string, number>>;
  totals: Record<string, number>;
} {
  const dailyMap = new Map<string, Record<string, number>>();
  const totals: Record<string, number> = {};
  for (const rank of RANKS) totals[rank] = 0;

  if (bySession) {
    // First pass: find best rank per (date, session_id)
    const sessionBest = new Map<string, { date: string; rankIdx: number }>();
    for (const row of rows) {
      const utcDate = new Date(row.achieved_at + 'Z');
      const dateStr = utcDate.toLocaleDateString('en-CA', {
        timeZone: 'Europe/Helsinki',
      });
      // Use session_id if available, fall back to row-level counting
      const key = row.session_id
        ? `${dateStr}:${row.session_id}`
        : `${dateStr}:${row.achieved_at}`;
      const idx = RANK_INDEX.get(row.rank) ?? 0;
      const existing = sessionBest.get(key);
      if (!existing || idx > existing.rankIdx) {
        sessionBest.set(key, { date: dateStr, rankIdx: idx });
      }
    }

    // Second pass: count best ranks per day
    for (const { date, rankIdx } of sessionBest.values()) {
      if (!dailyMap.has(date)) {
        dailyMap.set(date, Object.fromEntries(RANKS.map((r) => [r, 0])));
      }
      const rankName = RANKS[rankIdx];
      dailyMap.get(date)![rankName]++;
      totals[rankName]++;
    }
  } else {
    // Raw mode: count every achievement row
    for (const row of rows) {
      const utcDate = new Date(row.achieved_at + 'Z');
      const dateStr = utcDate.toLocaleDateString('en-CA', {
        timeZone: 'Europe/Helsinki',
      });
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, Object.fromEntries(RANKS.map((r) => [r, 0])));
      }
      const dayCounts = dailyMap.get(dateStr)!;
      if (dayCounts[row.rank] !== undefined) dayCounts[row.rank]++;
      if (totals[row.rank] !== undefined) totals[row.rank]++;
    }
  }

  return { dailyMap, totals };
}

/**
 * GET /achievements
 * Daily achievement breakdown by rank.
 * Query params:
 *   days=7 (default) — period length
 *   mode=sessions — count only highest rank per session (default: all events)
 */
admin.get('/achievements', (c) => {
  const days = Math.min(
    90,
    Math.max(1, parseInt(c.req.query('days') || '7', 10)),
  );
  const bySession = c.req.query('mode') === 'sessions';

  const db = getDb();

  const rows = db
    .prepare(
      `SELECT rank, achieved_at, session_id FROM achievements
       WHERE achieved_at >= datetime('now', ?)
       ORDER BY achieved_at DESC`,
    )
    .all(`-${days} days`) as AchievementRow[];

  const { dailyMap, totals } = groupByDay(rows, bySession);

  // Fill missing days using Helsinki dates (must match groupByDay keys).
  // Anchor at noon UTC to avoid DST edge cases when subtracting days.
  const todayHki = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/Helsinki',
  });
  const anchor = new Date(todayHki + 'T12:00:00Z');

  const daily: Array<{
    date: string;
    counts: Record<string, number>;
    total: number;
  }> = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(anchor.getTime() - d * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    const counts =
      dailyMap.get(dateStr) || Object.fromEntries(RANKS.map((r) => [r, 0]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    daily.push({ date: dateStr, counts, total });
  }

  return c.json({ days, daily, totals, mode: bySession ? 'sessions' : 'all' });
});

/**
 * GET /failed-guesses
 * Daily failed guess breakdown with top words per day.
 * Query params:
 *   days=7 (default) — period length
 */
admin.get('/failed-guesses', (c) => {
  const days = Math.min(
    90,
    Math.max(1, parseInt(c.req.query('days') || '7', 10)),
  );

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT puzzle_date, word, count FROM failed_guesses
       WHERE puzzle_date >= date('now', ?)
       ORDER BY puzzle_date DESC, count DESC, word ASC`,
    )
    .all(`-${days} days`) as FailedGuessStatRow[];

  const totalsByDay = new Map<string, number>();
  const wordsByDay = new Map<string, Array<{ word: string; count: number }>>();

  for (const row of rows) {
    totalsByDay.set(
      row.puzzle_date,
      (totalsByDay.get(row.puzzle_date) || 0) + row.count,
    );

    if (!wordsByDay.has(row.puzzle_date)) {
      wordsByDay.set(row.puzzle_date, []);
    }

    // Keep only the top 50 words per day by query order.
    const words = wordsByDay.get(row.puzzle_date)!;
    if (words.length < 50) {
      words.push({ word: row.word, count: row.count });
    }
  }

  // Fill missing days using Helsinki dates (same anchoring as achievements).
  const todayHki = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/Helsinki',
  });
  const anchor = new Date(todayHki + 'T12:00:00Z');

  const daily: Array<{
    date: string;
    total_count: number;
    words: Array<{ word: string; count: number }>;
  }> = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(anchor.getTime() - d * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    daily.push({
      date: dateStr,
      total_count: totalsByDay.get(dateStr) || 0,
      words: wordsByDay.get(dateStr) || [],
    });
  }

  const grandTotal = daily.reduce((sum, day) => sum + day.total_count, 0);
  return c.json({ days, daily, grand_total: grandTotal });
});

/**
 * GET /word-finds
 * Successful word-find counts for one puzzle slot.
 * Query params:
 *   puzzle_number=0 — zero-based puzzle slot to inspect
 */
admin.get('/word-finds', (c) => {
  const rawPuzzleNumber = c.req.query('puzzle_number');
  if (!rawPuzzleNumber || !/^\d+$/.test(rawPuzzleNumber)) {
    return c.json({ error: 'Invalid puzzle_number' }, 400);
  }

  const puzzleNumber = Number.parseInt(rawPuzzleNumber, 10);
  const puzzle = getPuzzleBySlot(puzzleNumber);
  if (!puzzle) {
    return c.json({ error: 'Puzzle not found' }, 404);
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT word, count FROM word_finds
       WHERE puzzle_number = ?
       ORDER BY count ASC, word ASC`,
    )
    .all(puzzleNumber) as WordFindStatRow[];

  const countsByWord = new Map(rows.map((row) => [row.word, row.count]));
  const words = puzzle.words
    .map((word) => ({
      word,
      find_count: countsByWord.get(word) || 0,
    }))
    .sort((a, b) => {
      if (a.find_count !== b.find_count) {
        return a.find_count - b.find_count;
      }
      return a.word.localeCompare(b.word, 'fi');
    });

  const totalFinds = words.reduce((sum, item) => sum + item.find_count, 0);
  const recordedWords = words.filter((item) => item.find_count > 0).length;

  return c.json({
    puzzle_number: puzzleNumber,
    display_number: puzzleNumber + 1,
    center: puzzle.center,
    letters: puzzle.letters,
    total_words: words.length,
    recorded_words: recordedWords,
    total_finds: totalFinds,
    words,
  });
});

export default admin;
