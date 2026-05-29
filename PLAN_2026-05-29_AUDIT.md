# Sanakenno UI polish audit

Date: 2026-05-29

## Fixed in this pass

- Standard web overlays now share one modal shell for backdrop, width, border,
  padding, close button size, close button position, and Escape/backdrop close
  behavior.
- The close button now uses the active accent color in Rules, Stats, Archive,
  Puzzle Words, and Sync/User modal.
- The Sync/User modal no longer shows horizontal divider lines, including the
  linked/logged-in view.
- The current-word display and score text now use the same proportional system
  font direction as the paused iOS app instead of the old mono game-area look.
- The monitor script false-positive path is covered by a mocked local harness,
  so Docker read glitches can be tested without hitting Telegram.

## Remaining inconsistencies to discuss

- The archive action sheet and celebration overlay remain visually distinct from
  standard modals because their interaction model is different.
- Admin screens still use a denser operational layout than player-facing game
  overlays. That seems appropriate unless the admin UI gets a dedicated polish
  pass.
- The web rank threshold popover is still a compact anchored panel, while iOS
  presents rank details as centered overlays. Changing this would be a product
  interaction decision, not a low-risk consistency fix.
- The paused iOS app has native tab/settings polish that should stay as
  reference material only while native publishing is on hiatus.
