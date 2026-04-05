/**
 * Dev-only console helpers exposed on `window.sk`.
 *
 * Usage from browser console:
 *   sk.removeWord('kissa')   — remove a word to re-guess it
 *   sk.setScore(50)          — set score directly (recalculates rank)
 *   sk.celebrate('taysikenno') — trigger a celebration overlay
 *   sk.celebrate('allistyttava')
 *   sk.resetHints()          — lock all hint panels
 *   sk.state()               — dump current store state
 *   sk.words()               — list all found words
 *
 * @module src/dev
 */

import { useGameStore } from './store/useGameStore.js';
import { recalcScore } from '@sanakenno/shared';
import type { CelebrationType } from './store/useGameStore.js';

interface DevHelpers {
  removeWord: (word: string) => void;
  setScore: (score: number) => void;
  celebrate: (type: 'allistyttava' | 'taysikenno') => void;
  resetHints: () => void;
  lockHint: (id: string) => void;
  setPairs: (count: number) => void;
  state: () => void;
  words: () => string[];
}

function createDevHelpers(): DevHelpers {
  const store = useGameStore;

  return {
    removeWord(word: string) {
      const { foundWords, puzzle } = store.getState();
      if (!foundWords.has(word)) {
        console.warn(`"${word}" not in found words`);
        return;
      }
      const next = new Set(foundWords);
      next.delete(word);
      const allLetters = new Set([puzzle!.center, ...puzzle!.letters]);
      const score = recalcScore([...next], allLetters);
      store.setState({ foundWords: next, score });
      store.getState().saveState();
      console.log(`Removed "${word}". Score: ${score}, Words: ${next.size}`);
    },

    setScore(score: number) {
      store.setState({ score });
      store.getState().saveState();
      console.log(`Score set to ${score}. Rank: ${store.getState().rank()}`);
    },

    celebrate(type: CelebrationType) {
      store.setState({ celebration: type });
      console.log(`Triggered ${type} celebration`);
    },

    resetHints() {
      store.setState({ hintsUnlocked: new Set() });
      store.getState().saveState();
      console.log('All hints locked');
    },

    lockHint(id: string) {
      const next = new Set(store.getState().hintsUnlocked);
      next.delete(id);
      store.setState({ hintsUnlocked: next });
      store.getState().saveState();
      console.log(`Locked hint "${id}"`);
    },

    setPairs(count: number) {
      const { puzzle } = store.getState();
      if (!puzzle) {
        console.warn('No puzzle loaded');
        return;
      }
      const pairs: Record<string, number> = {};
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      for (let i = 0; i < count; i++) {
        pairs[letters[i % 26] + letters[(i + 1) % 26]] =
          Math.floor(Math.random() * 15) + 1;
      }
      store.setState({
        puzzle: {
          ...puzzle,
          hint_data: { ...puzzle.hint_data, by_pair: pairs },
        },
      });
      console.log(`Set ${count} fake pairs`);
    },

    state() {
      const s = store.getState();
      console.log({
        puzzleNumber: s.puzzle?.puzzle_number,
        score: s.score,
        maxScore: s.puzzle?.max_score,
        rank: s.rank(),
        foundWords: s.foundWords.size,
        hintsUnlocked: [...s.hintsUnlocked],
        celebration: s.celebration,
      });
    },

    words() {
      const sorted = [...store.getState().foundWords].sort((a, b) =>
        a.localeCompare(b, 'fi'),
      );
      console.table(sorted);
      return sorted;
    },
  };
}

export function installDevHelpers(): void {
  (window as unknown as Record<string, unknown>).sk = createDevHelpers();
  console.log(
    '%c[sk] Dev helpers loaded. Try: sk.state(), sk.removeWord("sana"), sk.celebrate("taysikenno")',
    'color: #ff643e',
  );
}
