---
name: add-route
description: Add a Hono API route the way this repo does one — auth layer choice, route file conventions, structured JSON errors, and the integration test that pins the behaviour. Use when adding or extending an endpoint under server/routes/.
paths:
  - server/**
  - tests/**
---

# Add Route

## 1. Pick the auth layer first

It decides the middleware, the path prefix, and the tests.

| Layer | Path | Middleware |
| --- | --- | --- |
| **Admin** | `/api/admin/*`, `/api/auth/*` | `requireAuth` + `requireCsrf` from `auth/middleware.ts` (cookie session) |
| **Player** | `/api/player/*` | `requirePlayerAuth` from `player-auth/middleware.ts` (Bearer token) |
| **Public** | everything else | none; rate-limit where it can be hammered |

Admin routes need **both** `requireAuth` and `requireCsrf`. A cookie session
without the CSRF check is a cross-site write.

## 2. Where the code goes

Respect the package boundaries — this is the decision that keeps the repo
coherent, and it is the one most easily got wrong:

- **`packages/shared`** — pure game rules and shared types. No I/O, no database,
  no framework. If web and server both need it, it lives here.
- **`server`** — routes, auth, persistence, operational scripts.
- **`packages/web`** — UI and browser state only.

`puzzle-engine.ts` is pure logic with no I/O; keep it that way.

## 3. Route file conventions

- Add the route to an existing file in `server/routes/` when it belongs to that
  domain; a new file is mounted in `server/index.ts`, whose header comment lists
  every endpoint.
- **Each route file starts with a header comment listing every endpoint it
  exposes and its purpose.** Update it.
- JSDoc on every non-trivial handler and middleware.
- Inline comments on complex logic explain *why*, not what.
- Errors are structured JSON — `{ error: string }` with a real status.

## 4. Database access

All queries go through `getDb()`. Never open a raw connection. Parameterised
queries only; never interpolate input into SQL.

If the route needs a column that does not exist, that is a **schema change** —
run `schema-change`, do not reach for the database directly.

## 5. Puzzle numbering, if the route touches puzzles

Two numbers, not interchangeable:

- **`slot`** (`puzzle_number` in responses) — the permanent storage key. Player
  stats, saved progress, and word-find analytics are keyed on it. Never renumber.
- **`display_number`** — the 1-based position among *active* puzzles, and the only
  number ever shown to anyone.

Never derive a cycle position from a slot number. Use the index within
`getActiveSlots()` — slot arithmetic drifts silently once soft deletes leave gaps.

## 6. Tests — same commit

Integration test in `tests/integration/`: the real Hono app, in-memory SQLite,
real stores. Cover the success shape, the auth boundary (what the layer below
gets), validation and its rejection path, and anything the route refuses to do.

**Test names are the behaviour catalog.** Write the name as the behaviour, not as
the function under test.

## Verify

```bash
pnpm run typecheck
pnpm run test:unit
```

**If this goes wrong:** the risk is an endpoint reachable without the auth you
intended, or one that returns internal state. Before finishing, re-read the
handler and answer both. Nothing here touches the host; revert with `git revert`.
