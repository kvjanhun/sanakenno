# Sanakenno — Project Map

This document provides a high-level overview of the project's architecture and data flow to help AI agents navigate the codebase efficiently.

## Core Architecture

Sanakenno is a word-puzzle game with a web app (PWA) and a Hono (Node.js)
backend. A pnpm workspace ties the code together:

```
sanakenno/
  packages/
    shared/   # Pure domain logic, types, platform interfaces (@sanakenno/shared)
    web/      # React 19 + Vite PWA frontend
  server/     # Hono API server
```

The former native iOS app was archived at the `mobile-archive` git tag.

Current versions: see the package.json files for each deployable target.

---

## Data Flows

### User Finding a Word

1. **Input**: User types in `packages/web/src/components/WordInput.tsx` or taps the Honeycomb.
2. **Action**: Calls `submitWord` in `useGameStore.ts`.
3. **Logic**: Store uses `@sanakenno/shared` (`scoreWord`, `recalcScore`) to calculate points and validate.
4. **State**: Store updates `foundWords`, `score`, `longestWord`, and `pangramsFound`.
5. **Persistence**: State syncs to `localStorage`.
6. **Stats**: `updateStatsRecord` (shared) updates the per-puzzle `StatsRecord` (rank, score, longest_word, pangrams_found). Skipped if the puzzle's `revealed_N` flag is set.
7. **Sync**: If logged in, fires `POST /api/player/sync/stats` and `POST /api/player/sync/state` (fire-and-forget).
8. **Feedback**: `MessageBar` shows success/error messages.
9. **Word-find analytics**: Accepted words fire-and-forget `POST /api/word-find` with `(word, puzzle_number)`.
10. **Failed guesses**: After an "Ei sanakirjassa" rejection, the client fires-and-forgets `POST /api/failed-guess`.

### Daily Puzzle Fetching

1. **Request**: Frontend calls `GET /api/puzzle` on mount (or at midnight).
2. **Route**: `server/routes/puzzle.ts` handles the request.
3. **Engine**: `server/puzzle-engine.ts` calculates which active puzzle slot to serve based on Helsinki time. Date-based rotation can roll over to the first active slot.
4. **Database**: Puzzles are fetched from SQLite via `server/db/connection.ts`.
5. **Response**: JSON including letters, center letter, and pre-computed `hint_data`.

### Archive & Reveal Flow

1. `ArchiveModal` fetches `GET /api/archive?all=true` — returns calendar entries for the current active-puzzle cycle.
2. A past puzzle can be replayed, or its answers revealed via `GET /api/puzzle/:number/words`.
3. Revealing sets `revealed_N = 'true'` in localStorage; stats updates are frozen for that puzzle from then on.

### Cross-Device Sync

1. On login, `useAuthStore.initialize()` calls `GET /api/player/sync` to pull all server records.
2. `pullAndMerge` merges server data into local storage using `mergeStatsRecord` and `mergePuzzleState` from `@sanakenno/shared`.
3. Only records absent from the server response are pushed back (avoids redundant POSTs on every load).
4. During active play, stats and state are pushed fire-and-forget after each word.

---

## Key Files & Directories

### Shared Domain (`packages/shared/src/`)

- `scoring.ts`: Pure Finnish word scoring and pangram detection.
- `hint-data.ts`: Pure hint-data derivation from word lists.
- `stats.ts`: `StatsRecord` type (per-puzzle: rank, score, longest_word, pangrams_found, words_found); `updateStatsRecord`, `computeStreak`, `computeRankDistribution`, `computeAverageCompletion`.
- `sync-merge.ts`: `mergeStatsRecord` and `mergePuzzleState` — conflict-free merge rules (best rank, highest score, longer word, max pangrams).
- `kotus.ts`: Kotus dictionary URL builder for word definition links.
- `platform/types.ts`: Platform service interfaces (storage, crypto, share, etc.).

### Web Frontend (`packages/web/src/`)

- `store/useGameStore.ts`: **Source of Truth** for web game state.
- `store/useAuthStore.ts`: Player auth, sync pull/push, transfer token flow.
- `hooks/useMidnightRollover.ts`: Manages the transition between daily puzzles (browser reload).
- `components/Honeycomb/`: The visual heart of the web game.
- `components/ArchiveModal.tsx`: Current-cycle puzzle archive browser and reveal flow.
- `components/StatsModal.tsx`: Player statistics and history display.
- `components/admin/Stats.tsx`: Admin usage stats with unique-player and raw-event modes.
- `components/admin/WordData.tsx`: Separate Sanadata page for failed guesses and word-find analytics.
- `components/admin/WordFinds.tsx`: Per-puzzle successful word-find counts, found-first by default with a hardest-first tuning mode.

