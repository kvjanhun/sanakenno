---
name: theme-audit
description: Audit and fix Sanakenno palette, dark mode, contrast, and theme parity issues. Use when tasks mention theme, palette IDs such as `mono` or `aamu`, accent surfaces, dark mode regressions, hardcoded colors, or mismatches between web and mobile.
---

# Theme Audit

Audit tokens first, then audit surfaces that consume those tokens.

## Workflow

1. Compare the source theme definitions:
   - `packages/mobile/src/theme.ts`
   - `packages/web/src/styles/index.css`
2. Confirm the palette values and `onAccent` behavior match across platforms.
3. Search for hardcoded colors in theme-sensitive components:
   - `text-white`
   - `#fff`
   - `#ffffff`
   - direct hardcoded text colors on accent backgrounds
4. Inspect the affected surfaces on both platforms when applicable:
   - rank pills
   - buttons on accent backgrounds
   - honeycomb center hex
   - celebration cards
   - message pills
5. Check normal state and completed state separately. Completed-state regressions often come from faded or disabled variants, not the main accent token.
6. Prefer:
   - `theme.onAccent` on mobile
   - `var(--color-on-accent)` on web
7. Keep platform-specific styling conventions intact while aligning the underlying behavior.

## Common Files

- `packages/web/src/components/RankProgress.tsx`
- `packages/web/src/components/GameControls.tsx`
- `packages/web/src/components/Honeycomb/Honeycomb.tsx`
- `packages/mobile/src/components/RankProgress.tsx`
- `packages/mobile/src/components/Honeycomb.tsx`
- `packages/mobile/src/components/MessageBar.tsx`
- `packages/mobile/src/components/AuthSection.tsx`

## Validation

Run:

- `pnpm exec tsc -p packages/web/tsconfig.json --noEmit`
- `pnpm exec tsc -p packages/mobile/tsconfig.json --noEmit`

If the change affects behavior described in `features/theme.feature` or browser-visible states, also run the matching tests.
