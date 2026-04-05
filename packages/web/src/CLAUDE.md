# Frontend Rules (`src/`)

## React Patterns
- **Zustand**: subscribe selectively — one selector per value, not `useGameStore(s => s)`.
- **Actions**: destructure actions outside render (stable refs, no re-render on call).
- **Memoisation**: `useMemo`/`useCallback` where the cost justifies it; don't cargo-cult them.
- **Non-rendering state**: use `useRef`, not `useState`, for values that don't drive the UI.
- **No prop drilling**: global game state (score, foundWords, puzzle, hints) lives in Zustand.

## Components
- Every non-trivial component and hook gets a JSDoc block (purpose, props, return).
- Complex logic gets inline comments explaining *why*, not *what*.
- Keep components focused — split when a single file starts doing two things.

## Styling
- Design tokens are CSS custom properties (`--color-*`, `--font-*`). Always use them; never hardcode colours or font names.
- Layout and spacing via Tailwind utility classes. Token-dependent styles (colours, fonts) via inline `style={{}}`.
- No CSS Modules — the token system handles theming cleanly without them.

## Language
- All user-facing strings: **Finnish**.
- All code, comments, variable names, JSDoc: **English**.
