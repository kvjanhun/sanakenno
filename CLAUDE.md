# Sanakenno — Project Rules

## What this is
A Finnish word-puzzle game (standalone React + Hono, SQLite). Live at **sanakenno.fi**.
See `src/CLAUDE.md` for frontend rules, `server/CLAUDE.md` for backend rules.

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Zustand, Tailwind 4 |
| Backend | Hono on Node.js (tsx) |
| Storage | SQLite |
| Testing | Vitest · Cucumber.js (BDD) · Playwright (E2E) |
| PWA | vite-plugin-pwa |

## BDD-First Development
Feature files in `features/` are the source of truth for behaviour.

- **New feature**: write or update the `.feature` file first, get it agreed, then implement.
- **Modifying existing behaviour**: update the `.feature` file in the same commit as the code change.
- **Never** ship code whose behaviour contradicts or is absent from the feature files.
- Step definitions test pure logic (Vitest-compatible); browser behaviour goes in E2E specs under `tests/e2e/`.

## Git Discipline
- One logical unit of work per commit. Use the imperative mood.
- All checks must pass before committing to `main`: typecheck → lint → unit → BDD → E2E → build.
- Never commit broken code to `main`; use a feature branch for incomplete work.

## Workspace
pnpm mono-repo with `packages/shared` (pure domain logic, types, platform interfaces).
Shared code is imported as `@sanakenno/shared`.

## Versioning

Each deployable target has its **own independent version**. Do not bump one when only the other changes.

| Package | Version source | Notes |
|---|---|---|
| Web + server (root) | `package.json` + `packages/web/package.json` | Synced by `scripts/sync-versions.js` |
| Shared | `packages/shared/package.json` | Synced with web automatically |
| Mobile (iOS) | `packages/mobile/package.json` | Independent — also reflected in `app.json` via `app.config.js` |

### How to bump versions

**Web / server / shared** (changesets workflow):
```
pnpm run version:changeset   # create a changeset describing the change
pnpm run version:bump         # apply changesets → bumps web, syncs root + shared
```

**Mobile** (manual — bump directly in `packages/mobile/package.json`):
```
cd packages/mobile
npm version patch   # 0.2.4 → 0.2.5 (bug fix, small tweak)
npm version minor   # 0.2.4 → 0.3.0 (new feature)
npm version major   # 0.2.4 → 1.0.0 (breaking / major milestone)
```
This updates both `package.json` and `app.json` is overridden at build time via `app.config.js`.

### Semver guide
- **patch** (0.0.X): bug fixes, copy changes, minor UI tweaks
- **minor** (0.X.0): new features, new screens, notable UX changes
- **major** (X.0.0): breaking changes, major redesigns, first stable release

## Commands
```
pnpm install           install dependencies
pnpm run dev           start dev server + API (localhost:5173 → proxy :3001)
pnpm run typecheck     tsc --noEmit
pnpm run lint          eslint + prettier check
pnpm run test:unit     vitest
pnpm run test:bdd      cucumber.js
pnpm exec playwright test    E2E tests (requires dev server running)
pnpm run build         production build → dist/
```
