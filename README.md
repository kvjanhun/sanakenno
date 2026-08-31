# Sanakenno

Finnish Spelling Bee word game — find words from 7 letters, every word must contain the center letter, pangrams (using all 7) earn a bonus. New puzzle daily.

**Live at [sanakenno.fi](https://sanakenno.fi)**

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Web Frontend | React 19, Vite, Zustand, Tailwind CSS 4 |
| Shared Domain | `packages/shared` — pure game logic, types, platform interfaces |
| Backend | Hono (Node.js via tsx) |
| Storage | SQLite (better-sqlite3) |
| Testing | Vitest (unit + integration), Playwright (E2E) |
| PWA | vite-plugin-pwa |
| Deployment | Docker, nginx |

## Commands

```
pnpm install         # Install dependencies
pnpm run dev         # Start dev server (Vite + Hono)
pnpm run build       # Production build
pnpm run typecheck   # TypeScript check
pnpm run test:unit   # Vitest unit + integration tests
pnpm run test:coverage # Vitest coverage thresholds
pnpm run test:e2e    # Playwright E2E tests (dev server required)
pnpm run test:pwa:built # Production-preview PWA tests after build
pnpm run lint        # ESLint + Prettier check
```

## Development Rules

Shared project and agent instructions live in [AGENTS.md](AGENTS.md). Scoped
implementation rules live near the relevant code in
`packages/web/src/CLAUDE.md` and `server/CLAUDE.md`.

### Pangram Review Pipeline

Admin suggestions use `server/assets/pangram-quality.json` for curated pangram
quality metadata. The private LLM review workflow, prompt principles, and
reproduction steps are documented in
[`docs/pangram-review.md`](docs/pangram-review.md). Files under
`tmp/pangram-review/` include spoiler pangram words and must stay local.

## Testing

Behaviour is encoded directly as tests; descriptive test names are the
behaviour catalog.

- `tests/` — Vitest unit tests for shared logic and server modules.
- `tests/integration/` — Vitest integration tests against the real Hono app
  (in-memory SQLite) and the real web stores.
- `tests/e2e/` — Playwright specs for browser behaviour.
- `tests/pwa/` + `pnpm run test:pwa:built` — PWA behaviour against the
  production build.

## Deployment

Runs as a Docker container on a NUC server behind nginx. CI (GitHub Actions) runs the full test suite on every push; a webhook triggers the deploy script on merge to main.

The Hono server serves the API (`/api/*`) and the built React frontend is served as static files from `/var/www/sanakenno/dist/` by nginx. SQLite is replicated continuously to Backblaze B2 via Litestream.
