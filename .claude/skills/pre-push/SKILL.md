---
name: pre-push
description: >-
  Run the full local CI gauntlet that mirrors GitHub Actions before any push to
  main or PR open. Use before every commit/push since the strict CI does not let
  lint or typecheck errors through and there is no staging. Halts on first
  failure. Args: --skip-e2e, --skip-build, --docs-only.
tools: Bash, Read, Grep, Glob
---

# Pre-Push Gauntlet

Mirrors `.github/workflows/ci-web.yml` exactly. Halts on first failure. No
staging environment — this gate is the safety net.

## 1. Run the gauntlet

Run steps **sequentially** in this order. Match CI ordering — failures surface
in the same place CI would catch them.

```bash
pnpm run typecheck            # server (root)
pnpm turbo run typecheck      # shared, web
pnpm run lint
pnpm run test:unit            # Vitest unit + integration
pnpm run test:e2e             # needs dev server up
pnpm run build
pnpm run test:pwa:built       # PWA checks against the production build
```

## 2. Skip flags

Parse from args (sparingly — CI runs everything regardless):

- `--skip-e2e` — skip Playwright. OK for copy-only or comment-only changes.
- `--skip-build` — skip prod build + built-PWA tests. Rare; only if the build
  step is wholly unrelated.
- `--docs-only` — run only `lint` + `typecheck`. Use only for `.md` /
  docs-only diffs.

If a skip flag is used, print a one-line warning naming what was skipped and
remind that CI will still run it.

## 3. Failure handling

- On first failure: stop. Surface the exact command and the failing output verbatim.
- Do not auto-fix unless the user asks.
- Do not retry without diagnosis.
- If E2E fails because the dev server is down (`curl http://localhost:5173` fails), say so — do **not** start the dev server (the user keeps it running themselves on `:5173` / `:3001`).

## 4. Report

End with one line, nothing more:

- `Gauntlet PASSED — safe to push`
- `Gauntlet FAILED at <step>` (with the failing command)

## 5. Docs sync check

Before reporting PASSED, verify the single-owner docs still tell the truth
about this change:

- Commands, CI steps, or workflow rules changed → `CLAUDE.md`.
- Structure, data flow, or endpoints changed → `PROJECT_MAP.md`.
- Stack or the public-facing story changed → `README.md`.

Each fact lives in exactly one file — update the owner, link from the others.

Then scan the docs you touched for journal writing — "used to", "no longer",
"previously", "now owns", "was moved", or any sentence that only makes sense
to someone who watched the change. Documentation states what is true now;
history belongs in the commit message. See "Documentation is not a journal"
in `CLAUDE.md`.
