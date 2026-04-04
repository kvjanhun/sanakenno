# Sanakenno React Native Migration Plan

## Context

Sanakenno is a Finnish word puzzle game currently running as a React 19 web app (PWA). The goal is to build truly native iOS and Android apps using React Native — not a WebView wrapper. This is a learning project: architecture should be clean and idiomatic, prioritizing doing things "right." Development will be AI-agent driven.

The backend (Hono + SQLite) stays as-is. The same API serves all clients.

---

## Architecture Decisions

### Expo with Continuous Native Generation (CNG)
Use **Expo SDK 53+** with CNG (`npx expo prebuild`). This gives full native control without manually maintaining Xcode/Gradle projects. Expo supports all needed native modules: `expo-crypto`, `expo-haptics`, `react-native-svg`, `react-native-reanimated`. For AI-agent driven development, Expo's tooling and error messages are dramatically better than bare RN.

### Mono-repo with Shared Package
Convert to a **pnpm workspace mono-repo**:
```
sanakenno/
  packages/
    shared/          # Pure logic, types, constants
    web/             # Current React web app (moved here)
    mobile/          # New Expo React Native app
  features/          # BDD specs (stays at root)
  server/            # API server (stays at root)
  pnpm-workspace.yaml
```
The web app keeps working throughout migration. Shared logic is never duplicated.

**`packages/shared` contains:**
- `scoring.ts`, `stats.ts`, `hint-data.ts`, `kotus.ts` (pure functions, verbatim)
- All shared TypeScript types (`Puzzle`, `HintData`, `PlayerStats`, `StatsRecord`, rank types, etc.)
- Constants (`RANKS`, `HINT_ICONS`, `HINT_ORDER`)

**Not shared** (platform-dependent): `storage.ts`, `hash.ts`, the Zustand store itself, all UI components.

### Keep Zustand with Dependency Injection
Zustand works identically in RN. Same selective subscription pattern. The store is ~95% identical between web and mobile — only 3 platform API swaps (storage, crypto, share).

To keep the store truly platform-agnostic, use **dependency injection**: the store factory receives platform adapters (storage, crypto, share) as arguments rather than importing them directly. This prevents the web app from accidentally pulling in mobile-only libraries and vice versa.

```typescript
// packages/shared/src/createGameStore.ts
export function createGameStore(adapters: PlatformAdapters) { ... }

// packages/web/src/store.ts
import { createGameStore } from '@sanakenno/shared';
export const useGameStore = createGameStore({ storage: webStorage, crypto: webCrypto, share: webShare });

// packages/mobile/src/store.ts
import { createGameStore } from '@sanakenno/shared';
export const useGameStore = createGameStore({ storage: mmkvStorage, crypto: expoCrypto, share: nativeShare });
```

This moves the store logic itself into `packages/shared` — the only platform-specific code per app is the thin adapter wiring.

### Hexagon Grid: react-native-svg
Direct port of current SVG approach. 7 polygons + 7 text elements is trivially light. `<svg>` → `<Svg>`, `<polygon>` → `<Polygon>`. Touch moves from `onPointerDown` to `Pressable` with `onPressIn`/`onPressOut`. Press animations via Reanimated (UI thread, smoother than CSS).

### Navigation: Expo Router + Bottom Sheet Modals
Use **Expo Router** (file-based routing built on React Navigation) + `@gorhom/bottom-sheet` for modals. Expo Router is the 2026 Expo standard — it provides file-based routing, built-in deep linking, and typed routes out of the box. The game is single-screen; Archive, Stats, Rules become bottom sheets or presented modals. Celebration is an overlay animation.

### Platform-Specific UI (80/20 split)
~80% shared component code. Platform splits via `Platform.select()` and `.ios.tsx`/`.android.tsx` file extensions for:
- iOS: SF Pro font, translucent sheet presentations, iOS haptic patterns
- Android: Roboto, Material Design 3 styling, Android haptic patterns, edge-to-edge

Liquid Glass (iOS 26) has no RN API yet. Design for it (translucent backgrounds, whitespace, vibrancy via `react-native-blur`) and adopt native APIs when available.

---

## Git Strategy

```
main                          # Production web app — never broken
  └── feat/monorepo-setup     # Phase 0: restructure → merge to main early
  └── feat/mobile             # Phases 1-5: all mobile work
        ├── feat/mobile-grid       # Sub-branches for parallel work
        ├── feat/mobile-store
        └── etc.
```

- `main` always deploys the web app
- `feat/monorepo-setup` merges to `main` once verified (repo restructure, no behavior change)
- `feat/mobile` is the long-lived mobile branch; sub-branches merge into it
- TestFlight builds from `feat/mobile` via EAS Build
- Once feature-complete, `feat/mobile` merges to `main`

---

## Key Dependencies

| Package | Purpose | Replaces |
|---|---|---|
| `expo` (~53) | Framework + build | Vite |
| `expo-crypto` | SHA-256 hashing | `crypto.subtle` |
| `react-native-mmkv` | Sync key-value storage | `localStorage` |
| `zustand` (^5) | State management | Same |
| `react-native-svg` | Hexagons + icons | Browser SVG |
| `react-native-reanimated` (~3) | UI-thread animations | CSS transitions |
| `react-native-gesture-handler` | Native gestures | Pointer events |
| `expo-router` | File-based routing + deep linking | Hash routing |
| `@gorhom/bottom-sheet` | Bottom sheet modals | CSS overlay modals |
| `react-native-safe-area-context` | Safe area insets | `env(safe-area-inset-*)` |
| `expo-haptics` | Haptic feedback | New capability |
| `expo-sharing` | Native share sheet | `navigator.clipboard` |

