# Sanakenno Mobile — Development Plan

## Context

The mobile app (Expo 55, React Native) is working on a physical iPhone but needs bug fixes and UX polish before App Store release. The requirements come from `ios/development.md` and cover bugs, UI improvements, a new server-side feature, and a versioning strategy.

---

## Task Ordering

Groups are ordered by dependency and complexity. Items within a group are independent.

### Group 1 — Quick Bug Fixes

#### Bug B: Shuffle icon looks like "refresh"
- **File:** `src/components/GameControls.tsx` (lines 82–113)
- Replace the `ShuffleIcon` SVG paths with a standard crossing-arrows shuffle icon
- Keep same dimensions (`width={22} height={22} viewBox="0 0 24 24"`, `strokeWidth={2}`)

#### Bug D: Celebration share text differs from normal share
- **File:** `app/(tabs)/index.tsx` (lines 166–173)
- Replace the inline text construction in `<Celebration onShare={...}>` with a call to `copyStatus()`
- This matches web behavior where both celebration and normal share use `copyStatus()`

#### Bug E: Pangram text wrong + double exclamation marks
- **File:** `src/store/useGameStore.ts` (lines 249–257)
- Change `'Täysosuma!'` → `'Pangrammi!'` (line 250) to match web
- Fix rank-up message: `msg = newRank.endsWith('!') ? newRank : \`${newRank}!\`` to avoid "Nyt mennään!!"
- Affected ranks from `RANKS` in shared: "Nyt mennään!" and "Etsi sanoja!" already end with `!`

#### Bug F: "Ei sanakirjassa" stays visible when typing
- **File:** `src/store/useGameStore.ts`
- `addLetter` (line 153): add `message: ''` to the `set()` call when `wordRejected` is true
- `deleteLetter` (line 162): add `message: ''` to the `set()` call when `wordRejected` is true
- Root cause: typing clears `wordRejected` but not `message`, and the setTimeout guard then fails

### Group 2 — Medium Bug Fixes

