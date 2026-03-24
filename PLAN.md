# Sanakenno Standalone — Project Plan

Porting the Sanakenno game from web_kontissa website repository to a standalone
React + Hono project. Spec-first approach: Gherkin features define
the behaviour, implementation satisfies the specs.

### Core Directive: Parity & Reuse
- **Visual Identity**: The standalone game MUST be visually and behaviorally identical to the original Nuxt version (styles, colors, animations, SVG honeycomb).
- **Code Reuse**: Maximum reuse of the original logic (`useSanakennoLogic.js`, `useGameTimer.js`, `useHintData.js`) by porting from Vue composables to React hooks/Zustand.
- **Asset Reuse**: Reuse existing SVG icons, manifest properties, and the 101k wordlist source.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety across server/client boundary, safer refactoring. |
| Frontend | React 19 + Vite | Modern, fast development with ESM HMR. |
| Styling | Tailwind CSS 4 + CSS Modules | Tailwind for layouts/UI; CSS Modules for complex game animations. |
| State | Zustand | Lightweight, high-performance central state. |
| Backend | Hono (tsx) | Modern, lightweight, and fast framework with native async support. |
| Storage | SQLite | Single database for all application data. Wordlist as flat file. |
| Testing | Vitest, RTL, Cucumber.js, Playwright | Comprehensive testing from unit to BDD/E2E. |
| PWA | `vite-plugin-pwa` | Automated manifest/SW generation and update handling. |
| Deployment | Docker, nginx | Containerized deployment on existing infrastructure. |

## Architecture

```
sanakenno/
├── features/                  # Gherkin specs
│   ├── step-definitions/      # Cucumber.js step definitions (wired per phase)
│   │   ├── scoring.steps.ts
│   │   ├── api.steps.ts
│   │   ├── interaction.steps.ts
│   │   └── ...
│   └── support/               # Cucumber world, hooks, helpers
├── scripts/
│   ├── migrate-from-kontissa.ts  # One-time: reads web_kontissa site.db → sanakenno.db
│   └── create-admin.ts        # CLI: create admin account (argon2id hash)
├── server/
│   ├── index.ts               # Hono entry point
│   ├── db/
│   │   ├── schema.sql         # Full SQLite schema (incl. admins, sessions)
│   │   └── connection.ts      # DB connection + helpers
│   ├── auth/
│   │   ├── middleware.ts       # Session validation, CSRF check, security headers
│   │   ├── routes.ts          # POST /api/auth/login, /logout, /change-password
│   │   └── session.ts         # Session create/validate/expire, CSRF token generation
│   ├── puzzle-engine.ts       # Word filtering, hashing, hint computation (with cache)
│   ├── routes/
│   │   ├── puzzle.ts          # GET /api/puzzle, GET /api/puzzle/:n
│   │   ├── achievement.ts     # POST /api/achievement
│   │   └── admin.ts           # Admin CRUD (Phase 6)
│   └── data/
│       ├── sanakenno.db       # SQLite database (all app data)
│       └── kotus_words.txt    # Finnish wordlist (1.2MB, static file)
├── src/
│   ├── main.tsx               # React entry
│   ├── App.tsx                # Root component, layout shell
│   ├── store/
│   │   └── useGameStore.ts    # Zustand store (state, words, score, timer)
│   ├── hooks/
│   │   ├── useGameTimer.ts    # Logic for active play-time tracking
│   │   ├── useHintData.ts     # Derived hint computations
│   │   └── useMidnightRollover.ts  # Midnight detection and reload
│   ├── components/
│   │   ├── Honeycomb/         # Hex grid + CSS Module animations
│   │   │   ├── Honeycomb.tsx
│   │   │   └── Honeycomb.module.css
│   │   ├── WordInput.tsx      # Current word display
│   │   ├── FoundWords.tsx     # Word lists
│   │   ├── HintPanels.tsx     # Unlock-able hint cards
│   │   ├── RankProgress.tsx   # Score bar
│   │   ├── ShareButton.tsx    # Result sharing
│   │   ├── Celebration.tsx    # Overlays
│   │   ├── RulesModal.tsx     # Instructions
│   │   ├── ErrorState.tsx     # Network/load error display with retry
│   │   └── admin/             # Admin UI (Phase 6)
│   │       ├── LoginPage.tsx
│   │       ├── AdminLayout.tsx
│   │       ├── PuzzleEditor.tsx
│   │       ├── BlockedWords.tsx
│   │       ├── CombinationsBrowser.tsx
│   │       ├── VariationsGrid.tsx
│   │       ├── WordList.tsx
│   │       ├── Schedule.tsx
│   │       └── Stats.tsx
│   ├── utils/
│   │   ├── scoring.ts         # scoreWord, recalcScore, rankForScore (pure functions)
│   │   ├── hash.ts            # SHA-256 via crypto.subtle
│   │   └── storage.ts         # localStorage helpers with error handling
│   └── styles/
│       └── index.css          # Tailwind base + custom properties
├── public/
│   └── icons/                 # PWA icons (192, 512, apple-touch)
├── tests/
│   ├── scoring.test.ts        # Pure function tests
│   ├── useGameTimer.test.ts   # Hook tests with fake timers
│   ├── useHintData.test.ts    # Derived computation tests
│   └── components/            # React Testing Library tests
├── tsconfig.json
├── tsconfig.server.json
├── Dockerfile
├── docker-compose.yml
├── nginx.conf                 # Static + /api proxy
└── package.json
```

