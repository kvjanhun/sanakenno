# @sanakenno/mobile

## 0.6.2

### Patch Changes

- Refine the hint panel styling to better match web, including a cleaner tab bar and primary-surface open panel.

## 0.6.1

### Patch Changes

- Version bump.

## 0.6.0

### Minor Changes

- Refresh the gameplay UI with cleaner hint panels and more polished control buttons across web and iOS.
- Updated dependencies
  - @sanakenno/shared@1.4.0

## 0.4.6

### Patch Changes

- Auth: tap "Näytä QR-koodi" again to hide the QR code; button label flips to "Piilota QR-koodi" while shown
- Auth: scale + light haptic feedback on every action button (copy link, copy code, QR, send email, send, connect, logout) so taps feel responsive even when there's no visible result
- Auth: fix misleading post-send confirmation — show "Sähköposti lähetetty!" in accent colour after a successful send, leaving "Tarkista sähköpostiosoite." reserved for invalid-format errors

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
