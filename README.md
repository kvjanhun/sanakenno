# Sanakenno

Finnish Spelling Bee word game — find words from 7 letters, every word must contain the center letter, pangrams (using all 7) earn a bonus. New puzzle daily.

**Live at [sanakenno.fi](https://sanakenno.fi)**

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Web Frontend | React 19, Vite, Zustand, Tailwind CSS 4 |
| Mobile App | Expo 55, React Native 0.83, Zustand, MMKV (paused) |
| Shared Domain | `packages/shared` — pure game logic, types, platform interfaces |
| Backend | Hono (Node.js via tsx) |
| Storage | SQLite (better-sqlite3) |
| Testing | Vitest, Cucumber.js (BDD), Playwright (E2E) |
| PWA | vite-plugin-pwa |
| Deployment | Docker, nginx |

## Commands

```
pnpm install         # Install dependencies
pnpm run dev         # Start dev server (Vite + Hono)
pnpm run build       # Production build
pnpm run typecheck   # TypeScript check
pnpm run test:unit   # Vitest unit tests
pnpm run test:bdd    # Cucumber.js BDD specs
pnpm run test:e2e    # Playwright E2E tests (dev server required)
pnpm run lint        # ESLint + Prettier check
```

### Pangram Review Pipeline

Admin suggestions use `server/data/pangram-quality.json` for curated pangram
quality metadata. To classify the remaining valid candidate games with an LLM,
put the key in an untracked root `.env.local` file:

```bash
OPENAI_API_KEY=sk-...
```

Then run:

```bash
pnpm run review:export      # writes private candidates to tmp/pangram-review/
pnpm run review:make-pilot  # grouped gpt-5.4 stratified canary batch
pnpm run review:submit      # uploads the currently generated batch
pnpm run review:status      # check completion
pnpm run review:download    # downloads results
pnpm run review:parse       # validates structured output
pnpm run review:audit       # summarizes low-confidence/disagreement cases
pnpm run review:make-batch  # full uncurated batch, after pilot quality is good
pnpm run review:submit
pnpm run review:status
pnpm run review:download
pnpm run review:parse
pnpm run review:audit
pnpm run review:promote -- --min-confidence=medium --dry-run
```

Remove `--dry-run` to merge accepted new grades after a full batch. Existing
hand-curated grades are preserved unless `--overwrite-curated` is passed. Pilot
results cannot be promoted unless `--allow-sample` is passed explicitly. Files
under `tmp/pangram-review/` include pangram words and must stay local.

The review batch is grouped by identical 7-letter pangram set. One LLM grade is
expanded back to every center-letter key in the group, so the same pangrams do
not get inconsistent grades for different centers.

## Feature specs

All behaviour is defined in Gherkin specs under `features/`. The BDD suite runs against the real Hono server; E2E tests tagged `@e2e` run in Playwright with a mocked API.

| Feature | What it covers |
|---|---|
| [scoring](features/scoring.feature) | Point values, pangram bonus ("Pangrammi!"), score accumulation |
| [word-validation](features/word-validation.feature) | Rejection rules, SHA-256 hash checking, input normalisation, failed-guess reporting |
| [ranks](features/ranks.feature) | 7 rank thresholds, progress bar, celebrations |
| [puzzle](features/puzzle.feature) | Daily rotation, puzzle structure, midnight rollover |
| [hints](features/hints.feature) | 4 unlockable hint panels, persistence, collapse state |
| [interaction](features/interaction.feature) | Keyboard/tap input, honeycomb, found words, share |
| [timer](features/timer.feature) | Elapsed time tracking, pause on tab hidden/blur |
| [persistence](features/persistence.feature) | localStorage per-puzzle, validation on reload |
| [achievements](features/achievements.feature) | Server-side rank recording, session dedup |
| [api](features/api.feature) | Hono endpoints, response shape, rate limiting, failed-guess and word-find recording |
| [settings](features/settings.feature) | Theme preference, haptics intensity levels (mobile) |
| [navigation](features/navigation.feature) | Stack navigator, archive/stats/rules/settings screens (mobile) |
| [theme](features/theme.feature) | Light/dark mode toggle, system preference |
| [error-handling](features/error-handling.feature) | Network errors, corrupt data, storage limits |
| [accessibility](features/accessibility.feature) | Keyboard behaviour, touch quirks, safe areas |
| [pwa](features/pwa.feature) | Installability, service worker strategies, iOS quirks |
| [infrastructure](features/infrastructure.feature) | Docker, nginx, health checks |
| [auth](features/auth.feature) | Admin authentication (cookie sessions, CSRF, CLI-provisioned account) |
| [player-auth](features/player-auth.feature) | Silent player init, pairing-code device pairing, key rotation |
| [admin](features/admin.feature) | Puzzle CRUD, blocked words, schedule, analytics |
| [archive](features/archive.feature) | 7-day puzzle archive, score+rank per day, replay past puzzles |
| [definitions](features/definitions.feature) | Word definitions via Kotus dictionary links |
| [stats](features/stats.feature) | Player statistics, streaks, rank distribution |
| [sync](features/sync.feature) | Cross-device stats and puzzle-state sync (offline-safe, fire-and-forget) |
| [server-errors](features/server-errors.feature) | API error responses, structured error logging |

## Deployment

Runs as a Docker container on a NUC server behind nginx. CI (GitHub Actions) runs the full test suite on every push; a webhook triggers the deploy script on merge to main.

The Hono server serves the API (`/api/*`) and the built React frontend is served as static files from `/var/www/sanakenno/dist/` by nginx. SQLite is replicated continuously to Backblaze B2 via Litestream.
