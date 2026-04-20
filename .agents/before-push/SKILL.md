---
name: before-push
description: Run Sanakenno's pre-push safety routine before pushing or opening a PR. Use when the user asks to push, merge, release, or verify CI readiness. Run typechecks, lint, and tests in order, and push only after everything passes.
---

# Before Push

Use this as the default gate before `git push`.

## Routine

1. Confirm the worktree contains only intended changes.
2. Run root and package typechecks:
   - `pnpm run typecheck`
   - `pnpm turbo run typecheck`
3. Run lint:
   - `pnpm run lint`
4. Run tests:
   - `pnpm run test:unit`
   - `pnpm run test:bdd`
   - `pnpm run test:e2e`
5. Stop immediately on the first failing command.
6. Push only after every command above passes.

## Reporting

- If a command fails, report the exact failing gate and the important error lines.
- Do not say the branch is ready when any gate is still red.
- If Playwright needs extra permissions to bind a local port, request them rather than skipping E2E silently.

## Scope

Use the full routine by default. Only narrow it if the user explicitly asks for a faster, partial check.
