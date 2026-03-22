# Sanakenno Standalone — Project Plan

Porting the Finnish Spelling Bee game from web_kontissa to a standalone
React + Express project. Spec-first approach: Gherkin features define
the behaviour, implementation satisfies the specs.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 19 + Vite | Deepens FSO React foundation. Vite already familiar from Nuxt. |
| Styling | Tailwind CSS 4 | Already known. Don't change everything at once. |
| State | Start with lifted state + props | Learn React's native state model first. Add Zustand only if prop drilling becomes painful. |
| Backend | Express | FSO uses it, most learning resources available. |
| Storage | JSON files | Puzzles are static. Achievements are append-only. No DB needed. |
| Testing | Vitest (unit), React Testing Library (components), Cucumber.js (BDD, later) |
| PWA | Manual service worker + manifest | Same approach as current site, framework-independent. |
| Deployment | Docker, nginx on the same NUC as erez.ac |

## Architecture

```
sanakenno/
├── features/                  # Gherkin specs (done)
├── scripts/
│   ├── build-puzzles.js       # Processes kotus_words.txt → puzzles.json
│   └── export-from-kontissa.js  # Pulls puzzle config from erez.ac API
├── server/
│   ├── index.js               # Express entry point
│   ├── routes/
│   │   ├── puzzle.js          # GET /api/puzzle, GET /api/puzzle/:n
│   │   └── achievement.js     # POST /api/achievement
│   └── data/
│       ├── puzzles.json       # Pre-computed: letters, center, hashes, hints, max_score
│       └── achievements.json  # Append-only achievement log
├── src/
│   ├── main.jsx               # React entry + router
│   ├── App.jsx                # Root component, puzzle fetch, game state
│   ├── hooks/
│   │   ├── useGameTimer.js    # Port of Vue composable → React hook
│   │   ├── useHintData.js     # Derived hint computations
│   │   └── useSanakenno.js    # Core game state: words, score, rank, validation
│   ├── components/
│   │   ├── Honeycomb.jsx      # SVG hex grid (React.memo for perf)
│   │   ├── WordInput.jsx      # Current word display with coloured letters
│   │   ├── FoundWords.jsx     # Recent + expandable full list
│   │   ├── HintPanels.jsx     # 4 unlock-able hint cards
│   │   ├── RankProgress.jsx   # Score bar + rank thresholds
│   │   ├── ShareButton.jsx    # Copy result to clipboard
│   │   ├── Celebration.jsx    # Glow/golden overlays
│   │   └── RulesModal.jsx     # How to play
│   ├── utils/
│   │   ├── scoring.js         # scoreWord, recalcScore, rankForScore (pure functions)
│   │   └── hash.js            # SHA-256 via crypto.subtle
│   └── styles/
│       └── index.css          # Tailwind base + custom properties
├── public/
│   ├── sanakenno.webmanifest
│   ├── sanakenno-sw.js
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

### Phase 2 — Express API
Minimal backend serving puzzles and recording achievements.

1. `GET /api/puzzle` — read puzzles.json, compute today's index by date rotation
2. `GET /api/puzzle/:number` — serve a specific puzzle (wrap around)
3. `POST /api/achievement` — validate and append to achievements.json
4. Rate limiting via `express-rate-limit`
5. CORS + JSON body parsing

**Test:** API tests with supertest. Validates `api.feature` scenarios.

### Phase 3 — React game (core)
The game UI without hints, achievements, or PWA.

1. Vite + React + Tailwind project scaffold
2. `useSanakenno` hook: fetch puzzle, manage found words, score, rank, word validation
3. `useGameTimer` hook: port from Vue (nearly identical with useState/useEffect)
4. `Honeycomb` component: SVG hex grid with tap/click input
5. Keyboard input handler (letters, Backspace, Enter)
6. `WordInput` display with coloured characters
7. `FoundWords` list (recent 6 + expandable)
8. `RankProgress` bar with thresholds
9. localStorage persistence (per-puzzle)
10. Submit validation chain: length → center letter → puzzle letters → hash check

**Test:** Unit tests for hooks, React Testing Library for components.
Validates `scoring.feature`, `word-validation.feature`, `ranks.feature`,
`persistence.feature`, `timer.feature`, `interaction.feature`.

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

1. Web manifest + service worker (port from current)
2. iOS double-tap zoom prevention
3. Dockerfile (Node alpine, build React → serve static + Express API)
4. docker-compose.yml on the NUC
5. nginx config: route sanakenno subdomain or path to the container
6. Icons (reuse existing SVG source, generate sizes)

**Test:** Validates `pwa.feature`. Manual testing on iOS Safari.

### Phase 6 — BDD wiring (later)
Wire Gherkin specs to actual test runners.

1. Install Cucumber.js
2. Write step definitions for API features (supertest under the hood)
3. Write step definitions for scoring/validation (direct function calls)
4. Consider RF for API acceptance tests (after RF learning journey on web_kontissa)

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
   into puzzles.json. The Express API just reads JSON and picks today's entry.

2. **No authentication.** The game is public. Achievements are anonymous.
   Admin functions stay in web_kontissa.

3. **State in lifted props first.** Don't add Zustand until prop drilling
   is demonstrably painful. The progression teaches more than starting with
   the "right" answer.

4. **React.memo when needed, not upfront.** Build naive, optimise when
   the honeycomb feels laggy on keystroke.

5. **Finnish UI, English code.** All user-facing strings are Finnish (this is
   a Finnish word game). Variable names, comments, and docs are English.

## Open questions

- **Subdomain vs path?** `sanakenno.erez.ac` vs `erez.ac/sanakenno`. Subdomain
  is cleaner for a standalone app but needs a TLS cert. Current site already has
  a wildcard? Check nginx config.
- **Shared wordlist?** The 101k wordlist is 1.2MB. Could mount as a shared
  Docker volume instead of copying. But copying is simpler and the file is static.
- **Achievement storage long-term?** JSON append works for low traffic. If it
  grows, consider SQLite (single file, no server). But don't premature-optimise.
