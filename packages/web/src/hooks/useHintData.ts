/**
 * React hook that subscribes to the Zustand game store and returns
 * memoised derived hint data for the four hint panels.
 *
 * Pure derivation logic lives in `src/utils/hint-data.ts` so it can
 * be tested without React or Vite dependencies.
 *
 * @module src/hooks/useHintData
 */

import { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { deriveHintData } from '@sanakenno/shared';

// Re-export types and pure function for consumers
export type {
  HintData,
  DerivedHintData,
  LetterEntry,
  LengthEntry,
  PairEntry,
  PangramStats,
} from '@sanakenno/shared';
export { deriveHintData } from '@sanakenno/shared';

/**
 * React hook that subscribes to the Zustand store and returns
 * memoised derived hint data for the four hint panels.
 *
 * @returns Derived hint data, or null when no puzzle is loaded
 */
export function useHintData(): ReturnType<typeof deriveHintData> | null {
  const puzzle = useGameStore((s) => s.puzzle);
  const foundWords = useGameStore((s) => s.foundWords);

  return useMemo(() => {
    if (!puzzle) return null;
    const allLetters = new Set<string>([puzzle.center, ...puzzle.letters]);
    return deriveHintData(puzzle.hint_data, foundWords, allLetters);
  }, [puzzle, foundWords]);
}
