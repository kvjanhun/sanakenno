# @sanakenno/web

## 1.3.3

### Patch Changes

- Fix archive and theme regressions, and polish honeycomb shading across web and iOS.
- Updated dependencies
  - @sanakenno/shared@1.3.3

## 1.3.2

### Patch Changes

- Fix auth-linked state persistence and clipboard/theme regressions.
- Updated dependencies
  - @sanakenno/shared@1.3.2

## 1.3.1

### Patch Changes

- Fix theme accent contrast issues and align mobile completion styling with web.
  - @sanakenno/shared@1.3.1

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

### Patch Changes

- Updated dependencies
  - @sanakenno/shared@1.3.0

## 1.2.7

### Patch Changes

- Align stats + sync behavior across web and mobile, and use Helsinki date for failed-guess POSTs.
  - @sanakenno/shared@1.2.7

## 1.2.6

### Patch Changes

- Email: redesign the device-transfer email — clearer subject, no repeated "Sanakenno.fi" branding, single privacy disclosure at the bottom, and a tighter validity-and-single-use note
- Email: show the Sanakenno app icon next to the heading for a cleaner, more recognisable header

## 1.2.0

### Minor Changes

- Add longest_word and pangrams_found per-puzzle stats fields; expand archive API with all=true param and puzzle words endpoint; update sync merge logic for new fields.

### Patch Changes

- Updated dependencies
  - @sanakenno/shared@1.2.0

## 1.1.0

### Minor Changes

- Add player authentication and cross-device progress sync via magic links (Resend). Players can optionally create an account to back up and sync their stats and puzzle state across devices.

### Patch Changes

- @sanakenno/shared@1.1.0

## 1.0.2

### Patch Changes

- Add failed-guesses admin stats endpoint and stats-tab UI section.
  - @sanakenno/shared@1.0.2

## 0.2.4

### Patch Changes

- @sanakenno/shared@0.2.4

## 0.2.3

### Patch Changes

- @sanakenno/shared@0.2.3

## 0.2.1

### Patch Changes

- Show app version number in web rules modal and mobile settings screen
  - Web: version read from root package.json via Vite define, shown below footer links in RulesModal
  - Mobile: version read from root package.json via app.config.js and expo-constants, shown at bottom of Settings tab
  - Root package.json established as single source of truth for version across all packages

- Updated dependencies
  - @sanakenno/shared@0.2.1