## Database Schema

Single SQLite database (`sanakenno.db`) with all application data:

See `server/db/schema.sql` for the authoritative schema. Tables:

| Table | Purpose |
|---|---|
| `puzzles` | Puzzle definitions (slot, letters, center, is_active) |
| `blocked_words` | Admin-curated word exclusions |
| `achievements` | Player achievement records (anonymous, with optional session_id) |
| `page_views` | Anonymous page view tracking (sessionStorage-based visitor_id) |
| `combinations` | Pre-computed 7-letter combinations for admin puzzle browser |
| `admins` | Admin accounts (created via CLI, argon2id hashes) |
| `sessions` | Server-side sessions for admin auth (with CSRF tokens) |
| `admin_log` | Audit trail for admin actions |
| `config` | App-level config (rotation epoch, etc.) |

## Puzzle Engine (Runtime Computation)

Instead of pre-computed JSON, puzzles are computed at request time with
in-memory caching — same approach as the Flask backend:

1. Read puzzle definition from `puzzles` table (letters + center)
2. Read blocked words from `blocked_words` table
3. Filter `kotus_words.txt`: length ≥ 4, contains center, all chars in letter set, not blocked
4. For each valid word: compute SHA-256 hash, score, hint frequencies
5. Cache result in memory per puzzle slot; invalidate on admin edit or block change

This keeps the public API fast (cache hit = instant) while allowing admin
edits to take effect immediately (cache invalidation on write).

## Code Reuse Strategy

What to copy, port, or rewrite from `../web_kontissa`:

| Source file | Action | Rationale |
|---|---|---|
| `composables/useSanakennoLogic.js` | **Copy + type** → `src/utils/scoring.ts` | Pure functions with TypeScript interfaces |
| `composables/useGameTimer.js` | **Light port** → `src/hooks/useGameTimer.ts` | Replace Vue `ref()` with Zustand/React state |
| `composables/useHintData.js` | **Light port** → `src/hooks/useHintData.ts` | Replace Vue `computed()` with `useMemo` |
| `app/wordlists/kotus_words.txt` | **Copy** → `server/data/kotus_words.txt` | Static asset, 1.2MB |
| `sanakenno.vue` scoped CSS | **Extract & copy** → CSS Modules | Hex geometry, animations, color vars |
| `sanakenno.webmanifest` | **Reference** for vite-plugin-pwa config | Values only, not the file itself |
| `tests/unit/useSanakennoLogic.test.js` | **Port** → `tests/scoring.test.ts` | 37 test cases, adapt to Vitest |
| `api/kenno.py` | **Port** → `server/puzzle-engine.ts` | Word filtering, hashing, hint computation |
| `sanakenno-sw.js` | **Skip** | `vite-plugin-pwa` generates service worker |
| `app/data/site.db` | **One-time migration** → `sanakenno.db` | Puzzles, blocked words, combinations |

