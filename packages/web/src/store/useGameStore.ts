/**
 * Central Zustand store for Sanakenno game state.
 *
 * Manages puzzle data, word submission, scoring, UI flags, and
 * persistence keyed by puzzle number via platform services.
 *
 * @module src/store/useGameStore
 */

import { create } from 'zustand';

import { storage, crypto, share, config } from '../platform/index';

const API_BASE = config.apiBase;

import {
  scoreWord,
  recalcScore,
  rankForScore,
  updateStatsRecord,
  emptyStats,
  STATS_STORAGE_KEY,
} from '@sanakenno/shared';
import type { HintData, PlayerStats } from '@sanakenno/shared';
export type { HintData } from '@sanakenno/shared';

import { hashWord } from '../utils/hash';
import {
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
} from '../utils/storage';
import { useAuthStore } from './useAuthStore';

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
  /** Score at the moment the first hint was unlocked; null if no hints used. */
  scoreBeforeHints: number | null;
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
  secondaryMessage: string;
  secondaryType: MessageType;
  loading: boolean;
  fetchError: string;
  showRanks: boolean;
  showRules: boolean;
  showAllFoundWords: boolean;
  hintsUnlocked: Set<string>;
  /** Score captured when the first hint was unlocked; null if no hints used yet. */
  scoreBeforeHints: number | null;
  celebration: CelebrationType;
  wordShake: boolean;
  wordRejected: boolean;
  lastResubmittedWord: string | null;
  shareCopied: boolean;
  pressedHexIndex: number | null;
  startedAt: number;
  totalPausedMs: number;
  sessionId: string;
  showArchive: boolean;
  showStats: boolean;
  /** Helsinki ISO date string when viewing an archive puzzle; null = today. */
  viewingPuzzleDate: string | null;

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
  setShowArchive: (v: boolean) => void;
  setShowStats: (v: boolean) => void;
  loadArchivePuzzle: (
    puzzleNumber: number,
    date: string | null,
  ) => Promise<void>;
  returnToToday: () => Promise<void>;
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Storage key for a given puzzle number. */
function storageKey(puzzleNumber: number): string {
  return `sanakenno_state_${puzzleNumber}`;
}

/**
 * Get or create a stable device ID.
 * Combined with puzzle_number, this gives a consistent session ID
 * for the same player on the same puzzle across refreshes.
 */
function getDeviceId(): string {
  const key = 'sanakenno_device_id';
  let id = storage.getRaw(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setRaw(key, id);
  }
  return id;
}

/**
 * Build a deterministic session ID from deviceId + puzzle number.
 * Uses a simple hash to keep it short and non-reversible.
 */
