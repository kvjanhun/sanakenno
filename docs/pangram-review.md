# Pangram Review Pipeline

Sanakenno admin suggestions use pangram-quality metadata to avoid suggesting
valid but poor puzzle anchors.

Tracked outputs:

- `server/assets/pangram-quality.json`: curated LLM/human-reviewed grades used
  by suggestions.
- `server/assets/pangram-quality.generated.json`: local heuristic fallback used
  only when no curated grade exists.

The canonical scripts are:

- `scripts/pangram-review.ts`: candidate export, OpenAI Batch API request
  generation, result parsing, auditing, chunk merge, and promotion.
- `scripts/comment-pangram-audit.ts`: interactive local reviewer for comments in
  `tmp/pangram-review/audit.json`.
- `scripts/generate-pangram-quality.ts`: heuristic fallback generator for
  `server/assets/pangram-quality.generated.json`.

## Inputs

Use the same repository commit and input data when reproducing a historical
run; the candidate set and prompt examples depend on the then-current word list,
database, blocked words, and curated metadata.

Required local inputs:

- A local SQLite database with the `combinations` table populated.
- `server/data/kotus_words.txt`.
- `OPENAI_API_KEY` in `.env.local` or in the shell environment.
- The tracked `server/assets/pangram-quality.json` and
  `server/assets/pangram-quality.generated.json` from the commit being reviewed.

All intermediate files are generated under `tmp/pangram-review/`. They include
spoiler pangram words, OpenAI batch state, raw model output, and local developer
comments, so they intentionally stay untracked.

## Candidate Export

Regenerate the heuristic fallback first if the word list, blocked words, or
combination table changed:

```bash
pnpm run screening:generate
```

Then export review candidates:

```bash
pnpm run review:export
```

`review:export` writes `tmp/pangram-review/candidates.jsonl`. It includes every
eligible center-letter variation with:

- 18 to 80 accepted words.
- 1 to 5 pangrams.
- Current curated and heuristic grades, when present.
- The actual pangram words, for private review only.

Candidates are grouped before model review by identical 7-letter set and
identical pangram set. The model grades one `group_id`, and the parser expands
that grade back to every center-letter key in the group. This prevents the same
pangrams from receiving inconsistent grades for different centers.

## Prompt Policy

The model grades only pangram quality, not total word count or the center
letter. The prompt asks for one of four grades:

- `good`: strong, ordinary puzzle anchors that Finnish players are likely to
  understand and plausibly find.
- `ok`: fair puzzle material. This is the normal passing grade.
- `risky`: valid but questionable: obscure, specialist, awkwardly derived,
  dictionary-valid but unnatural, or likely unfair as the only/primary pangram.
- `reject`: should not be suggested.

Prompt principles:

- Judge contextual naturalness, not rare letters alone.
- Finnish compounds are normal words. Penalize only forced, semantically odd, or
  very niche compounds.
- Established loanwords can pass when the spelling is natural Finnish usage.
- Rare letters such as `f`, `c`, `d`, `g`, `b`, and `w` are acceptable when the
  word itself is familiar or standard.
- Base forms and ordinary verbs, nouns, and adjectives are stronger anchors than
  awkward comparatives, forced adverbs, heavy abstractions, or dictionary-only
  inflections.
- Multiple pangrams are graded as a set. One excellent pangram can carry a group
  to `ok`, while several weak pangrams should lower the grade or confidence.
- `high` confidence means the grade can be used directly. `low` confidence
  means a human should inspect the result before promotion.

The batch prompt also includes evenly selected existing curated examples for
each grade.

## Pilot Run

Run the pilot before spending on a full batch:

```bash
pnpm run review:make-pilot
pnpm run review:submit
pnpm run review:status
pnpm run review:download
pnpm run review:parse
pnpm run review:audit
pnpm run review:comments -- --filter=curated-bucket-disagreements
```

The default pilot uses `gpt-5.4`, `--sample-size=150`,
`--include-curated`, and `--group-size=30`. It is stratified by current review
state, word-count band, and pangram count so the sample exercises known curated
cases and unreviewed candidates.

Inspect `tmp/pangram-review/audit.json` and add comments with
`review:comments` when the model is inconsistent or the prompt needs adjustment.
Pilot output is not promotable unless `--allow-sample` is passed explicitly.

## Full Run

After the pilot is acceptable, generate and submit the full uncurated batch:

```bash
pnpm run review:make-batch -- --model=gpt-5.4
pnpm run review:submit
pnpm run review:status
pnpm run review:download
pnpm run review:parse
pnpm run review:audit
```

For very large runs, split work into chunks:

```bash
pnpm run review:make-batch -- --model=gpt-5.4 --chunk-count=4 --chunk-index=1
pnpm run review:submit
pnpm run review:status
pnpm run review:download
pnpm run review:parse
```

Repeat each chunk with its own `--chunk-index`, then merge parsed drafts:

```bash
pnpm run review:merge-chunks
```

## Promotion

Audit before writing tracked metadata:

```bash
pnpm run review:promote -- --min-confidence=medium --dry-run
```

If the dry run is correct:

```bash
pnpm run review:promote -- --min-confidence=medium
```

Promotion writes `server/assets/pangram-quality.json`. Existing curated grades
are preserved unless `--overwrite-curated` is passed. The default promotion
accepts `medium` and `high` confidence for all grades; narrow it with
`--grades=good,ok` when only passing candidates should be promoted.
