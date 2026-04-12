# @sanakenno/web

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