## Data Migration

One-time migration via `scripts/migrate-from-kontissa.js`:

1. Open `../web_kontissa/app/data/site.db` (read-only)
2. Read `bee_puzzles` (slot, letters) + `bee_config` (center per slot) → write to `puzzles` table
3. Read `blocked_words` → write to `blocked_words` table
4. Read `bee_combinations` → write to `combinations` table
5. Copy rotation epoch to `config` table
6. Validate: computed puzzle output matches Flask API response for a sample of puzzles

After migration, the standalone DB is the source of truth. web_kontissa's
puzzle data is no longer authoritative for this app.

## Implementation Phases

BDD step definitions are wired in the same phase as the code they test,
not deferred to the end. Each phase proves itself against its specs.

### Phase 0 — Project Scaffold & CI

Set up the monorepo structure, tooling, and CI pipeline.

1. Initialize project: `package.json`, Vite config, Tailwind, ESLint, Prettier
2. Scaffold empty directory structure (see Architecture above)
3. Configure Vitest (unit), Cucumber.js (BDD), Playwright (E2E placeholder)
4. `.github/workflows/test.yml`:
   - **Lint**: ESLint + Prettier check
   - **Vitest**: Unit tests
   - **Cucumber**: BDD specs
   - **Playwright**: E2E tests (initially skipped)
5. `.dockerignore`, `.gitignore`, `scripts/setup-dev.sh`

**Validates:** Project builds and CI runs green (no tests yet).

### Phase 1 — Data Migration + Puzzle Engine + Scoring Logic

Set up the database, migrate data from web_kontissa, build the puzzle engine,
and port the pure game logic.

1. Create `server/db/schema.sql` and `server/db/connection.js`
2. Write `scripts/migrate-from-kontissa.js`:
   - Read web_kontissa's `site.db` directly (no API auth needed)
   - Populate `puzzles`, `blocked_words`, `combinations`, `config` tables
3. Copy `kotus_words.txt` from web_kontissa
4. Write `server/puzzle-engine.js`:
   - Load wordlist once at startup
   - `computePuzzle(letters, center, blockedWords)` → words, hashes, hints, max_score
   - In-memory cache per puzzle slot, with invalidation
   - Port the filtering/scoring logic from `kenno.py`
5. Copy `useSanakennoLogic.js` → `src/utils/scoring.js` (verbatim — pure functions)
6. Port `useSanakennoLogic.test.js` → `tests/scoring.test.js` (37 test cases)
7. Write `src/utils/hash.js`: SHA-256 via `crypto.subtle`
8. Validate: puzzle engine output matches Flask API for sample puzzles

**BDD wiring:**
- `features/step-definitions/scoring.steps.js` — wire to `scoring.js`
- `features/step-definitions/word-validation.steps.js` — wire to `scoring.js` + `hash.js`

**Validates:** `scoring.feature`, `word-validation.feature`

### Phase 2 — Hono API

Minimal backend serving puzzles and recording achievements.

1. `server/index.js`: Hono app with JSON body parsing, structured logging
2. `GET /api/health` — DB reachability check
3. `GET /api/puzzle` — call puzzle engine, compute today's slot by Helsinki-date rotation
4. `GET /api/puzzle/:number` — serve specific puzzle (wrap around total)
5. `POST /api/achievement` — validate rank, store in SQLite, rate limit (10/min)
6. CORS configuration

**BDD wiring:**
- `features/step-definitions/api.steps.js` — wire with Hono's `app.request()`
- `features/step-definitions/puzzle.steps.js` — daily rotation, structure validation

**Validates:** `api.feature`, `puzzle.feature` (structure + rotation scenarios)

### Phase 3 — React Game (Core)

The playable game without hints, celebrations, or PWA.

