/**
 * Central Zustand store for Sanakenno game state.
 *
 * Manages puzzle data, word submission, scoring, UI flags, and
 * localStorage persistence keyed by puzzle number.
 *
 * @module src/store/useGameStore
 */

import { create } from 'zustand';
import { hashWord } from '../utils/hash.js';
import { scoreWord, recalcScore, rankForScore } from '../utils/scoring.js';
import {
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
} from '../utils/storage.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Shape of the hint_data object returned by the puzzle API. */
export interface HintData {
  word_count: number;
  pangram_count: number;
  by_letter: Record<string, number>;
  by_length: Record<string, number>;
  by_pair: Record<string, number>;
}

/** Shape of the puzzle payload from GET /api/puzzle. */
export interface Puzzle {
  center: string;
  letters: string[];
  word_hashes: string[];
  hint_data: HintData;
  max_score: number;
  puzzle_number: number;
  total_puzzles: number;
}

/** Message severity used for toast display. */
export type MessageType = 'ok' | 'error' | 'special';

/** Celebration overlay type. */
export type CelebrationType = 'allistyttava' | 'taysikenno' | null;

/** Hint icon identifiers for the share line (must match panel IDs). */
type HintId = 'summary' | 'letters' | 'distribution' | 'pairs';

/** Persisted state shape in localStorage. */
interface PersistedState {
  foundWords: string[];
  score: number;
  hintsUnlocked: string[];
  startedAt: number;
  totalPausedMs: number;
}

/** Legacy persisted shape (pre-puzzle-number keying). */
interface LegacyPersistedState extends PersistedState {
  puzzleNumber: number;
}

/* ------------------------------------------------------------------ */
/*  Store shape                                                        */
/* ------------------------------------------------------------------ */

/** Full store state (data + actions). */
export interface GameState {
  /* --- Data --- */
  puzzle: Puzzle | null;
  outerLetters: string[];
  currentWord: string;
  foundWords: Set<string>;
  score: number;
  message: string;
  messageType: MessageType;
  loading: boolean;
  fetchError: string;
  showRanks: boolean;
  showRules: boolean;
  showAllFoundWords: boolean;
  hintsUnlocked: Set<string>;
  celebration: CelebrationType;
  wordShake: boolean;
  wordRejected: boolean;
  lastResubmittedWord: string | null;
  shareCopied: boolean;
  pressedHexIndex: number | null;
  startedAt: number;
  totalPausedMs: number;

  /* --- Derived helpers (synchronous) --- */
  center: () => string;
  allLetters: () => Set<string>;
  wordHashSet: () => Set<string>;
  rank: () => string;
  recentFoundWords: () => string[];
  sortedFoundWords: () => string[];

