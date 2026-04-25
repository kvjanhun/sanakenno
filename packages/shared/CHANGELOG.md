# @sanakenno/shared

## 1.5.0

### Minor Changes

- 3b7e3f2: - Server now supports running two API containers behind nginx for multi-core throughput; SQLite uses WAL with a busy timeout, and a DB-backed cache generation invalidates puzzle/archive caches across processes.
  - Logged-in gameplay sync coalesces stats and puzzle-state into a single `POST /api/player/sync/progress` request per accepted word, halving outgoing traffic.
  - Web app reaches feature parity with mobile: archive paginates over all puzzles, stats include lifetime totals, found-word pills link to Kotus definitions and bold pangrams, and a palette/theme selector lives next to the dark-mode toggle.
  - Security: wrapped slot aliases of today's puzzle no longer leak the word list.
  - UI polish: header icon spacing, archive modal fills the viewport with a fixed height, and the selected-day frame renders as an inset ring so it can't be clipped.

## 1.4.3

## 1.4.2

## 1.4.1

## 1.4.0

### Minor Changes

- Add shared column-first hint ordering support used by the refreshed hint panels on web and iOS.

## 1.3.3

### Patch Changes

- Fix archive and theme regressions, and polish honeycomb shading across web and iOS.

## 1.3.2

### Patch Changes

- Fix auth-linked state persistence and clipboard/theme regressions.

## 1.3.1

## 1.3.0

### Minor Changes

- Stable pairing codes and light/dark theme preference sync
  - Pairing no longer uses one-shot, 15-minute transfer tokens. Every player has a
    stable `player_key` minted at first launch; pasting it on another device pairs
    them. The same code can be reused across devices and delivered by email
    without expiry. Rotating the code (via "Vaihda tunniste") mints a new one and
    drops other devices' sessions, allowing progress to be forked intentionally.
  - The light/dark theme preference (light / dark / system) now round-trips
    between web and mobile via the account sync channel, so a paired browser and
    phone share one setting.

## 1.2.7

## 1.2.0

### Minor Changes

- Add longest_word and pangrams_found per-puzzle stats fields; expand archive API with all=true param and puzzle words endpoint; update sync merge logic for new fields.

## 1.1.0

## 1.0.2

## 0.2.4

## 0.2.3

## 0.2.1

### Patch Changes

- Show app version number in web rules modal and mobile settings screen
  - Web: version read from root package.json via Vite define, shown below footer links in RulesModal
  - Mobile: version read from root package.json via app.config.js and expo-constants, shown at bottom of Settings tab
  - Root package.json established as single source of truth for version across all packages