1. React + Tailwind + Zustand scaffold (`src/main.jsx`, `src/App.jsx`)
2. `useGameStore.js`: Zustand store
   - Puzzle fetch, found words (Set), score, rank, currentWord, message
   - Validation chain: length → center → puzzle letters → hash → duplicate
   - localStorage persistence per puzzle (`sanakenno_state_{n}`)
   - Legacy key migration (conditional on same-origin deployment)
3. `useGameTimer.js`: port from Vue, track active play time
4. `useMidnightRollover.js`: setTimeout to midnight + visibilitychange detection
5. `Honeycomb/`: SVG hex grid, CSS Module animations, press feedback
6. `WordInput.jsx`: colored character display (center letter = accent)
7. Keyboard handler: letters (a-z, ä, ö, hyphen), Backspace, Enter; ignore modifiers
8. `FoundWords.jsx`: recent 6 visible, expandable alphabetical list
9. `RankProgress.jsx`: bar with thresholds, Täysi kenno hidden until achieved
10. `RulesModal.jsx`: Finnish instructions
11. Theme toggle (light/dark, system default, localStorage persistence)
12. `ErrorState.jsx`: network error display with retry button
13. `src/utils/storage.js`: localStorage wrapper with quota-exceeded handling

**BDD wiring:**
- `features/step-definitions/ranks.steps.js` — pure logic tests
- `features/step-definitions/timer.steps.js` — hook tests with fake timers
- `features/step-definitions/persistence.steps.js` — localStorage scenarios
- `features/step-definitions/interaction.steps.js` — Playwright E2E
- `features/step-definitions/theme.steps.js` — localStorage + class toggle
- `features/step-definitions/error-handling.steps.js` — error scenarios
- `features/step-definitions/accessibility.steps.js` — keyboard/touch

**Validates:** `scoring.feature`, `word-validation.feature`, `ranks.feature`,
`persistence.feature`, `timer.feature`, `interaction.feature`, `theme.feature`,
`error-handling.feature`, `accessibility.feature`

### Phase 4 — Hints, Celebrations, Share

The polish layer.

1. `useHintData.js`: port from Vue, derive letter/length/pair/pangram stats
2. `HintPanels.jsx`: 4 panels with unlock/collapse, persisted unlock state
3. `Celebration.jsx`: Ällistyttävä glow (5s), Täysi kenno gold (8s), rank toasts (3s)
4. `ShareButton.jsx`: clipboard copy with formatted text:
   ```
   Sanakenno — Peli #N
   RankName · N sanaa
   score/max pistettä
   Avut: 📊🔤📏🔠  (only if hints unlocked)
   erez.ac/sanakenno
   ```
5. Achievement fire-and-forget POST on rank transition (session-deduplicated)

**BDD wiring:**
- `features/step-definitions/hints.steps.js`
- `features/step-definitions/achievements.steps.js`

**Validates:** `hints.feature`, `achievements.feature`

### Phase 5 — PWA + Docker + Deployment

Make it installable and deploy.

1. `vite-plugin-pwa` configuration:
   - Network-first for navigation, stale-while-revalidate for assets, network-only for API
   - Manifest: standalone display, icons at 192/512, theme color
2. iOS standalone quirks: `touch-action: manipulation`, double-tap prevention
3. Safe area support: `viewport-fit=cover`, `env(safe-area-inset-*)`
4. `Dockerfile`: multi-stage build, Node alpine, non-root user
5. `docker-compose.yml`: Hono container, health check, Loki logging driver
6. `nginx.conf`: static files + `/api` proxy
7. Icons: generate 192×192, 512×512, apple-touch from existing SVG source

**BDD wiring:**
- `features/step-definitions/pwa.steps.js`
- `features/step-definitions/infrastructure.steps.js`

**Validates:** `pwa.feature`, `infrastructure.feature`

### Phase 5.5 — On-server Infrastructure

Integrate with the existing NUC server stack. This phase is done manually
on the server, not by agents.

