# Sanakenno React Native Migration Plan

## Context

Sanakenno is a Finnish word puzzle game currently running as a React 19 web app with PWA support. The goal of this plan is to build truly native iOS and Android apps using React Native, not a WebView wrapper. Web version of the game will continue to exist alongside the native apps.

This project should also serve as a showcase of engineering skill and as a learning project for React Native and mobile development. The architecture should be clean and idiomatic, but should not chase purity at the cost of unnecessary churn. End product should look like a well-crafted native app, not a web app ported to React Native.

The backend stays as-is for now: Hono + SQLite serving the same API to all clients.

For the first mobile version, progress / achievements remain device-local. Cross-device identity, sync, and user accounts are explicitly out of scope for this migration and will be added later as a separate capability.

Initial rollout should be iOS-first. Finish the native app for iPhone, validate it on simulator and a personal device, and defer Android-specific product and release work until the iOS path is solid.

---

## Architecture Decisions

### Expo With Continuous Native Generation
Use Expo SDK 53+ with Continuous Native Generation via `npx expo prebuild`.

Reasons:
- It is the most practical modern path for an Expo-first React Native app that still needs real native capabilities.
- It keeps the developer experience strong while leaving a path to native configuration when needed.
- It supports the native modules this app is likely to need, including crypto, haptics, SVG rendering, safe area handling, and Reanimated.
- It fits the goal of early simulator and real-device testing.

Practical note for the current stage:
- Early iOS development should use the local Xcode build path on macOS so the app can be tested on simulator and a personal iPhone before enrolling in the paid Apple Developer Program.
- EAS iOS device builds, TestFlight, and App Store distribution should be treated as later release work.

### iOS-First Rollout
Treat the first mobile release as an iPhone release, not a simultaneous iOS + Android launch.

Reasons:
- The current development environment already supports native iOS work end-to-end.
- It reduces release complexity for a solo developer.
- The plan already uses iOS as the primary design reference.
- It keeps Android work additive instead of forcing parallel platform delivery too early.

Constraints:
- Keep shared domain logic platform-neutral so Android remains a later client, not a rewrite.
- Do not introduce iOS-specific assumptions into `packages/shared`.
- Android parity remains a planned phase after the iOS app is stable.

### Agent Guidance For Paid Program Boundaries
When implementing any phase or task that requires Apple distribution tooling or paid-program-only capabilities, the implementing agent must state explicitly: "You will need the paid Apple Developer Program for this."

This applies in particular to:
- EAS iOS device builds
- TestFlight setup
- App Store Connect distribution setup
- Final release signing and submission work

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

Why use packages:
- The shared boundary becomes explicit instead of being an informal set of copied files.
- Web and mobile both depend on the same shared module.
- It is a better showcase architecture for a multi-client codebase.
- It reduces accidental coupling between web and mobile code.

Why use pnpm:
- It is a practical and common choice for multi-package repositories.
- It handles workspace dependencies cleanly.
- It makes the repository structure look intentional and idiomatic for a multi-app codebase.

### Shared Domain, Not Shared UI
The goal is to share domain logic and types, not UI components.

This is a native-first rewrite for mobile. iOS and Android UI should be designed as native apps, not as the web app translated into React Native components.

`packages/shared` should contain:
- Pure game logic: scoring, hint derivation, stats math, rank thresholds, word utilities
- Shared TypeScript types
- Shared constants
- API client and shared data mapping logic where useful
- Platform interfaces and adapter contracts

`packages/shared` should not contain:
- Web UI
- React Native UI
- Navigation components
- Theme implementation details
- Platform-specific lifecycle code

### Shared Store Logic Only Where It Actually Helps
Do not assume the entire Zustand store should be shared.

The current store mixes domain state with UI state and platform behavior. The better target is:
- Share domain logic and pure state transitions where useful
- Keep platform-specific UI state in the platform app
- Keep platform services behind interfaces

Likely shareable:
- Puzzle loading orchestration
- Word submission rules
- Score calculation and rank derivation
- Persistence payload shapes
- Share text formatting

Likely platform-specific:
- Modal visibility and presentation state
- Theme state and appearance integration
- Press and gesture state
- App lifecycle integration
- Navigation state

### Platform Services Boundary
Introduce explicit platform services instead of letting browser or native APIs leak into domain code.

At minimum:
- `storage`
- `crypto`
- `share`
- `config`
- `clock`
- `lifecycle`

This matters because the current web app relies on browser-specific behavior such as `localStorage`, `crypto.subtle`, `crypto.randomUUID()`, clipboard APIs, `window.location.reload()`, document visibility, and Vite env access.

### Navigation Is Foundational, Not Optional
Use Expo Router from the beginning.

The motivation is not just that Expo Router is standard in modern Expo. The real reason is that the mobile app is intended to be a native rethink of the product structure. Archive, achievements, rules, stats, and similar sections are not web overlays in a mobile frame; they are part of the app's information architecture.

