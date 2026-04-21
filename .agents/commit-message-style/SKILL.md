---
name: commit-message-style
description: Use Sanakenno's typed git commit subject style when creating or suggesting commit messages. Use when the user asks to commit, asks for a commit message, or wants a message rewritten to match repo history. Prefer lowercase prefixes like `feat`, `fix`, `chore`, and `test`, with an optional scope in parentheses.
---

# Commit Message Style

Match the repo's existing typed subject format.

## Format

- Preferred: `type: imperative summary`
- Scoped: `type(scope): imperative summary`
- Keep `type` lowercase.
- Do not write `type (scope):`; use `type(scope):`.
- Keep the summary concise, imperative, and without a trailing period.

## Types

- Prefer the types already used in repo history: `feat`, `fix`, `chore`, `test`.
- Use `refactor`, `docs`, `build`, or `ci` only when they fit better than the four above.
- For bug fixes, prefer `fix`, not `bug`.

## Scope

- Add a scope when the change is clearly limited to one area or platform.
- Prefer existing scope names from repo history such as `mobile`, `web`, `auth`, `theme`, `docker`, `bdd`, `e2e`, and `changesets`.
- For iOS app work, prefer `mobile` unless the user explicitly asks for `iOS`.

## Workflow

1. Review the staged or intended changes before writing the message.
2. If wording is unclear, inspect recent subjects with `git log --format=%s -n 20`.
3. Pick the narrowest accurate `type` and optional `scope`.
4. Avoid vague subjects like `Update files` or `Misc fixes`.

## Examples

- `feat: add Turborepo and split CI into web/server and mobile pipelines`
- `fix(mobile): patch react-native-bottom-tabs to skip empty icon URLs`
- `test(e2e): mock /api/player/** so auth init doesn't hit the Vite proxy`
- `chore(changesets): decouple mobile from shared + web versioning`