1. **Nginx**: proxy `/sanakenno` to container (port 8081), trailing-slash normalization
2. **Deploy script**: `scripts/deploy-sanakenno.sh` (pull, build, restart)
3. **Webhook**: trigger deploy on push to main
4. **Litestream**: replicate `sanakenno.db` to Backblaze B2
5. **Systemd**: `sanakenno.service` to manage docker-compose lifecycle

### Phase 6 — Authentication + Admin Tool

Build the auth system and port the puzzle management UI from web_kontissa.
After this phase, web_kontissa's kenno admin is no longer needed.

#### 6a — Authentication Infrastructure

1. **`scripts/create-admin.js`** — CLI script to create admin account:
   - Prompts for username and password
   - Enforces minimum 12-char password
   - Stores argon2id hash in `admins` table
   - Never logs or stores plaintext password
2. **`server/auth/session.js`** — server-side session management:
   - Create session: generate cryptographically random session ID + CSRF token
   - Store in `sessions` table with expiry (configurable, e.g. 7 days)
   - Validate: check session exists, not expired, matches admin_id
   - Expire: delete session row, periodic cleanup of stale sessions
3. **`server/auth/routes.js`** — auth endpoints:
   - `POST /api/auth/login` — verify argon2id hash, create session, set cookie
     - Constant-time comparison to prevent timing attacks
     - Rate limit: 5 attempts/minute per IP, 60s lockout
     - Generic error message (no username/password distinction)
   - `POST /api/auth/logout` — delete session, clear cookie
   - `POST /api/auth/change-password` — require current password, update hash,
     invalidate all other sessions
4. **`server/auth/middleware.js`** — applied to all `/api/admin/*` routes:
   - Validate session cookie (HttpOnly, Secure, SameSite=Strict)
   - Verify CSRF token on state-changing requests (POST, PUT, DELETE)
   - Set security headers: `X-Content-Type-Options: nosniff`,
     `X-Frame-Options: DENY`, `Cache-Control: no-store`
   - Reject with 401 if session invalid, 403 if CSRF mismatch

#### 6b — Admin API

1. **Admin API routes** (`server/routes/admin.js`):
   - `POST /api/admin/puzzle` — create/update puzzle slot (letters + center)
   - `DELETE /api/admin/puzzle/:slot` — delete puzzle
   - `POST /api/admin/puzzle/swap` — swap two slots
   - `POST /api/admin/center` — change center letter for a slot
   - `POST /api/admin/preview` — preview center variations without saving (rate limit: 20/min)
   - `GET /api/admin/variations/:slot` — get all 7 center variations for a slot
   - `GET /api/admin/schedule` — upcoming puzzle rotation
   - `POST /api/admin/block` — block a word
   - `DELETE /api/admin/block/:id` — unblock
   - `GET /api/admin/blocked` — list blocked words
   - `GET /api/admin/combinations` — browse pre-computed combinations (filterable, paginated)
   - `GET /api/admin/stats` — achievement stats dashboard
   - All admin writes invalidate the puzzle engine cache
   - Today's puzzle protection: 409 without `force=true` on modify/delete/swap

#### 6c — Admin UI

1. **`LoginPage.jsx`** — login form, error display, redirect to admin on success
2. **`AdminLayout.jsx`** — auth-gated shell, navigation, logout
3. **`PuzzleEditor.jsx`** — CRUD for puzzle slots, center selection via VariationsGrid,
   slot navigation, swap, delete, save with dirty detection, today-warning dialogs
4. **`VariationsGrid.jsx`** — 7-button grid showing word_count/max_score/pangram_count
   per center letter, active center highlighted
5. **`WordList.jsx`** — alphabetical word display with pangram highlighting,
   block button per word with confirmation
6. **`CombinationsBrowser.jsx`** — browse/filter 7,922 combinations with 6 filter groups
   (requires, excludes, pangrams, word count best/worst, in_rotation),
   sortable columns, pagination, expandable rows showing VariationsGrid
7. **`BlockedWords.jsx`** — list, add, remove blocked words
8. **`Schedule.jsx`** — upcoming rotation calendar
9. **`Stats.jsx`** — achievement counts by rank and date, period selection (7/30/90 days)
10. **Admin route** in React: `/admin` path, redirects to login if no session

