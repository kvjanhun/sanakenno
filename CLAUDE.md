# Sanakenno - Project Rules

## What This Is

Sanakenno is a Finnish word-puzzle game with a web app and a Hono backend
using SQLite. The production site is live at **sanakenno.fi**.

Native app code remains in the repo as a reference surface, but mobile
development and publishing are paused.

For scoped implementation rules, also read:

- [packages/web/src/CLAUDE.md](packages/web/src/CLAUDE.md) for web frontend rules.
- [packages/mobile/CLAUDE.md](packages/mobile/CLAUDE.md) for mobile rules.
- [server/CLAUDE.md](server/CLAUDE.md) for backend rules.

## Tech Stack

| Layer | Tech |
| --- | --- |
| Web frontend | React 19, Vite, Zustand, Tailwind CSS 4 |
| Mobile app | Expo 55, React Native 0.83, Zustand, MMKV (paused reference surface) |
| Shared domain | `packages/shared` - pure game logic, types, platform interfaces |
| Backend | Hono on Node.js via `tsx` |
| Storage | SQLite with `better-sqlite3` |
| Testing | Vitest, Cucumber.js BDD, Playwright E2E |
| PWA | `vite-plugin-pwa` |
| Monorepo | pnpm workspace and Turborepo |

## BDD-First Development

Feature files in `features/` are the source of truth for product behaviour.

- New features: write or update the `.feature` file first, get it agreed, then
  implement.
- Behaviour changes: update the matching `.feature` file in the same commit as
  the code change.
- Do not ship code whose behaviour contradicts or is absent from the feature
  files.
- Step definitions test pure logic in a Vitest-compatible shape. Browser
  behaviour belongs in E2E specs under `tests/e2e/`.

## Git Discipline

- Keep commits to one logical unit of work.
- Use Conventional Commit subjects in the imperative mood.
- Before committing to `main`, the relevant checks must pass in CI order:
  typecheck, lint, unit, BDD, E2E, build.
- Never commit broken or intentionally incomplete code to `main`; use a feature
  branch for incomplete work.

## Workspace

This is a pnpm monorepo. Shared game logic lives in `packages/shared` and is
imported as `@sanakenno/shared`.

Prefer existing package boundaries:

- UI and browser state in `packages/web`.
- Pure game rules and shared types in `packages/shared`.
- API routes, auth, persistence, and operational scripts in `server`.
- Mobile code only when explicitly working on the paused native surface.

## Versioning

Each deployable target has its own independent version. Do not bump one target
when only another target changed.

| Package | Version source | Notes |
| --- | --- | --- |
| Web and server | `package.json` and `packages/web/package.json` | Synced by `scripts/sync-versions.js` |
| Shared | `packages/shared/package.json` | Synced with web automatically |
| Mobile iOS | `packages/mobile/package.json` | Independent; also reflected in `app.json` through `app.config.js` |

### Web, Server, and Shared

Use the changesets workflow:

```sh
pnpm run version:changeset
pnpm run version:bump
```

### Mobile

Bump `packages/mobile/package.json` directly only when mobile changes are in
scope:

```sh
cd packages/mobile
npm version patch
npm version minor
npm version major
```

The mobile runtime version is reflected into `app.json` by `app.config.js`.

### Semver Guide

- Patch: bug fixes, copy changes, minor UI tweaks.
- Minor: new features, new screens, notable UX changes.
- Major: breaking changes, major redesigns, first stable release.

## CI Pipelines

Two GitHub Actions workflows handle web/server and mobile independently.

| Workflow | File | Triggers on | What it does |
| --- | --- | --- | --- |
| Web and server | `ci-web.yml` | Any push or PR except `packages/mobile/**` and `patches/**` | typecheck except mobile, lint, unit, BDD, E2E, build, deploy |
| Mobile iOS | `ci-mobile.yml` | Pushes or PRs touching `packages/mobile/**`, `patches/**`, or `pnpm-lock.yaml` | typecheck mobile and shared, lint |

Typecheck uses Turborepo for workspace packages in dependency order
(`shared` before `web` or `mobile`). The root package is the server and is not a
Turbo workspace package, so it is checked separately.

- `pnpm run typecheck` checks the server/root package.
- `pnpm turbo run typecheck --filter=!@sanakenno/mobile` checks shared and web.
- `pnpm turbo run typecheck --filter=@sanakenno/mobile` checks shared and mobile.

When native development resumes and Android becomes active, add a matching
Android CI workflow.

## Commands

```sh
pnpm install                              # install dependencies
pnpm run dev                              # start Vite + API; Vite uses :5173 and proxies to :3001
pnpm run typecheck                        # typecheck server/root package
pnpm turbo run typecheck                  # typecheck all workspace packages
pnpm turbo run typecheck --filter=<pkg>   # typecheck one package and its deps
pnpm run lint                             # ESLint + Prettier check
pnpm run test:unit                        # Vitest
pnpm run test:bdd                         # Cucumber.js
pnpm run test:e2e                         # Playwright E2E; requires dev server
pnpm run build                            # production build
```

Do not start a dev server unless the task requires it. If a server is needed,
prefer the standard ports already used by the project.

## Workflow Skills

Project workflow skills may be agent-local and are not guaranteed to be tracked
in this repository. When the named skill is available, use it. Otherwise, follow
the same workflow manually.

| Workflow | When |
| --- | --- |
| `bdd-feature` | Behaviour changes: update feature specs first, then implementation and step definitions. |
| `bump-version` | After implemented and tested changes: create the correct web/server/shared changeset or mobile version bump. |
| `pre-push` | Before push or PR: run the local CI gauntlet matching the changed surface. |
| `verify-locally` | After checks pass: inspect the real local web/API surfaces or produce manual mobile verification steps. |
| `commit` | For standalone commits: create an atomic local Conventional Commit with a co-author trailer; never push. |
| `ship-feature` | For full feature work: chain BDD, implementation, checks, local verification, version bump, and commit. |

## Documentation Upkeep

- Keep `README.md`, `AGENTS.md`/`CLAUDE.md`, and scoped package guides in sync
  when stack, CI, commands, or workflow rules change.
- Use `AGENTS.md` as the canonical cross-agent project guide. It is tracked as
  the standard entry point for non-Claude agents.
- Keep scoped implementation rules near the code they govern.
