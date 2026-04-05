import { create } from 'zustand';
import { config, crypto, storage } from '../platform';
import { scoreWord, rankForScore } from '@sanakenno/shared';
import type { HintData } from '@sanakenno/shared';

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
  wordRejected: boolean;

  fetchPuzzle: (overrideNumber?: number) => Promise<void>;
  addLetter: (letter: string) => void;
  deleteLetter: () => void;
  clearWord: () => void;
  submitWord: () => Promise<void>;
  shuffleLetters: () => void;
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
  wordRejected: false,

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
      });

      // Restore persisted state
      const saved = storage.load<{
        foundWords: string[];
        score: number;
      }>(stateKey(data.puzzle_number));
      if (saved) {
        set({
          foundWords: new Set(saved.foundWords),
          score: saved.score,
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
      showError('Löysit jo tämän!');
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
      msg = `Täysosuma! +${pts}`;
      msgType = 'special';
    } else if (newRank !== previousRank) {
      msg = `${newRank}! +${pts}`;
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
    });

    // Persist state
    storage.save(stateKey(puzzle.puzzle_number), {
      foundWords: [...newFoundWords],
      score: newScore,
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
}));