  /* --- Actions --- */
  fetchPuzzle: (overrideNumber?: number) => Promise<void>;
  addLetter: (letter: string) => void;
  deleteLetter: () => void;
  shuffleLetters: () => void;
  submitWord: () => Promise<void>;
  saveState: () => void;
  loadState: () => Promise<void>;
  showMessageAction: (
    msg: string,
    type: MessageType,
    duration?: number,
  ) => void;
  setShowRanks: (v: boolean) => void;
  setShowRules: (v: boolean) => void;
  setShowAllFoundWords: (v: boolean) => void;
  unlockHint: (id: string) => void;
  copyStatus: () => Promise<void>;
  setPressedHexIndex: (i: number | null) => void;
  setCelebration: (v: CelebrationType) => void;
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Storage key for a given puzzle number. */
function storageKey(puzzleNumber: number): string {
  return `sanakenno_state_${puzzleNumber}`;
}

const LEGACY_KEY = 'sanakenno_state';

/** Fisher-Yates in-place shuffle, returns new array. */
function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Map hint IDs to their share emoji. */
const HINT_ICONS: Record<HintId, string> = {
  summary: '\u{1F4CA}',
  letters: '\u{1F524}',
  distribution: '\u{1F4CF}',
  pairs: '\u{1F520}',
};

/** Ordered hint IDs for consistent share line output. */
const HINT_ORDER: HintId[] = ['summary', 'letters', 'distribution', 'pairs'];

let messageTimer: ReturnType<typeof setTimeout> | null = null;

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useGameStore = create<GameState>()((set, get) => ({
  /* --- Initial state --- */
  puzzle: null,
  outerLetters: [],
  currentWord: '',
  foundWords: new Set<string>(),
  score: 0,
  message: '',
  messageType: 'ok',
  loading: false,
  fetchError: '',
  showRanks: false,
  showRules: false,
  showAllFoundWords: false,
  hintsUnlocked: new Set<string>(),
  celebration: null,
  wordShake: false,
  wordRejected: false,
  lastResubmittedWord: null,
  shareCopied: false,
  pressedHexIndex: null,
  startedAt: 0,
  totalPausedMs: 0,

  /* --- Derived helpers --- */

  center: () => get().puzzle?.center ?? '',

  allLetters: () => {
    const { puzzle, outerLetters } = get();
    const s = new Set<string>(outerLetters);
    if (puzzle) s.add(puzzle.center);
    return s;
  },

  wordHashSet: () => new Set<string>(get().puzzle?.word_hashes ?? []),

  rank: () => {
    const { score, puzzle } = get();
    return rankForScore(score, puzzle?.max_score ?? 0);
  },

  recentFoundWords: () => {
    const { foundWords } = get();
    return [...foundWords].reverse().slice(0, 6);
  },

  sortedFoundWords: () => {
    const { foundWords } = get();
    return [...foundWords].sort((a, b) => a.localeCompare(b, 'fi'));
  },

  /* --- Actions --- */

  fetchPuzzle: async (overrideNumber?: number) => {
    set({ loading: true, fetchError: '' });
    try {
      const url =
        overrideNumber !== undefined
          ? `/api/puzzle/${overrideNumber}`
          : '/api/puzzle';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Puzzle;

      const outerLetters = data.letters.filter((l) => l !== data.center);
      set({
        puzzle: data,
        outerLetters,
        loading: false,
        currentWord: '',
        foundWords: new Set<string>(),
        score: 0,
        message: '',
        fetchError: '',
        celebration: null,
        startedAt: Date.now(),
        totalPausedMs: 0,
      });

      await get().loadState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tuntematon virhe';
      set({ loading: false, fetchError: msg });
    }
  },

  addLetter: (letter: string) => {
    const { wordRejected } = get();
    if (wordRejected) {
      set({ currentWord: letter, wordRejected: false, wordShake: false });
      return;
    }
    set((s) => ({ currentWord: s.currentWord + letter }));
  },

  deleteLetter: () => {
    const { wordRejected, currentWord } = get();
    if (wordRejected) {
      set({ currentWord: '', wordRejected: false, wordShake: false });
      return;
    }
    set({ currentWord: currentWord.slice(0, -1) });
  },

  shuffleLetters: () => {
    set((s) => ({ outerLetters: fisherYatesShuffle(s.outerLetters) }));
  },

  submitWord: async () => {
    const state = get();
    const { puzzle, currentWord, foundWords } = state;
    if (!puzzle) return;

    const normalized = currentWord.toLowerCase().replace(/-/g, '');

    // 1. Too short
    if (normalized.length < 4) {
      get().showMessageAction('Liian lyhyt!', 'error');
      set({ wordRejected: true, wordShake: true });
      setTimeout(() => set({ wordShake: false }), 400);

      return;
    }

    // 2. Missing center letter
    if (!normalized.includes(puzzle.center)) {
      const upper = puzzle.center.toUpperCase();
      get().showMessageAction(`Kirjain '${upper}' puuttuu!`, 'error');
      set({ wordRejected: true, wordShake: true });
      setTimeout(() => set({ wordShake: false }), 400);

      return;
    }

    // 3. Invalid letters
    const validLetters = state.allLetters();
    for (const ch of normalized) {
      if (!validLetters.has(ch)) {
        get().showMessageAction('Käytä vain annettuja kirjaimia!', 'error');
        set({ wordRejected: true, wordShake: true });
        setTimeout(() => set({ wordShake: false }), 400);

        return;
      }
    }

    // 4. Already found
    if (foundWords.has(normalized)) {
      get().showMessageAction('Löysit jo tämän!', 'error');
      set({
        wordRejected: true,
        wordShake: true,
        lastResubmittedWord: normalized,
      });
      setTimeout(() => {
        set({ wordShake: false, lastResubmittedWord: null });
      }, 1200);

      return;
    }

    // 5. Hash check
    const wordHash = await hashWord(normalized);
    const hashSet = state.wordHashSet();
    if (!hashSet.has(wordHash)) {
      get().showMessageAction('Ei sanakirjassa', 'error');
      set({ wordRejected: true, wordShake: true });
      setTimeout(() => set({ wordShake: false }), 400);

      return;
    }

    // 6. Valid word
    const pts = scoreWord(normalized, validLetters);
    const isPangram = [...validLetters].every((c) => normalized.includes(c));
    const newFoundWords = new Set(foundWords);
    newFoundWords.add(normalized);
    const newScore = state.score + pts;
    const previousRank = rankForScore(state.score, puzzle.max_score);
    const newRank = rankForScore(newScore, puzzle.max_score);

    set({
      foundWords: newFoundWords,
      score: newScore,
      currentWord: '',
      wordRejected: false,
    });

    get().saveState();

    // Rank change → celebration or toast
    if (newRank !== previousRank) {
      if (newRank === 'Täysi kenno') {
        set({ celebration: 'taysikenno' });
      } else if (newRank === 'Ällistyttävä') {
        set({ celebration: 'allistyttava' });
      } else {
        get().showMessageAction(`Uusi taso: ${newRank}!`, 'special', 3000);
      }

      // Fire-and-forget achievement POST
      const elapsed = Date.now() - state.startedAt - state.totalPausedMs;
      fetch('/api/achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzle_number: puzzle.puzzle_number,
          rank: newRank,
          score: newScore,
          max_score: puzzle.max_score,
          words_found: newFoundWords.size,
          elapsed_ms: elapsed,
        }),
      }).catch(() => {});
    } else if (isPangram) {
      get().showMessageAction('Pangrammi!', 'special');
    } else {
      get().showMessageAction(`+${pts}`, 'ok');
    }
  },

