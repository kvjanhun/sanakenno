---
'@sanakenno/web': minor
---

Track how often each word is found per puzzle. Adds a `word_finds` table
(word, puzzle_number, count) and a `POST /api/word-find` endpoint, with
fire-and-forget reporting from web and mobile clients on every accepted
word. Surfaces which words from a given letter combination are hard to
find for analytics and puzzle tuning.