async function buildSessionId(puzzleNumber: number): Promise<string> {
  const input = `${getDeviceId()}:${puzzleNumber}`;
  const fullHash = await crypto.hashSHA256(input);
  return fullHash.slice(0, 32);
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
  secondaryMessage: '',
  secondaryType: 'ok' as MessageType,
  loading: false,
  fetchError: '',
  showRanks: false,
  showRules: false,
  showAllFoundWords: false,
  hintsUnlocked: new Set<string>(),
  scoreBeforeHints: null,
  celebration: null,
  wordShake: false,
  wordRejected: false,
  lastResubmittedWord: null,
  shareCopied: false,
  pressedHexIndex: null,
  startedAt: 0,
  totalPausedMs: 0,
  sessionId: '',
  showArchive: false,
  showStats: false,
  viewingPuzzleDate: null,

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
    return [...foundWords].reverse().slice(0, 8);
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
          ? `${API_BASE}/api/puzzle/${overrideNumber}`
          : `${API_BASE}/api/puzzle`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Puzzle;

      const outerLetters = data.letters.filter((l) => l !== data.center);
      const sessionId = await buildSessionId(data.puzzle_number);
      set({
        puzzle: data,
        outerLetters,
        loading: false,
        currentWord: '',
        foundWords: new Set<string>(),
        score: 0,
        scoreBeforeHints: null,
        message: '',
        fetchError: '',
        celebration: null,
        startedAt: Date.now(),
        totalPausedMs: 0,
        sessionId,
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

      // Fire-and-forget: record non-dictionary guess on server
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Europe/Helsinki',
      });
      fetch(`${API_BASE}/api/failed-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: normalized, date: today }),
      }).catch(() => {
        // Silently ignore network errors
      });

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

    // Rank change → celebration + achievement POST
    if (newRank !== previousRank) {
      if (newRank === 'Täysi kenno') {
        set({ celebration: 'taysikenno' });
      } else if (newRank === 'Ällistyttävä') {
        set({ celebration: 'allistyttava' });
      }
      // Rank advance shown via pill pulse animation — no toast needed

      // Fire-and-forget achievement POST
      const elapsed = Date.now() - state.startedAt - state.totalPausedMs;
      fetch(`${API_BASE}/api/achievement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzle_number: puzzle.puzzle_number,
          rank: newRank,
          score: newScore,
          max_score: puzzle.max_score,
          words_found: newFoundWords.size,
          elapsed_ms: elapsed,
          session_id: state.sessionId || undefined,
        }),
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Achievement POST failed:', err);
      });
    }

    // Record stats locally (on every accepted word, not just rank changes)
    {
      const elapsed = Date.now() - state.startedAt - state.totalPausedMs;
      const helsinkiDate = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
      );
      const dateStr = `${helsinkiDate.getFullYear()}-${String(helsinkiDate.getMonth() + 1).padStart(2, '0')}-${String(helsinkiDate.getDate()).padStart(2, '0')}`;
      let longestWord = '';
      let pangramsFound = 0;
      for (const w of newFoundWords) {
        if (w.length > longestWord.length) longestWord = w;
        let isP = true;
        for (const c of validLetters) {
          if (!w.includes(c)) {
            isP = false;
            break;
          }
        }
        if (isP) pangramsFound++;
      }
      const existing =
        loadFromStorage<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats();
      const updated = updateStatsRecord(existing, {
        puzzle_number: puzzle.puzzle_number,
        date: get().viewingPuzzleDate ?? dateStr,
        best_rank: newRank,
        best_score: newScore,
        max_score: puzzle.max_score,
        words_found: newFoundWords.size,
        hints_used: state.hintsUnlocked.size,
        elapsed_ms: elapsed,
        longest_word: longestWord,
        pangrams_found: pangramsFound,
      });
      saveToStorage(STATS_STORAGE_KEY, updated);

      // Fire-and-forget server sync when player is logged in
      const { isLoggedIn, syncProgress } = useAuthStore.getState();
      if (isLoggedIn) {
        void syncProgress({
          puzzle_number: puzzle.puzzle_number,
          date: get().viewingPuzzleDate ?? dateStr,
          found_words: [...newFoundWords],
          score: newScore,
          hints_unlocked: [...state.hintsUnlocked],
          started_at: state.startedAt,
          total_paused_ms: state.totalPausedMs,
          score_before_hints: state.scoreBeforeHints,
          max_score: puzzle.max_score,
        });
      }
    }

    // Always show points; add pangram chip if applicable
    if (isPangram) {
      if (messageTimer !== null) clearTimeout(messageTimer);
      set({
        message: `+${pts}`,
        messageType: 'ok',
        secondaryMessage: 'Pangrammi!',
        secondaryType: 'special',
      });
      messageTimer = setTimeout(
        () => set({ message: '', secondaryMessage: '' }),
        2000,
      );
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
      scoreBeforeHints,
    } = get();
    if (!puzzle) return;
    const data: PersistedState = {
      foundWords: [...foundWords],
      score,
      hintsUnlocked: [...hintsUnlocked],
      startedAt,
      totalPausedMs,
      scoreBeforeHints,
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
          scoreBeforeHints: null,
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
      scoreBeforeHints: saved.scoreBeforeHints ?? null,
      startedAt: saved.startedAt || Date.now(),
      totalPausedMs: saved.totalPausedMs ?? 0,
    });
  },

  showMessageAction: (msg: string, type: MessageType, duration = 2000) => {
    if (messageTimer !== null) clearTimeout(messageTimer);
    set({ message: msg, messageType: type });
    messageTimer = setTimeout(() => {
      const cleared: Partial<GameState> = {
        message: '',
        messageType: 'ok',
        secondaryMessage: '',
        secondaryType: 'ok' as MessageType,
      };
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
      const isFirst = s.hintsUnlocked.size === 0;
      const next = new Set(s.hintsUnlocked);
      next.add(id);
      return {
        hintsUnlocked: next,
        ...(isFirst ? { scoreBeforeHints: s.score } : {}),
      };
    });
    get().saveState();
  },

  copyStatus: async () => {
    const { puzzle, score, hintsUnlocked, scoreBeforeHints } = get();
    if (!puzzle) return;

    const rank = get().rank();
    const hasTrophy =
      rank === '\u00C4llistytt\u00E4v\u00E4' || rank === 'T\u00E4ysi kenno';
    const rankPrefix = hasTrophy ? '\u{1F3C6} ' : '';

    // Progress bar: 10 blocks proportional to score/max_score
    const filled = Math.round((score / puzzle.max_score) * 10);
    const bar = '\u{1F7E7}'.repeat(filled) + '\u2B1B'.repeat(10 - filled);

    const lines: string[] = [
      `Sanakenno \u2014 Kenno #${puzzle.puzzle_number + 1}`,
      `${rankPrefix}${rank} \u00B7 ${score}/${puzzle.max_score}`,
      bar,
    ];

    // Hints line: only include if any hints unlocked
    const unlockedIcons = HINT_ORDER.filter((id) => hintsUnlocked.has(id)).map(
      (id) => HINT_ICONS[id],
    );
    if (unlockedIcons.length > 0) {
      const beforeHints = scoreBeforeHints ?? 0;
      lines.push(`Avut: ${unlockedIcons.join('')} (${beforeHints} p. ilman)`);
    }

    lines.push('sanakenno.fi');

    const text = lines.join('\n');
    const copied = await share.copyToClipboard(text);
    if (copied) {
      set({ shareCopied: true });
      setTimeout(() => set({ shareCopied: false }), 2000);
    }
  },

  setPressedHexIndex: (i: number | null) => set({ pressedHexIndex: i }),
  setCelebration: (v: CelebrationType) => set({ celebration: v }),

  setShowArchive: (v: boolean) => set({ showArchive: v }),
  setShowStats: (v: boolean) => set({ showStats: v }),

  loadArchivePuzzle: async (puzzleNumber: number, date: string | null) => {
    set({ showArchive: false, viewingPuzzleDate: date });
    await get().fetchPuzzle(date ? puzzleNumber : undefined);
  },

  returnToToday: async () => {
    set({ viewingPuzzleDate: null });
    await get().fetchPuzzle();
  },

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
      secondaryMessage: '',
      secondaryType: 'ok' as MessageType,
      loading: false,
      fetchError: '',
      showRanks: false,
      showRules: false,
      showAllFoundWords: false,
      hintsUnlocked: new Set<string>(),
      scoreBeforeHints: null,
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
