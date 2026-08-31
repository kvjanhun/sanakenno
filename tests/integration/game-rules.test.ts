/**
 * Game rules: word validation and scoring through the real web store.
 *
 * Replaces the former scoring.feature and word-validation.feature BDD
 * scenarios. Unlike the old step definitions, these tests drive the real
 * `useGameStore.submitWord` flow, so the rejection rules, Finnish message
 * strings, scoring, and fire-and-forget analytics POSTs are all verified
 * against production code.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import {
  useGameStore,
  type Puzzle,
} from '../../packages/web/src/store/useGameStore';

// jsdom does not always expose WebCrypto's subtle API; the platform hash
// service the store calls needs it.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
} else if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, 'subtle', {
    value: webcrypto.subtle,
  });
}

function sha256(word: string): string {
  return createHash('sha256').update(word).digest('hex');
}

/** Puzzle used by most scenarios: letters a,e,k,l,n,s,t with center "a". */
function makePuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  const words = ['kala', 'sanka', 'kelkka', 'sankaleet'];
  return {
    center: 'a',
    letters: ['e', 'k', 'l', 'n', 's', 't'],
    word_hashes: words.map(sha256),
    hint_data: { letterCounts: {}, prefixes: {}, pangramCount: 0 } as never,
    max_score: 100,
    puzzle_number: 1,
    display_number: 1,
    total_puzzles: 1,
    ...overrides,
  };
}

const fetchMock = vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
  Promise.resolve(new Response('{}', { status: 200 })),
);

/** Parse the JSON body of a recorded fetch call. */
function bodyOf(
  call: [string | URL | Request, RequestInit?],
): Record<string, unknown> {
  return JSON.parse(String(call[1]!.body)) as Record<string, unknown>;
}

function resetStore(puzzle: Puzzle): void {
  useGameStore.setState({
    puzzle,
    outerLetters: puzzle.letters,
    currentWord: '',
    foundWords: new Set<string>(),
    score: 0,
    message: '',
    messageType: 'ok',
    secondaryMessage: '',
    hintsUnlocked: new Set<string>(),
    scoreBeforeHints: null,
    startedAt: Date.now(),
    totalPausedMs: 0,
    wordRejected: false,
    lastResubmittedWord: null,
    viewingPuzzleDate: null,
  });
}

async function submit(word: string): Promise<void> {
  useGameStore.setState({ currentWord: word });
  await useGameStore.getState().submitWord();
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  resetStore(makePuzzle());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('word rejection rules', () => {
  it('rejects a word shorter than 4 letters', async () => {
    await submit('ala');
    const s = useGameStore.getState();
    expect(s.wordRejected).toBe(true);
    expect(s.message).toBe('Liian lyhyt!');
    expect(s.messageType).toBe('error');
  });

  it('rejects a word missing the center letter', async () => {
    await submit('kone');
    const s = useGameStore.getState();
    expect(s.wordRejected).toBe(true);
    expect(s.message).toBe("Kirjain 'A' puuttuu!");
  });

  it('rejects a word using letters not in the puzzle', async () => {
    await submit('kalvo');
    const s = useGameStore.getState();
    expect(s.wordRejected).toBe(true);
    expect(s.message).toBe('Käytä vain annettuja kirjaimia!');
  });

  it('rejects a word whose hash is not in the puzzle word set', async () => {
    await submit('aksat');
    const s = useGameStore.getState();
    expect(s.wordRejected).toBe(true);
    expect(s.message).toBe('Ei sanakirjassa');
    expect(s.foundWords.size).toBe(0);
  });

  it('accepts a word whose SHA-256 hash is in the puzzle data', async () => {
    await submit('kala');
    const s = useGameStore.getState();
    expect(s.wordRejected).toBe(false);
    expect(s.foundWords.has('kala')).toBe(true);
  });

  it('reports a non-dictionary guess to POST /api/failed-guess', async () => {
    await submit('aksat');
    const failedGuessCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/failed-guess'),
    );
    expect(failedGuessCall).toBeDefined();
    const body = bodyOf(failedGuessCall!);
    expect(body.word).toBe('aksat');
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('normalises hyphenated compound words before validation', async () => {
    // "palo-ovi" must validate as "paloovi" (hyphens stripped, lowercased).
    resetStore(
      makePuzzle({
        center: 'o',
        letters: ['p', 'a', 'l', 'v', 'i', 'e'],
        word_hashes: [sha256('paloovi')],
      }),
    );
    await submit('Palo-Ovi');
    const s = useGameStore.getState();
    expect(s.wordRejected).toBe(false);
    expect(s.foundWords.has('paloovi')).toBe(true);
  });
});

describe('scoring', () => {
  it('scores a four-letter word 1 point', async () => {
    await submit('kala');
    expect(useGameStore.getState().score).toBe(1);
    expect(useGameStore.getState().message).toBe('+1');
  });

  it('scores a five-letter word its length', async () => {
    await submit('sanka');
    expect(useGameStore.getState().score).toBe(5);
  });

  it('scores a six-letter word its length', async () => {
    await submit('kelkka');
    expect(useGameStore.getState().score).toBe(6);
  });

  it('scores a pangram length plus 7 bonus and shows "Pangrammi!"', async () => {
    await submit('sankaleet');
    const s = useGameStore.getState();
    expect(s.score).toBe(16);
    expect(s.message).toBe('+16');
    expect(s.secondaryMessage).toBe('Pangrammi!');
    expect(s.secondaryType).toBe('special');
  });

  it('accumulates score across multiple words', async () => {
    await submit('kala');
    await submit('sanka');
    expect(useGameStore.getState().score).toBe(6);
  });

  it('does not change the score for a duplicate word', async () => {
    await submit('kala');
    await submit('kala');
    const s = useGameStore.getState();
    expect(s.score).toBe(1);
    expect(s.foundWords.size).toBe(1);
    expect(s.message).toBe('Löysit jo tämän!');
    expect(s.lastResubmittedWord).toBe('kala');
  });

  it('records an accepted word to POST /api/word-find', async () => {
    await submit('kala');
    const wordFindCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/word-find'),
    );
    expect(wordFindCall).toBeDefined();
    const body = bodyOf(wordFindCall!);
    expect(body).toEqual({ word: 'kala', puzzle_number: 1 });
  });
});

describe('achievement reporting', () => {
  const achievementCalls = () =>
    fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/api/achievement'),
    );

  it('POSTs an achievement when the score crosses into a new rank', async () => {
    // max_score 10 → a 1-point word is 10% and crosses into "Nyt mennään!".
    resetStore(makePuzzle({ max_score: 10 }));
    await submit('kala');
    await vi.waitFor(() => expect(achievementCalls().length).toBe(1));
    const body = bodyOf(achievementCalls()[0]);
    expect(body.rank).toBe('Nyt mennään!');
    expect(body.puzzle_number).toBe(1);
    expect(body.score).toBe(1);
    expect(body.max_score).toBe(10);
    expect(body.words_found).toBe(1);
    expect(typeof body.elapsed_ms).toBe('number');
  });

  it('does not POST again while the rank stays the same', async () => {
    // max_score 1000 → two 1-point words stay inside "Etsi sanoja!".
    resetStore(
      makePuzzle({
        max_score: 1000,
        word_hashes: [sha256('kala'), sha256('alas')],
      }),
    );
    await submit('kala');
    await submit('alas');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(achievementCalls().length).toBe(0);
  });
});
