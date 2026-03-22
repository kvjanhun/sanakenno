# Sanakenno

Finnish Spelling Bee word game — standalone port from [erez.ac](https://erez.ac/sanakenno).

Find words from 7 letters. Every word must contain the center letter. Pangrams (using all 7) earn a bonus. New puzzle daily.

## Status

**Early planning stage.** The game currently runs as part of [web_kontissa](https://github.com/kvjanhun/web_kontissa). This repo is the standalone rewrite.

What exists so far:
- BDD feature specs defining all game behaviour (see below)
- Implementation plan covering stack, architecture, and phasing

No application code yet. Next step is Phase 1 (data pipeline).

## Planned stack

React 19 + Vite | Tailwind CSS | Express | JSON file storage

See [PLAN.md](PLAN.md) for full details and rationale.

## Feature specs

The `features/` directory contains Gherkin specs that serve as the design document. They define what the game does before any code is written.

| Feature | What it covers |
|---|---|
| [scoring](features/scoring.feature) | Point values, pangram bonus, score accumulation |
| [word-validation](features/word-validation.feature) | Rejection rules, SHA-256 hash checking, input normalisation |
| [ranks](features/ranks.feature) | 7 rank thresholds, progress bar, celebrations |
| [puzzle](features/puzzle.feature) | Daily rotation, puzzle structure, midnight rollover |
| [hints](features/hints.feature) | 4 unlockable hint panels, persistence, collapse state |
| [interaction](features/interaction.feature) | Keyboard/tap input, honeycomb, found words, share |
| [timer](features/timer.feature) | Elapsed time tracking, pause on tab hidden/blur |
| [persistence](features/persistence.feature) | localStorage per-puzzle, validation on reload |
| [achievements](features/achievements.feature) | Server-side rank recording, session dedup |
| [api](features/api.feature) | Express endpoints, response shape, rate limiting |
| [pwa](features/pwa.feature) | Installability, service worker strategies, iOS quirks |

These will later be wired to [Cucumber.js](https://github.com/cucumber/cucumber-js) for automated acceptance testing.
