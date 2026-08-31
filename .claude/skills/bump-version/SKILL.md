---
name: bump-version
description: Bump the semver version for the current change set after a feature/fix is implemented and tested. Use after implementation + tests pass and before pre-push, or when the user invokes /bump-version. Web + shared + root are versioned together via Changesets. Defaults to patch; suggests minor when the change introduces new user-visible behaviour (new behaviour tests, new screen, new route). Major bumps are rare and always confirmed.
tools: Bash, Read, Write, Edit, Glob, Grep
---

# Bump Version

One versioned target: the web stack — `@sanakenno/web` + `@sanakenno/shared` +
root `package.json` move together via Changesets (`fixed` group).

## Level

| Level | When |
| --- | --- |
| **patch** | bug fixes, copy changes, minor UI tweaks, refactors, deps, ops |
| **minor** | new feature, new screen, new endpoint, notable UX change |
| **major** | breaking change, major redesign — always confirm with the user first |

Default to patch. Suggest minor when the diff adds user-visible behaviour.

## Flow

1. Inspect the change set: `git diff --name-only origin/main...HEAD` plus
   unstaged work.
2. Create the changeset non-interactively: write
   `.changeset/<slug>.md` with frontmatter naming `'@sanakenno/web'` and the
   level, plus a one-line summary in the body. Quote the package name — the
   YAML parser needs it.
3. Run `pnpm run version:bump` (applies the changeset and syncs the version to
   root and shared via `scripts/sync-versions.js`).
4. Show the resulting version delta and the changelog entry.
5. Do not commit — `pre-push` and `commit` run next in the ship flow.

## Guardrails

- Never edit the three package.json versions by hand; the changeset flow owns
  them.
- One changeset per logical change; do not batch unrelated work into one bump.
- If the working tree already has an unapplied changeset, ask before adding
  another.
