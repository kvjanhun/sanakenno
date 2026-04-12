# Plan: v1.2 — Stats Fields, iOS Archive Expansion, Hint Fix

## Context

Three areas of improvement targeting the iOS app and shared backend, with no changes to the web archive or stats UI:

1. **New lifetime stats fields** — track longest word guessed, total word count, and total pangrams across all puzzles. Requires new fields in `StatsRecord`, server DB columns, and sync route updates.
2. **iOS archive expansion** — show all past puzzles (not just 7 days); pin today's puzzle so it never scrolls away; let players choose "play" or "view answers" via a bottom sheet; word list screen shows found vs. missed words; revealing answers disables stats updates for that puzzle.
3. **iOS hint toggle fix** — re-tapping the active hint tab should hide the panel (mirrors web behaviour); hint area height must be reserved even when hidden.

Version bumps: **web/server/shared → 1.2.0 (minor)**, **mobile → 0.4.0 (minor)**.

---

## Files to Modify

### Shared (`packages/shared/src/`)

| File            | Change                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `stats.ts`      | Add `longest_word?: string` and `pangrams_found?: number` to `StatsRecord`; update `updateStatsRecord()` to track both |
| `sync-merge.ts` | `mergeStatsRecord()`: `longest_word` = whichever is longer; `pangrams_found` = MAX                                     |

### Server

| File                                                 | Change                                                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/db/schema.sql`                               | Add `longest_word TEXT DEFAULT NULL` and `pangrams_found INTEGER NOT NULL DEFAULT 0` to `player_stats` table                                         |
| `server/routes/archive.ts`                           | Add `?all=true` query param — when set, loop over all puzzle slots instead of hardcoded 7                                                            |
| `server/routes/player-sync.ts`                       | Update `POST /api/player/sync/stats` INSERT and UPDATE to handle `longest_word` (keep longer string) and `pangrams_found` (MAX)                      |
| `server/routes/puzzle.ts` _(new or extend existing)_ | Add `GET /api/puzzle/:number/words` — returns plaintext word list for any puzzle that is **not** the current active puzzle; public, no auth required |

### Mobile

| File                                           | Change                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/mobile/app/(tabs)/archive.tsx`       | Fetch with `?all=true`; move today's card to a fixed `View` **above** the `FlatList` so it never scrolls away; tap any past card → bottom sheet with "Pelaa" and "Näytä vastaukset"        |
| `packages/mobile/app/puzzle-words.tsx` _(new)_ | Screen: fetches word list via new endpoint; found words (from `game_state_N` in MMKV) highlighted, missed shown in muted text; on first view, writes `revealed_N = true` to MMKV           |
| `packages/mobile/app/(tabs)/stats.tsx`         | Add three new rows: longest word (word string), total words (sum of `words_found`), total pangrams (sum of `pangrams_found`)                                                               |
| `packages/mobile/src/store/useGameStore.ts`    | Track `pangramsFound` and `longestWord` in state; update on each word submission; before calling `updateStatsRecord`, check `storage.getRaw('revealed_N')` — skip stats update if revealed |
| `packages/mobile/src/components/HintPanel.tsx` | Init `activeTab` as `null`; toggle logic: `setActiveTab(prev => prev === id ? null : id)`; wrap content in a fixed-height container so layout doesn't shift when hidden                    |

### Feature Files

| File                               | Change                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/stats.feature`           | Add scenarios: `longest_word` recorded per puzzle; `pangrams_found` incremented per pangram; totals are derived sums across records                              |
| `features/sync.feature`            | Add scenarios: new fields synced and merged correctly                                                                                                            |
| `features/archive.feature` _(new)_ | Scenarios: all-puzzles endpoint returns more than 7; words endpoint blocked for today's puzzle; revealed flag prevents stats update; revealed + play still works |

---

## Key Decisions

- **`longest_word` is per-puzzle** (the longest word found in that specific puzzle). The stats screen derives the global longest by scanning all records for the max-length word.
- **`pangrams_found` is per-puzzle** (count of pangrams found in that puzzle). Global total = `SUM(pangrams_found)` across all records.
- **Total words guessed** = `SUM(words_found)` across all records — no new field needed, `words_found` already exists.
- **Revealed flag** (`revealed_N`) stored locally in MMKV only — not synced across devices. Revealing answers on one device does not affect another.
- **Stats freeze on reveal**: `useGameStore.submitWord` skips `updateStatsRecord` and server sync when `revealed_N` is set. The puzzle can still be played normally, messages still appear, but no rank/score/word-count achievements are recorded.
- **Word list endpoint security**: `GET /api/puzzle/:number/words` checks that the requested puzzle number is not the currently active puzzle slot before returning plaintext words.

---

## Implementation Phases

### Phase 1 — Shared types + merge logic

- `stats.ts`: add `longest_word`, `pangrams_found` to `StatsRecord`; update `updateStatsRecord()`
- `sync-merge.ts`: update `mergeStatsRecord()`
- Unit tests in `tests/sync-merge.test.ts` for new merge cases

### Phase 2 — Server

- `schema.sql`: add two columns to `player_stats`; verify migration runs on startup
- `player-sync.ts`: extend stats upsert
- `archive.ts`: add `?all=true` param
- New words endpoint
- BDD: update `sync.feature`; new `archive.feature` server scenarios

### Phase 3 — Mobile game store

- `useGameStore.ts`: track `pangramsFound`, `longestWord`; revealed guard
- Update MMKV persistence for new fields

### Phase 4 — Mobile archive rework

- Fixed today card + `FlatList` for all past puzzles
- Bottom sheet on card tap
- Navigate to word list screen with "Näytä vastaukset"

### Phase 5 — Mobile word list screen

- `puzzle-words.tsx`: fetch words, highlight found, set revealed flag

### Phase 6 — Mobile stats screen

- `stats.tsx`: add three new stat items

### Phase 7 — Mobile hint panel fix

- `HintPanel.tsx`: toggle logic + reserved height

### Phase 8 — Feature files, BDD step defs, version bumps

- All feature files updated/created; BDD passes
- `pnpm run typecheck && pnpm run lint && pnpm run test:unit && pnpm run test:bdd`
- Bump: web/server/shared → 1.2.0, mobile → 0.4.0

---

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit        # sync-merge new cases
pnpm run test:bdd         # all 193+ scenarios + new ones
pnpm run build
```

Manual on device:

- Find a long word → check stats screen shows it
- Find a pangram → total pangram count increments
- Archive: scroll shows all past puzzles; today's card stays pinned
- Tap past card → bottom sheet with two options
- "Näytä vastaukset" → word list with found words marked
- Play same revealed puzzle → no stats change; rank/score not updated
- Hint panel: tap active tab → panel hides; layout stable