Using a router from the start gives:
- A clean route model for a native app structure
- Better handling of modal, sheet, stack, and detail flows
- Typed route definitions and deep-linking support
- A clearer foundation for future account and auth flows

### Mobile UI Direction
The mobile app should be designed as a native iOS app first, with Android parity added deliberately afterward.

That means:
- Navigation, screen structure, and modal presentation are designed for native use
- Components like rules, stats, archive, and achievements are rethought instead of ported mechanically
- Shared UI is not a goal by itself
- Android should still feel native on Android, but iOS can be the primary design reference during early phases

### Hexagon Grid
Use `react-native-svg` for the honeycomb.

The visual structure is a good candidate for conceptual reuse, but the implementation should be treated as a native component rewrite. Pointer events, CSS transforms, and browser touch hacks should not be carried over mechanically.

Press feedback and animation should use Reanimated.

### Sharing
Treat native share and clipboard copy as separate capabilities.

Initial plan:
- Use the React Native Share API for plain text status sharing
- Add clipboard copy only if it still improves the mobile UX
- Do not use `expo-sharing` as the primary plain-text share mechanism

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

Guidelines:
- `main` should remain in a deployable state for the web app
- Prefer short-lived feature branches over one very long-lived mobile branch
- Merge structural work as soon as it is validated
- Merge mobile-safe incremental work to `main` when it does not destabilize the web app
- Keep native app milestones visible via branches and tags, not just one giant integration branch

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
- A UUID solution for device-local identity if needed, instead of assuming web `crypto.randomUUID()` behavior maps directly.

---

## Phased Implementation

### Phase 0: Extract Shared Domain In-Place
**Goal**: find and validate the real shared boundary before restructuring the repository.

This phase happens before workspace restructuring. The purpose is to reduce uncertainty first.

Why this comes first:
- The biggest risk is not folder layout. It is incorrectly guessing what can actually be shared between web and mobile.
- Extracting shared logic first gives a concrete architecture to organize around.
- It avoids paying the cost of a large repo move before the shared boundary is proven.
- It keeps the web app stable while the portable domain layer is carved out.

Tasks:
1. Extract pure domain logic from the current web app into clearly separated modules
2. Identify and isolate browser-only assumptions
3. Define platform service interfaces for storage, crypto, share, config, clock, and lifecycle
4. Refactor the web app to consume those abstractions without changing behavior
5. Keep tests green throughout

**Phase 0 result — validated shared boundary:**

Moves to `packages/shared`:
- `src/utils/scoring.ts` — pure, no deps beyond TS
- `src/utils/hint-data.ts` — pure, no deps beyond TS
- `src/utils/stats.ts` — pure, imports only scoring.ts
- `src/utils/kotus.ts` — pure, no deps
- `src/platform/types.ts` — platform service interfaces

Stays platform-specific (web):
- `src/platform/web.ts` — browser implementations (localStorage, crypto.subtle, clipboard, import.meta.env)
- `src/utils/storage.ts` — thin delegate to platform storage (can be inlined by consumers)
- `src/utils/hash.ts` — thin delegate to platform crypto (can be inlined by consumers)
- `src/store/useGameStore.ts` — imports platform services; the store itself is mostly shareable but needs the delegates and some UI state split
- `src/hooks/useGameTimer.ts` — browser visibility/focus events
- `src/hooks/useMidnightRollover.ts` — browser page reload
- `src/hooks/useKeyboard.ts` — browser keydown listener
- All `src/components/` — web UI, stays in web package

### Phase 1: Workspace Restructure
**Goal**: move to a pnpm workspace after the shared boundary is proven.

Split into small PRs:

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
2. Set up the local iOS build path via Expo prebuild + Xcode for simulator and personal-device testing
3. Define mobile platform adapters for storage, crypto, share, config, clock, and lifecycle
4. Create the initial navigation structure using Expo Router
5. Fetch puzzle data and render a minimal playable screen shell
6. Validate on iOS simulator and a real iPhone as early as possible

This phase should produce a running native app quickly. The goal is not visual parity. The goal is proving that the shared domain and native foundation actually work on device.

For now, prefer local iOS builds over EAS device builds so development can continue without paid enrollment.

### Phase 3: Core Gameplay
**Goal**: native letter entry, word building, submission, scoring, and persistence.

Tasks:
1. Implement the honeycomb as a native React Native component using `react-native-svg`
2. Design native input interaction instead of porting browser keyboard assumptions directly
3. Wire the gameplay flow to shared domain logic
4. Persist game state locally using MMKV
5. Validate the full loop on simulator and device

Notes:
- Do not assume the web keyboard model maps directly to mobile
- Press feedback, animations, and haptics belong here, not as late polish only

### Phase 4: Lifecycle and Daily Puzzle Behavior
**Goal**: native handling of timer, app backgrounding, and puzzle rollover.