  saveState: () => {
    const {
      puzzle,
      foundWords,
      score,
      hintsUnlocked,
      startedAt,
      totalPausedMs,
    } = get();
    if (!puzzle) return;
    const data: PersistedState = {
      foundWords: [...foundWords],
      score,
      hintsUnlocked: [...hintsUnlocked],
      startedAt,
      totalPausedMs,
    };
    saveToStorage(storageKey(puzzle.puzzle_number), data);
  },

  loadState: async () => {
    const { puzzle } = get();
    if (!puzzle) return;

    const key = storageKey(puzzle.puzzle_number);
    let saved = loadFromStorage<PersistedState>(key);

    // Legacy migration: check old key without puzzle number suffix
    if (!saved) {
      const legacy = loadFromStorage<LegacyPersistedState>(LEGACY_KEY);
      if (legacy && legacy.puzzleNumber === puzzle.puzzle_number) {
        saved = legacy;
        saveToStorage(key, {
          foundWords: legacy.foundWords,
          score: legacy.score,
          hintsUnlocked: legacy.hintsUnlocked,
          startedAt: legacy.startedAt,
          totalPausedMs: legacy.totalPausedMs,
        } satisfies PersistedState);
        removeFromStorage(LEGACY_KEY);
      }
    }

    if (!saved) return;

    // Validate saved words against current puzzle hashes
    const hashSet = new Set(puzzle.word_hashes);
    const validWords: string[] = [];
    for (const word of saved.foundWords) {
      const h = await hashWord(word);
      if (hashSet.has(h)) {
        validWords.push(word);
      }
    }

    const allLetters = new Set<string>([puzzle.center, ...puzzle.letters]);
    const needsRecalc = validWords.length !== saved.foundWords.length;
    const score = needsRecalc
      ? recalcScore(validWords, allLetters)
      : saved.score;

    set({
      foundWords: new Set(validWords),
      score,
      hintsUnlocked: new Set(saved.hintsUnlocked ?? []),
      startedAt: saved.startedAt || Date.now(),
      totalPausedMs: saved.totalPausedMs ?? 0,
    });
  },

  showMessageAction: (msg: string, type: MessageType, duration = 2000) => {
    if (messageTimer !== null) clearTimeout(messageTimer);
    set({ message: msg, messageType: type });
    messageTimer = setTimeout(() => {
      const cleared: Partial<GameState> = { message: '', messageType: 'ok' };
      if (get().wordRejected) {
        cleared.currentWord = '';
        cleared.wordRejected = false;
      }
      set(cleared);
      messageTimer = null;
    }, duration);
  },

  setShowRanks: (v: boolean) => set({ showRanks: v }),
  setShowRules: (v: boolean) => set({ showRules: v }),
  setShowAllFoundWords: (v: boolean) => set({ showAllFoundWords: v }),

  unlockHint: (id: string) => {
    set((s) => {
      const next = new Set(s.hintsUnlocked);
      next.add(id);
      return { hintsUnlocked: next };
    });
    get().saveState();
  },

  copyStatus: async () => {
    const { puzzle, foundWords, score, hintsUnlocked } = get();
    if (!puzzle) return;

    const rank = get().rank();
    const isTaysiKenno = rank === 'Täysi kenno';
    const target = isTaysiKenno
      ? puzzle.max_score
      : Math.ceil(0.7 * puzzle.max_score);

    const lines: string[] = [
      `Sanakenno \u2014 Peli #${puzzle.puzzle_number}`,
      `${rank} \u00B7 ${foundWords.size} sanaa`,
      `${score}/${target} pistett\u00E4`,
    ];

    // Hints line: only include if any hints unlocked
    const unlockedIcons = HINT_ORDER.filter((id) => hintsUnlocked.has(id)).map(
      (id) => HINT_ICONS[id],
    );
    if (unlockedIcons.length > 0) {
      lines.push(`Avut: ${unlockedIcons.join('')}`);
    }

    lines.push('erez.ac/sanakenno-react');

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      set({ shareCopied: true });
      setTimeout(() => set({ shareCopied: false }), 2000);
    } catch {
      // Clipboard API may be unavailable; fail silently
    }
  },

  setPressedHexIndex: (i: number | null) => set({ pressedHexIndex: i }),
  setCelebration: (v: CelebrationType) => set({ celebration: v }),

  reset: () => {
    if (messageTimer !== null) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    set({
      puzzle: null,
      outerLetters: [],
      currentWord: '',
      foundWords: new Set<string>(),
      score: 0,
      message: '',
      messageType: 'ok',
      loading: false,
      fetchError: '',
      showRanks: false,
      showRules: false,
      showAllFoundWords: false,
      hintsUnlocked: new Set<string>(),
      celebration: null,
      wordShake: false,
      wordRejected: false,
      lastResubmittedWord: null,
      shareCopied: false,
      pressedHexIndex: null,
      startedAt: 0,
      totalPausedMs: 0,
    });
  },
}));
