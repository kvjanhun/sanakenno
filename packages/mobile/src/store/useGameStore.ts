import { create } from 'zustand';
import { config, crypto, storage } from '../platform';
import * as Haptics from 'expo-haptics';
import {
  scoreWord,
  rankForScore,
  STATS_STORAGE_KEY,
  updateStatsRecord,
  emptyStats,
} from '@sanakenno/shared';
import type { HintData, PlayerStats } from '@sanakenno/shared';

export type CelebrationType = 'allistyttava' | 'taysikenno' | null;

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

export type MessageType = 'ok' | 'error' | 'special';

interface GameState {
  puzzle: Puzzle | null;
  outerLetters: string[];
  loading: boolean;
  fetchError: string;
  currentWord: string;
  score: number;
  foundWords: Set<string>;
  message: string;
  messageType: MessageType;
  pointsBubble: string | null;
  wordRejected: boolean;
  startedAt: number | null;
  totalPausedMs: number;
  hintsUnlocked: Set<string>;
  scoreBeforeHints: number | null;
  celebration: CelebrationType;
  postedRanks: Set<string>;
  lastResubmittedWord: string | null;

  fetchPuzzle: (overrideNumber?: number) => Promise<void>;
  addLetter: (letter: string) => void;
  deleteLetter: () => void;
  clearWord: () => void;
  submitWord: () => Promise<void>;
  shuffleLetters: () => void;
  saveState: () => void;
  unlockHint: (id: string) => void;
  setCelebration: (value: CelebrationType) => void;
}

/** Persistence key for a given puzzle number. */
function stateKey(puzzleNumber: number): string {
  return `game_state_${puzzleNumber}`;
}

