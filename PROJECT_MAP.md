# Sanakenno — Project Map

This document provides a high-level overview of the project's architecture and data flow to help AI agents navigate the codebase efficiently.

## Core Architecture

Sanakenno is a standalone word-puzzle game built with a React frontend and a Hono (Node.js) backend.

### Data Flow: User Finding a Word

1. **Input**: User types in `src/components/WordInput.tsx`.
2. **Action**: `WordInput` calls `addWord` in `src/store/useGameStore.ts`.
3. **Logic**: `useGameStore` uses `src/utils/scoring.ts` to calculate points and validate word length/letters.
4. **State**: `useGameStore` updates `foundWords` and `score`.
5. **Persistence**: `useGameStore` automatically syncs state to `localStorage` via `src/utils/storage.ts`.
6. **Feedback**: `src/components/MessageBar.tsx` displays success/error messages.

### Data Flow: Daily Puzzle Fetching

1. **Request**: Frontend calls `GET /api/puzzle` on mount (or at midnight).
2. **Route**: `server/routes/puzzle.ts` handles the request.
3. **Engine**: `server/puzzle-engine.ts` calculates which puzzle to serve based on Helsinki time.
4. **Database**: Puzzles are fetched from SQLite via `server/db/connection.ts`.
5. **Response**: JSON including letters, center letter, and pre-computed `hint_data`.

## Key Files & Directories

### Frontend (`src/`)

- `store/useGameStore.ts`: **Source of Truth** for game state.
- `hooks/useMidnightRollover.ts`: Manages the transition between daily puzzles.
- `utils/scoring.ts`: Pure logic for Finnish word scoring and pangram detection.
- `utils/stats.ts`: Pure stat computation (streaks, rank distribution, completion).
- `utils/kotus.ts`: Kotus dictionary URL builder for word definition links.
- `components/Honeycomb/`: The visual heart of the game.
- `components/ArchiveModal.tsx`: 7-day puzzle archive browser.
- `components/StatsModal.tsx`: Player statistics and history display.

### Backend (`server/`)

- `index.ts`: API entry point and middleware configuration.
- `puzzle-engine.ts`: **Core Logic** for puzzle rotation and hint generation.
- `routes/archive.ts`: 7-day puzzle metadata endpoint for the archive modal.
- `db/schema.sql`: Database structure (Puzzles, Stats, Admin).

### Testing (`features/` & `tests/`)

- `features/*.feature`: **Acceptance Criteria** for every feature.
- `features/step-definitions/`: Integration tests for the backend logic.
- `tests/e2e/`: Playwright specs for the full user journey.

## State Management (Zustand)

- **Selectivity**: Always use specific selectors: `const score = useGameStore(s => s.score)`.
- **Actions**: Destructure actions for stability: `const { addWord } = useGameStore()`.

## Environment & Deployment

- **Helsinki Time**: The game strictly follows `Europe/Helsinki` for puzzle rotation.
- **Admin**: Admin features are behind `/api/admin/*` and require session-based auth.
