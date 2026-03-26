# Sanakenno Standalone — Project Plan

Porting the Sanakenno game from web_kontissa website repository to a standalone
React + Hono project. Spec-first approach: Gherkin features define
the behaviour, implementation satisfies the specs.

### Core Directive: Clean React, Visual Parity
- **Visual Identity**: The standalone game MUST be visually and behaviorally identical to the original Nuxt version (styles, colors, animations, SVG honeycomb).
- **Idiomatic React**: Write clean, idiomatic React — not a mechanical Vue-to-React port. The original Vue code is a reference for what the app does, not how the React code should be structured.
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
│   │   ├── useGameTimer.ts    # Ref-based play-time tracking (no re-renders)
│   │   ├── useKeyboard.ts     # Global keydown handler with stable ref pattern
│   │   ├── useHintData.ts     # Derived hint computations (Phase 4)
│   │   └── useMidnightRollover.ts  # Midnight detection and reload
│   ├── components/
│   │   ├── animations.module.css  # Shared animations (shake, glow, celebration)
│   │   ├── Honeycomb/         # Hex grid SVG component
│   │   │   └── Honeycomb.tsx
│   │   ├── WordInput.tsx      # Current word display with per-char coloring
│   │   ├── FoundWords.tsx     # Collapsed/expanded word lists
│   │   ├── GameControls.tsx   # Delete/shuffle/submit buttons
│   │   ├── MessageBar.tsx     # Ephemeral status messages
│   │   ├── HintPanels.tsx     # Unlock-able hint cards (Phase 4)
│   │   ├── RankProgress.tsx   # Score bar + rank thresholds
│   │   ├── Celebration.tsx    # Rank celebration overlays
│   │   ├── ThemeToggle.tsx    # Light/dark mode toggle
│   │   ├── RulesModal.tsx     # Finnish instructions
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

The original Vue code is a reference for *behaviour*, not a template for structure.
React implementations use idiomatic patterns (Zustand selectors, ref-based timers, CSS Modules).

| Source file | Action | Status |
|---|---|---|
| `composables/useSanakennoLogic.js` | Pure functions → `src/utils/scoring.ts` | Done |
| `composables/useGameTimer.js` | Ref-based hook → `src/hooks/useGameTimer.ts` | Done |
| `composables/useHintData.js` | Zustand-derived → `src/hooks/useHintData.ts` | Phase 4 |
| `app/wordlists/kotus_words.txt` | Copy → `server/data/kotus_words.txt` | Done |
| `sanakenno.vue` scoped CSS | CSS Modules: `animations.module.css` | Done |
| `sanakenno.webmanifest` | Reference for vite-plugin-pwa config | Phase 5 |
| `tests/unit/useSanakennoLogic.test.js` | Vitest → `tests/scoring.test.ts` | Done |
| `api/kenno.py` | TypeScript → `server/puzzle-engine.ts` | Done |
| `sanakenno-sw.js` | Skip — `vite-plugin-pwa` generates SW | Phase 5 |
| `app/data/site.db` | One-time migration → `sanakenno.db` | Done |

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
4. `.github/workflows/ci.yml`:
   - **Typecheck**: `tsc --noEmit`
   - **Prettier**: format check
   - **Vitest**: Unit tests
   - **Cucumber**: BDD specs (continue-on-error until all steps defined)
   - **Deploy**: webhook trigger on main push after tests pass
5. `.dockerignore`, `.gitignore`, `scripts/setup-dev.sh`

**Validates:** Project builds and CI runs green (no tests yet).

### Phase 1 — Data Migration + Puzzle Engine + Scoring Logic

Set up the database, migrate data from web_kontissa, build the puzzle engine,
and port the pure game logic.

1. Create `server/db/schema.sql` and `server/db/connection.ts`
2. Write `scripts/migrate-from-kontissa.js`:
   - Read web_kontissa's `site.db` directly (no API auth needed)
   - Populate `puzzles`, `blocked_words`, `combinations`, `config` tables
3. Copy `kotus_words.txt` from web_kontissa
4. Write `server/puzzle-engine.ts`:
   - Lazy-load wordlist on first `computePuzzle()` call
   - `computePuzzle(letters, center, blockedWords)` → words, hashes, hints, max_score
   - In-memory cache per puzzle slot, with invalidation
   - Port the filtering/scoring logic from `kenno.py`
5. Pure game functions → `src/utils/scoring.ts` (typed, tested)
6. Port tests → `tests/scoring.test.ts` (43 test cases)
7. Write `src/utils/hash.ts`: SHA-256 via `crypto.subtle`
8. Validate: puzzle engine output matches Flask API for sample puzzles