---

## Phased Implementation

### Phase 0: Mono-repo Restructure
**Goal**: pnpm workspace without changing web app behavior.

This is the riskiest structural change — relative path breaks are the main hazard. Split into 3 small, independently verifiable PRs:

**PR 0a — Extract shared package:**
1. Create `pnpm-workspace.yaml` and `packages/shared/` with its own `package.json` + `tsconfig.json`
2. Copy pure utils and types to `packages/shared/src/`
3. Update web app imports to `@sanakenno/shared`
4. Verify: typecheck, lint, unit, BDD, build all pass
5. Merge to `main`

**PR 0b — Move web app to `packages/web/`:**
1. Move `src/`, `index.html`, `vite.config.js`, web-specific configs into `packages/web/`
2. Update all relative paths (Vite aliases, tsconfig paths, test configs)
3. Verify: full test suite + Vite dev server + production build all work
4. Merge to `main`

**PR 0c — Store dependency injection:**
1. Extract `createGameStore` factory into `packages/shared/` with `PlatformAdapters` interface
2. Web app provides its adapters (localStorage, crypto.subtle, clipboard)
3. Verify: all tests pass, no behavior change
4. Merge to `main`

### Phase 1: Mobile Scaffold
**Goal**: Expo app that fetches puzzle and displays letters as text.
1. `npx create-expo-app packages/mobile`
2. Create platform adapters: `storage.ts` (MMKV), `hash.ts` (expo-crypto)
3. Port Zustand store (swap 3 platform APIs)
4. Minimal `App.tsx` showing puzzle data + score

### Phase 2: Core Game Loop
**Goal**: Tap letters → build words → submit → score.
- **2a**: Port Honeycomb (react-native-svg + Reanimated press animations + haptics)
- **2b**: Port WordInput + GameControls + MessageBar (can parallelize with 2a)
- **2c**: Wire store to all components, test full game loop

### Phase 3: Persistence + Timer + Midnight
**Goal**: State survives restart. Timer works with AppState. New puzzle at midnight.
- **3a**: Verify MMKV persistence (save/load/restore)
- **3b**: Port `useGameTimer` (AppState instead of visibility/blur events)
- **3c**: Port `useMidnightRollover` (state reset instead of page reload)

### Phase 4: Full UI + Modals
**Goal**: Feature parity with web app.
- **4a**: Theme system (React Context providing design tokens, `useTheme()` hook)
- **4b**: Header bar + navigation shell (SafeAreaView, icons via react-native-svg)
- **4c**: RankProgress (animated score counter via Reanimated, share via native sheet)
- **4d**: Modals — Rules, Archive, Stats as bottom sheets; Celebration as overlay
- **4e**: HintPanels (segmented control + panel) + FoundWords (ScrollView + FlatList)

### Phase 5: Native Polish (iOS)
**Goal**: Feels like a native iOS app, not a web port.
1. Haptics at all touch points (hex tap, submit success/error, rank change)
2. Animation audit — springs, timing curves, 120fps verification
3. iOS-specific: Dynamic Type, proper status bar, translucent modals
4. App icon + splash screen
5. Performance profiling on real device

### Phase 6: Android + Release
**Goal**: Android parity and store submissions.
1. `npx expo prebuild --platform android`
2. Platform fixes (shadows → elevation, font rendering, status bar)
3. Material Design 3 adjustments (segmented buttons, bottom sheets, share intent)
4. EAS Build for both platforms
5. TestFlight (iOS) + internal testing (Android)

---

## Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest | `packages/shared` pure functions (port from Vitest) |
| BDD | Cucumber | Logic step definitions run against shared package |
| Component | `@testing-library/react-native` | Individual RN components |
| E2E | Maestro | Full app flows on simulator/device (YAML-based, AI-friendly) |

BDD feature files remain the source of truth. Web-specific steps (e.g., "reloads the page") map to native equivalents ("resets state and re-fetches puzzle").

---

## Critical Files to Study/Port

| File | Lines | Role | Migration Notes |
|---|---|---|---|
| `src/store/useGameStore.ts` | ~684 | Central store | Extract to shared as `createGameStore` factory with DI for platform adapters |
| `src/components/Honeycomb/Honeycomb.tsx` | ~179 | Hex grid | SVG tags capitalize; touch → Pressable; CSS → Reanimated |
| `src/utils/storage.ts` | ~52 | Storage adapter | Replace localStorage with MMKV (same sync API) |
| `src/hooks/useGameTimer.ts` | ~117 | Play timer | AppState replaces visibility/blur events |
| `src/styles/index.css` | ~75 | Design tokens | Become a theme context with token objects |
| `src/components/RankProgress.tsx` | ~260 | Score/rank UI | rAF counter → Reanimated; progress bar → animated width |
| `src/components/HintPanels.tsx` | ~360 | Hint tabs | Segmented control → custom Reanimated component |

---

## Agent Task Sizing

Each phase is broken into tasks sized for one AI agent session (~30-60 min):

- **Phase 0**: 1 agent, 3 small PRs (shared extraction → web move → store DI)
- **Phase 1**: 1 agent, 4 sequential tasks
- **Phase 2**: 2 agents in parallel (grid + input), then 1 agent to wire
- **Phase 3**: 1 agent, 3 sequential tasks
- **Phase 4**: 2 agents in parallel (theme+header + rank+share), then sequential for modals
- **Phase 5**: 1 agent, sequential polish tasks
- **Phase 6**: 1 agent, sequential Android tasks
