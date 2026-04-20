---
name: cross-platform-ui-parity
description: Keep Sanakenno behavior and UI aligned across web and mobile. Use when changing game flow, archive, stats, hints, controls, auth, themes, or other user-facing behavior that likely exists in both `packages/web` and `packages/mobile`.
---

# Cross Platform UI Parity

Check both clients before declaring a user-facing change complete.

## Workflow

1. Identify whether the requested behavior exists on web, mobile, or both.
2. Inspect shared logic first:
   - `packages/shared/`
   - shared stores or derived helpers used by both clients
3. Inspect both client implementations:
   - web entry points in `packages/web/src/`
   - mobile screens in `packages/mobile/app/`
   - paired components in `packages/web/src/components/` and `packages/mobile/src/components/`
4. Decide whether the change belongs in shared logic, platform-specific UI, or both.
5. Preserve established platform patterns:
   - web uses CSS variables and Tailwind utilities
   - mobile uses `StyleSheet.create` and `useTheme()`
6. If parity should remain intentionally different, note the reason explicitly instead of leaving it implicit.

## Common Pairs

- Main game: `packages/web/src/App.tsx` and `packages/mobile/app/(tabs)/index.tsx`
- Rank and score UI: `packages/web/src/components/RankProgress.tsx` and `packages/mobile/src/components/RankProgress.tsx`
- Honeycomb: `packages/web/src/components/Honeycomb/Honeycomb.tsx` and `packages/mobile/src/components/Honeycomb.tsx`
- Controls: `packages/web/src/components/GameControls.tsx` and `packages/mobile/src/components/GameControls.tsx`
- Celebration: `packages/web/src/components/Celebration.tsx` and `packages/mobile/src/components/Celebration.tsx`

## Validation

Run both package typechecks after parity work:

- `pnpm exec tsc -p packages/web/tsconfig.json --noEmit`
- `pnpm exec tsc -p packages/mobile/tsconfig.json --noEmit`

Add or run narrower tests where the changed behavior already has coverage.