**BDD wiring:**
- `features/step-definitions/scoring.steps.ts` — wire to `scoring.js`
- `features/step-definitions/word-validation.steps.ts` — wire to `scoring.js` + `hash.js`

**Validates:** `scoring.feature`, `word-validation.feature`

### Phase 2 — Hono API

Minimal backend serving puzzles and recording achievements.

1. `server/index.ts`: Hono app with JSON body parsing, structured logging
2. `GET /api/health` — DB reachability check
3. `GET /api/puzzle` — call puzzle engine, compute today's slot by Helsinki-date rotation
4. `GET /api/puzzle/:number` — serve specific puzzle (wrap around total)
5. `POST /api/achievement` — validate rank, store in SQLite, rate limit (10/min)
6. CORS configuration

**BDD wiring:**
- `features/step-definitions/api.steps.ts` — wire with Hono's `app.request()`
- `features/step-definitions/puzzle.steps.ts` — daily rotation, structure validation

**Validates:** `api.feature`, `puzzle.feature` (structure + rotation scenarios)

### Phase 3 — React Game (Core) ✓

The playable game without hints, celebrations polish, or PWA. **Complete.**

1. React + Tailwind + Zustand scaffold (`src/main.tsx`, `src/App.tsx`)
2. `useGameStore.ts`: Zustand store with selective subscriptions
   - Puzzle fetch, found words (Set), score, rank, currentWord, message
   - Validation chain: length → center → puzzle letters → hash → duplicate
   - localStorage persistence per puzzle (`sanakenno_state_{n}`)
   - Legacy key migration from `sanakenno_state`
3. `useGameTimer.ts`: ref-based timer (no re-renders), pause on blur/hidden, resume on focus/visible
4. `useMidnightRollover.ts`: setTimeout to midnight + visibilitychange detection
5. `Honeycomb/`: SVG hex grid, press feedback via scale transform
6. `animations.module.css`: shared CSS Module animations (shake, glow, celebration)
7. `WordInput.tsx`: colored character display (center letter = accent)
8. `useKeyboard.ts`: letters (a-z, ä, ö, hyphen), Backspace, Enter, Escape; ref-based options for stable listener
9. `FoundWords.tsx`: recent 6 visible, expandable alphabetical columns
10. `RankProgress.tsx`: bar with thresholds, Täysi kenno hidden until achieved
11. `RulesModal.tsx`: Finnish instructions
12. `ThemeToggle.tsx`: light/dark toggle, system default, consistent storage utility usage
13. `ErrorState.tsx`: network error display with retry button
14. `GameControls.tsx`: delete/shuffle/submit with preventDefault for focus retention
15. `MessageBar.tsx`: ephemeral status messages with fade transition
16. `Celebration.tsx`: Ällistyttävä and Täysi kenno overlays
17. `src/utils/storage.ts`: localStorage wrapper with quota-exceeded handling

**BDD wiring:**
- `features/step-definitions/ranks.steps.ts` — pure logic tests
- `features/step-definitions/timer.steps.ts` — hook tests with fake timers
- `features/step-definitions/persistence.steps.ts` — localStorage scenarios
- `features/step-definitions/interaction.steps.ts` — Playwright E2E
- `features/step-definitions/theme.steps.ts` — localStorage + class toggle
- `features/step-definitions/error-handling.steps.ts` — error scenarios
- `features/step-definitions/accessibility.steps.ts` — keyboard/touch

**Validates:** `scoring.feature`, `word-validation.feature`, `ranks.feature`,
`persistence.feature`, `timer.feature`, `interaction.feature`, `theme.feature`,
`error-handling.feature`, `accessibility.feature`

### Phase 4 — Hints, Celebrations Polish, Share ✓

The polish layer. **Complete.**

1. `useHintData.ts`: derive letter/length/pair/pangram stats from Zustand store
2. `HintPanels.tsx`: 4 panels with unlock/collapse, persisted unlock state
3. Celebration polish: timing (Ällistyttävä 5s, Täysi kenno 8s), auto-close
4. Share text with hint icons, copy to clipboard
5. Achievement fire-and-forget POST on rank transition (session-deduplicated)
6. SVG icons for hints and theme toggle (inline, currentColor)
7. Expanded rules modal with Kotus link and erez.ac footer
8. Dev console helpers (`window.sk`) for testing UI states

### Phase 5 — PWA + Docker + Deployment ✓

Installable PWA with containerized deployment. **Complete.**

