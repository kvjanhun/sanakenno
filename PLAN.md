# Sanakenno React Native Migration Plan

## Context

Sanakenno is a Finnish word puzzle game currently running as a React 19 web app with PWA support. The goal of this plan is to build truly native iOS and Android apps using React Native, not a WebView wrapper. Web version of the game will continue to exist alongside the native apps.

This project should also serve as a showcase of engineering skill and as a learning project for React Native and mobile development. The architecture should be clean and idiomatic, but should not chase purity at the cost of unnecessary churn. End product should look like a well-crafted native app, not a web app ported to React Native.

The backend stays as-is for now: Hono + SQLite serving the same API to all clients.

For the first mobile version, progress / achievements remain device-local. Cross-device identity, sync, and user accounts are explicitly out of scope for this migration and will be added later as a separate capability.

---

## Architecture Decisions

### Expo With Continuous Native Generation
Use Expo SDK 53+ with Continuous Native Generation via `npx expo prebuild`.

Reasons:
- Most practical modern path for an Expo-first app that still needs real native capabilities.
- Strong developer experience with a path to native configuration when needed.
- Supports needed native modules: crypto, haptics, SVG rendering, safe area handling, Reanimated.
- Fits the goal of early simulator and real-device testing.

### pnpm Workspace Mono-repo
Convert the repo to a pnpm workspace mono-repo.

```
sanakenno/
  packages/
    shared/          # Shared domain logic, types, platform interfaces
    web/             # Current web app after migration
    mobile/          # Expo React Native app
  features/          # BDD specs at repo root
  server/            # API server at repo root
  pnpm-workspace.yaml
```

Why packages: the shared boundary becomes explicit, both clients depend on the same module, and it reduces accidental coupling between web and mobile code.

Why pnpm: practical and common choice for multi-package repositories with clean workspace dependency handling.

### Shared Domain, Not Shared UI
Share domain logic and types, not UI components.

`packages/shared` should contain:
- Pure game logic: scoring, hint derivation, stats math, rank thresholds, word utilities
- Shared TypeScript types and constants
- API client and shared data mapping logic where useful
- Platform interfaces and adapter contracts

`packages/shared` should not contain:
- Any UI (web or React Native)
- Navigation, theme implementation, or platform-specific lifecycle code

The Zustand store should not be shared wholesale. The current store mixes domain state with UI state and platform behavior. Share domain logic and pure state transitions; keep platform-specific UI state (modal visibility, theme, gestures, navigation) in each platform app. Keep platform services behind interfaces.

### Platform Services Boundary
Introduce explicit platform services instead of letting browser or native APIs leak into domain code.

At minimum: `storage`, `crypto`, `share`, `config`, `clock`, `lifecycle`.

The current web app relies on `localStorage`, `crypto.subtle`, `crypto.randomUUID()`, clipboard APIs, `window.location.reload()`, document visibility, and Vite env access — all of which need platform-specific adapters.

### Navigation Is Foundational
Use Expo Router from the beginning.

The mobile app is a native rethink of the product structure. Archive, achievements, rules, stats, and settings are part of the app's information architecture — not web overlays in a mobile frame. A router from the start gives a clean route model, proper modal/sheet/stack handling, typed routes, deep-linking, and a foundation for future auth flows.

### Mobile UI Direction

Design iOS first, then add Android parity deliberately.

#### iOS App Structure

**No title bar.** The web app's fixed header with title, icons, and theme toggle does not exist in the iOS app. Instead:

- **Native menu** (Liquid Glass context menu or equivalent native pattern) provides access to: Archive, Stats, Rules, and Settings.
- **Settings** includes at minimum: appearance mode (Light / Dark / System).
- **Main gameplay view** contains, top to bottom: score display with rank and progress bar, hint buttons, the honeycomb grid, and the action buttons (delete, shuffle, submit).
- **Found words** need a native-idiomatic presentation — not CSS pills that expand into a list. Explore patterns like a collapsible inline section, a pull-up drawer, a dedicated bottom sheet, or a scrollable chip tray. The right answer should feel like it belongs in an iOS app.

#### Android Direction

Android should look and feel like an Android app, not an iOS port. Material Design 3 conventions apply: bottom sheets use Material styling, navigation follows Android patterns, elevation replaces iOS shadows, and haptic patterns match Android expectations. The underlying game logic and state management remain shared; the UI layer diverges where the platforms diverge.

