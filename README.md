# Sanakenno

Finnish Spelling Bee word game — standalone port from [erez.ac](https://erez.ac/sanakenno).

Find words from 7 letters. Every word must contain the center letter. Pangrams (using all 7) earn a bonus. New puzzle daily.

## Status

**Phase 3 — React Game Core.** The playable game UI is under construction.

Completed:
- Project scaffold, CI pipeline (GitHub Actions)
- SQLite database, data migration from web_kontissa
- Puzzle engine with runtime word filtering, SHA-256 hashing, in-memory cache
- Hono API: `GET /api/puzzle`, `GET /api/puzzle/:n`, `POST /api/achievement`
- Full TypeScript migration (strict mode, no `any`)
- React components: Honeycomb grid, word input, found words, rank progress, rules modal, error state, theme toggle, celebrations
- Zustand game store with localStorage persistence
- Game timer, midnight rollover, keyboard handler

Coming next:
- BDD step definitions for Phase 3 features
- Phase 4: Hints, celebrations polish, share functionality
- Phase 5: PWA + Docker deployment
- Phase 6: Admin authentication + puzzle management tool

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Frontend | React 19, Vite, Zustand, Tailwind CSS 4 |
| Backend | Hono (Node.js via tsx) |
| Storage | SQLite (better-sqlite3) |
| Testing | Vitest, Cucumber.js, Playwright |
| PWA | vite-plugin-pwa (planned) |

## Commands

```
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run test:unit    # Vitest unit tests
npm run test:bdd     # Cucumber.js BDD specs
npm run lint         # ESLint + Prettier check
```

## Feature specs

The `features/` directory contains Gherkin specs defining all game behaviour.

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

See [PLAN.md](PLAN.md) for architecture, phasing, and design decisions.
