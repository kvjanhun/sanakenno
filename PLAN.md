# Sanakenno Standalone — Project Plan

Porting the Sanakenno game from web_kontissa website repository to a standalone
React + Hono project. Spec-first approach: Gherkin features define
the behaviour, implementation satisfies the specs.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 19 + Vite | Modern, fast development with ESM HMR. |
| Styling | Tailwind CSS 4 + CSS Modules | Tailwind for layouts/UI; CSS Modules for complex game animations. |
| State | Zustand | Lightweight, high-performance central state. |
| Backend | Hono | Modern, lightweight, and fast framework with native async support. |
| Storage | SQLite + JSON | JSON for static puzzles; SQLite for safe, atomic achievement writes. |
| Testing | Vitest, RTL, Cucumber.js, Playwright | Comprehensive testing from unit to BDD/E2E. |
| PWA | `vite-plugin-pwa` | Automated manifest/SW generation and update handling. |
| Deployment | Docker, nginx | Containerized deployment on existing infrastructure. |

## Architecture

```
sanakenno/
├── features/                  # Gherkin specs (done)
├── scripts/
│   ├── build-puzzles.js       # Processes kotus_words.txt → puzzles.json
│   └── export-from-kontissa.js  # Pulls puzzle config from erez.ac API
├── server/
│   ├── index.js               # Hono entry point
│   ├── db/
│   │   └── schema.sql         # SQLite schema for achievements
│   ├── routes/
│   │   ├── puzzle.js          # GET /api/puzzle, GET /api/puzzle/:n
│   │   └── achievement.js     # POST /api/achievement
│   └── data/
│       ├── puzzles.json       # Pre-computed: letters, center, hashes, hints, max_score
│       └── achievements.db    # SQLite database
├── src/
│   ├── main.jsx               # React entry
│   ├── store/
│   │   └── useGameStore.js    # Zustand store (state, words, score, timer)
│   ├── hooks/
│   │   ├── useGameTimer.js    # Logic for active play-time tracking
│   │   └── useHintData.js     # Derived hint computations
│   ├── components/
│   │   ├── Honeycomb/         # Hex grid + CSS Module animations
│   │   │   ├── Honeycomb.jsx
│   │   │   └── Honeycomb.module.css
│   │   ├── WordInput.jsx      # Current word display
│   │   ├── FoundWords.jsx     # Word lists
│   │   ├── HintPanels.jsx     # Unlock-able hint cards
│   │   ├── RankProgress.jsx   # Score bar
│   │   ├── ShareButton.jsx    # Result sharing
│   │   ├── Celebration.jsx    # Overlays
│   │   └── RulesModal.jsx     # Instructions
│   ├── utils/
│   │   ├── scoring.js         # scoreWord, recalcScore, rankForScore (pure functions)
│   │   └── hash.js            # SHA-256 via crypto.subtle
│   └── styles/
│       └── index.css          # Tailwind base + custom properties
├── public/
│   └── icons/                 # PWA icons (192, 512, apple-touch)
├── tests/
│   ├── scoring.test.js        # Pure function tests
│   ├── useGameTimer.test.js   # Hook tests with fake timers
│   ├── useHintData.test.js    # Derived computation tests
│   └── components/            # React Testing Library tests
├── Dockerfile
├── docker-compose.yml
├── nginx.conf                 # Static + /api proxy
└── package.json
```

## Implementation Phases

### Phase 0 — Infrastructure & CI
Set up the environment and automated pipelines before implementation.

1. `.github/workflows/test.yml`:
   - **Lint**: ESLint + Prettier check.
   - **Vitest**: Run unit tests for hooks and utils.
   - **Cucumber**: Run BDD specs against the Hono API.
   - **Playwright**: Run E2E tests against the built React app.
2. `scripts/setup-dev.sh`: Helper to install deps and pre-commit hooks.
3. `.dockerignore` and `.gitignore` boilerplate.

### Phase 0.5 — On-server Infrastructure
Integrate the standalone project with the existing NUC server infrastructure.

1. **Nginx Configuration**:
   - Update `erez.ac.conf` to proxy `/sanakenno` to the new container (port 8081).
   - Ensure `trailing-slash` and `asset-path` normalization for the standalone app.
2. **Deployment Pipeline**:
   - `scripts/deploy-sanakenno.sh`: Pulls latest, builds, and restarts the container.
   - Configure a new webhook in the server's webhook listener to trigger this script.
3. **Container Orchestration**:
   - `docker-compose.yml`: Define the Hono backend + React frontend container.
   - Health check: `curl -f http://localhost:8081/api/health`.
   - Logging: Use the existing Loki driver to push logs to the local Loki instance.
4. **Achievement Persistence**:
   - `litestream`: Add a new replication job for `achievements.db` to Backblaze B2 (reuse existing server credentials).
5. **Systemd Service**:
   - `sanakenno.service`: Systemd unit to manage the Docker Compose project life-cycle.

### Phase 1 — Data pipeline
Build the puzzle pre-computation script. This is the foundation — everything
else reads from `puzzles.json`.

