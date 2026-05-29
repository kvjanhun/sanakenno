# Sanakenno — Roadmap

## Current Status (web/server/shared 1.6.0 · mobile 0.6.4 paused)

The web and server stack is the active product and is live at
**sanakenno.fi**. Native mobile development is on full hiatus. The Expo iOS app
exists in the repo and was useful exploration, but App Store distribution is
not currently worth the Apple Developer Program fee and should not drive the
roadmap.

Shipped since the previous planning era:
- Monorepo workspace (`packages/{shared,web,mobile}`) with Turborepo + split CI.
- Cross-device sync: player auth, Bearer tokens, transfer-link pairing, stable
  `player_key` rotation, combined `GET /api/player/sync`, fire-and-forget
  `POST /api/player/sync/{stats,state}`.
- 6-palette theme system with cross-device sync.
- Past-puzzle reveal flow on web and mobile (`revealed_N` flag freezes stats).
- Multi-process server with health-checked compose deploy.
- Admin puzzle tooling, schedule view, achievement stats, and failed-guess stats.

Workflow skills cover the dev loop: `bdd-feature`, `bump-version`, `pre-push`,
`verify-locally`, `commit`, and `ship-feature`.

---

## Active Direction

Sanakenno is web-first again. New work should primarily improve the web app,
backend, admin tooling, puzzle operations, reliability, and player experience at
`sanakenno.fi`.

### Current Work: Word-Find Analytics

Goal: understand which valid words players actually find for each puzzle, so
future puzzle tuning can spot unusually easy or hard words.

Implemented in the current work-in-progress:
- `word_finds` SQLite table keyed by `(word, puzzle_number)`.
- Public `POST /api/word-find`, rate-limited, fire-and-forget from web and
  mobile stores after an accepted word.
- Authenticated `GET /api/admin/word-finds?puzzle_number=N`.
- Admin stats panel showing successful find counts hardest-first for the
  selected puzzle.
- BDD coverage in `features/api.feature` and `features/admin.feature`.
- Focused Vitest coverage for `POST /api/word-find`.
- Queued changeset: `.changeset/word-find-tracking.md`.

Before release:
1. Run the local web/server check set.
2. Apply the queued changeset/version bump.
3. Deploy normally; `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so the table
   will be created on server startup for existing SQLite databases.

### Next Web Work

After word-find analytics ships, choose the next web-app item from actual usage
or admin pain. The previous native launch checklist is no longer a priority
source of work.

Known small candidates:
- PWA install discoverability: add a quiet static mention, no prompt.
- Admin tuning workflow: use word-find and failed-guess data to improve puzzle
  review.
- Observability/security cleanup before the next larger release.

---

## Native Apps On Hiatus

The native app code remains in `packages/mobile`, but it is not an active
target. Do not spend work on:
- EAS production builds
- TestFlight or App Store Connect
- App Store metadata, screenshots, icons, privacy listing, review notes
- Android parity or Play Store preparation
- Mobile E2E infrastructure

The local `ios-launch` branch contains obsolete App Store preparation work. It
should not be merged unless native distribution is deliberately resumed and the
plan is re-reviewed from scratch.

If native work resumes later, first write a new roadmap section. Anything that
requires Apple distribution tooling must state explicitly: "You will need the
paid Apple Developer Program for this."

---

## Testing Strategy Gaps

- Keep BDD feature files as the source of truth for behavior.
- Add browser E2E only for behavior that cannot be verified at pure API/domain
  level.
- Mobile-specific BDD/E2E gaps are intentionally deferred while native is on
  hiatus.

---

## Observability (deferred — wire into shared erez.ac stack)

The server runs alongside the existing `erez.ac` observability stack on the NUC.
There is no project-local logging, error tracking, or metrics today beyond
structured `console.log` output.

Planned approach: route Sanakenno's logs and errors into the same collector the
`erez.ac` stack already uses. Concrete tasks once started:

1. Decide on the log shipping mechanism the shared stack expects.
2. Replace remaining ad-hoc `console.log` in `server/` with a structured logger
   that emits the agreed format.
3. Add error capture for unhandled exceptions and 5xx responses.
4. Add a minimal alert: server unreachable, error rate spike, sync endpoint
   failures.
5. Document the link between this app's logs and the shared dashboard.

---

## Security Review (recurring, before each major release)

Security is a project priority. Schedule a deliberate review pass before major
web/server releases and recurring production changes.

Scope to cover:
- **Player auth**: Bearer token issuance, rotation, expiry; transfer-link email
  flow; stable `player_key` rotation guarantees.
- **Admin auth**: cookie session lifetime, CSRF on mutating routes, rate limits
  on login.
- **Public endpoints**: rate limiting on `/api/puzzle`, `/api/archive`,
  `/api/failed-guess`, `/api/word-find`, `/api/achievement`; abuse vectors.
- **Database**: confirm all queries are parameterised; no string concatenation
  into SQL anywhere.
- **Secrets**: confirm `.env` files, signing keys, Resend API key, etc. are not
  committed and are present in deploy environment only.
- **Dependencies**: `pnpm audit` clean; review notable CVEs in transitive deps.

Capture findings in a dated report under `reports/` and turn each finding into
an issue or commit.

---

## PWA Install Discoverability (small UX win)

`vite-plugin-pwa` is wired and the site is installable, but there is no
indication to the player that it can be installed. **No install prompt**.
Instead, add a quiet, discoverable mention somewhere unobtrusive (settings menu,
footer, or a single line in the rules screen) along the lines of:

> Voit asentaa Sanakennon kotinäytöllesi selaimesi valikon kautta.

Keep it static text, no dismissible banners, no `beforeinstallprompt` handling.

---

## Stale Account Cleanup (deferred — low priority)

Every `initPlayer()` call creates a permanent player row. Anonymous players who
play once and never return, accounts abandoned after logout, and orphaned
transfer-token players all accumulate indefinitely. The data is tiny, so this is
not urgent.

**Planned approach:** a scheduled cleanup job on the server (run at startup +
daily cron) that hard-deletes player accounts with no session activity in the
last 180 days. Cascade deletes handle `player_stats` and
`player_puzzle_states` automatically.

```sql
DELETE FROM players
WHERE id NOT IN (
  SELECT DISTINCT player_id FROM player_sessions
  WHERE expires_at > datetime('now', '-180 days')
);
```

Implementation notes:
- Run opportunistically in `server/player-auth/session.ts` alongside the
  existing `cleanupExpiredPlayerSessions()` call, or as a standalone cron entry.
- 180-day window is conservative; adjust once real usage patterns are known.
- Add a BDD scenario: player with no sessions older than 180 days is removed;
  player with recent activity is preserved.
