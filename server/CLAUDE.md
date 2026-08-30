# Backend Rules (`server/`)

## Structure
```
server/
  index.ts          entry point — mounts all routes, middleware
  routes/           puzzle, archive, achievement, failed-guess, word-find, admin, player-sync route files
  auth/             admin session middleware and routes (cookie-based)
  player-auth/      player identity middleware and routes (Bearer token-based)
  db/               SQLite connection + schema
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
- **Public** (`/api/puzzle`, `/api/archive`, `/api/achievement`, `/api/failed-guess`, `/api/word-find`): no auth, rate-limited where needed.

## Puzzle numbering
- `slot` is the permanent storage key and must never be renumbered — player
  stats, saved progress, and word-find analytics are keyed on it.
- `display_number` is the 1-based position among active puzzles and is the only
  number shown in any UI or share text. Soft deletes close the gap.
- `totalPuzzles()` counts active puzzles; `nextFreeSlot()` is what appends use.
- Never derive a cycle position from a slot number — use the index within
  `getActiveSlots()`, or the gaps left by soft deletes will skew it.

## Database
- All queries go through the `getDb()` helper — never open a raw connection elsewhere.
- Use parameterised queries; never interpolate user input into SQL.
- Schema lives in `db/schema.sql` and is applied on startup via `applySchema`. Existing prod databases are already populated; if you add a column, apply it by hand to any live DB before shipping.
- For manual production table additions, the convenient path is to run a one-off Node command through Docker Compose with the app image's existing `better-sqlite3` dependency. This runs as the container user against mounted `/data`, avoiding host-side readonly/ownership issues:
  `docker compose stop && docker compose run --rm --no-deps --entrypoint node sanakenno-a -e "const Database=require('better-sqlite3'); const db=new Database('/data/sanakenno.db'); db.exec(\`...\`); db.close();" && docker compose up -d`

## Environment
- Port: `process.env.PORT` (default `3001`).
- Secrets (session key, admin credentials) come from environment variables — never hardcoded.

## Deploy webhook (server-side, not in this repo)
- CI calls `https://erez.ac/hooks/deploy-sanakenno` — an adnanh/webhook
  listener on the server (port 9000 behind nginx) that runs
  `server/deploy-sanakenno.sh`. CI authenticates with the `X-Deploy-Token`
  header (`DEPLOY_TOKEN` repo secret).
- The hooks config is **rendered, not hand-edited**: the systemd unit
  (`/etc/systemd/system/webhook.service`) has an `ExecStartPre` that runs
  `envsubst < ~/webhooks/hooks.template.json > ~/webhooks/hooks.json` on
  every service start, substituting `${DEPLOY_TOKEN}` from the unit's
  `Environment=` line. Editing `hooks.json` directly is silently undone by
  the next restart — **edit `hooks.template.json`, then
  `sudo systemctl restart webhook`**.
- Rotating the token means updating: the unit's `Environment=` line
  (`daemon-reload` + restart), this repo's `DEPLOY_TOKEN` secret, and
  web_kontissa's deploy trigger — both hooks on the server share the token.
