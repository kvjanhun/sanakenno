---
name: verify-locally
description: Walk through the changed feature in a real browser before declaring it shipped. Use after pre-push has passed but before pushing. Pings the always-running dev servers (localhost:5173 web and localhost:3001 api) and produces a concrete checklist for the browser walk-through. Refuses to claim success for anything that wasn't actually exercised.
tools: Bash, Read, Grep, Glob
---

# Verify Locally

No staging environment. Type checks and tests verify code correctness, not
feature correctness. Before pushing, the change must be exercised in a real
browser when it touches anything user-visible.

## 1. Ping the dev surfaces

```bash
curl -sf http://localhost:5173 > /dev/null && echo "web up"
curl -sf http://localhost:3001/api/health && echo
```

The user keeps these running — never start them yourself. If either is down,
say so and stop.

## 2. Build the walk-through checklist

From the diff, derive:

- The golden path a player (or the admin) would take through the change
- The edge cases the new tests cover (so the manual walk mirrors them)
- Any state that persists (localStorage keys, sync) worth checking across a
  reload

Present it as a concrete checklist of clicks/inputs, e.g.:

- [ ] Golden path: <specific clicks/inputs>
- [ ] Edge case: <input/state>
- [ ] Reload: state survives / rolls over correctly

## 3. Honest reporting

- Only tick what was actually exercised, by you (via API calls) or by the
  user (in the browser — ask them to walk the checklist for visual changes).
- If a surface wasn't exercised, say "not verified" — never imply it was.
