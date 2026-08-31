# Sanakenno - Project Rules

## What This Is

Sanakenno is a Finnish word-puzzle game with a web app (PWA) and a Hono
backend using SQLite. The production site is live at **sanakenno.fi**.

The web app is the only product surface. The former native iOS app was
archived at the `mobile-archive` git tag; do not plan native work.

For scoped implementation rules, also read:

- [packages/web/src/CLAUDE.md](packages/web/src/CLAUDE.md) for web frontend rules.
- [server/CLAUDE.md](server/CLAUDE.md) for backend rules.

## Tech Stack

| Layer | Tech |
| --- | --- |
| Web frontend | React 19, Vite, Zustand, Tailwind CSS 4 |
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

## Versioning

Web, server, and shared move together as one version. Use the changesets
workflow:

```sh
pnpm run version:changeset
pnpm run version:bump
```

`scripts/sync-versions.js` copies the version set by changesets in
`packages/web/package.json` into the root and shared package.json files.

### Semver Guide

- Patch: bug fixes, copy changes, minor UI tweaks.
- Minor: new features, new screens, notable UX changes.
- Major: breaking changes, major redesigns, first stable release.

## CI Pipeline

One GitHub Actions workflow, `ci-web.yml`, runs on every push and PR:
typecheck, lint, unit, BDD, E2E, build, then (on `main` pushes) deploy and
verify.

The deploy job fires the server webhook (which only means "accepted"), then
polls `https://sanakenno.fi/commit.txt` — the source commit stamped into the
image at build time and extracted with the frontend — until it matches the
pushed commit. A green deploy job therefore means the deploy verifiably
landed; a red one means it failed or stalled server-side (see the Telegram
alert). Deploys on `main` are serialised by a workflow concurrency group and
a server-side lock in `server/deploy-sanakenno.sh`.

Typecheck uses Turborepo for workspace packages in dependency order
(`shared` before `web`). The root package is the server and is not a Turbo
workspace package, so it is checked separately.

- `pnpm run typecheck` checks the server/root package.
- `pnpm turbo run typecheck` checks shared and web.

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
| `bump-version` | After implemented and tested changes: create the web/server/shared changeset. |
| `pre-push` | Before push or PR: run the local CI gauntlet matching the changed surface. |
| `verify-locally` | After checks pass: inspect the real local web/API surfaces. |
| `commit` | For standalone commits: create an atomic local Conventional Commit with a co-author trailer; never push. |
| `ship-feature` | For full feature work: chain BDD, implementation, checks, local verification, version bump, and commit. |

## Documentation Upkeep

- Keep `README.md`, `AGENTS.md`/`CLAUDE.md`, and scoped package guides in sync
  when stack, CI, commands, or workflow rules change.
- Use `AGENTS.md` as the canonical cross-agent project guide. It is tracked as
  the standard entry point for non-Claude agents.
- Keep scoped implementation rules near the code they govern.