1. `vite-plugin-pwa`: Workbox strategies (NetworkOnly for API, StaleWhileRevalidate for assets, CacheFirst for images)
2. PWA manifest: standalone display, icons at 192/512/maskable, theme color
3. iOS standalone: `touch-action: none` on hex/controls, safe area padding, no-zoom viewport
4. `Dockerfile`: multi-stage build (node:22-alpine), non-root `sanakenno` user
5. `docker-compose.yml`: port 8081:3001, SQLite volume, health check
6. `nginx.conf`: static from `/var/www/sanakenno/dist/`, API proxy to container
7. `.github/workflows/ci.yml`: typecheck, prettier, unit tests, BDD, deploy webhook
8. `server/deploy-sanakenno.sh`: git pull, docker build, extract dist to `/var/www`

### Phase 5.5 — On-server Infrastructure ✓

Integration with the existing NUC server stack. **Complete.**

1. **Nginx**: sanakenno location blocks in `erez.ac.conf`, static from `/var/www/sanakenno/dist/`, API proxy to port 8081
2. **Deploy script**: `server/deploy-sanakenno.sh` (pull, build, docker cp dist to /var/www)
3. **Webhook**: `deploy-sanakenno` hook on port 9000, triggered by GitHub Actions after CI passes
4. **Deploy key**: separate `sanakenno_deploy_key` for git pull access
5. **Litestream**: Replication added to web_kontissa's Litestream container via extra volume mount + dbs entry

### Phase 6 — Authentication + Admin Tool ✓

Auth system and admin UI for puzzle management. **Complete.**
After this phase, web_kontissa's kenno admin is no longer needed.

#### 6a — Authentication Infrastructure

1. **`scripts/create-admin.ts`** — CLI script to create admin account:
   - Prompts for username and password
   - Enforces minimum 12-char password
   - Stores argon2id hash in `admins` table
   - Never logs or stores plaintext password
2. **`server/auth/session.ts`** — server-side session management:
   - Create session: generate cryptographically random session ID + CSRF token
   - Store in `sessions` table with expiry (configurable, e.g. 7 days)
   - Validate: check session exists, not expired, matches admin_id
   - Expire: delete session row, periodic cleanup of stale sessions
3. **`server/auth/routes.ts`** — auth endpoints:
   - `POST /api/auth/login` — verify argon2id hash, create session, set cookie
     - Constant-time comparison to prevent timing attacks
     - Rate limit: 5 attempts/minute per IP, 60s lockout
     - Generic error message (no username/password distinction)
   - `POST /api/auth/logout` — delete session, clear cookie
   - `POST /api/auth/change-password` — require current password, update hash,
     invalidate all other sessions
4. **`server/auth/middleware.ts`** — applied to all `/api/admin/*` routes:
   - Validate session cookie (HttpOnly, Secure, SameSite=Strict)
   - Verify CSRF token on state-changing requests (POST, PUT, DELETE)
   - Set security headers: `X-Content-Type-Options: nosniff`,
     `X-Frame-Options: DENY`, `Cache-Control: no-store`
   - Reject with 401 if session invalid, 403 if CSRF mismatch

#### 6b — Admin API

1. **Admin API routes** (`server/routes/admin.ts`):
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

1. **`LoginPage.tsx`** — login form, error display, redirect to admin on success
2. **`AdminLayout.tsx`** — auth-gated shell, navigation, logout
3. **`PuzzleEditor.tsx`** — CRUD for puzzle slots, center selection via VariationsGrid,
   slot navigation, swap, delete, save with dirty detection, today-warning dialogs
4. **`VariationsGrid.tsx`** — 7-button grid showing word_count/max_score/pangram_count
   per center letter, active center highlighted
5. **`WordList.tsx`** — alphabetical word display with pangram highlighting,
   block button per word with confirmation
6. **`CombinationsBrowser.tsx`** — browse/filter 7,922 combinations with 6 filter groups
   (requires, excludes, pangrams, word count best/worst, in_rotation),
   sortable columns, pagination, expandable rows showing VariationsGrid
7. **`BlockedWords.tsx`** — list, add, remove blocked words
8. **`Schedule.tsx`** — upcoming rotation calendar
9. **`Stats.tsx`** — achievement counts by rank and date, period selection (7/30/90 days)
10. **Admin route** in React: `/admin` path, redirects to login if no session

**BDD wiring:**
- `features/step-definitions/auth.steps.ts`
- `features/step-definitions/admin.steps.ts`

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

## Resolved Decisions

- **Path-based deployment with dual routing.** React version deploys to
  `erez.ac/sanakenno-react` (Vite `base: '/sanakenno-react/'`). Original Nuxt
  game stays at `erez.ac/sanakenno` until React version is validated. On cutover,
  base changes to `/sanakenno/`. This means legacy localStorage migration is NOT
  possible (different path = different origin for storage purposes).
