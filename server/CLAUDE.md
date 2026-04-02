# Backend Rules (`server/`)

## Structure
```
server/
  index.ts          entry point — mounts all routes, middleware
  routes/           puzzle, achievement, admin, archive route files
  auth/             session handling and auth routes
  db/               SQLite connection and migrations
  puzzle-engine.ts  pure puzzle logic (no I/O)
```

## Route Conventions
- Each route file starts with a header comment listing every endpoint it exposes and its purpose.
- Every non-trivial handler and middleware gets a JSDoc block.
- Complex logic (midnight rollover, scoring, auth checks) gets inline comments explaining *why*.

## Hono Patterns
- Use `hono/cors`, `hono/logger`, and custom `securityHeaders` middleware from `index.ts`.
- Return structured JSON errors: `{ error: string }` with an appropriate HTTP status.
- Auth-required routes go under `/api/admin/*` and are guarded by the `requireAuth` middleware.

## Database
- All queries go through the `getDb()` helper — never open a raw connection elsewhere.
- Use parameterised queries; never interpolate user input into SQL.

## Environment
- Port: `process.env.PORT` (default `3001`).
- Secrets (session key, admin credentials) come from environment variables — never hardcoded.
