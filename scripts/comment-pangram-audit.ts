/**
 * Interactive local reviewer for pangram-quality audit files.
 *
 * This edits tmp/pangram-review/audit.json in place. The file contains
 * spoiler pangrams by design and must stay local.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { join } from 'node:path';

type ReviewGrade = 'good' | 'ok' | 'risky' | 'reject';
type ReviewConfidence = 'high' | 'medium' | 'low';

interface AuditReview {
  key: string;
  grade: ReviewGrade;
  confidence: ReviewConfidence;
  reason: string;
  letters?: string;
  center?: string;
  word_count?: number;
  pangram_count?: number;
  pangrams?: string[];
  current_curated_grade?: ReviewGrade;
  current_screening_grade?: ReviewGrade;
  dev_comment?: string;
}

interface AuditFile {
  reviews: AuditReview[];
  samples?: Record<string, AuditReview[]>;
  [key: string]: unknown;
}

const DEFAULT_AUDIT_PATH = join(
  process.cwd(),
  'tmp',
  'pangram-review',
  'audit.json',
);
const DEFAULT_STATE_PATH = join(
  process.cwd(),
  'tmp',
  'pangram-review',
  'audit-comment-state.json',
);

interface CommentState {
  cursors: Record<string, number>;
}

function argValue(name: string, fallback?: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index !== -1) return process.argv[index + 1] || fallback;
  return fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function usage(): never {
  console.log(`Usage:
  pnpm run review:comments
  pnpm run review:comments -- --filter=curated-bucket-disagreements
  pnpm run review:comments -- --filter=all --start=120
  pnpm run review:comments -- --init

Filters:
  all, uncommented, low-confidence, curated-disagreements,
  curated-bucket-disagreements, good, ok, risky, reject`);
  process.exit(1);
}

function readAudit(path: string): AuditFile {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}; run pnpm run review:audit first`);
  }
  const audit = JSON.parse(readFileSync(path, 'utf-8')) as AuditFile;
  if (!Array.isArray(audit.reviews)) {
    throw new Error(`${path} does not contain a reviews array`);
  }
  return audit;
}

function readState(path: string): CommentState {
  if (!existsSync(path)) return { cursors: {} };
  const parsed = JSON.parse(
    readFileSync(path, 'utf-8'),
  ) as Partial<CommentState>;
  return { cursors: parsed.cursors || {} };
}

function writeState(path: string, state: CommentState): void {
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

function gradeBucket(grade: ReviewGrade): 'pass' | 'hold' {
  return grade === 'good' || grade === 'ok' ? 'pass' : 'hold';
}

function ensureComments(audit: AuditFile): void {
  const comments = new Map<string, string>();
  for (const review of audit.reviews) {
    if (typeof review.dev_comment !== 'string') review.dev_comment = '';
    if (review.dev_comment) comments.set(review.key, review.dev_comment);
  }

  for (const sample of Object.values(audit.samples || {})) {
    for (const review of sample || []) {
      if (typeof review.dev_comment !== 'string') review.dev_comment = '';
      if (review.dev_comment) comments.set(review.key, review.dev_comment);
    }
  }

  for (const review of audit.reviews) {
    review.dev_comment = comments.get(review.key) || review.dev_comment || '';
  }
  for (const sample of Object.values(audit.samples || {})) {
    for (const review of sample || []) {
      review.dev_comment = comments.get(review.key) || review.dev_comment || '';
    }
  }
}

function setComment(audit: AuditFile, key: string, comment: string): void {
  for (const review of audit.reviews) {
    if (review.key === key) review.dev_comment = comment;
  }
  for (const sample of Object.values(audit.samples || {})) {
    for (const review of sample || []) {
      if (review.key === key) review.dev_comment = comment;
    }
  }
}

function writeAudit(path: string, audit: AuditFile): void {
  ensureComments(audit);
  writeFileSync(path, `${JSON.stringify(audit, null, 2)}\n`);
}

function reviewMatchesFilter(review: AuditReview, filter: string): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'uncommented':
      return !review.dev_comment;
    case 'low-confidence':
      return review.confidence === 'low';
    case 'curated-disagreements':
      return Boolean(
        review.current_curated_grade &&
        review.current_curated_grade !== review.grade,
      );
    case 'curated-bucket-disagreements':
      return Boolean(
        review.current_curated_grade &&
        gradeBucket(review.current_curated_grade) !== gradeBucket(review.grade),
      );
    case 'good':
    case 'ok':
    case 'risky':
    case 'reject':
      return review.grade === filter;
    default:
      throw new Error(`Unknown --filter=${filter}`);
  }
}

function filteredReviews(audit: AuditFile, filter: string): AuditReview[] {
  return audit.reviews.filter((review) => reviewMatchesFilter(review, filter));
}

function startIndex(
  reviews: AuditReview[],
  filter: string,
  start: string | undefined,
  state: CommentState,
): number {
  if (!start) return 0;
  if (start === 'resume') {
    return Math.max(
      0,
      Math.min(reviews.length - 1, state.cursors[filter] || 0),
    );
  }
  const numeric = parseInt(start, 10);
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(reviews.length - 1, numeric - 1));
  }
  const index = reviews.findIndex((review) => review.key === start);
  return index === -1 ? 0 : index;
}

function formatGrade(label: string, value: ReviewGrade | undefined): string {
  return `${label}: ${value || '-'}`;
}

function printReview(review: AuditReview, index: number, total: number): void {
  console.log('\n' + '='.repeat(72));
  console.log(`[${index + 1}/${total}] ${review.key}`);
  console.log(
    `Letters: ${review.letters || '-'}  Center: ${review.center || '-'}  Words: ${
      review.word_count ?? '-'
    }  Pangrams: ${review.pangram_count ?? '-'}`,
  );
  console.log(
    `GPT: ${review.grade} (${review.confidence})  ${formatGrade(
      'curated',
      review.current_curated_grade,
    )}  ${formatGrade('screening', review.current_screening_grade)}`,
  );
  console.log(`Pangrams: ${(review.pangrams || []).join(', ') || '-'}`);
  console.log(`Reason: ${review.reason}`);
  console.log(`Comment: ${review.dev_comment || '-'}`);
  console.log(
    'Enter comment, empty=keep next, .clear, .back, .skip, .quit, .help',
  );
}

function printHelp(): void {
  console.log(`
Commands:
  <text>   set comment and go next
  Enter    keep current comment and go next
  .clear   clear comment and go next
  .skip    go next without changing
  .back    go to previous entry
  .show    show current entry again
  .help    show this help
  .quit    save and exit
`);
}

async function reviewInteractively(
  path: string,
  audit: AuditFile,
): Promise<void> {
  const filter = argValue('--filter', 'all') || 'all';
  const reviews = filteredReviews(audit, filter);
  if (reviews.length === 0) {
    console.log(`No entries for filter "${filter}"`);
    return;
  }

  const statePath =
    argValue('--state-file', DEFAULT_STATE_PATH) || DEFAULT_STATE_PATH;
  const state = readState(statePath);
  let index = startIndex(reviews, filter, argValue('--start', 'resume'), state);
  const rl = createInterface({ input, output });

  function saveCursor(): void {
    state.cursors[filter] = Math.max(0, Math.min(index, reviews.length));
    writeState(statePath, state);
  }

  try {
    while (index < reviews.length) {
      const review = reviews[index];
      printReview(review, index, reviews.length);
      const answer = await rl.question('> ');
      const trimmed = answer.trim();

      if (trimmed === '.quit') {
        saveCursor();
        break;
      }
      if (trimmed === '.help') {
        printHelp();
        continue;
      }
      if (trimmed === '.show') continue;
      if (trimmed === '.back') {
        index = Math.max(0, index - 1);
        saveCursor();
        continue;
      }
      if (trimmed === '.skip' || trimmed === '') {
        index++;
        saveCursor();
        continue;
      }
      if (trimmed === '.clear') {
        setComment(audit, review.key, '');
        writeAudit(path, audit);
        index++;
        saveCursor();
        continue;
      }

      setComment(audit, review.key, answer.trim());
      writeAudit(path, audit);
      index++;
      saveCursor();
    }
  } finally {
    rl.close();
  }

  writeAudit(path, audit);
  saveCursor();
  console.log(`Saved ${path}`);
  console.log(
    `Cursor for "${filter}" is ${Math.min(index + 1, reviews.length + 1)}`,
  );
}

async function main(): Promise<void> {
  if (hasFlag('--help')) usage();
  const path = argValue('--file', DEFAULT_AUDIT_PATH) || DEFAULT_AUDIT_PATH;
  const audit = readAudit(path);
  ensureComments(audit);
  writeAudit(path, audit);

  if (hasFlag('--init')) {
    console.log(`Initialized dev_comment fields in ${path}`);
    return;
  }

  await reviewInteractively(path, audit);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