**BDD wiring:**
- `features/step-definitions/auth.steps.js`
- `features/step-definitions/admin.steps.js`

**Validates:** `auth.feature`, `admin.feature`

## Parallel Agent Strategy

Phases are designed for maximum parallelism using worktree-isolated agents.
Each agent gets the relevant `.feature` files as acceptance criteria and
reads original source from `../web_kontissa` for reference.

```
Phase 0:  [Agent: scaffold]
              │
         ┌────┴────┐
Phase 1:  [A: data+engine]  [B: hono-api]     ← parallel, worktree isolation
         └────┬────┘
              │ ← integration merge + full test run
         ┌────┼──────────┐
Phase 3:  [C: state]  [D: honeycomb]  [E: found+rank]  ← parallel
         └────┬──────────┘
              │ ← integration merge
         ┌────┴────┐
Phase 4:  [F: hints+share]  [G: pwa+docker]  ← parallel
         └────┬────┘
              │ ← final integration
Phase 6:  [H: auth]  [I: admin-api]  [J: admin-ui]  ← H first, then I+J parallel
         └─────────┬─────────┘
              │ ← admin integration
```

After each parallel phase, a single integration step merges worktrees,
resolves conflicts, and runs the full test suite before proceeding.

## What Stays in web_kontissa (Temporarily)

After Phase 6, the only dependency on web_kontissa is the one-time migration.
Until Phase 6 is complete:

- **Puzzle editor** (AdminKennoPuzzleTool) — remains usable for editing puzzles,
  but edits go to web_kontissa's DB. Re-run migration if needed before Phase 6.
- **Wordlist source** — `kotus_words.txt` is copied; authoritative source stays
  in web_kontissa but the file is static and unlikely to change.

After Phase 6, web_kontissa's kenno-related code can be removed entirely.

## Key Design Decisions

1. **SQLite as single data store.** One `sanakenno.db` for puzzles, blocked words,
   achievements, and combinations. No JSON files for data. The wordlist
   (`kotus_words.txt`) stays as a flat file since it's a static 1.2MB asset
   that's read once at startup.

2. **Runtime puzzle computation with caching.** The puzzle engine loads the
   wordlist once, computes puzzle data on first request per slot, and caches
   in memory. Admin writes invalidate the cache. Same pattern as the Flask
   backend but in JS.

3. **Production-grade admin auth.** Server-side sessions in SQLite, argon2id
   password hashing, CSRF tokens, rate-limited login, security headers.
   Admin account created via CLI script — no self-registration. The game
   itself is public with anonymous achievements.

4. **Centralized Zustand state.** Prevents prop drilling and simplifies
   communication between game logic and UI components.

5. **Finnish UI, English code.** All user-facing strings are Finnish (this is
   a Finnish word game). Variable names, comments, and docs are English.

6. **BDD-first, not BDD-last.** Step definitions are wired in the same phase
   as the code they test. Each phase is green before the next begins.

7. **Midnight rollover via two mechanisms.** A `setTimeout` fires at midnight
   Helsinki time, and a `visibilitychange` handler catches tab-resume across
   midnight. Both save current state before reloading.

8. **One-time migration, then independence.** Puzzle data is migrated once from
   web_kontissa's DB. After that (and especially after Phase 6), the standalone
   app is fully self-contained.

## Open Questions

- **Subdomain vs path?** `sanakenno.erez.ac` vs `erez.ac/sanakenno`. Subdomain
  is cleaner for a standalone app but needs a TLS cert. Current site already has
  a wildcard? Check nginx config. This also determines whether legacy localStorage
  migration is possible (same-origin requirement).
- **Combinations pre-computation.** The 7,922-row combinations table was pre-computed
  in web_kontissa via a Python script. Need to either: (a) migrate the data as-is,
  (b) rewrite the computation in JS, or (c) both — migrate now, rewrite later so
  new combinations can be computed from the standalone.
