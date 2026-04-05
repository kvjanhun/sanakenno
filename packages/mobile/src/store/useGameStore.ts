import { create } from 'zustand';
import { config } from '../platform';
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

interface GameState {
  puzzle: Puzzle | null;
  outerLetters: string[];
  loading: boolean;
  fetchError: string;
  currentWord: string;
  score: number;
  foundWords: Set<string>;

  fetchPuzzle: (overrideNumber?: number) => Promise<void>;
  addLetter: (letter: string) => void;
  deleteLetter: () => void;
  clearWord: () => void;
}

export const useGameStore = create<GameState>()((set, _get) => ({
  puzzle: null,
  outerLetters: [],
  loading: false,
  fetchError: '',
  currentWord: '',
  score: 0,
  foundWords: new Set<string>(),

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
        fetchError: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tuntematon virhe';
      set({ loading: false, fetchError: msg });
    }
  },

  addLetter: (letter: string) => {
    set((s) => ({ currentWord: s.currentWord + letter }));
  },

  deleteLetter: () => {
    set((s) => ({ currentWord: s.currentWord.slice(0, -1) }));
  },

  clearWord: () => {
    set({ currentWord: '' });
  },
}));