### Backend (`server/`)

- `index.ts`: API entry point — all routes and middleware mounted here; full endpoint list in header comment. `GET /api/health` also reports `total_puzzles` and `days_remaining` for rotation alerting.
- `puzzle-engine.ts`: **Core Logic** for puzzle rotation and word-list generation. Owns the slot/display-number split (see below), `nextFreeSlot()` for appends, and `getDaysRemainingInCycle()`.
- `routes/puzzle.ts`: `GET /api/puzzle`, `GET /api/puzzle/:number`, `GET /api/puzzle/:number/words`. Direct `:number` values are exact active slot IDs; out-of-range and soft-deleted slots return 404. Words are blocked for the current active puzzle slot.
- `routes/archive.ts`: `GET /api/archive` — last 7 days; `?all=true` walks the current active-puzzle calendar cycle by cycle _position_, not slot number.
- `routes/player-sync.ts`: `GET /api/player/sync`, `POST /api/player/sync/stats`, `POST /api/player/sync/state`.
- `routes/admin.ts`: Admin dashboard endpoints (requires session auth).
- `routes/failed-guess.ts`: `POST /api/failed-guess`.
- `routes/word-find.ts`: `POST /api/word-find`; admin reads aggregate counts through `GET /api/admin/word-finds`.
- `auth/`: Admin session middleware and routes (cookie-based, CSRF-protected).
- `player-auth/`: Player identity middleware and routes (Bearer token-based).
- `email/`: Transactional email helpers (e.g. `send-transfer-link.ts` for the device-pairing email).
- `db/schema.sql`: Baseline structure a fresh database is created from (puzzles, player_stats, player_puzzle_states, achievements, failed_guesses, config).
- `db/migrations/`: Ordered, versioned migrations that bring an existing database up to the baseline. Applied automatically at startup; tracked in `schema_migrations`. See `server/CLAUDE.md` for the two-edit rule.
- `db/connection.ts`: `getDb()` helper — opens the SQLite file, enables WAL, applies `schema.sql`, then runs pending migrations.

### Testing (`tests/`)

- `tests/`: Vitest unit tests for shared logic and API routes.
- `tests/integration/`: Vitest integration tests — real Hono app with
  in-memory SQLite, and the real web stores. Test names are the behaviour
  catalog.
- `tests/e2e/`: Playwright specs for the full web user journey.

---

## Puzzle Numbering

Two numbers identify a puzzle, and they are not interchangeable:

- **`slot`** (`puzzle_number` in API responses) — the permanent storage key.
  Soft-deleted puzzles keep their slot forever, so saved progress
  (`sanakenno_state_N`), `player_stats`, `word_finds`, and `revealed_N` flags
  stay addressable. New puzzles append at `nextFreeSlot()`, never at the
  active count.
- **`display_number`** — the 1-based position among _active_ puzzles, and the
  only number ever shown to a player or admin. Soft-deleting a puzzle closes
  the gap, so every later puzzle's display number drops by one.

`total_puzzles` counts active puzzles only. Anything deriving a cycle position
must use the index within `getActiveSlots()`; slot arithmetic silently drifts
once the rotation has gaps.

Duplicate protection lives in `routes/admin.ts`: letters are compared as a
sorted key, so letter order never distinguishes two puzzles. Same letters _and_
centre is refused outright; same letters with a different centre is allowed
behind a force confirmation that reports how recently those letters ran.

## Environment & Deployment

- **Helsinki Time**: The game strictly follows `Europe/Helsinki` for puzzle rotation.
- **Auth layers**: Admin — cookie session (`/api/admin/*`, `/api/auth/*`). Player — Bearer token (`/api/player/*`). Public — no auth.
- **Revealed flag**: `revealed_N` in localStorage (local-only, not synced) marks a puzzle whose answers have been viewed; stats updates are frozen for that puzzle number.
- **Backups**: The SQLite database is backed up off-box to Backblaze S3 by the shared backup service that runs alongside `erez.ac` (see `~/Projects/web_kontissa`). No backup logic lives in this repo.
