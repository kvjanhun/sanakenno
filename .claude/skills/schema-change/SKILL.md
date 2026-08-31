---
name: schema-change
description: Change the database schema for a feature — add or alter a column, table, or index. Use whenever a feature needs the shape of sanakenno.db to change. Enforces the two-edit rule (schema.sql baseline plus an ordered migration file), the tests that go with it, and the forward-only constraint.
paths:
  - server/db/**
  - server/routes/**
  - tests/**
---

# Schema Change

A schema change is a feature's change to the shape of the database. The
`db/migrations/` mechanism is how one is *delivered*; it is not the name of the
task.

Schema changes here are automatic and versioned. **Never hand-edit a production
database, and never write a one-off migration script.**

## The two-edit rule

Every schema change is **two edits in the same commit**:

1. **`server/db/schema.sql`** — the baseline a brand-new database is created
   from. Update it so a fresh database matches the new shape directly.
2. **`server/db/migrations/NNNN-name.ts`** — brings existing databases forward to
   that same shape. Append it to the ordered array in
   `server/db/migrations/index.ts`.

Both, always. `schema.sql` alone leaves production behind. A migration file alone
leaves fresh databases and the whole test suite behind.

Number `NNNN` one past the highest existing file. Name it for what it does, not
for the feature that needed it.

## Constraints that decide the design

- **Forward-only.** There is no `down`. Rolling back a bad schema change means
  restoring from the Litestream replica — so get it right rather than planning to
  undo it.
- **Never edit or renumber a migration that has already run in production.**
  Append a new one. The applied set is tracked in `schema_migrations`.
- **A failing migration aborts startup deliberately.** A half-migrated database
  serving traffic is worse than a container that will not come up. This is why
  the change must be tested before it ships, not after.
- **Two app instances start together after a host reboot.** `runMigrations` in
  `db/connection.ts` handles that with `BEGIN IMMEDIATE` and a re-check under the
  lock. Do not add your own concurrency handling.

## Data that already exists

Adding a nullable column is safe. Anything else needs a decision written down
before you implement:

- A `NOT NULL` column needs a default, or a backfill inside the same migration.
- A rename or a type change means existing rows must be carried across — write
  the backfill in the migration, in the same transaction.
- Dropping a column is permanent and unreplicated by anything but Litestream's
  point-in-time history. Say so out loud before doing it.

Puzzle rows are the sharp edge: `slot` is a permanent storage key that player
stats, saved progress, and word-find analytics are all keyed on. **Never
renumber a slot.**

## Tests — same commit

- The migration itself: an integration test in `tests/integration/` that opens a
  database at the previous shape, runs the migration, and asserts the new shape
  and any backfilled values.
- The behaviour the change exists for, through the real Hono app with in-memory
  SQLite. The descriptive test name is the behaviour catalog entry.

## Verify

```bash
pnpm run typecheck
pnpm run test:unit
```

Then confirm a fresh database and a migrated one agree — that is what the two
edits are for. If they diverge, one of the two edits is wrong.

**If this goes wrong:** a bad schema change that reaches production aborts
container startup, so the site serves the last good image rather than corrupt
data — you will see it in the deploy's Telegram alert and container health, not
in user-facing breakage. Recovery is to append a corrective migration and deploy
again. Data already destroyed by a dropped column or a bad backfill comes back
only from the Litestream replica, so treat destructive changes as one-way.