### Hexagon Grid
Use `react-native-svg` for the honeycomb. The visual structure is a good candidate for conceptual reuse, but the implementation is a native component rewrite — no pointer events, CSS transforms, or browser touch hacks carried over. Press feedback and animation use Reanimated.

### Sharing
Use the React Native Share API for plain text status sharing. Add clipboard copy only if it improves the mobile UX. Do not use `expo-sharing` as the primary plain-text share mechanism.

---

## Git Strategy

Keep `main` stable and merge small increments early where practical.

```
main
  ├── feat/shared-extraction
  ├── feat/workspace-setup
  ├── feat/mobile-foundation
  ├── feat/mobile-navigation
  ├── feat/mobile-game-loop
  └── ...
```

- `main` remains deployable for the web app at all times.
- Prefer short-lived feature branches over one long-lived mobile branch.
- Merge structural and mobile-safe work to `main` as soon as it is validated and does not destabilize the web app.
- Keep native app milestones visible via branches and tags.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `expo` | React Native app framework |
| `expo-router` | File-based native routing |
| `react-native-svg` | Honeycomb and custom vector UI |
| `react-native-reanimated` | Native-feeling motion and press feedback |
| `react-native-gesture-handler` | Native gesture support |
| `react-native-safe-area-context` | Safe area handling |
| `expo-haptics` | Native haptics |
| `react-native-mmkv` | Fast device-local persistence |
| `zustand` | State management |
| `pnpm` workspaces | Multi-package repo management |

Additional likely dependency:
- A UUID solution for device-local identity, instead of assuming `crypto.randomUUID()` maps directly.

---

## BDD-First Development

Every phase of this migration follows BDD-first discipline: write or update feature specs before implementing the feature. This is not a separate testing phase — it is how each phase works.

- **New mobile behavior**: write the `.feature` file first, agree on the scenario, then implement.
- **Shared behavior already covered by web specs**: tag existing scenarios as shared; add mobile-only scenarios for platform-specific behavior.
- **Each phase deliverable includes its feature specs.** A phase is not complete until the scenarios that describe its behavior exist and pass.

This means mobile feature coverage grows incrementally with each phase, not as a late bolt-on. By the end of Phase 6, the mobile app should have full BDD coverage matching its feature set.

---

## Phased Implementation

### Phase 0: Extract Shared Domain In-Place
**Goal**: find and validate the real shared boundary before restructuring the repository.

This phase happens before workspace restructuring to reduce uncertainty first. The biggest risk is incorrectly guessing what can be shared. Extracting in-place keeps the web app stable while the portable domain layer is carved out.

Tasks:
1. Extract pure domain logic into clearly separated modules
2. Identify and isolate browser-only assumptions
3. Define platform service interfaces for storage, crypto, share, config, clock, and lifecycle
4. Refactor the web app to consume those abstractions without changing behavior
5. Keep tests green throughout

Expected output:
- A clear list of what belongs in `packages/shared` vs. what stays platform-specific
- A web app already using the future architecture in-place

### Phase 1: Workspace Restructure
**Goal**: move to a pnpm workspace after the shared boundary is proven.

**PR 1a - Workspace and shared package setup**
1. Add `pnpm-workspace.yaml`
2. Create `packages/shared/` with package metadata and TS config
3. Move already-extracted domain code into `packages/shared`
4. Update the web app to consume the shared package
5. Verify typecheck, lint, unit, BDD, and build

**PR 1b - Move web app into `packages/web/`**
1. Move the current web app into `packages/web/`
2. Update config, build, and test paths
3. Verify local dev, typecheck, lint, unit, BDD, and production build

**PR 1c - Prepare the mobile package**
1. Create `packages/mobile/` as an Expo app
2. Wire the workspace so web and mobile can consume `packages/shared`
3. Verify a minimal mobile app starts successfully

### Phase 2: Mobile Foundation
**Goal**: get a real native app running early on simulator and device.

Tasks:
1. Set up Expo app foundation, native dev build flow, and routing scaffold
2. Define mobile platform adapters for storage, crypto, share, config, clock, and lifecycle
3. Create the initial navigation structure using Expo Router
4. Fetch puzzle data and render a minimal playable screen shell
5. Validate on iOS simulator and a real iPhone as early as possible

The goal is not visual parity — it is proving the shared domain and native foundation work on device.

### Phase 3: Core Gameplay
**Goal**: native letter entry, word building, submission, scoring, and persistence.

