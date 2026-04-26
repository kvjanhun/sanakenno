# Sanakenno — Roadmap

## Current Status (web/server/shared 1.6.0 · mobile 0.6.4)

The web and server stack is live in production at **sanakenno.fi**. The iOS app
runs on device with the full feature set. What remains is App Store distribution
and Android parity.

Shipped since the last plan refresh:
- Monorepo workspace (`packages/{shared,web,mobile}`) with Turborepo + split CI
  (`ci-web.yml`, `ci-mobile.yml`).
- Cross-device sync: player auth, Bearer tokens, transfer-link pairing, stable
  `player_key` rotation, combined `GET /api/player/sync`, fire-and-forget
  `POST /api/player/sync/{stats,state}`.
- 6-palette theme system with cross-device sync.
- Past-puzzle reveal flow on both web and mobile (`revealed_N` flag freezes
  stats updates).
- Multi-process server with health-checked compose deploy.
- Hint panel rework, polished tab bar, archive bottom sheet, midnight rollover,
  haptics intensity levels.

Workflow skills (`.claude/skills/`) now cover the dev loop: `bdd-feature`,
`bump-version`, `pre-push`, `verify-locally`, `commit`, `ship-feature`.

---

## Architecture Decisions (still active)

### Agent Guidance For Paid Program Boundaries
When implementing any phase or task that requires Apple distribution tooling or
paid-program-only capabilities, the implementing agent must state explicitly:
"You will need the paid Apple Developer Program for this."

This applies in particular to:
- EAS iOS device builds
- TestFlight setup
- App Store Connect distribution setup
- Final release signing and submission work

### iOS-First Rollout
The first release is iPhone-only. Android parity is a deliberate later phase,
not concurrent work.

Constraints:
- Keep shared domain logic platform-neutral so Android remains a later client,
  not a rewrite.
- Do not introduce iOS-specific assumptions into `packages/shared`.

---

## Next Milestone: App Store Release (Phase 8)

`eas.json` is scaffolded with `production` profile (autoIncrement). Native iOS
project exists under `packages/mobile/ios/`. Remaining tasks:

1. **Join the Apple Developer Program** before any of the distribution steps
   below. You will need the paid Apple Developer Program for this.
2. Validate a production iOS build via
   `eas build --platform ios --profile production`.
3. Run release-quality smoke testing on a physical device
   (clean install, gameplay, archive, settings, date rollover, sync, transfer).
4. Configure App Store Connect: app record, metadata, screenshots, age rating,
   privacy info.
5. Submit to TestFlight; validate with personal device before wider distribution.
6. Submit for App Store review.
7. Document the ongoing release and maintenance workflow (version bump, build,
   submit cycle).

### iOS launch checklist (concrete artefacts)

Track these as they're produced — most are required by App Store Connect and
will block submission if missing.

- [ ] Privacy policy URL (publicly hosted, linked from app + listing)
- [ ] Support URL
- [ ] Marketing URL (optional but recommended)
- [ ] App Store screenshots — required sizes: 6.9" (iPhone 16 Pro Max), 6.5"
      (iPhone 11 Pro Max). Capture in light + dark theme.
- [ ] App Store icon (1024×1024 PNG, no alpha)
- [ ] App name, subtitle, promotional text (Finnish primary, English secondary)
- [ ] Description and keywords (Finnish + English)
- [ ] Age rating questionnaire answers
- [ ] Privacy "data collection" answers (player auth = email; analytics = none)
- [ ] Export compliance answer (uses HTTPS only → standard exemption)
- [ ] Demo account credentials for review (player login flow needs one)
- [ ] Test notes for the reviewer (Finnish-only UI; Helsinki-time puzzle; how
      to trigger sync / pairing)

---

## Deferred: Android Parity (Phase 7)

The Android folder exists (`packages/mobile/android/`) and `ci-mobile.yml` will
need an `ci-android.yml` sibling once work begins.

1. Start Android implementation after the iOS app is validated and stable in
   the App Store.
