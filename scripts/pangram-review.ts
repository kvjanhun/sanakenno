/**
 * Private LLM review pipeline for pangram-quality metadata.
 *
 * Exported candidates and batch results include pangram words and must stay
 * local. Keep generated files under tmp/pangram-review/.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { getDb } from '../server/db/connection';
import { computePuzzle, getBlockedWords } from '../server/puzzle-engine';
import {
  normalizeLettersKey,
  suggestionKey,
  type PangramQualityGrade,
} from '../server/puzzle-suggestions';

type ReviewGrade = PangramQualityGrade;
type ReviewConfidence = 'high' | 'medium' | 'low';

interface CombinationRow {
  letters: string;
  variations: string;
}

interface VariationRow {
  center: string;
  word_count: number;
  max_score: number;
  pangram_count: number;
}

interface QualityFile {
  version: number;
  grades: Record<string, PangramQualityGrade>;
}

interface ReviewCandidate {
  key: string;
  letters: string;
  center: string;
  word_count: number;
  pangram_count: number;
  max_score: number;
  pangrams: string[];
  current_curated_grade?: PangramQualityGrade;
  current_screening_grade?: PangramQualityGrade;
}

interface ReviewResult {
  key: string;
  group_id?: string;
  grade: ReviewGrade;
  confidence: ReviewConfidence;
  reason: string;
}

interface GroupReviewResult {
  group_id: string;
  grade: ReviewGrade;
  confidence: ReviewConfidence;
  reason: string;
}

interface DraftReviewFile {
  version: number;
  source: string;
  profile?: string;
  model?: string;
  batch_id?: string;
  reviewed_at: string;
  total: number;
  expected_total: number;
  complete: boolean;
  usage?: TokenUsageSummary;
  reviews: Record<string, ReviewResult>;
  grades: Record<string, ReviewGrade>;
}

interface BatchManifest {
  version: number;
  profile: string;
  model: string;
  review_unit: 'candidate' | 'pangram-group';
  endpoint: string;
  created_at: string;
  input_file: string;
  request_count: number;
  source_candidate_count: number;
  candidate_count: number;
  review_group_count: number;
  full_candidate_count?: number;
  full_review_group_count?: number;
  chunk_index?: number;
  chunk_count?: number;
  group_size: number;
  include_curated: boolean;
  sample_size?: number;
  example_keys: string[];
  example_group_ids: string[];
}

interface BatchSubmitState {
  batch_id: string;
  input_file_id: string;
  endpoint: string;
  created_at: string;
}

interface BatchOutputLine {
  custom_id: string;
  response?: {
    status_code?: number;
    body?: unknown;
  };
  error?: unknown;
}

interface ResponsesBody {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: TokenUsage;
}

interface ChatBody {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface PromptExamples {
  examples: Record<ReviewGrade, object[]>;
  exampleKeys: Set<string>;
  exampleGroupIds: Set<string>;
}

interface BatchRequest {
  custom_id: string;
  method: 'POST';
  url: '/v1/responses';
  body: {
    model: string;
    input: Array<{
      role: 'system' | 'user';
      content: string;
    }>;
    text: {
      format: {
        type: 'json_schema';
        name: string;
        strict: boolean;
        schema: object;
      };
    };
  };
}

interface BatchRequestMap {
  allKeys: Set<string>;
  keysByGroupId: Map<string, Set<string>>;
  groupIdsByCustomId: Map<string, Set<string>>;
}

interface ReviewGroupVariant {
  key: string;
  center: string;
  word_count: number;
  max_score: number;
  current_curated_grade?: PangramQualityGrade;
  current_screening_grade?: PangramQualityGrade;
}

interface ReviewGroup {
  group_id: string;
  letters: string;
  pangram_count: number;
  pangrams: string[];
  keys: string[];
  center_variants: ReviewGroupVariant[];
  word_count_min: number;
  word_count_max: number;
  current_curated_grades: Partial<Record<PangramQualityGrade, number>>;
  current_screening_grades: Partial<Record<PangramQualityGrade, number>>;
}

interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

interface TokenUsageSummary {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

const DEFAULT_DIR = join(process.cwd(), 'tmp', 'pangram-review');
const CANDIDATES_PATH = join(DEFAULT_DIR, 'candidates.jsonl');
const OPENAI_BATCH_PATH = join(DEFAULT_DIR, 'openai-batch.jsonl');
const BATCH_MANIFEST_PATH = join(DEFAULT_DIR, 'openai-batch.manifest.json');
const BATCH_STATE_PATH = join(DEFAULT_DIR, 'openai-batch.state.json');
const RESULTS_PATH = join(DEFAULT_DIR, 'results.jsonl');
const DRAFT_PATH = join(DEFAULT_DIR, 'pangram-quality.llm-draft.json');
const AUDIT_PATH = join(DEFAULT_DIR, 'audit.json');
const ENV_LOCAL_PATH = join(process.cwd(), '.env.local');
const CURATED_QUALITY_PATH = join(
  process.cwd(),
  'server',
  'assets',
  'pangram-quality.json',
);
const SCREENING_PATH = join(
  process.cwd(),
  'server',
  'assets',
  'pangram-quality.generated.json',
);
const MIN_WORDS = 18;
const MAX_WORDS = 80;
const MAX_PANGRAMS = 5;
const GRADES: ReviewGrade[] = ['good', 'ok', 'risky', 'reject'];
const CONFIDENCE_ORDER: Record<ReviewConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function usage(): never {
  console.log(`Usage:
  pnpm run review:export
  pnpm run review:make-pilot
  pnpm run review:make-batch -- [--model=gpt-5.4] [--group-size=30] [--sample-size=150] [--include-curated]
  pnpm run review:submit
  pnpm run review:status [--batch=batch_...]
  pnpm run review:download [--batch=batch_...]
  pnpm run review:parse
  pnpm run review:merge-chunks
  pnpm run review:audit
  pnpm run review:promote -- [--min-confidence=medium] [--grades=good,ok,risky,reject] [--overwrite-curated] [--allow-sample] [--dry-run]

Files are written under ${DEFAULT_DIR}.
Network commands read OPENAI_API_KEY from the environment or .env.local.`);
  process.exit(1);
}

function argValue(name: string, fallback?: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index !== -1) return process.argv[index + 1] || fallback;
  return fallback;
}

function argNumber(name: string, fallback: number): number {
  const value = argValue(name);
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function intArg(name: string, fallback: number): number {
  const parsed = parseInt(argValue(name, String(fallback)) || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalIntArg(name: string): number | undefined {
  const value = argValue(name);
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  if (parsed < 1) {
    throw new Error(`${name} must be greater than zero`);
  }
  return parsed;
}

function ensureDir(): void {
  mkdirSync(DEFAULT_DIR, { recursive: true });
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function writeJsonFile(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readQualityFile(path: string): Record<string, PangramQualityGrade> {
  if (!existsSync(path)) return {};
  return readJsonFile<QualityFile>(path).grades || {};
}

function parseVariations(value: string): VariationRow[] {
  const parsed = JSON.parse(value) as VariationRow[];
  return Array.isArray(parsed) ? parsed : [];
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function writeJsonl(path: string, rows: unknown[]): void {
  writeFileSync(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function sortedRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b, 'fi')),
  );
}

function gradeCounts(
  rows: Iterable<{ grade: ReviewGrade }>,
): Record<ReviewGrade, number> {
  const counts = { good: 0, ok: 0, risky: 0, reject: 0 };
  for (const row of rows) counts[row.grade]++;
  return counts;
}

function deterministicHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function wordCountBand(wordCount: number): string {
  if (wordCount <= 27) return 'short';
  if (wordCount <= 39) return 'regular';
  if (wordCount <= 55) return 'open';
  return 'long';
}

function pickEvenly<T>(
  values: T[],
  limit: number,
  key: (value: T) => string,
): T[] {
  if (values.length <= limit)
    return [...values].sort((a, b) => key(a).localeCompare(key(b), 'fi'));
  const sorted = [...values].sort((a, b) => key(a).localeCompare(key(b), 'fi'));
  const picked: T[] = [];
  for (let index = 0; index < limit; index++) {
    const sourceIndex = Math.floor((index * sorted.length) / limit);
    picked.push(sorted[sourceIndex]);
  }
  return picked;
}

function exportCandidates(): void {
  ensureDir();
  const curated = readQualityFile(CURATED_QUALITY_PATH);
  const screening = readQualityFile(SCREENING_PATH);
  const db = getDb();
  const blockedWords = getBlockedWords();
  const rows = db
    .prepare(
      `SELECT letters, variations
       FROM combinations
       WHERE max_word_count >= ?
         AND min_word_count <= ?
         AND total_pangrams BETWEEN 1 AND ?
       ORDER BY letters ASC`,
    )
    .all(MIN_WORDS, MAX_WORDS, MAX_PANGRAMS) as CombinationRow[];

  const candidates: ReviewCandidate[] = [];
  for (const row of rows) {
    const letters = Array.from(normalizeLettersKey(row.letters));
    const lettersKey = letters.join('');
    for (const variation of parseVariations(row.variations)) {
      if (
        variation.word_count < MIN_WORDS ||
        variation.word_count > MAX_WORDS ||
        variation.pangram_count < 1 ||
        variation.pangram_count > MAX_PANGRAMS
      ) {
        continue;
      }

      const puzzle = computePuzzle(letters, variation.center, blockedWords);
      const pangrams = puzzle.words.filter((word) =>
        letters.every((letter) => word.includes(letter)),
      );
      const key = suggestionKey(letters, variation.center);
      candidates.push({
        key,
        letters: lettersKey,
        center: variation.center,
        word_count: puzzle.hint_data.word_count,
        pangram_count: puzzle.hint_data.pangram_count,
        max_score: puzzle.max_score,
        pangrams,
        current_curated_grade: curated[key],
        current_screening_grade: screening[key],
      });
    }
  }

  writeJsonl(CANDIDATES_PATH, candidates);
  console.log(`Wrote ${candidates.length} candidates to ${CANDIDATES_PATH}`);
}

function pangramSignature(pangrams: string[]): string {
  return [...pangrams].sort((a, b) => a.localeCompare(b, 'fi')).join('|');
}

function reviewGroupId(candidate: ReviewCandidate): string {
  const hash = deterministicHash(
    `${candidate.letters}:${pangramSignature(candidate.pangrams)}`,
  ).toString(36);
  return `${candidate.letters}:${hash}`;
}

function incrementGradeCount(
  counts: Partial<Record<PangramQualityGrade, number>>,
  grade: PangramQualityGrade | undefined,
): void {
  if (!grade) return;
  counts[grade] = (counts[grade] || 0) + 1;
}

function groupCandidates(candidates: ReviewCandidate[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();

  for (const candidate of candidates) {
    const groupId = reviewGroupId(candidate);
    const existing = groups.get(groupId);
    const group =
      existing ||
      ({
        group_id: groupId,
        letters: candidate.letters,
        pangram_count: candidate.pangram_count,
        pangrams: [...candidate.pangrams].sort((a, b) =>
          a.localeCompare(b, 'fi'),
        ),
        keys: [],
        center_variants: [],
        word_count_min: candidate.word_count,
        word_count_max: candidate.word_count,
        current_curated_grades: {},
        current_screening_grades: {},
      } satisfies ReviewGroup);

    group.keys.push(candidate.key);
    group.center_variants.push({
      key: candidate.key,
      center: candidate.center,
      word_count: candidate.word_count,
      max_score: candidate.max_score,
      current_curated_grade: candidate.current_curated_grade,
      current_screening_grade: candidate.current_screening_grade,
    });
    group.word_count_min = Math.min(group.word_count_min, candidate.word_count);
    group.word_count_max = Math.max(group.word_count_max, candidate.word_count);
    incrementGradeCount(
      group.current_curated_grades,
      candidate.current_curated_grade,
    );
    incrementGradeCount(
      group.current_screening_grades,
      candidate.current_screening_grade,
    );

    groups.set(groupId, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      keys: [...group.keys].sort((a, b) => a.localeCompare(b, 'fi')),
      center_variants: [...group.center_variants].sort((a, b) =>
        a.center.localeCompare(b.center, 'fi'),
      ),
    }))
    .sort((a, b) => groupSortKey(a).localeCompare(groupSortKey(b), 'fi'));
}

function groupGrade(
  group: ReviewGroup,
  source: 'current_curated_grades' | 'current_screening_grades',
): PangramQualityGrade | undefined {
  const grades = Object.keys(group[source]) as PangramQualityGrade[];
  return grades.length === 1 ? grades[0] : undefined;
}

function groupReviewState(group: ReviewGroup): string {
  const curated = groupGrade(group, 'current_curated_grades');
  if (curated) return `curated:${curated}`;
  const curatedGrades = Object.keys(group.current_curated_grades);
  if (curatedGrades.length > 1) return 'curated:mixed';
  const screening = groupGrade(group, 'current_screening_grades');
  if (screening) return `screened:${screening}`;
  return 'screened:none';
}

function groupSortKey(group: ReviewGroup): string {
  return [
    groupReviewState(group),
    wordCountBand(
      Math.round((group.word_count_min + group.word_count_max) / 2),
    ),
    `p${group.pangram_count}`,
    group.letters,
    group.group_id,
  ].join(':');
}

function groupForPrompt(
  group: ReviewGroup,
  options: { includeCuratedGrade?: boolean } = {},
): object {
  const promptGroup: Record<string, unknown> = {
    group_id: group.group_id,
    letters: group.letters,
    pangram_count: group.pangram_count,
    pangrams: group.pangrams,
    keys: group.keys,
    word_count_range: [group.word_count_min, group.word_count_max],
    center_variants: group.center_variants.map((variant) => ({
      key: variant.key,
      center: variant.center,
      word_count: variant.word_count,
      max_score: variant.max_score,
    })),
  };
  if (options.includeCuratedGrade) {
    const grade = groupGrade(group, 'current_curated_grades');
    if (grade) promptGroup.curated_grade = grade;
  }
  return promptGroup;
}

function examplesForPrompt(groups: ReviewGroup[]): PromptExamples {
  const examples: Record<ReviewGrade, object[]> = {
    good: [],
    ok: [],
    risky: [],
    reject: [],
  };
  const exampleKeys = new Set<string>();
  const exampleGroupIds = new Set<string>();

  for (const grade of GRADES) {
    const selected = pickEvenly(
      groups.filter(
        (group) => groupGrade(group, 'current_curated_grades') === grade,
      ),
      4,
      groupSortKey,
    );
    for (const group of selected) {
      examples[grade].push(
        groupForPrompt(group, { includeCuratedGrade: true }),
      );
      exampleGroupIds.add(group.group_id);
      for (const key of group.keys) exampleKeys.add(key);
    }
  }

  return { examples, exampleKeys, exampleGroupIds };
}

function reviewInstructions(examples: Record<ReviewGrade, object[]>): string {
  return `You classify Finnish word-puzzle pangram quality for Sanakenno.

The user will provide review groups. Each group has 7 letters, all center-letter
variants for that pangram set, word-count ranges, and the pangram words. Return
exactly one grade per group_id. The grade applies to every key in that group.
Grade ONLY the pangram set, not the whole solution list or the center letter.

Use these grades:
- good: Strong puzzle anchor set. Contains ordinary, natural, recognizable words
  that Finnish players are likely to understand and plausibly find.
- ok: Fair puzzle material. May include established loanwords, ordinary Finnish
  compounds, colloquial but widely understood words, or some weaker pangrams when
  there is at least one solid anchor.
- risky: Valid but questionable: obscure, specialist/domain-specific, awkwardly
  inflected/derived, dictionary-valid but unnatural, proper-name-like, English
  spelling that Finnish speakers understand but rarely use, or likely unfair as
  the only/primary pangram.
- reject: Should not be suggested: clear typo/noise, not Finnish enough for this
  puzzle, mainly a proper name/abbreviation, broken morphology, or otherwise bad.

Important:
- Treat ok as the normal passing grade. Reserve good for especially confident,
  ordinary anchors. Reject should be rare because the source list is prefiltered.
- Finnish compound words are normal words. Do not downgrade merely because a word
  is a compound. Downgrade only forced, semantically odd, or very niche compounds.
- Do NOT judge by rare letters alone. F, C, D, G, B, W, etc. can be good when the
  word itself is familiar, natural, or the standard Finnish spelling.
- Established loanwords can be good/ok. Fully English-looking spellings are more
  risky when Finnish speakers would understand them but not normally write/use
  that form. Do not invent alternate spellings if the borrowed spelling is the
  established Finnish spelling.
- Judge contextual naturalness. Specialist terms can be ok/good when broadly
  familiar enough; narrow academic, sport, hobby, or technical terms trend risky.
- Base forms and ordinary verbs/nouns/adjectives are stronger anchors. Awkward
  comparative forms, adverbs like forced -sti forms, heavy abstractions, and
  dictionary-only inflections should lower good to ok/risky.
- A word everyone can understand is not automatically good: consider whether a
  player is likely to propose it as a puzzle answer.
- Multiple pangrams should be graded by the set: one excellent pangram can carry
  the group to ok, but several bad pangrams should lower confidence/grade. A few
  weak pangrams should usually lower good to ok rather than make the group risky
  when strong familiar anchors remain.
- If the same pangram set appears with several center letters, keep the same
  grade because the pangram quality is identical.
- Confidence high means you would be comfortable using the grade directly.
  Confidence low means a human should inspect it before promotion.
- Keep reason concise and concrete. Mention strong and weak pangrams when useful.
- Return JSON only. No markdown.

Existing curated examples from the project:
${JSON.stringify(examples, null, 2)}`;
}

function reviewSchema(): object {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      reviews: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            group_id: { type: 'string' },
            grade: { type: 'string', enum: GRADES },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
            reason: {
              type: 'string',
              maxLength: 220,
            },
          },
          required: ['group_id', 'grade', 'confidence', 'reason'],
        },
      },
    },
    required: ['reviews'],
  };
}

function stratumKey(group: ReviewGroup): string {
  return [
    groupReviewState(group),
    wordCountBand(
      Math.round((group.word_count_min + group.word_count_max) / 2),
    ),
    `p${group.pangram_count}`,
  ].join(':');
}

function stratifiedSample(groups: ReviewGroup[], limit: number): ReviewGroup[] {
  if (groups.length <= limit) {
    return [...groups].sort((a, b) =>
      a.group_id.localeCompare(b.group_id, 'fi'),
    );
  }

  const selected = new Map<string, ReviewGroup>();
  const curated = groups.filter(
    (group) => Object.keys(group.current_curated_grades).length > 0,
  );
  const curatedLimit = Math.min(curated.length, Math.floor(limit * 0.45));
  for (const group of pickEvenly(curated, curatedLimit, groupSortKey)) {
    selected.set(group.group_id, group);
  }

  const strata = new Map<string, ReviewGroup[]>();
  for (const group of groups) {
    if (selected.has(group.group_id)) continue;
    const key = stratumKey(group);
    const stratum = strata.get(key) || [];
    stratum.push(group);
    strata.set(key, stratum);
  }

  const sortedStrata = [...strata.entries()]
    .map(
      ([key, values]) =>
        [
          key,
          values.sort(
            (a, b) =>
              deterministicHash(a.group_id) - deterministicHash(b.group_id) ||
              a.group_id.localeCompare(b.group_id, 'fi'),
          ),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, 'fi'));

  while (selected.size < limit) {
    let added = false;
    for (const [, stratum] of sortedStrata) {
      const group = stratum.shift();
      if (!group) continue;
      selected.set(group.group_id, group);
      added = true;
      if (selected.size >= limit) break;
    }
    if (!added) break;
  }

  return [...selected.values()].sort(
    (a, b) =>
      stratumKey(a).localeCompare(stratumKey(b), 'fi') ||
      a.group_id.localeCompare(b.group_id, 'fi'),
  );
}

function batchRequestKeys(): BatchRequestMap {
  const allKeys = new Set<string>();
  const keysByGroupId = new Map<string, Set<string>>();
  const groupIdsByCustomId = new Map<string, Set<string>>();
  if (!existsSync(OPENAI_BATCH_PATH)) {
    return { allKeys, keysByGroupId, groupIdsByCustomId };
  }

  for (const request of readJsonl<BatchRequest>(OPENAI_BATCH_PATH)) {
    const userInput = request.body.input.find((input) => input.role === 'user');
    if (!userInput)
      throw new Error(`Missing user input for ${request.custom_id}`);
    const payload = JSON.parse(userInput.content) as {
      candidates?: Array<{ key?: string }>;
      review_groups?: Array<{
        group_id?: string;
        keys?: string[];
        center_variants?: Array<{ key?: string }>;
      }>;
    };

    const groupIds = new Set<string>();
    if (Array.isArray(payload.review_groups)) {
      for (const group of payload.review_groups) {
        if (!group.group_id) {
          throw new Error(
            `Review group without group_id in ${request.custom_id}`,
          );
        }
        const groupKeys = new Set(
          (
            group.keys ||
            group.center_variants?.map((variant) => variant.key) ||
            []
          )
            .filter((key): key is string => typeof key === 'string')
            .sort((a, b) => a.localeCompare(b, 'fi')),
        );
        if (groupKeys.size === 0) {
          throw new Error(`Review group without keys in ${request.custom_id}`);
        }
        groupIds.add(group.group_id);
        keysByGroupId.set(group.group_id, groupKeys);
        for (const key of groupKeys) allKeys.add(key);
      }
    } else if (Array.isArray(payload.candidates)) {
      for (const candidate of payload.candidates) {
        if (!candidate.key) {
          throw new Error(`Candidate without key in ${request.custom_id}`);
        }
        groupIds.add(candidate.key);
        keysByGroupId.set(candidate.key, new Set([candidate.key]));
        allKeys.add(candidate.key);
      }
    } else {
      throw new Error(
        `Missing review_groups/candidates for ${request.custom_id}`,
      );
    }
    groupIdsByCustomId.set(request.custom_id, groupIds);
  }

  return { allKeys, keysByGroupId, groupIdsByCustomId };
}

function makeBatch(): void {
  ensureDir();
  if (!existsSync(CANDIDATES_PATH)) {
    throw new Error(`Missing ${CANDIDATES_PATH}; run review:export first`);
  }

  const profile = argValue('--profile', 'full') || 'full';
  const model = argValue('--model', 'gpt-5.4');
  const groupSize = intArg('--group-size', 30);
  const sampleSize = optionalIntArg('--sample-size');
  const includeCurated = hasFlag('--include-curated');
  const chunkCount = argNumber('--chunk-count', 1);
  const chunkIndex = argNumber('--chunk-index', 1);
  if (!model) throw new Error('Missing model');
  if (!Number.isFinite(groupSize) || groupSize < 1 || groupSize > 100) {
    throw new Error('--group-size must be between 1 and 100');
  }
  if (chunkCount < 1) throw new Error('--chunk-count must be at least 1');
  if (chunkIndex < 1 || chunkIndex > chunkCount) {
    throw new Error('--chunk-index must be between 1 and --chunk-count');
  }

  const candidates = readJsonl<ReviewCandidate>(CANDIDATES_PATH);
  const sourceGroups = groupCandidates(candidates);
  const { examples, exampleKeys, exampleGroupIds } =
    examplesForPrompt(sourceGroups);
  const instructions = reviewInstructions(examples);
  const requests: BatchRequest[] = [];
  const candidatePool = candidates.filter((candidate) => {
    if (exampleKeys.has(candidate.key)) return false;
    if (!includeCurated && candidate.current_curated_grade) return false;
    return true;
  });
  const candidateGroups = groupCandidates(candidatePool).filter(
    (group) => !exampleGroupIds.has(group.group_id),
  );
  const allBatchGroups =
    sampleSize === undefined
      ? candidateGroups
      : stratifiedSample(candidateGroups, sampleSize);
  const batchGroups =
    chunkCount === 1
      ? allBatchGroups
      : allBatchGroups.filter(
          (_group, index) => index % chunkCount === chunkIndex - 1,
        );
  const batchCandidateCount = batchGroups.reduce(
    (sum, group) => sum + group.keys.length,
    0,
  );
  const fullBatchCandidateCount = allBatchGroups.reduce(
    (sum, group) => sum + group.keys.length,
    0,
  );

  for (let start = 0; start < batchGroups.length; start += groupSize) {
    const group = batchGroups.slice(start, start + groupSize);
    requests.push({
      custom_id: [
        'pangram-review',
        profile,
        chunkCount > 1 ? `c${chunkIndex}of${chunkCount}` : null,
        String(start).padStart(5, '0'),
      ]
        .filter(Boolean)
        .join('-'),
      method: 'POST',
      url: '/v1/responses',
      body: {
        model,
        input: [
          { role: 'system', content: instructions },
          {
            role: 'user',
            content: JSON.stringify({
              review_groups: group.map((reviewGroup) =>
                groupForPrompt(reviewGroup),
              ),
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'pangram_review_batch',
            strict: true,
            schema: reviewSchema(),
          },
        },
      },
    });
  }

  writeJsonl(OPENAI_BATCH_PATH, requests);
  writeJsonFile(BATCH_MANIFEST_PATH, {
    version: 1,
    profile,
    model,
    review_unit: 'pangram-group',
    endpoint: '/v1/responses',
    created_at: new Date().toISOString(),
    input_file: basename(OPENAI_BATCH_PATH),
    request_count: requests.length,
    source_candidate_count: candidates.length,
    candidate_count: batchCandidateCount,
    review_group_count: batchGroups.length,
    full_candidate_count: fullBatchCandidateCount,
    full_review_group_count: allBatchGroups.length,
    chunk_index: chunkCount > 1 ? chunkIndex : undefined,
    chunk_count: chunkCount > 1 ? chunkCount : undefined,
    group_size: groupSize,
    include_curated: includeCurated,
    sample_size: sampleSize,
    example_keys: [...exampleKeys].sort((a, b) => a.localeCompare(b, 'fi')),
    example_group_ids: [...exampleGroupIds].sort((a, b) =>
      a.localeCompare(b, 'fi'),
    ),
  } satisfies BatchManifest);
  console.log(
    `Wrote ${requests.length} ${profile}${chunkCount > 1 ? ` chunk ${chunkIndex}/${chunkCount}` : ''} batch requests for ${batchGroups.length}/${allBatchGroups.length} groups / ${batchCandidateCount}/${fullBatchCandidateCount} candidates`,
  );
}

function localEnvValue(name: string): string | undefined {
  if (!existsSync(ENV_LOCAL_PATH)) return undefined;

  for (const line of readFileSync(ENV_LOCAL_PATH, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('sk-')) return trimmed;

    const match = line.match(
      new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)\\s*$`),
    );
    if (!match) continue;

    const value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  return undefined;
}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY || localEnvValue('OPENAI_API_KEY');
  if (!key) {
    throw new Error('Set OPENAI_API_KEY in the environment or .env.local');
  }
  return key;
}

async function openaiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI ${path} failed ${response.status}: ${text}`);
  }
  return JSON.parse(text) as T;
}

async function submitBatch(): Promise<void> {
  ensureDir();
  if (!existsSync(OPENAI_BATCH_PATH)) {
    throw new Error(
      `Missing ${OPENAI_BATCH_PATH}; run review:make-batch first`,
    );
  }

  const manifest = readJsonFile<BatchManifest>(BATCH_MANIFEST_PATH);
  const form = new FormData();
  form.append('purpose', 'batch');
  form.append(
    'file',
    new Blob([readFileSync(OPENAI_BATCH_PATH)], {
      type: 'application/jsonl',
    }),
    basename(OPENAI_BATCH_PATH),
  );

  const file = await openaiJson<{ id: string }>('/files', {
    method: 'POST',
    body: form,
  });
  const batch = await openaiJson<{ id: string }>('/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_file_id: file.id,
      endpoint: manifest.endpoint,
      completion_window: '24h',
    }),
  });

  writeJsonFile(BATCH_STATE_PATH, {
    batch_id: batch.id,
    input_file_id: file.id,
    endpoint: manifest.endpoint,
    created_at: new Date().toISOString(),
  } satisfies BatchSubmitState);
  console.log(`Submitted batch ${batch.id}`);
}

function currentBatchId(): string {
  const fromArgs = argValue('--batch');
  if (fromArgs) return fromArgs;
  if (!existsSync(BATCH_STATE_PATH)) {
    throw new Error(`Missing ${BATCH_STATE_PATH}; pass --batch=batch_...`);
  }
  return readJsonFile<BatchSubmitState>(BATCH_STATE_PATH).batch_id;
}

async function statusBatch(): Promise<void> {
  const batch = await openaiJson<unknown>(`/batches/${currentBatchId()}`);
  console.log(JSON.stringify(batch, null, 2));
}

async function downloadBatch(): Promise<void> {
  ensureDir();
  const batch = await openaiJson<{
    id: string;
    status: string;
    output_file_id?: string;
    error_file_id?: string;
  }>(`/batches/${currentBatchId()}`);
  if (batch.status !== 'completed' || !batch.output_file_id) {
    throw new Error(
      `Batch ${batch.id} is ${batch.status}; output_file_id is not ready`,
    );
  }

  const response = await fetch(
    `https://api.openai.com/v1/files/${batch.output_file_id}/content`,
    {
      headers: { Authorization: `Bearer ${apiKey()}` },
    },
  );
  if (!response.ok) {
    throw new Error(
      `Download failed ${response.status}: ${await response.text()}`,
    );
  }
  writeFileSync(RESULTS_PATH, await response.text());
  console.log(`Downloaded results to ${RESULTS_PATH}`);
}

function responseOutputText(body: unknown): string {
  const responsesBody = body as ResponsesBody;
  if (typeof responsesBody.output_text === 'string') {
    return responsesBody.output_text;
  }
  for (const item of responsesBody.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') return content.text;
    }
  }

  const chatBody = body as ChatBody;
  const chatContent = chatBody.choices?.[0]?.message?.content;
  if (typeof chatContent === 'string') return chatContent;

  throw new Error('Could not extract output text from response body');
}

function responseUsage(body: unknown): TokenUsage {
  const usage = (body as ResponsesBody).usage;
  return {
    input_tokens: usage?.input_tokens || 0,
    output_tokens: usage?.output_tokens || 0,
    total_tokens: usage?.total_tokens || 0,
  };
}

function parseReviewPayload(text: string): GroupReviewResult[] {
  const parsed = JSON.parse(text) as { reviews?: GroupReviewResult[] };
  if (!Array.isArray(parsed.reviews)) throw new Error('Missing reviews array');
  return parsed.reviews;
}

function validateGroupReview(
  review: GroupReviewResult,
  knownGroupIds: Set<string>,
): void {
  if (!knownGroupIds.has(review.group_id)) {
    throw new Error(`Unknown group_id ${review.group_id}`);
  }
  if (!GRADES.includes(review.grade)) {
    throw new Error(`Invalid grade ${review.grade} for ${review.group_id}`);
  }
  if (!['high', 'medium', 'low'].includes(review.confidence)) {
    throw new Error(
      `Invalid confidence ${review.confidence} for ${review.group_id}`,
    );
  }
  if (!review.reason.trim())
    throw new Error(`Missing reason for ${review.group_id}`);
}

function parseResults(): void {
  if (!existsSync(RESULTS_PATH)) {
    throw new Error(`Missing ${RESULTS_PATH}; run review:download first`);
  }
  const manifest = existsSync(BATCH_MANIFEST_PATH)
    ? readJsonFile<BatchManifest>(BATCH_MANIFEST_PATH)
    : null;
  const requests = batchRequestKeys();
  const knownKeys =
    requests.allKeys.size > 0
      ? requests.allKeys
      : new Set(
          readJsonl<ReviewCandidate>(CANDIDATES_PATH).map(
            (candidate) => candidate.key,
          ),
        );
  const knownGroupIds =
    requests.keysByGroupId.size > 0
      ? new Set(requests.keysByGroupId.keys())
      : knownKeys;
  const outputRows = readJsonl<BatchOutputLine>(RESULTS_PATH);
  const reviews: Record<string, ReviewResult> = {};
  const failed: BatchOutputLine[] = [];
  const structuralErrors: string[] = [];
  const usage: TokenUsageSummary = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };

  for (const row of outputRows) {
    if (row.error || row.response?.status_code !== 200 || !row.response.body) {
      failed.push(row);
      continue;
    }
    const expectedGroupIds = requests.groupIdsByCustomId.get(row.custom_id);
    const seenInRow = new Set<string>();
    const rowUsage = responseUsage(row.response.body);
    usage.input_tokens += rowUsage.input_tokens || 0;
    usage.output_tokens += rowUsage.output_tokens || 0;
    usage.total_tokens += rowUsage.total_tokens || 0;

    for (const review of parseReviewPayload(
      responseOutputText(row.response.body),
    )) {
      validateGroupReview(review, knownGroupIds);
      if (expectedGroupIds && !expectedGroupIds.has(review.group_id)) {
        structuralErrors.push(
          `${row.custom_id} returned unexpected group_id ${review.group_id}`,
        );
      }
      if (seenInRow.has(review.group_id)) {
        structuralErrors.push(
          `${row.custom_id} duplicated group_id ${review.group_id}`,
        );
      }
      seenInRow.add(review.group_id);
      const keys = requests.keysByGroupId.get(review.group_id);
      if (!keys || keys.size === 0) {
        structuralErrors.push(`${review.group_id} has no keys to expand`);
        continue;
      }
      for (const key of keys) {
        reviews[key] = {
          key,
          group_id: review.group_id,
          grade: review.grade,
          confidence: review.confidence,
          reason: review.reason.trim(),
        };
      }
    }

    if (expectedGroupIds) {
      for (const groupId of expectedGroupIds) {
        if (!seenInRow.has(groupId)) {
          structuralErrors.push(`${row.custom_id} missed group_id ${groupId}`);
        }
      }
    }
  }

  if (failed.length > 0) {
    writeJsonFile(join(DEFAULT_DIR, 'failed-results.json'), failed);
  }

  const missing = [...knownKeys].filter((key) => !reviews[key]);
  if (failed.length > 0 || structuralErrors.length > 0 || missing.length > 0) {
    writeJsonFile(join(DEFAULT_DIR, 'parse-errors.json'), {
      failed_count: failed.length,
      structural_errors: structuralErrors,
      missing,
    });
    throw new Error(
      `Parse incomplete: ${failed.length} failed rows, ${structuralErrors.length} structural errors, ${missing.length} missing reviews`,
    );
  }

  const grades = sortedRecord(
    Object.fromEntries(
      Object.values(reviews).map((review) => [review.key, review.grade]),
    ),
  );
  const draft: DraftReviewFile = {
    version: 1,
    source: basename(RESULTS_PATH),
    profile: manifest?.profile,
    model: manifest?.model,
    batch_id: existsSync(BATCH_STATE_PATH)
      ? readJsonFile<BatchSubmitState>(BATCH_STATE_PATH).batch_id
      : undefined,
    reviewed_at: new Date().toISOString(),
    total: Object.keys(reviews).length,
    expected_total: knownKeys.size,
    complete: true,
    usage: usage.total_tokens > 0 ? usage : undefined,
    reviews: sortedRecord(reviews),
    grades,
  };
  writeJsonFile(DRAFT_PATH, draft);
  if (manifest?.chunk_count && manifest.chunk_index) {
    writeJsonFile(
      join(
        DEFAULT_DIR,
        `pangram-quality.llm-draft.chunk-${manifest.chunk_index}-of-${manifest.chunk_count}.json`,
      ),
      draft,
    );
  }
  console.log(
    `Parsed ${draft.total}/${knownKeys.size} reviews to ${DRAFT_PATH}`,
  );
}

function mergeChunkDrafts(): void {
  ensureDir();
  const files = readdirSync(DEFAULT_DIR)
    .filter((file) =>
      /^pangram-quality\.llm-draft\.chunk-\d+-of-\d+\.json$/u.test(file),
    )
    .sort((a, b) => a.localeCompare(b, 'fi'));
  if (files.length === 0) {
    throw new Error(`No chunk drafts found in ${DEFAULT_DIR}`);
  }

  const chunks = files.map((file) =>
    readJsonFile<DraftReviewFile>(join(DEFAULT_DIR, file)),
  );
  const reviews: Record<string, ReviewResult> = {};
  const usage: TokenUsageSummary = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };
  let expectedTotal = 0;

  for (const chunk of chunks) {
    expectedTotal += chunk.expected_total;
    usage.input_tokens += chunk.usage?.input_tokens || 0;
    usage.output_tokens += chunk.usage?.output_tokens || 0;
    usage.total_tokens += chunk.usage?.total_tokens || 0;

    for (const [key, review] of Object.entries(chunk.reviews)) {
      if (reviews[key])
        throw new Error(`Duplicate review key while merging: ${key}`);
      reviews[key] = review;
    }
  }

  const total = Object.keys(reviews).length;
  if (total !== expectedTotal) {
    throw new Error(`Merged ${total} reviews, expected ${expectedTotal}`);
  }

  const grades = sortedRecord(
    Object.fromEntries(
      Object.values(reviews).map((review) => [review.key, review.grade]),
    ),
  );
  const merged: DraftReviewFile = {
    version: 1,
    source: files.join(','),
    profile: 'full',
    model: chunks[0].model,
    reviewed_at: new Date().toISOString(),
    total,
    expected_total: expectedTotal,
    complete: chunks.every((chunk) => chunk.complete),
    usage: usage.total_tokens > 0 ? usage : undefined,
    reviews: sortedRecord(reviews),
    grades,
  };

  writeJsonFile(DRAFT_PATH, merged);
  console.log(`Merged ${files.length} chunk drafts into ${DRAFT_PATH}`);
}

function sample<T>(values: T[], limit: number): T[] {
  return values.slice(0, limit);
}

function candidateMap(): Map<string, ReviewCandidate> {
  if (!existsSync(CANDIDATES_PATH)) return new Map();
  return new Map(
    readJsonl<ReviewCandidate>(CANDIDATES_PATH).map((candidate) => [
      candidate.key,
      candidate,
    ]),
  );
}

function existingAuditComments(): Map<string, string> {
  if (!existsSync(AUDIT_PATH)) return new Map();
  const existing = readJsonFile<{
    reviews?: Array<{ key?: string; dev_comment?: string }>;
  }>(AUDIT_PATH);
  return new Map(
    (existing.reviews || [])
      .filter(
        (review) =>
          typeof review.key === 'string' &&
          typeof review.dev_comment === 'string' &&
          review.dev_comment.length > 0,
      )
      .map((review) => [review.key as string, review.dev_comment as string]),
  );
}

function reviewWithCandidateContext(
  review: ReviewResult,
  candidates: Map<string, ReviewCandidate>,
  comments: Map<string, string>,
): object {
  const candidate = candidates.get(review.key);
  return {
    ...review,
    letters: candidate?.letters,
    center: candidate?.center,
    word_count: candidate?.word_count,
    pangram_count: candidate?.pangram_count,
    pangrams: candidate?.pangrams,
    current_curated_grade: candidate?.current_curated_grade,
    current_screening_grade: candidate?.current_screening_grade,
    dev_comment: comments.get(review.key) || '',
  };
}

function reviewsWithCandidateContext(
  reviews: ReviewResult[],
  candidates: Map<string, ReviewCandidate>,
  comments: Map<string, string>,
): object[] {
  return reviews.map((review) =>
    reviewWithCandidateContext(review, candidates, comments),
  );
}

function gradeBucket(grade: ReviewGrade): 'pass' | 'hold' {
  return grade === 'good' || grade === 'ok' ? 'pass' : 'hold';
}

function auditDraft(): void {
  if (!existsSync(DRAFT_PATH)) {
    throw new Error(`Missing ${DRAFT_PATH}; run review:parse first`);
  }
  const draft = readJsonFile<DraftReviewFile>(DRAFT_PATH);
  const curated = readQualityFile(CURATED_QUALITY_PATH);
  const candidates = candidateMap();
  const comments = existingAuditComments();
  const reviews = Object.values(draft.reviews);
  const curatedComparisons = reviews.filter((review) => curated[review.key]);
  const disagreements = reviews.filter(
    (review) => curated[review.key] && curated[review.key] !== review.grade,
  );
  const bucketDisagreements = curatedComparisons.filter(
    (review) => gradeBucket(curated[review.key]) !== gradeBucket(review.grade),
  );
  const lowConfidence = reviews.filter((review) => review.confidence === 'low');
  const byGrade = {
    good: reviews.filter((review) => review.grade === 'good'),
    ok: reviews.filter((review) => review.grade === 'ok'),
    risky: reviews.filter((review) => review.grade === 'risky'),
    reject: reviews.filter((review) => review.grade === 'reject'),
  };
  const audit = {
    profile: draft.profile,
    total: reviews.length,
    expected_total: draft.expected_total,
    complete: draft.complete,
    counts: gradeCounts(reviews),
    usage: draft.usage,
    low_confidence: lowConfidence.length,
    curated_compared: curatedComparisons.length,
    curated_disagreements: disagreements.length,
    curated_exact_agreement:
      curatedComparisons.length > 0
        ? Number(
            (
              (curatedComparisons.length - disagreements.length) /
              curatedComparisons.length
            ).toFixed(3),
          )
        : null,
    curated_bucket_disagreements: bucketDisagreements.length,
    curated_bucket_agreement:
      curatedComparisons.length > 0
        ? Number(
            (
              (curatedComparisons.length - bucketDisagreements.length) /
              curatedComparisons.length
            ).toFixed(3),
          )
        : null,
    samples: {
      low_confidence: reviewsWithCandidateContext(
        sample(lowConfidence, 30),
        candidates,
        comments,
      ),
      curated_disagreements: reviewsWithCandidateContext(
        sample(disagreements, 30),
        candidates,
        comments,
      ),
      curated_bucket_disagreements: reviewsWithCandidateContext(
        sample(bucketDisagreements, 30),
        candidates,
        comments,
      ),
      risky: reviewsWithCandidateContext(
        sample(byGrade.risky, 30),
        candidates,
        comments,
      ),
      reject: reviewsWithCandidateContext(
        sample(byGrade.reject, 30),
        candidates,
        comments,
      ),
      good: reviewsWithCandidateContext(
        sample(byGrade.good, 20),
        candidates,
        comments,
      ),
      ok: reviewsWithCandidateContext(
        sample(byGrade.ok, 20),
        candidates,
        comments,
      ),
    },
    reviews: reviewsWithCandidateContext(reviews, candidates, comments),
  };
  writeJsonFile(AUDIT_PATH, audit);
  const { samples: _samples, reviews: _reviewDetails, ...summary } = audit;
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote audit to ${AUDIT_PATH}`);
}

function promoteDraft(): void {
  if (!existsSync(DRAFT_PATH)) {
    throw new Error(`Missing ${DRAFT_PATH}; run review:parse first`);
  }
  const minConfidence = (argValue('--min-confidence', 'medium') ||
    'medium') as ReviewConfidence;
  if (!Object.keys(CONFIDENCE_ORDER).includes(minConfidence)) {
    throw new Error('--min-confidence must be high, medium, or low');
  }
  const allowedGrades = new Set(
    (argValue('--grades', GRADES.join(',')) || '')
      .split(',')
      .map((grade) => grade.trim())
      .filter(Boolean),
  );
  for (const grade of allowedGrades) {
    if (!GRADES.includes(grade as ReviewGrade)) {
      throw new Error(`Invalid --grades entry: ${grade}`);
    }
  }

  const draft = readJsonFile<DraftReviewFile>(DRAFT_PATH);
  if (draft.profile !== 'full' && !hasFlag('--allow-sample')) {
    throw new Error(
      `Draft profile is ${draft.profile || 'unknown'}; pass --allow-sample to promote non-full results`,
    );
  }
  if (!draft.complete) {
    throw new Error('Draft is incomplete; refusing to promote partial results');
  }
  const curated = readQualityFile(CURATED_QUALITY_PATH);
  const overwriteCurated = hasFlag('--overwrite-curated');
  const promoted: Record<string, ReviewGrade> = {};
  for (const review of Object.values(draft.reviews)) {
    if (!overwriteCurated && curated[review.key]) continue;
    if (CONFIDENCE_ORDER[review.confidence] < CONFIDENCE_ORDER[minConfidence]) {
      continue;
    }
    if (!allowedGrades.has(review.grade)) continue;
    promoted[review.key] = review.grade;
  }

  const merged = sortedRecord({ ...curated, ...promoted });
  const nextFile: QualityFile = { version: 1, grades: merged };
  console.log(
    `${hasFlag('--dry-run') ? 'Would promote' : 'Promoting'} ${Object.keys(promoted).length} reviews into ${CURATED_QUALITY_PATH}`,
  );
  if (hasFlag('--dry-run')) return;
  writeJsonFile(CURATED_QUALITY_PATH, nextFile);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case 'export':
      exportCandidates();
      break;
    case 'make-batch':
      makeBatch();
      break;
    case 'submit':
      await submitBatch();
      break;
    case 'status':
      await statusBatch();
      break;
    case 'download':
      await downloadBatch();
      break;
    case 'parse':
      parseResults();
      break;
    case 'merge-chunks':
      mergeChunkDrafts();
      break;
    case 'audit':
      auditDraft();
      break;
    case 'promote':
      promoteDraft();
      break;
    default:
      usage();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
