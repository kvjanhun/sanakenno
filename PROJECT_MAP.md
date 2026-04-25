# Sanakenno — Project Map

This document provides a high-level overview of the project's architecture and data flow to help AI agents navigate the codebase efficiently.

## Core Architecture

Sanakenno is a word-puzzle game with a web app, a native iOS/Android app, and a Hono (Node.js) backend. A pnpm workspace ties them together:

```
sanakenno/
  packages/
    shared/   # Pure domain logic, types, platform interfaces (@sanakenno/shared)
    web/      # React 19 + Vite PWA frontend
    mobile/   # Expo / React Native app (iOS-first)
  server/     # Hono API server
  features/   # BDD specs (source of truth for behaviour)
```

Current versions: see the package.json files for each deployable target.

---

## Data Flows

### User Finding a Word

1. **Input**: User types in `packages/web/src/components/WordInput.tsx` (web) or taps Honeycomb/keyboard in `packages/mobile/src/components/` (mobile).
2. **Action**: Calls `submitWord` in the platform's `useGameStore.ts`.
3. **Logic**: Store uses `@sanakenno/shared` (`scoreWord`, `recalcScore`) to calculate points and validate.
4. **State**: Store updates `foundWords`, `score`, `longestWord`, and `pangramsFound`.
5. **Persistence**: Web syncs to `localStorage`; mobile syncs to MMKV.
6. **Stats**: `updateStatsRecord` (shared) updates the per-puzzle `StatsRecord` (rank, score, longest_word, pangrams_found). Skipped if the puzzle's `revealed_N` flag is set.
7. **Sync**: If logged in, fires `POST /api/player/sync/stats` and `POST /api/player/sync/state` (fire-and-forget).
8. **Feedback**: `MessageBar` (web) / in-store `message` state (mobile) shows success/error messages.
9. **Failed guesses**: After an "Ei sanakirjassa" rejection, both clients fire-and-forget `POST /api/failed-guess`.

### Daily Puzzle Fetching

1. **Request**: Frontend calls `GET /api/puzzle` on mount (or at midnight).
2. **Route**: `server/routes/puzzle.ts` handles the request.
3. **Engine**: `server/puzzle-engine.ts` calculates which puzzle to serve based on Helsinki time.
4. **Database**: Puzzles are fetched from SQLite via `server/db/connection.ts`.
5. **Response**: JSON including letters, center letter, and pre-computed `hint_data`.

### Archive & Word List (mobile)

1. Mobile archive screen fetches `GET /api/archive?all=true` — returns all past puzzle slots.
2. Today's card is pinned above a scrollable `FlatList` of past entries.
3. Tapping a past card shows a bottom sheet: **Pelaa** (loads puzzle, navigates back) or **Näytä vastaukset** (navigates to `puzzle-words` screen).
4. `puzzle-words` screen: sets `revealed_N = 'true'` in MMKV, fetches `GET /api/puzzle/:number/words`, displays found vs missed words. Once revealed, stats updates are frozen for that puzzle.

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
- `components/ArchiveModal.tsx`: 7-day puzzle archive browser.
- `components/StatsModal.tsx`: Player statistics and history display.

### Mobile App (`packages/mobile/`)

- `app/_layout.tsx`: Root Stack — declares all screens including modals.
- `app/(tabs)/index.tsx`: Main game screen.
- `app/(tabs)/archive.tsx`: Archive screen — today's card pinned, all past puzzles in FlatList, bottom sheet for play/reveal choice.
- `app/(tabs)/stats.tsx`: Stats screen — per-puzzle history + lifetime totals (longest word, total words, total pangrams).
- `app/(tabs)/settings.tsx`: Theme + haptics settings.
- `app/puzzle-words.tsx`: Word list for a past puzzle — found words highlighted, missed shown muted; sets revealed flag on first view.
- `src/store/useGameStore.ts`: Mobile game state (Zustand + MMKV); tracks `longestWord` and `pangramsFound`; guards stats updates via `revealed_N` flag.
- `src/store/useAuthStore.ts`: Player auth and sync (mirrors web).
- `src/store/useSettingsStore.ts`: Theme preference and haptics intensity.
- `src/components/Honeycomb.tsx`: SVG honeycomb using react-native-svg + Reanimated.
- `src/components/HintPanel.tsx`: Hint tabs — tapping active tab hides the panel; height reserved when hidden.
- `src/components/FoundWords.tsx`: Found words pill row + bottom sheet.
- `src/components/RankProgress.tsx`: Rank chip + animated progress bar.
- `src/hooks/useMidnightRollover.ts`: Single-shot setTimeout — refetches if date changed.
- `modules/prepared-haptics/`: Custom Expo module for intensity-capped haptics.

### Backend (`server/`)

- `index.ts`: API entry point — all routes and middleware mounted here; full endpoint list in header comment.
- `puzzle-engine.ts`: **Core Logic** for puzzle rotation and word-list generation.
- `routes/puzzle.ts`: `GET /api/puzzle`, `GET /api/puzzle/:number`, `GET /api/puzzle/:number/words` (words blocked for active puzzle slot).
- `routes/archive.ts`: `GET /api/archive` — last 7 days; `?all=true` returns all past slots.
- `routes/player-sync.ts`: `GET /api/player/sync`, `POST /api/player/sync/stats`, `POST /api/player/sync/state`.
- `routes/admin.ts`: Admin dashboard endpoints (requires session auth).
- `routes/failed-guess.ts`: `POST /api/failed-guess`.
- `auth/`: Admin session middleware and routes (cookie-based, CSRF-protected).
- `player-auth/`: Player identity middleware and routes (Bearer token-based).
- `db/schema.sql`: Database structure (puzzles, player_stats, player_puzzle_states, achievements, failed_guesses, config).
- `db/connection.ts`: `getDb()` helper — opens the SQLite file, enables WAL, and applies `schema.sql`.

### Testing (`features/` & `tests/`)

- `features/*.feature`: **Acceptance Criteria** — source of truth for every feature.
- `features/step-definitions/`: Integration step definitions (hit real in-memory SQLite).
- `tests/`: Vitest unit tests for shared logic and API routes.
- `tests/e2e/`: Playwright specs for the full web user journey.

---

## Environment & Deployment

- **Helsinki Time**: The game strictly follows `Europe/Helsinki` for puzzle rotation.
- **Auth layers**: Admin — cookie session (`/api/admin/*`, `/api/auth/*`). Player — Bearer token (`/api/player/*`). Public — no auth.
- **Mobile**: MMKV for persistence, iOS-first. Android is a later phase.
- **Revealed flag**: `revealed_N` in MMKV (local-only, not synced) marks a puzzle whose answers have been viewed; stats updates are frozen for that puzzle number.
