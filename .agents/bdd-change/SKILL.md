---
name: bdd-change
description: Implement or review Sanakenno behavior changes with the repo's BDD-first workflow. Use when fixing bugs or adding features that should update `features/*.feature`, matching step definitions, and the relevant web, mobile, server, or shared code.
---

# BDD Change

Treat `features/*.feature` as the source of truth for behavior.

## Workflow

1. Find the closest existing feature file with `rg`.
2. Decide whether the requested change alters behavior or only refactors internals.
3. If behavior changes, update the relevant `.feature` in the same change. Add a new scenario only when no existing scenario covers the behavior clearly.
4. Find matching step definitions in `features/step-definitions/`.
5. Map the implementation:
   - `packages/shared/` for domain logic and types
   - `packages/web/` for browser UI
   - `packages/mobile/` for iOS app behavior
   - `server/` for API behavior
6. Prefer changing shared logic before duplicating logic in both clients.
7. Keep user-facing strings in Finnish and code/comments in English.

## Validation

Run the narrowest checks that prove the change first:

- Shared or server logic: `pnpm run test:unit`
- Feature semantics or API behavior: `pnpm run test:bdd`
- Browser interaction: `pnpm run test:e2e`
- Type safety when code changed: `pnpm run typecheck` and `pnpm turbo run typecheck`

If the change spans multiple layers, run all relevant commands, not only the smallest one.

## Guardrails

- Do not leave code behavior ahead of the `.feature` files.
- If the correct behavior is unclear and no feature describes it, create or update the feature instead of guessing silently.
- If a requested change is intentionally not BDD-worthy, state that explicitly in the final response.