2. Add Android-specific adjustments deliberately — do not inherit iOS decisions
   blindly.
3. Profile performance on Android emulator and physical devices.
4. Validate gameplay, navigation, persistence, haptics fallbacks, sharing, and
   sync on Android.
5. Add `@android`-tagged BDD scenarios as platform-specific behaviour emerges.
6. Prepare EAS Android build config and keystore; submit to Play Store.

---

## Testing Strategy (remaining gaps)

- Mobile E2E: no Detox/Maestro coverage yet for the native app. Add only if the
  lighter BDD + manual layers prove insufficient, but keep it on the radar
  before App Store submission.
- Mobile BDD: existing `features/*.feature` step definitions exercise shared
  domain logic only. Identify scenarios that should also be exercised on the
  mobile client (manually for now; later via Maestro if E2E lands) and tag
  them `@mobile`. Cross-device sync, archive reveal, and transfer-link pairing
  are the obvious candidates.
- Android: no mobile-specific BDD scenarios tagged `@android` yet — add when
  Phase 7 begins.

---

## Observability (deferred — wire into shared erez.ac stack)

The server runs alongside the existing `erez.ac` observability stack on the
NUC. There is no project-local logging, error tracking, or metrics today
beyond `console.log`.

Planned approach: route Sanakenno's structured logs and errors into the same
collector the `erez.ac` stack already uses (rather than standing up a separate
Sentry/Loki/Grafana instance for this project). Concrete tasks once started:

1. Decide on the log shipping mechanism the shared stack expects (e.g.
   stdout → docker log driver → Loki/Vector, or HTTP-push to a collector).
2. Replace ad-hoc `console.log` in `server/` with a structured logger that
   emits the agreed format.
3. Add error capture for unhandled exceptions and 5xx responses.
4. Add a minimal alert: server unreachable, error rate spike, sync endpoint
   failures.
5. Document the link between this app's logs and the shared dashboard so
   future agents know where to look.

---

## Security Review (recurring, before each major release)

Security is a project priority. Schedule a deliberate review pass before the
App Store submission and on a recurring basis after launch.

Scope to cover:
- **Player auth**: Bearer token issuance, rotation, expiry; transfer-link
  email flow (single-use, time-bound, no reuse after redemption); stable
  `player_key` rotation guarantees.
- **Admin auth**: cookie session lifetime, CSRF on all mutating routes, rate
  limits on login.
- **Public endpoints**: rate limiting on `/api/puzzle`, `/api/archive`,
  `/api/failed-guess`, `/api/achievement`; abuse vectors (e.g. dictionary
  scraping via failed-guess flooding).
- **Database**: confirm all queries are parameterised; no string concatenation
  into SQL anywhere.
- **Secrets**: confirm `.env` files, signing keys, Resend API key, etc. are
  not committed and are present in deploy environment only.
- **Mobile**: token storage in MMKV (not Keychain) — document the threat
  model trade-off; deep-link handling for transfer links.
- **Dependencies**: `pnpm audit` clean; review notable CVEs in transitive deps.

Run via `/security-review` skill at minimum. Capture findings in a dated
report under `reports/` and turn each finding into an issue or commit.

---

## PWA Install Discoverability (small UX win)

`vite-plugin-pwa` is wired and the site is installable, but there is no
indication to the player that it can be installed. **No install prompt** —
prompts of that kind are unwanted. Instead, add a quiet, discoverable mention
somewhere unobtrusive (settings menu, footer, or a single line in the rules
screen) along the lines of "Voit asentaa Sanakennon kotinäytöllesi
selaimesi valikon kautta." Keep it static text, no dismissible banners, no
beforeinstallprompt event handling.

---

## Stale Account Cleanup (deferred — low priority)

Every `initPlayer()` call creates a permanent player row. Anonymous players who
play once and never return, accounts abandoned after logout, and orphaned
transfer-token players all accumulate indefinitely. The data is tiny, so this
is not urgent.

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