export const useGameStore = create<GameState>()((set, get) => ({
  puzzle: null,
  outerLetters: [],
  loading: false,
  fetchError: '',
  currentWord: '',
  score: 0,
  foundWords: new Set<string>(),
  message: '',
  messageType: 'ok' as MessageType,
  pointsBubble: null,
  wordRejected: false,
  startedAt: null,
  totalPausedMs: 0,
  hintsUnlocked: new Set<string>(),
  scoreBeforeHints: null,
  celebration: null,
  postedRanks: new Set<string>(),
  lastResubmittedWord: null,

  fetchPuzzle: async (overrideNumber?: number) => {
    set({ loading: true, fetchError: '' });
    try {
      const base = config.apiBase;
      const url =
        overrideNumber !== undefined
          ? `${base}/api/puzzle/${overrideNumber}`
          : `${base}/api/puzzle`;
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
        wordRejected: false,
        startedAt: Date.now(),
        totalPausedMs: 0,
        hintsUnlocked: new Set<string>(),
        scoreBeforeHints: null,
        celebration: null,
        postedRanks: new Set<string>(),
      });

      // Restore persisted state
      const saved = storage.load<{
        foundWords: string[];
        score: number;
        startedAt?: number;
        totalPausedMs?: number;
        hintsUnlocked?: string[];
        scoreBeforeHints?: number | null;
      }>(stateKey(data.puzzle_number));
      if (saved) {
        set({
          foundWords: new Set(saved.foundWords),
          score: saved.score,
          startedAt: saved.startedAt ?? Date.now(),
          totalPausedMs: saved.totalPausedMs ?? 0,
          hintsUnlocked: new Set(saved.hintsUnlocked ?? []),
          scoreBeforeHints: saved.scoreBeforeHints ?? null,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tuntematon virhe';
      set({ loading: false, fetchError: msg });
    }
  },

  addLetter: (letter: string) => {
    const { wordRejected } = get();
    if (wordRejected) {
      set({ currentWord: letter, wordRejected: false });
      return;
    }
    set((s) => ({ currentWord: s.currentWord + letter }));
  },

  deleteLetter: () => {
    const { wordRejected } = get();
    if (wordRejected) {
      set({ currentWord: '', wordRejected: false });
      return;
    }
    set((s) => ({ currentWord: s.currentWord.slice(0, -1) }));
  },

  clearWord: () => {
    set({ currentWord: '', wordRejected: false });
  },

  submitWord: async () => {
    const state = get();
    const { puzzle, currentWord, foundWords } = state;
    if (!puzzle) return;

    const normalized = currentWord.toLowerCase().replace(/-/g, '');

    const showError = (msg: string) => {
      set({ message: msg, messageType: 'error', wordRejected: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        const s = get();
        if (s.wordRejected) {
          set({ currentWord: '', wordRejected: false, message: '' });
        }
      }, 2000);
    };

    // Too short
    if (normalized.length < 4) {
      showError('Liian lyhyt!');
      return;
    }

    // Missing center letter
    if (!normalized.includes(puzzle.center)) {
      showError(`Kirjain '${puzzle.center.toUpperCase()}' puuttuu!`);
      return;
    }

    // Invalid letters
    const validLetters = new Set([...puzzle.letters, puzzle.center]);
    for (const ch of normalized) {
      if (!validLetters.has(ch)) {
        showError('Käytä vain annettuja kirjaimia!');
        return;
      }
    }

    // Already found
    if (foundWords.has(normalized)) {
      set({
        message: 'Löysit jo tämän!',
        messageType: 'error',
        wordRejected: true,
        lastResubmittedWord: normalized,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => set({ lastResubmittedWord: null }), 1500);
      setTimeout(() => {
        const s = get();
        if (s.wordRejected) {
          set({ currentWord: '', wordRejected: false, message: '' });
        }
      }, 2000);
      return;
    }

    // Hash check
    const wordHash = await crypto.hashSHA256(normalized);
    const hashSet = new Set(puzzle.word_hashes);
    if (!hashSet.has(wordHash)) {
      showError('Ei sanakirjassa');
      return;
    }

    // Valid word — score and update
    const pts = scoreWord(normalized, validLetters);
    const isPangram = [...validLetters].every((c) => normalized.includes(c));
    const newFoundWords = new Set(foundWords);
    newFoundWords.add(normalized);
    const newScore = state.score + pts;
    const previousRank = rankForScore(state.score, puzzle.max_score);
    const newRank = rankForScore(newScore, puzzle.max_score);

    let msg: string;
    let msgType: MessageType = 'ok';
    if (isPangram) {
      msg = `Täysosuma!`;
      msgType = 'special';
    } else if (newRank !== previousRank) {
      msg = `${newRank}!`;
      msgType = 'special';
    } else {
      msg = `+${pts}`;
    }

    set({
      foundWords: newFoundWords,
      score: newScore,
      currentWord: '',
      wordRejected: false,
      message: msg,
      messageType: msgType,
      pointsBubble: (isPangram || newRank !== previousRank) ? `+${pts}` : null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-clear the success message after 2 seconds
    setTimeout(() => {
      const s = get();
      if (s.message === msg) {
        set({ message: '', pointsBubble: null });
      }
    }, 2000);

    // Trigger celebration on special ranks
    if (newRank !== previousRank) {
      if (newRank === 'Täysi kenno') {
        set({ celebration: 'taysikenno' });
      } else if (newRank === 'Ällistyttävä') {
        set({ celebration: 'allistyttava' });
      }

      // Fire-and-forget achievement POST (session-deduped)
      const dedupeKey = `${puzzle.puzzle_number}:${newRank}`;
      const { postedRanks } = get();
      if (!postedRanks.has(dedupeKey)) {
        postedRanks.add(dedupeKey);
        set({ postedRanks: new Set(postedRanks) });
        const elapsed =
          state.startedAt != null
            ? Date.now() - state.startedAt - state.totalPausedMs
            : 0;
        fetch(`${config.apiBase}/api/achievement`, {
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
      }
    }

    // Update player stats on rank change
    if (newRank !== previousRank) {
      const elapsed =
        state.startedAt != null
          ? Date.now() - state.startedAt - state.totalPausedMs
          : 0;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA', {
        timeZone: 'Europe/Helsinki',
      });
      const existing =
        storage.load<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats();
      const updated = updateStatsRecord(existing, {
        puzzle_number: puzzle.puzzle_number,
        date: dateStr,
        best_rank: newRank,
        best_score: newScore,
        max_score: puzzle.max_score,
        words_found: newFoundWords.size,
        hints_used: state.hintsUnlocked.size,
        elapsed_ms: elapsed,
      });
      storage.save(STATS_STORAGE_KEY, updated);
    }

    // Persist state
    storage.save(stateKey(puzzle.puzzle_number), {
      foundWords: [...newFoundWords],
      score: newScore,
      startedAt: state.startedAt,
      totalPausedMs: state.totalPausedMs,
      hintsUnlocked: [...state.hintsUnlocked],
      scoreBeforeHints: state.scoreBeforeHints,
    });
  },

  shuffleLetters: () => {
    set((s) => {
      const shuffled = [...s.outerLetters];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { outerLetters: shuffled };
    });
  },

  saveState: () => {
    const {
      puzzle,
      foundWords,
      score,
      startedAt,
      totalPausedMs,
      hintsUnlocked,
      scoreBeforeHints,
    } = get();
    if (!puzzle) return;
    storage.save(stateKey(puzzle.puzzle_number), {
      foundWords: [...foundWords],
      score,
      startedAt,
      totalPausedMs,
      hintsUnlocked: [...hintsUnlocked],
      scoreBeforeHints,
    });
  },

  unlockHint: (id: string) => {
    const { hintsUnlocked, scoreBeforeHints, score, puzzle } = get();
    if (hintsUnlocked.has(id)) return;
    const newUnlocked = new Set(hintsUnlocked);
    newUnlocked.add(id);
    const updates: Partial<GameState> = { hintsUnlocked: newUnlocked };
    // Capture score before first hint
    if (scoreBeforeHints === null) {
      updates.scoreBeforeHints = score;
    }
    set(updates);
    // Persist immediately
    if (puzzle) {
      const state = get();
      storage.save(stateKey(puzzle.puzzle_number), {
        foundWords: [...state.foundWords],
        score: state.score,
        startedAt: state.startedAt,
        totalPausedMs: state.totalPausedMs,
        hintsUnlocked: [...state.hintsUnlocked],
        scoreBeforeHints: state.scoreBeforeHints,
      });
    }
  },

  setCelebration: (value: CelebrationType) => {
    set({ celebration: value });
  },
}));
