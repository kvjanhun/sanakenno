# Sanakenno

Finnish Spelling Bee word game — find words from 7 letters, every word must contain the center letter, pangrams (using all 7) earn a bonus. New puzzle daily.

**Live at [sanakenno.fi](https://sanakenno.fi)**

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Frontend | React 19, Vite, Zustand, Tailwind CSS 4 |
| Backend | Hono (Node.js via tsx) |
| Storage | SQLite (better-sqlite3) |
| Testing | Vitest, Cucumber.js (BDD), Playwright (E2E) |
| PWA | vite-plugin-pwa |
| Deployment | Docker, nginx |

## Commands

```
npm install          # Install dependencies
npm run dev          # Start dev server (Vite + Hono)
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run test:unit    # Vitest unit tests
npm run test:bdd     # Cucumber.js BDD specs
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint + Prettier check
```

## Feature specs

All behaviour is defined in Gherkin specs under `features/`. The BDD suite runs against the real Hono server; E2E tests tagged `@e2e` run in Playwright with a mocked API.

| Feature | What it covers |
|---|---|
| [scoring](features/scoring.feature) | Point values, pangram bonus, score accumulation |
| [word-validation](features/word-validation.feature) | Rejection rules, SHA-256 hash checking, input normalisation |
| [ranks](features/ranks.feature) | 7 rank thresholds, progress bar, celebrations |
| [puzzle](features/puzzle.feature) | Daily rotation, puzzle structure, midnight rollover |
| [hints](features/hints.feature) | 4 unlockable hint panels, persistence, collapse state |
| [interaction](features/interaction.feature) | Keyboard/tap input, honeycomb, found words, share |
| [timer](features/timer.feature) | Elapsed time tracking, pause on tab hidden/blur |
| [persistence](features/persistence.feature) | localStorage per-puzzle, validation on reload |
| [achievements](features/achievements.feature) | Server-side rank recording, session dedup |
| [api](features/api.feature) | Hono endpoints, response shape, rate limiting |
| [theme](features/theme.feature) | Light/dark mode toggle, system preference |
| [error-handling](features/error-handling.feature) | Network errors, corrupt data, storage limits |
| [accessibility](features/accessibility.feature) | Keyboard behaviour, touch quirks, safe areas |
| [pwa](features/pwa.feature) | Installability, service worker strategies, iOS quirks |
| [infrastructure](features/infrastructure.feature) | Docker, nginx, health checks |
| [auth](features/auth.feature) | Admin authentication, sessions, CSRF |
| [admin](features/admin.feature) | Puzzle CRUD, blocked words, schedule |
| [archive](features/archive.feature) | 7-day puzzle archive, replay past puzzles |
| [definitions](features/definitions.feature) | Word definitions via Kotus dictionary links |
| [stats](features/stats.feature) | Player statistics, streaks, rank distribution |

## Deployment

Runs as a Docker container on a NUC server behind nginx. CI (GitHub Actions) runs the full test suite on every push; a webhook triggers the deploy script on merge to main.

The Hono server serves the API (`/api/*`) and the built React frontend is served as static files from `/var/www/sanakenno/dist/` by nginx. SQLite is replicated continuously to Backblaze B2 via Litestream.
