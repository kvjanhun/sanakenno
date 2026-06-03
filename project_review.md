# Project Review — Sanakenno

I have completed a thorough review of the Sanakenno codebase across the web frontend, Hono server, and shared library. The codebase is highly disciplined, type-safe, has excellent test coverage (both Vitest and Cucumber BDD pass cleanly), and follows modern practices.

However, there are a few architectural discrepancies, minor bugs, and planned but unfinished tasks that you may want to address.

---

## 1. Major Architectural & Data Integrity Findings

### ⚠️ Renumbering/Deletions Shifts Active Game States

In [admin.ts](file:///Users/erezac/Projects/sanakenno/server/routes/admin.ts#L380-L382), when deleting a puzzle slot, the slots are shifted down to keep them dense:

```typescript
db.prepare('DELETE FROM puzzles WHERE slot = ?').run(slot);
db.prepare('UPDATE puzzles SET slot = slot - 1 WHERE slot > ?').run(slot);
```

- **The Problem**: Puzzles are stored and identified on the client (both web local storage and mobile MMKV) and in the player database (`player_stats`, `player_puzzle_states`) directly by `puzzle_number` (which corresponds to `slot`).
- If slot $5$ is deleted, slot $6$ becomes the new slot $5$, slot $7$ becomes slot $6$, and so on.
- If a player has active progress or historical stats saved for the old slot $6$ (e.g. they solved it), their client now maps this state to the new slot $6$ (the old slot $7$). When loading the puzzle state, the client will:
  1. Load the old found words.
  2. Validate them against the new puzzle's hashes (which will mismatch and drop the words).
  3. Recalculate the score down to $0$, causing them to lose progress or have mismatched statistics.
- **Recommendation**: Avoid renumbering slots on deletion. Instead, either:
  - Soft-delete puzzles (mark them inactive).
  - Allow slot numbers to be sparse, and update the puzzle selector to resolve the next active slot rather than mathematically cycling via raw array index offsets.

### 🗑️ Unused `is_active` Database Field

- **The Problem**: The `puzzles` table defines `is_active INTEGER NOT NULL DEFAULT 1` in [schema.sql](file:///Users/erezac/Projects/sanakenno/server/db/schema.sql#L7). However, the engine's query logic in [puzzle-engine.ts](file:///Users/erezac/Projects/sanakenno/server/puzzle-engine.ts#L351-L357) doesn't query or respect this field when resolving slots or calculating total active puzzles.
- **Recommendation**: If soft-deletes are not wanted, drop this column to keep the schema clean. If soft-deletes are wanted to fix the deletion shift above, update the puzzle selector to use it.

---

## 2. Security & Rate-Limiting Observations

### 🚦 In-Memory Rate Limiting in Multi-Process/Load-Balanced Setup

- **The Problem**: In Hono routes [failed-guess.ts](file:///Users/erezac/Projects/sanakenno/server/routes/failed-guess.ts#L18-L24) and [word-find.ts](file:///Users/erezac/Projects/sanakenno/server/routes/word-find.ts#L18-L24), rate limiting is enforced using an in-memory `Map` that is cleared every 60 seconds.
- Since the server is deployed using a multi-process Docker Compose environment (as stated in [PLAN.md](file:///Users/erezac/Projects/sanakenno/PLAN.md#L18)), the rate limit is tracked per Node process. A player could potentially make far more requests if their requests hit different processes behind a load balancer.
- **Recommendation**: For small scales this is usually acceptable. If unified rate-limiting is required, move the rate limit maps to a shared store (like Redis or a simple temp table in the SQLite database).

### 🏆 Achievement Validation Gaps

- **The Problem**: The `POST /api/achievement` route in [achievement.ts](file:///Users/erezac/Projects/sanakenno/server/routes/achievement.ts#L95) does not check if the submitted `puzzle_number` exists in the database before writing it to the `achievements` table. It also does not require any player Bearer auth, meaning arbitrary anonymous clients could spam fake stats for non-existent puzzle IDs.
- **Recommendation**: Verify that `puzzle_number < totalPuzzles()` or exists in the `puzzles` table before saving.

---

## 3. Unfinished Roadmap Items (from PLAN.md)

There are three explicitly documented features in [PLAN.md](file:///Users/erezac/Projects/sanakenno/PLAN.md) that remain un-implemented:

1. **PWA Install Discoverability Hint**: [PLAN.md](file:///Users/erezac/Projects/sanakenno/PLAN.md#L140-L150) outlines adding a quiet static text notice to help users add the app to their home screens. No mention exists in the frontend rules or settings components.
2. **Stale Account Cleanup Cron**: [PLAN.md](file:///Users/erezac/Projects/sanakenno/PLAN.md#L153-L179) outlines hard-deleting player rows without active sessions in the last 180 days. Currently, only the `cleanupExpiredPlayerSessions` call is implemented, leaving abandoned anonymous players in the table indefinitely.
3. **Observability Integration**: [PLAN.md](file:///Users/erezac/Projects/sanakenno/PLAN.md#L98-L115) outlines routing structured logs and errors from the app into the shared NUC observability stack. Currently, logging uses plain console calls without structured metrics exporter wiring.