#### Bug A: Midnight rollover fails from background
- **File:** `src/hooks/useMidnightRollover.ts`
- Problem: `setTimeout` fires once but never re-schedules (effect has `[]` deps, comment says "recursive" but it isn't). Also, iOS suspends JS timers while backgrounded.
- Fix: make `scheduleNextCheck()` self-recursive after each fire. Add +500ms buffer to avoid clock-edge misfires. Keep AppState listener as reliable fallback.

```ts
const scheduleNextCheck = () => {
  timerId = setTimeout(() => {
    checkAndRefetch();
    scheduleNextCheck();
  }, msUntilMidnight() + 500);
};
scheduleNextCheck();
```

#### Bug C: Progress bar animation glitch near 100%
- **File:** `src/components/RankProgress.tsx`
- Add `overshootClamping: true` to the `withSpring` config (line 51)
- Clamp width in `fillStyle`: `Math.min(100, Math.max(0, animatedProgress.value))`
- Track previous score with a ref; only animate when delta > 10 points, otherwise snap directly
- Initialize `animatedProgress` to the initial `progress` value to avoid animating on load

### Group 3 — UI/UX Improvements

#### Dev B: Found words section improvements
- **File:** `src/components/FoundWords.tsx`
- Remove `if (foundWords.size === 0) return null;` (line 142) — always render container to reserve space
- Show header with "(0)" when empty; hide pill row and chevron
- Move chevron next to text: change `headerRow` from `justifyContent: 'space-between'` to gap-based layout
- Word colors in sheet: change `isFlash || isCenter ? theme.accent : theme.textPrimary` to just `isFlash ? theme.accent : theme.textPrimary` (line 269)

#### Dev C: Hex press animation too bouncy
- **File:** `src/components/Honeycomb.tsx` (lines 93–101)
- Replace `withSpring(0.92, ...)` with `withTiming(0.95, { duration: 50 })`
- Replace `withSpring(1, ...)` with `withTiming(1, { duration: 80 })`
- Add `withTiming` and `Easing` to reanimated imports

#### Dev D: Loading screen for cold start
- **Files:** `app/_layout.tsx`, `app.json`
- Add `expo-splash-screen` to plugins in `app.json`
- Add dark-mode splash config under `ios.splash.dark` with appropriate background colors (`#FFFFFF` light, `#1A1A1A` dark)
- In `_layout.tsx`: call `SplashScreen.preventAutoHideAsync()` at module scope, call `SplashScreen.hideAsync()` once the game store has a puzzle loaded
- Requires `expo prebuild` after config change

### Group 4 — Features

#### Dev A: Archive shows points + rank per day
- **Server:** Extend `GET /api/archive` to include `max_score` per entry (file: `server/routes/archive.ts`)
- **Mobile:** `app/(tabs)/archive.tsx`
  - Import `storage` and `rankForScore` from shared
  - In a `useMemo`, build a map of `puzzleNumber → { score, rank }` from MMKV storage (`game_state_${n}`)
  - Display score and rank badge in each archive row alongside the letters
  - Tighten letter spacing to make room
- **Future:** Also persist `max_score` in `game_state_${n}` going forward (modify `saveState` in `useGameStore.ts`)

#### Dev E: Haptics intensity levels
- **Settings store** (`src/store/useSettingsStore.ts`): Change `hapticsEnabled: boolean` → `hapticsIntensity: 'off' | 'light' | 'medium' | 'heavy'`; migrate old boolean values
- **Haptics module** (`modules/prepared-haptics/src/index.ts`): Add `setIntensity()`, cap requested style to user's preference (min of requested vs setting)
- **Settings UI** (`app/(tabs)/settings.tsx`): Replace Switch with segmented control: Off / Kevyt / Normaali / Voimakas
- Call sites (GameControls, Honeycomb, useGameStore) need no changes — module handles capping internally
- **Gotcha:** `triggerNotification` (success/error/warning) has no intensity levels natively. For `light` setting, downgrade notifications to a light impact instead.

#### General: Record non-dictionary guesses
- **New DB table** (server): `failed_guesses` with columns `word, puzzle_date, count, first_at, last_at`, unique on `(word, puzzle_date)`, upsert increments `count`
- **New route** (`server/routes/failed-guess.ts`): `POST /api/failed-guess` with body `{ word, date }`. Rate-limited. Max word length validation.
- **Mobile store** (`src/store/useGameStore.ts`): After "Ei sanakirjassa" error (around line 234), fire-and-forget `POST /api/failed-guess` with `{ word: normalized, date }`
- **Web store**: Same fire-and-forget POST in the equivalent location

### Group 5 — Versioning

- **Recommendation:** Unified version across web + mobile (single product, shared code)
- Root `package.json` version is source of truth; sync to `app.json` and `packages/mobile/package.json`
- EAS `autoIncrement` handles iOS build numbers separately
- GitHub releases for changelogs, tag format `v0.2.0`
- Bump to `0.2.0` after completing Groups 1–4

---

## Verification

| Task | How to verify |
|------|---------------|
| Bug B | Visual: shuffle icon has crossing arrows, not circular |
| Bug D | Trigger celebration → tap Jaa → verify share text has progress bar + rank (same as normal share) |
| Bug E | Find pangram → see "Pangrammi!". Rank up to "Nyt mennään!" → see single `!` |
| Bug F | Submit invalid word → start typing → error clears immediately |
| Bug A | Mock `msUntilMidnight()` to 5s → verify re-fires. Background past mock midnight → foreground → puzzle refreshes |
| Bug C | Score near 100% → bar doesn't overshoot. Small score gain (<10 pts) → bar snaps, no animation |
| Dev B | Before finding any words: found-words area visible, hex doesn't jump. Words in sheet are primary color, not orange |
| Dev C | Tap hex → subtle scale, no bounce |
| Dev D | Cold open → splash screen shows (correct theme) → hides when puzzle loads |
| Dev A | Open archive → see score + rank for previously played puzzles |
| Dev E | Settings → haptics slider → verify each level on device |
| General | Submit non-dictionary word → check server DB for recorded entry |
