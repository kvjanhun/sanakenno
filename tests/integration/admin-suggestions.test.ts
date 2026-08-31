/**
 * Game suggestion API surface: response shape, spoiler gating, rotation
 * exclusion, declined-candidate skipping, and the permanent rejection
 * list with restore.
 *
 * Replaces the suggestion scenarios of the former admin.feature BDD suite;
 * the candidate-selection engine itself (bands, quality grades, overlap)
 * is covered in tests/puzzle-suggestions.test.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../server/index';
import { getDb } from '../../server/db/connection';
import { setWordlist } from '../../server/puzzle-engine';
import {
  setSuggestionQualityForTesting,
  suggestionKey,
  type PangramQualityGrade,
} from '../../server/puzzle-suggestions';
import {
  setupAdmin,
  teardownAdmin,
  adminGet,
  adminHeaders,
  type AdminSession,
} from './helpers/admin-fixture';

let session: AdminSession;

interface Suggestion {
  letters: string[];
  letters_key: string;
  center: string;
  word_count: number;
  pangram_count: number;
  quality_label: string;
  words?: unknown;
  pangrams?: string[];
}

/** Generate `count` synthetic words for a candidate combination. */
function suggestionWords(
  letters: string,
  center: string,
  count: number,
): string[] {
  const chars = Array.from(letters);
  const words = new Set<string>([letters]);
  for (const a of chars) {
    for (const b of chars) {
      for (const c of chars) {
        words.add(`${center}${a}${b}${c}`);
        if (words.size >= count) return [...words].slice(0, count);
      }
    }
  }
  return [...words].slice(0, count);
}

function seedSuggestionCombination(
  letters: string,
  center: string,
  wordCount = 36,
  maxScore = 120,
  pangramCount = 1,
): void {
  const sortedLetters = Array.from(letters).sort().join('');
  const variations = Array.from(sortedLetters).map((letter) => ({
    center: letter,
    word_count: letter === center ? wordCount : 8,
    max_score: letter === center ? maxScore : 30,
    pangram_count: pangramCount,
  }));
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO combinations
       (letters, total_pangrams, min_word_count, max_word_count, min_max_score, max_max_score, variations, in_rotation)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(
      sortedLetters,
      pangramCount,
      Math.min(...variations.map((v) => v.word_count)),
      Math.max(...variations.map((v) => v.word_count)),
      Math.min(...variations.map((v) => v.max_score)),
      Math.max(...variations.map((v) => v.max_score)),
      JSON.stringify(variations),
    );
}

/** Seed two eligible, quality-graded candidates outside the rotation. */
function seedCandidates(): void {
  getDb().prepare('DELETE FROM combinations').run();
  setWordlist(
    new Set([
      ...suggestionWords('opqrstu', 'o', 36),
      ...suggestionWords('vwxyzåä', 'v', 34),
    ]),
  );
  seedSuggestionCombination('opqrstu', 'o', 36, 120);
  seedSuggestionCombination('vwxyzåä', 'v', 34, 116);
  setSuggestionQualityForTesting({
    [suggestionKey('opqrstu', 'o')]: 'good' as PangramQualityGrade,
    [suggestionKey('vwxyzåä', 'v')]: 'ok' as PangramQualityGrade,
  });
}

async function getSuggestion(query = ''): Promise<{
  res: Response;
  suggestion: Suggestion;
}> {
  const res = await app.request(`/api/admin/suggestion${query}`, {
    headers: adminGet(session),
  });
  const json = (await res.json()) as { suggestion: Suggestion };
  return { res, suggestion: json.suggestion };
}

beforeEach(async () => {
  session = await setupAdmin();
  seedCandidates();
});

afterEach(() => {
  teardownAdmin();
});

