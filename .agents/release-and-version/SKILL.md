---
name: release-and-version
description: Bump and sync Sanakenno versions safely. Use when preparing a release, doing patch/minor/major bumps, creating changesets, or updating changelogs without breaking the repo's versioning rules.
---

# Release And Version

Follow the repo's versioning model exactly.

## Version Rules

- Web, root, and shared move together — one version for the whole deployable.
- `pnpm run version:bump` syncs `packages/web/package.json` into root `package.json` and `packages/shared/package.json`.

## Workflow

1. Create a changeset for `@sanakenno/web`.
2. Run `pnpm run version:bump`.
3. Review generated changelog and version file changes before committing.
4. Run the pre-push routine before commit or push.
5. Commit version changes together with the code they describe unless the user asks otherwise.

## Commands

- Create changeset: `pnpm run version:changeset`
- Apply bump: `pnpm run version:bump`

## Guardrails

- Do not bump web/root/shared by editing all three files manually unless the repo workflow is broken and the user wants that explicitly.
- If the user asks to push, run the `before-push` routine first.