1. Copy `kotus_words.txt` to the repo
2. Write `scripts/build-puzzles.js`:
   - Read the wordlist (filter ≥4 chars, lowercase, Finnish alphabet, strip hyphens)
   - For each puzzle (exported from web_kontissa): filter valid words, compute
     hashes, hint_data, max_score, scoring
   - Output `server/data/puzzles.json`
3. Write `scripts/export-from-kontissa.js`:
   - Fetch puzzle slots + centers from erez.ac admin API
   - Write raw puzzle config (letters + center per slot) for build-puzzles to consume
4. Validate: puzzles.json should produce identical word lists and hashes as the
   current Flask backend

**Test:** Unit tests for scoring functions, word filtering, hash generation.

### Phase 2 — Hono API
Minimal backend serving puzzles and recording achievements.

1. `GET /api/puzzle` — read puzzles.json, compute today's index by date rotation
2. `GET /api/puzzle/:number` — serve a specific puzzle (wrap around)
3. `POST /api/achievement` — validate and store in `achievements.db` (SQLite)
4. CORS + JSON body parsing

**Test:** API tests with Vitest + Hono's `app.request()`. Validates `api.feature` scenarios.

### Phase 3 — React game (core)
The game UI without hints, celebrations, or PWA.

1. Vite + React + Tailwind + Zustand project scaffold
2. `useGameStore`: centralized state (fetch puzzle, found words, score, rank, validation)
3. `useGameTimer` hook: logic for tracking play-time
4. `Honeycomb` component: SVG hex grid + CSS Module animations
5. Keyboard input handler (letters, Backspace, Enter)
6. `WordInput` display with coloured characters
7. `FoundWords` list (recent 6 + expandable)
8. `RankProgress` bar with thresholds
9. localStorage persistence (per-puzzle)
10. Submit validation chain: length → center letter → puzzle letters → hash check

**Test:** Unit tests for hooks, React Testing Library for components.
Validates `scoring.feature`, `word-validation.feature`, `ranks.feature`,
`persistence.feature`, `timer.feature`, `interaction.feature`, `theme.feature`.

### Phase 4 — Hints, celebrations, share
The polish layer.

1. `useHintData` hook: letterMap, unfoundLengths, pangramStats, lengthDistribution, pairMap
2. `HintPanels` with unlock/collapse mechanics
3. Celebration overlays (Ällistyttävä glow, Täysi kenno golden)
4. `ShareButton` — clipboard copy with formatted result text
5. Achievement fire-and-forget POST on rank transition
6. Midnight rollover detection

**Test:** Validates `hints.feature`, `achievements.feature`.

### Phase 5 — PWA + deployment
Make it installable and deploy alongside erez.ac.

1. `vite-plugin-pwa` configuration
2. iOS double-tap zoom prevention
3. Dockerfile (Multi-stage build, Node alpine, non-root user)
4. docker-compose.yml on the NUC
5. nginx config: route sanakenno subdomain or path to the container
6. Icons (reuse existing SVG source, generate sizes)

**Test:** Validates `pwa.feature`, `infrastructure.feature`. Manual testing on iOS Safari.

### Phase 6 — BDD wiring
Wire the Gherkin specs (`features/*.feature`) to actual test runners.

1. **API Acceptance (Cucumber.js + Hono test helper)**:
   - Implement step definitions for `api.feature` and `puzzle.feature`.
   - Validates the Hono backend matches the spec.
2. **Logic Acceptance (Cucumber.js + Pure Functions)**:
   - Implement step definitions for `scoring.feature`, `word-validation.feature`, and `ranks.feature`.
   - Uses the actual `scoring.js` logic to satisfy Gherkin scenarios.
3. **E2E Acceptance (Cucumber.js + Playwright)**:
   - Implement step definitions for `interaction.feature` and `hints.feature`.
   - Drives a real browser to verify the React UI satisfies the spec.
4. **CI Integration**:
   - Ensure `npm test` runs all three levels (Unit, BDD, E2E).

## What stays in web_kontissa

- The puzzle editor (AdminKennoPuzzleTool) — used to browse combinations and
  manage rotation. Sanakenno standalone imports the result via export script.
- Blocked words management — admin blocks words in web_kontissa, export script
  pulls the blocked list.
- The 101k wordlist source — kotus_words.txt is copied to this repo but the
  authoritative source remains web_kontissa.

## Key design decisions

1. **Pre-compute everything at build time.** The current Flask backend filters
   101k words on every cache miss. The standalone version pre-computes once
   into puzzles.json. The Hono API just reads JSON and picks today's entry.

2. **No authentication.** The game is public. Achievements are anonymous.
   Admin functions stay in web_kontissa.

3. **Centralized Zustand state.** Prevents prop drilling and simplifies
   communication between game logic and UI components.

4. **SQLite for achievements.** Provides ACID compliance for persistent
   data without the overhead of a full database server.

5. **Finnish UI, English code.** All user-facing strings are Finnish (this is
   a Finnish word game). Variable names, comments, and docs are English.

## Open questions

- **Subdomain vs path?** `sanakenno.erez.ac` vs `erez.ac/sanakenno`. Subdomain
  is cleaner for a standalone app but needs a TLS cert. Current site already has
  a wildcard? Check nginx config.
- **Shared wordlist?** The 101k wordlist is 1.2MB. Could mount as a shared
  Docker volume instead of copying. But copying is simpler and the file is static.

