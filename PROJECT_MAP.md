# Sanakenno — Project Map

This document provides a high-level overview of the project's architecture and data flow to help AI agents navigate the codebase efficiently.

## Core Architecture

Sanakenno is a word-puzzle game with a web app, a native iOS/Android app, and a Hono (Node.js) backend.  A pnpm workspace ties them together:

```
sanakenno/
  packages/
    shared/   # Pure domain logic, types, platform interfaces (@sanakenno/shared)
    web/      # React 19 + Vite PWA frontend
    mobile/   # Expo 55 / React Native app (iOS-first)
  server/     # Hono API server
  features/   # BDD specs (source of truth for behaviour)
```

### Data Flow: User Finding a Word

1. **Input**: User types in `packages/web/src/components/WordInput.tsx` (web) or taps Honeycomb/keyboard in `packages/mobile/src/components/` (mobile).
2. **Action**: Calls `addWord`/`addLetter` in the platform's `useGameStore.ts`.
3. **Logic**: Store uses `@sanakenno/shared` (`scoreWord`, `recalcScore`) to calculate points and validate.
4. **State**: Store updates `foundWords` and `score`.
5. **Persistence**: Web syncs to `localStorage`; mobile syncs to MMKV.
6. **Feedback**: `MessageBar` (web) / in-store `message` state (mobile) shows success/error messages.
7. **Failed guesses**: After an "Ei sanakirjassa" rejection, both clients fire-and-forget a `POST /api/failed-guess` to record the attempt.

### Data Flow: Daily Puzzle Fetching

1. **Request**: Frontend calls `GET /api/puzzle` on mount (or at midnight).
2. **Route**: `server/routes/puzzle.ts` handles the request.
3. **Engine**: `server/puzzle-engine.ts` calculates which puzzle to serve based on Helsinki time.
4. **Database**: Puzzles are fetched from SQLite via `server/db/connection.ts`.
5. **Response**: JSON including letters, center letter, and pre-computed `hint_data`.

## Key Files & Directories

### Shared Domain (`packages/shared/src/`)

- `scoring.ts`: Pure Finnish word scoring and pangram detection.
- `hint-data.ts`: Pure hint-data derivation from word lists.
- `stats.ts`: Pure stat computation (streaks, rank distribution, completion).
- `kotus.ts`: Kotus dictionary URL builder for word definition links.
- `platform/types.ts`: Platform service interfaces (storage, crypto, share, etc.).

### Web Frontend (`packages/web/src/`)

- `store/useGameStore.ts`: **Source of Truth** for web game state.
- `hooks/useMidnightRollover.ts`: Manages the transition between daily puzzles (browser reload).
- `components/Honeycomb/`: The visual heart of the web game.
- `components/ArchiveModal.tsx`: 7-day puzzle archive browser.
- `components/StatsModal.tsx`: Player statistics and history display.

### Mobile App (`packages/mobile/`)

- `app/_layout.tsx`: Root layout — theme propagation, SplashScreen control, JS overlay.
- `app/(tabs)/index.tsx`: Main game screen.
- `app/(tabs)/archive.tsx`: Archive screen showing past puzzles + score/rank.
- `app/(tabs)/settings.tsx`: Settings screen (theme + haptics intensity).
- `src/store/useGameStore.ts`: Mobile game state (Zustand + MMKV).
- `src/store/useSettingsStore.ts`: Theme preference and haptics intensity (`off/light/medium/heavy`).
- `src/components/Honeycomb.tsx`: SVG honeycomb using react-native-svg + Reanimated.
- `src/components/FoundWords.tsx`: Found words pill row + bottom sheet.
- `src/components/RankProgress.tsx`: Rank chip + animated progress bar.
- `src/hooks/useMidnightRollover.ts`: Single-shot setTimeout — refetches if date changed.
- `modules/prepared-haptics/`: Custom Expo module for intensity-capped haptics.

### Backend (`server/`)

- `index.ts`: API entry point and middleware configuration.
- `puzzle-engine.ts`: **Core Logic** for puzzle rotation and hint generation.
- `routes/archive.ts`: 7-day puzzle metadata endpoint (includes `max_score` per day).
- `routes/failed-guess.ts`: `POST /api/failed-guess` — records non-dictionary guesses.
- `db/schema.sql`: Database structure (puzzles, achievements, failed_guesses, config).

### Testing (`features/` & `tests/`)

- `features/*.feature`: **Acceptance Criteria** for every feature.
- `features/step-definitions/`: Integration tests for backend and domain logic.
- `tests/e2e/`: Playwright specs for the full user journey (web).

## State Management (Zustand)

- **Selectivity**: Always use specific selectors: `const score = useGameStore(s => s.score)`.
- **Actions**: Destructure actions for stability: `const { addWord } = useGameStore()`.

## Environment & Deployment

- **Helsinki Time**: The game strictly follows `Europe/Helsinki` for puzzle rotation.
- **Admin**: Admin features are behind `/api/admin/*` and require session-based auth.
- **Mobile**: Uses MMKV for persistence and Expo SDK 55. iOS-first; Android is a later phase.
