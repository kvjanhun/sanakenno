# @sanakenno/mobile

## 0.4.2

### Patch Changes

- Archive: mark revealed puzzles in the archive list and show a clear no-stats notice in the puzzle action sheet
- Archive: change puzzle action modal animation to fade so the dark overlay fades in instead of rolling up

## 0.4.0

### Minor Changes

- Archive: show all past puzzles (pinned today card above scrollable list); bottom sheet on past puzzle tap with Pelaa / Näytä vastaukset options
- New puzzle-words screen: shows found vs missed words, sets revealed flag to freeze stats
- Stats screen: longest word, total words, total pangrams summary rows
- Hint panel: re-tapping active tab hides the panel; height reserved when hidden
- Updated dependencies
  - @sanakenno/shared@1.2.0

## 1.1.0

### Patch Changes

- @sanakenno/shared@1.1.0

## 0.2.4

### Patch Changes

- Redesign archive list: today puzzle as framed Tänään section, uniform letter display with inline accent for center letter
  - @sanakenno/shared@0.2.4

## 0.2.3

### Patch Changes

- Fix archive/stats refresh, puzzle numbering, midnight rollover, and UI animations
  - @sanakenno/shared@0.2.3

## 0.2.1

### Patch Changes

- Show app version number in web rules modal and mobile settings screen
  - Web: version read from root package.json via Vite define, shown below footer links in RulesModal
  - Mobile: version read from root package.json via app.config.js and expo-constants, shown at bottom of Settings tab
  - Root package.json established as single source of truth for version across all packages

- Updated dependencies
  - @sanakenno/shared@0.2.1
