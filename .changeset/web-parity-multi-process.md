---
"@sanakenno/web": minor
"@sanakenno/shared": minor
---

- Server now supports running two API containers behind nginx for multi-core throughput; SQLite uses WAL with a busy timeout, and a DB-backed cache generation invalidates puzzle/archive caches across processes.
- Logged-in gameplay sync coalesces stats and puzzle-state into a single `POST /api/player/sync/progress` request per accepted word, halving outgoing traffic.
- Web app reaches feature parity with mobile: archive paginates over all puzzles, stats include lifetime totals, found-word pills link to Kotus definitions and bold pangrams, and a palette/theme selector lives next to the dark-mode toggle.
- Security: wrapped slot aliases of today's puzzle no longer leak the word list.
- UI polish: header icon spacing, archive modal fills the viewport with a fixed height, and the selected-day frame renders as an inset ring so it can't be clipped.
