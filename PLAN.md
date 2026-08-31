# Sanakenno — Roadmap

**Last reviewed: 2026-08-31.** If that date is old, distrust this file and
check the code. This is the only forward-looking document; what already
exists is described in [PROJECT_MAP.md](PROJECT_MAP.md), and how to work in
the repo is in [CLAUDE.md](CLAUDE.md). Nothing here restates those.

Sanakenno is web-first and web-only. New work improves the web app, backend,
admin tooling, puzzle operations, and reliability at **sanakenno.fi**. The
native iOS app is archived at the `mobile-archive` tag and is not a target;
Android never will be. The PWA is the install story on every platform.

---

## Candidates

Unordered — pick from real usage or admin pain, not from this list's order.

### PWA install discoverability

The site is installable but never says so. Add a quiet static line (settings
menu, footer, or the rules screen) along the lines of:

> Voit asentaa Sanakennon kotinäytöllesi selaimesi valikon kautta.

Static text only: no install prompt, no `beforeinstallprompt` handling, no
dismissible banner.

### Split `server/routes/admin.ts`

At ~1,550 lines it is by far the largest file in the repo and covers three
unrelated areas: puzzle CRUD, suggestions, and analytics. Split along those
seams the next time a change lands in it, rather than as a dedicated pass.

### Stale account cleanup

Every `initPlayer()` call creates a permanent player row, so one-time
anonymous players accumulate forever. The data is tiny — this is tidiness,
not urgency.

Approach: a cleanup that hard-deletes players with no session activity in
180 days, run alongside the existing `cleanupExpiredPlayerSessions()`.
Cascade deletes handle `player_stats` and `player_puzzle_states`.

```sql
DELETE FROM players
WHERE id NOT IN (
  SELECT DISTINCT player_id FROM player_sessions
  WHERE expires_at > datetime('now', '-180 days')
);
```

Cover it with tests both ways: a player with no recent sessions is removed,
a player with recent activity is preserved.

### Admin tuning workflow

Word-find and failed-guess data are collected and displayed but do not yet
feed a workflow. Turn them into something that actually guides puzzle
review — flagging unusually hard or easy puzzles rather than just listing
counts.

---

## Recurring: security review

Security is a project priority, not a milestone. Do a deliberate pass before
major releases and after production changes:

- **Player auth** — Bearer issuance, rotation, expiry; pairing email flow.
- **Admin auth** — session lifetime, CSRF on mutating routes, login rate limits.
- **Public endpoints** — rate limits and abuse vectors on `/api/puzzle`,
  `/api/archive`, `/api/failed-guess`, `/api/word-find`, `/api/achievement`.
- **Database** — every query parameterised; no string concatenation into SQL.
- **Secrets** — nothing committed; `.env` present in the deploy environment only.
- **Dependencies** — `pnpm audit` clean; review notable transitive CVEs.

Capture findings in a dated report under `reports/` and turn each into a
commit or a candidate above.
