/**
 * Pure hint data derivation logic.
 *
 * Computes remaining-word statistics by starting letter, word length,
 * and two-letter prefix — comparing puzzle hint_data totals against
 * found words. No React, Zustand, or Vite dependencies.
 *
 * @module src/utils/hint-data
 */

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

/** Per-letter remaining count. */
export interface LetterEntry {
  letter: string;
  total: number;
  found: number;
  remaining: number;
}

/** Per-length remaining count. */
export interface LengthEntry {
  len: number;
  total: number;
  found: number;
  remaining: number;
}

/** Per-two-letter-prefix remaining count. */
export interface PairEntry {
  pair: string;
  total: number;
  found: number;
  remaining: number;
}

/** Pangram progress stats. */
export interface PangramStats {
  total: number;
  found: number;
  remaining: number;
}

/** Complete derived hint data for all four panels. */
export interface DerivedHintData {
  /** Total / remaining word counts. */
  wordCount: number;
  wordsFound: number;
  wordsRemaining: number;
  /** Per starting-letter breakdown, sorted alphabetically. */
  letterMap: LetterEntry[];
  /** Per word-length breakdown, sorted ascending. */
  lengthDistribution: LengthEntry[];
  /** Per two-letter prefix breakdown, sorted alphabetically. */
  pairMap: PairEntry[];
  /** Pangram totals. */
  pangramStats: PangramStats;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/** Count found words by starting letter. */
function countByLetter(foundWords: Set<string>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const word of foundWords) {
    const l = word[0];
    map[l] = (map[l] ?? 0) + 1;
  }
  return map;
}

/** Count found words by length. */
function countByLength(foundWords: Set<string>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const word of foundWords) {
    const k = String(word.length);
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
}

/** Count found words by two-letter prefix. */
function countByPair(foundWords: Set<string>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const word of foundWords) {
    const pair = word.slice(0, 2);
    map[pair] = (map[pair] ?? 0) + 1;
  }
  return map;
}

/** Count found pangrams (words containing all puzzle letters). */
function countFoundPangrams(
  foundWords: Set<string>,
  allLetters: Set<string>,
): number {
  let count = 0;
  for (const word of foundWords) {
    let isPangram = true;
    for (const c of allLetters) {
      if (!word.includes(c)) {
        isPangram = false;
        break;
      }
    }
    if (isPangram) count++;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/*  Pure derivation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compute all derived hint data from puzzle hint_data and found words.
 *
 * @param hintData - The puzzle's hint_data from the API
 * @param foundWords - Set of found word strings
 * @param allLetters - All puzzle letters (center + outer)
 * @returns Derived hint data for all four panels
 */
export function deriveHintData(
  hintData: HintData,
  foundWords: Set<string>,
  allLetters: Set<string>,
): DerivedHintData {
  const foundByLetter = countByLetter(foundWords);
  const foundByLen = countByLength(foundWords);
  const foundByPair = countByPair(foundWords);

  const letterMap: LetterEntry[] = Object.entries(hintData.by_letter)
    .map(([letter, total]) => {
      const found = foundByLetter[letter] ?? 0;
      return { letter, total, found, remaining: total - found };
    })
    .sort((a, b) => a.letter.localeCompare(b.letter));

  const lengthDistribution: LengthEntry[] = Object.entries(hintData.by_length)
    .map(([len, total]) => {
      const found = foundByLen[len] ?? 0;
      return { len: parseInt(len, 10), total, found, remaining: total - found };
    })
    .sort((a, b) => a.len - b.len);

  const pairMap: PairEntry[] = Object.entries(hintData.by_pair)
    .map(([pair, total]) => {
      const found = foundByPair[pair] ?? 0;
      return { pair, total, found, remaining: total - found };
    })
    .sort((a, b) => a.pair.localeCompare(b.pair));

  const foundPangrams = countFoundPangrams(foundWords, allLetters);
  const pangramStats: PangramStats = {
    total: hintData.pangram_count,
    found: foundPangrams,
    remaining: hintData.pangram_count - foundPangrams,
  };

  return {
    wordCount: hintData.word_count,
    wordsFound: foundWords.size,
    wordsRemaining: hintData.word_count - foundWords.size,
    letterMap,
    lengthDistribution,
    pairMap,
    pangramStats,
  };
}
