# Sanakenno Standalone — Context & Rules

This file provides foundational mandates for the Sanakenno standalone project. Adhere to these strictly.

## Technical Stack
- **Language**: TypeScript (strict mode). All source, tests, and scripts in `.ts`/`.tsx`.
- **Frontend**: React 19, Vite, Zustand (State), Tailwind 4 + CSS Modules (Styling).
- **Backend**: Hono (Node.js runtime, executed via tsx).
- **Storage**: SQLite (all application data). Wordlist as flat file.
- **Testing**: Vitest (Unit/Logic), Cucumber.js (BDD/Integration), Playwright (E2E).
- **PWA**: `vite-plugin-pwa`.

## Core Directive: Parity & Reuse
- **Visual & Behavioral Identity**: The standalone version MUST remain visually and behaviorally identical to the original Nuxt version (CSS styles, SVG Honeycomb geometry, animations).
- **Logic Porting**: Maximize code reuse by porting the original Vue logic (`useSanakennoLogic.js`, `useGameTimer.js`, `useHintData.js`) into equivalent React hooks and Zustand stores.

## Coding Standards
- **Language**: All user-facing UI strings must be in **Finnish**. All code (variables, functions, comments, documentation) must be in **English**.
- **BDD-First**: Every feature implementation must be verified against the corresponding `.feature` file in the `features/` directory.
- **Surgical Updates**: Prefer targeted edits to files rather than full rewrites unless scaffolding a new component.
- **State Management**: Use Zustand for global game state (timer, found words, score) to avoid prop drilling.

## Documentation
- Every non-trivial function, hook, and module must have a JSDoc comment explaining its purpose, parameters, and return value.
- Complex logic (puzzle engine, auth middleware, midnight rollover) must include inline comments explaining the why, not just the what.
- Each server route file must have a header comment listing its endpoints and their purpose.

## Git Discipline
- Commit frequently — each logical unit of work gets its own commit (e.g. one commit per component, one per route, one per hook).
- Commit messages must be clear and descriptive. Use the imperative mood ("Add Honeycomb component" not "Added" or "Adding").
- Never commit broken or partially working code to main. If work is incomplete, use a feature branch.
- Tests must pass before committing.

## Commands
- **Install**: `npm install`
- **Dev**: `npm run dev`
- **Type Check**: `npm run typecheck`
- **Test (Unit)**: `npm run test:unit`
- **Test (BDD)**: `npm run test:bdd`
- **Build**: `npm run build`

## Project Architecture
Refer to `PLAN.md` for the detailed implementation phases and architectural mapping.
