---
name: release-and-version
description: Bump and sync Sanakenno versions safely. Use when preparing a release, doing patch/minor/major bumps, creating changesets, updating changelogs, or versioning web and mobile together without breaking the repo's split versioning rules.
---

# Release And Version

Follow the repo's split versioning model exactly.

## Version Rules

- Web, root, and shared move together.
- Mobile is independent.
- `@sanakenno/mobile` is ignored by changesets.
- `pnpm run version:bump` syncs `packages/web/package.json` into root `package.json` and `packages/shared/package.json`.

## Workflow

1. Determine the scope:
   - web/root/shared only
   - mobile only
   - both
2. For web/root/shared:
   - create a changeset for `@sanakenno/web`
   - run `pnpm run version:bump`
3. For mobile:
   - bump `packages/mobile/package.json` directly
   - `packages/mobile/app.config.js` reads that version automatically
4. Review generated changelog and version file changes before committing.
5. Run the pre-push routine before commit or push.
6. Commit version changes together with the code they describe unless the user asks otherwise.

## Commands

- Create changeset: `pnpm run version:changeset`
- Apply web/root/shared bump: `pnpm run version:bump`
- Mobile patch example: update `packages/mobile/package.json` from `0.5.1` to `0.5.2`

## Guardrails

- Do not bump mobile through changesets.
- Do not bump web/root/shared by editing all three files manually unless the repo workflow is broken and the user wants that explicitly.
- If the user asks to push, run the `before-push` routine first.
