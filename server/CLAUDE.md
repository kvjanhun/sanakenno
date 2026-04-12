# Backend Rules (`server/`)

## Structure
```
server/
  index.ts          entry point — mounts all routes, middleware
  routes/           puzzle, archive, achievement, failed-guess, admin, player-sync route files
  auth/             admin session middleware and routes (cookie-based)
  player-auth/      player identity middleware and routes (Bearer token-based)
  db/               SQLite connection, schema, and migration helpers
  email/            transactional email helpers (transfer link)
  puzzle-engine.ts  pure puzzle logic (no I/O)
```

## Route Conventions
- Each route file starts with a header comment listing every endpoint it exposes and its purpose.
- Every non-trivial handler and middleware gets a JSDoc block.
- Complex logic (midnight rollover, scoring, auth checks) gets inline comments explaining *why*.
- Return structured JSON errors: `{ error: string }` with an appropriate HTTP status.

## Auth layers
- **Admin** (`/api/admin/*`, `/api/auth/*`): cookie session via `requireAuth` + `requireCsrf` from `auth/middleware.ts`.
- **Player** (`/api/player/*`): Bearer token via `requirePlayerAuth` from `player-auth/middleware.ts`.
- **Public** (`/api/puzzle`, `/api/archive`, `/api/achievement`, `/api/failed-guess`): no auth, rate-limited where needed.

## Database
- All queries go through the `getDb()` helper — never open a raw connection elsewhere.
- Use parameterised queries; never interpolate user input into SQL.
- Schema changes go in `db/schema.sql`; backwards-compatible column additions are applied as migrations in `db/connection.ts` via try/catch `ALTER TABLE`.

## Environment
- Port: `process.env.PORT` (default `3001`).
- Secrets (session key, admin credentials) come from environment variables — never hardcoded.