Tasks:
1. Write mobile-specific feature scenarios for input, submission, and scoring
2. Implement the honeycomb using `react-native-svg` with Reanimated press feedback and haptics
3. Design native input interaction (do not port browser keyboard assumptions)
4. Wire the gameplay flow to shared domain logic
5. Persist game state locally using MMKV
6. Validate the full loop on simulator and device

### Phase 4: Lifecycle and Daily Puzzle Behavior
**Goal**: native handling of timer, app backgrounding, and puzzle rollover.

Tasks:
1. Write mobile-only feature scenarios for backgrounding, timer pause/resume, and midnight rollover
2. Implement lifecycle handling with app-state-aware services
3. Rework timer logic around native lifecycle semantics
4. Rework midnight rollover around native state refresh instead of page reload
5. Validate persistence, restoration, and day changes through manual and automated tests

This phase is separate because the current web behavior depends heavily on browser visibility and reload semantics.

### Phase 5: Native Navigation and App Structure
**Goal**: implement the iOS app's information architecture and Android equivalent.

Tasks:
1. Implement the iOS native menu (Liquid Glass / context menu) for Archive, Stats, Rules, Settings
2. Build the Settings screen with appearance mode selection
3. Finalize route structure and modal/sheet/stack presentation patterns
4. Build Android navigation equivalent following Material Design 3 patterns
5. Ensure the route model supports long-term direction (future auth, deep links)

### Phase 6: Feature Parity Through Native Components
**Goal**: bring over product capabilities with native UI per platform.

Workstreams:
- Archive browsing and puzzle selection
- Stats display and streak visualization
- Achievements
- Rules and help
- Rank progress and sharing (native share sheet)
- Hint surfaces
- Found words — native-idiomatic presentation (resolve design during this phase)

Each is a native feature implementation backed by shared logic. Write or update feature scenarios for each workstream before implementing.

### Phase 7: Native Polish and Android Parity
**Goal**: make the app feel intentional and native on both platforms.

Tasks:
1. Refine motion, haptics, typography, spacing, and transitions on iOS
2. Add Android-specific adjustments deliberately (elevation, Material components, Android haptics)
3. Profile performance on simulator and real devices
4. Finalize assets, icons, and launch experience

### Phase 8: Release Preparation
**Goal**: prepare builds for distribution.

Tasks:
1. Validate production builds for iOS and Android
2. Prepare EAS Build configuration
3. Run release-quality smoke testing
4. Prepare TestFlight and Android internal testing
5. Document release and maintenance workflow

---

## Testing Strategy

### Planned Layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Shared domain logic in `packages/shared` |
| API | Vitest | Server routes and contract behavior |
| Feature / BDD | Cucumber | Shared feature logic plus platform-tagged scenarios |
| Component / Integration | React Testing Library variants as needed | Targeted web/mobile interaction coverage |

### BDD Restructure
Feature files remain the source of truth, reorganized into shared, web-only, and mobile-only scenarios.

Examples:
- *word scores correctly* — shared
- *player reloads the page* — web-only
- *timer reacts to app backgrounding* — mobile-only
- *PWA install and service worker* — web-only

### E2E Position
Do not make broad E2E coverage a gate for the initial mobile migration. Keep existing web E2E where valuable; add mobile E2E only when there is a clear return on maintenance cost.

---

## Critical Refactor Targets

### Highest Priority (platform boundary extraction)
- `src/store/useGameStore.ts`: separate domain logic from UI and platform assumptions
- `src/hooks/useGameTimer.ts`: replace browser lifecycle with lifecycle abstraction
- `src/hooks/useMidnightRollover.ts`: replace page reload with native refresh semantics
- `src/hooks/useKeyboard.ts`: replace browser keydown with native input design
- `src/utils/storage.ts`: move behind storage service interface
- `src/utils/hash.ts`: move behind crypto service interface

### High Priority UI Rewrites (native component design)
- `src/components/Honeycomb/Honeycomb.tsx`
- `src/components/RankProgress.tsx`
- `src/components/HintPanels.tsx`
- `src/components/ArchiveModal.tsx`
- `src/components/StatsModal.tsx`
- `src/components/ThemeToggle.tsx`

### Good Shared Candidates (move to `packages/shared` verbatim)
- `src/utils/scoring.ts`
- `src/utils/hint-data.ts`
- `src/utils/stats.ts`
- `src/utils/kotus.ts`

---

## Agent Task Sizing

Keep tasks small enough to be verifiable in one focused session.

Preferred slice size: one boundary extraction, one platform service, one navigation flow, one gameplay capability, or one native screen family.

This project is better served by many small, defensible steps than by large speculative rewrites.