describe('game suggestions', () => {
  it('suggests an appendable game without spoilers', async () => {
    const { res, suggestion } = await getSuggestion();
    expect(res.status).toBe(200);
    expect(Array.isArray(suggestion.letters)).toBe(true);
    expect(typeof suggestion.center).toBe('string');
    expect(typeof suggestion.word_count).toBe('number');
    expect(typeof suggestion.pangram_count).toBe('number');
    expect(typeof suggestion.quality_label).toBe('string');
    expect(suggestion.words).toBeUndefined();
    expect(suggestion.pangrams).toBeUndefined();
  });

  it('reveals pangrams only on explicit spoiler request', async () => {
    const { res, suggestion } = await getSuggestion('?include_pangrams=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(suggestion.pangrams)).toBe(true);
    expect(suggestion.pangrams!.length).toBeGreaterThan(0);
    expect(suggestion.words).toBeUndefined();
  });

  it('excludes combinations already in rotation', async () => {
    // The rotation serves a,e,k,l,n,s,t puzzles; seed that combination as a
    // candidate and verify it is never suggested.
    getDb().prepare('DELETE FROM combinations').run();
    setWordlist(
      new Set([
        ...suggestionWords('aeklnst', 'a', 36),
        ...suggestionWords('opqrstu', 'o', 34),
      ]),
    );
    seedSuggestionCombination('aeklnst', 'a', 36, 120);
    seedSuggestionCombination('opqrstu', 'o', 34, 116);
    setSuggestionQualityForTesting({
      [suggestionKey('aeklnst', 'a')]: 'good' as PangramQualityGrade,
      [suggestionKey('opqrstu', 'o')]: 'ok' as PangramQualityGrade,
    });

    const { suggestion } = await getSuggestion();
    expect(suggestion.letters_key).not.toBe('aeklnst');
  });

  it('skips declined candidates', async () => {
    const first = await getSuggestion();
    const key = `${first.suggestion.letters_key}:${first.suggestion.center}`;
    const second = await getSuggestion(`?declined=${encodeURIComponent(key)}`);
    expect(second.res.status).toBe(200);
    const secondKey = `${second.suggestion.letters_key}:${second.suggestion.center}`;
    expect(secondKey).not.toBe(key);
  });
});

describe('suggestion rejections', () => {
  async function rejectFirstSuggestion(): Promise<{
    key: string;
    id: number;
  }> {
    const { suggestion } = await getSuggestion();
    const res = await app.request('/api/admin/suggestion-rejections', {
      method: 'POST',
      headers: adminHeaders(session),
      body: JSON.stringify({
        letters: suggestion.letters,
        center: suggestion.center,
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      id?: number;
      rejection?: { id?: number };
    };
    return {
      key: `${suggestion.letters_key}:${suggestion.center}`,
      id: (json.id ?? json.rejection?.id)!,
    };
  }

  it('permanently rejected suggestions are skipped and listed', async () => {
    const { key } = await rejectFirstSuggestion();
    const next = await getSuggestion();
    expect(`${next.suggestion.letters_key}:${next.suggestion.center}`).not.toBe(
      key,
    );

    const listRes = await app.request('/api/admin/suggestion-rejections', {
      headers: adminGet(session),
    });
    expect(listRes.status).toBe(200);
    const { rejections } = (await listRes.json()) as {
      rejections: Array<{ letters_key: string; center: string }>;
    };
    expect(rejections.some((r) => `${r.letters_key}:${r.center}` === key)).toBe(
      true,
    );
  });

  it('restoring a rejection makes the suggestion eligible again', async () => {
    const { key, id } = await rejectFirstSuggestion();
    const restore = await app.request(
      `/api/admin/suggestion-rejections/${id}`,
      {
        method: 'DELETE',
        headers: adminHeaders(session),
      },
    );
    expect(restore.status).toBe(200);

    // Reject the other candidate so the restored one is the only choice.
    const other = await getSuggestion();
    const otherKey = `${other.suggestion.letters_key}:${other.suggestion.center}`;
    if (otherKey !== key) {
      await app.request('/api/admin/suggestion-rejections', {
        method: 'POST',
        headers: adminHeaders(session),
        body: JSON.stringify({
          letters: other.suggestion.letters,
          center: other.suggestion.center,
        }),
      });
    }
    const { res, suggestion } = await getSuggestion();
    expect(res.status).toBe(200);
    expect(`${suggestion.letters_key}:${suggestion.center}`).toBe(key);
  });

  it('reports clearly when every suitable suggestion is used or rejected', async () => {
    const first = await rejectFirstSuggestion();
    const second = await rejectFirstSuggestion();
    expect(second.key).not.toBe(first.key);

    const res = await app.request('/api/admin/suggestion', {
      headers: adminGet(session),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe(
      'Kaikki sopivat ehdotukset on jo käytetty tai hylätty',
    );
  });
});