Tasks:
1. Implement lifecycle handling with app-state-aware services
2. Rework timer logic around native lifecycle semantics
3. Rework midnight rollover around native state refresh semantics instead of page reload
4. Validate persistence, restoration, and day changes through manual and automated tests

This phase is separate because the current web behavior depends heavily on browser visibility and reload behavior.

### Phase 5: Native Navigation and App Structure
**Goal**: implement the native app's actual information architecture.

Tasks:
1. Finalize route structure for gameplay, archive, achievements, rules, stats, and related flows
2. Implement the chosen modal, sheet, and stack presentation patterns
3. Build the app shell, menus, and structural screens in a native style
4. Ensure the route model matches the long-term direction of the app

This phase is intentionally not framed as porting web modals. The mobile app should have its own UI structure.

### Phase 6: Feature Parity Through Native Components
**Goal**: bring over the product capabilities while designing native UI per platform.

Likely workstreams:
- Archive
- Stats
- Achievements
- Rules and help
- Rank progress and sharing
- Hint surfaces
- Found words and progress review

Each should be treated as a native feature implementation backed by shared logic where appropriate.

### Phase 7: Native Polish and Android Parity
**Goal**: make the app feel intentional and native on both platforms.

Tasks:
1. Refine motion, haptics, typography, spacing, and transitions
2. Do iOS-specific presentation polish first
**SKIP**3. Start Android implementation after the iOS app is stable enough that platform-specific work will not churn shared boundaries
**SKIP**4. Add Android-specific adjustments deliberately rather than inheriting iOS decisions blindly
5. Profile performance on simulator and real devices
6. Finalize assets, icons, and launch experience

### Phase 8: Release Preparation
**Goal**: prepare builds for distribution once the app is solid.

Tasks:
1. Join the Apple Developer Program when distribution work is about to begin
2. Prepare EAS Build configuration for release workflows
3. Validate production iOS builds first
4. Run release-quality smoke testing for iOS
5. Prepare TestFlight and App Store Connect submission flow
6. Add Android release preparation later when the Android app reaches parity
7. Document release and maintenance workflow

---

## Testing Strategy

Keep the test strategy strong, but do not start by expanding into full multi-platform E2E coverage.

### Core Principles
- Keep Vitest as the primary unit test runner
- Keep feature files as the behavioral source of truth
- Split shared behavior from platform-specific behavior explicitly
- Focus on high-confidence unit, API, and feature logic coverage first
- Add heavier end-to-end coverage only if the lighter layers prove insufficient

### Planned Layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Shared domain logic in `packages/shared` |
| API | Vitest | Server routes and contract behavior |
| Feature / BDD | Cucumber | Shared feature logic plus platform-tagged scenarios |
| Component / Integration | React Testing Library variants as needed | Targeted web/mobile interaction coverage |

### BDD Restructure
Feature files remain the source of truth, but they should be reorganized conceptually into:
- Shared scenarios
- Web-only scenarios
- Mobile-only scenarios

Examples:
- word scores correctly is shared behavior
- player reloads the page is web-only behavior
- timer reacts to app backgrounding is mobile-only behavior
- PWA install and service worker scenarios remain web-only

### E2E Position
Do not make broad E2E coverage a gate for the initial mobile migration.

Possible later additions:
- Keep existing web E2E where it is valuable
- Add mobile E2E only when there is a clear return on maintenance cost

---

## Critical Refactor Targets

The main goal is not to port files blindly. It is to extract the right boundaries.

### Highest Priority
- `src/store/useGameStore.ts`: separate domain logic from UI and platform assumptions
- `src/hooks/useGameTimer.ts`: replace browser lifecycle assumptions with lifecycle abstraction
- `src/hooks/useMidnightRollover.ts`: replace page reload semantics with native refresh semantics
- `src/hooks/useKeyboard.ts`: replace browser keydown assumptions with native input design
- `src/utils/storage.ts`: move behind storage service interface
- `src/utils/hash.ts`: move behind crypto service interface

### High Priority UI Rewrites
- `src/components/Honeycomb/Honeycomb.tsx`
- `src/components/RankProgress.tsx`
- `src/components/HintPanels.tsx`
- `src/components/ArchiveModal.tsx`
- `src/components/StatsModal.tsx`
- `src/components/ThemeToggle.tsx`

### Good Shared Candidates
- `src/utils/scoring.ts`
- `src/utils/hint-data.ts`
- `src/utils/stats.ts`
- `src/utils/kotus.ts`

---

## Agent Task Sizing

Keep tasks small enough to be verifiable in one focused session.

- Phase 0: small refactors with no behavior change
- Phase 1: small structural PRs with full verification
- Phase 2: early mobile foundation with rapid device validation
- Phase 3 onward: feature slices that can be tested independently

Preferred slice size:
- one boundary extraction
- one platform service
- one navigation flow
- one gameplay capability
- one native screen family

This project is better served by many small, defensible steps than by large speculative rewrites.

