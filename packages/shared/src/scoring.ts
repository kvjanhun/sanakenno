/**
 * Pure Sanakenno game logic — no React reactivity, no DOM access.
 * Extracted for unit testing and reuse.
 *
 * Ported verbatim from web_kontissa/frontend/composables/useSanakennoLogic.js.
 *
 * @module src/utils/scoring
 */

export interface Rank {
  pct: number;
  name: string;
}

export interface ColorizedChar {
  char: string;
  color: 'accent' | 'primary' | 'tertiary';
}

export interface RankThreshold {
  name: string;
  points: number;
  isCurrent: boolean;
}

export const RANKS: readonly Rank[] = [
  { pct: 100, name: 'Täysi kenno' },
  { pct: 70, name: 'Ällistyttävä' },
  { pct: 40, name: 'Sanavalmis' },
  { pct: 20, name: 'Onnistuja' },
  { pct: 10, name: 'Nyt mennään!' },
  { pct: 2, name: 'Hyvä alku' },
  { pct: 0, name: 'Etsi sanoja!' },
];

/** Score a single word. 4-letter words = 1 pt; longer = length. Pangram bonus +7. */
export function scoreWord(
  word: string,
  allLetters: Set<string> | string[],
): number {
  const pts = word.length === 4 ? 1 : word.length;
  const isPangram = [...allLetters].every((c) => word.includes(c));
  return pts + (isPangram ? 7 : 0);
}

/** Recalculate total score for a list of found words. */
export function recalcScore(
  words: string[],
  allLetters: Set<string> | string[],
): number {
  let total = 0;
  for (const w of words) {
    total += scoreWord(w, allLetters);
  }
  return total;
}

/** Determine the rank name for a given score and max score. */
export function rankForScore(score: number, maxScore: number): string {
  if (maxScore === 0) return RANKS[RANKS.length - 1].name;
  const pct = (score / maxScore) * 100;
  for (const r of RANKS) {
    if (pct >= r.pct) return r.name;
  }
  return RANKS[RANKS.length - 1].name;
}

/** Compute point thresholds for all ranks. */
export function rankThresholds(
  currentRank: string,
  maxScore: number,
): RankThreshold[] {
  return [...RANKS].reverse().map((r) => ({
    name: r.name,
    points: Math.ceil((r.pct / 100) * maxScore),
    isCurrent: currentRank === r.name,
  }));
}

/** Compute progress percentage toward the next rank (0–100). */
export function progressToNextRank(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  const scorePct = (score / maxScore) * 100;
  const currentIdx = RANKS.findIndex((r) => scorePct >= r.pct);
  if (currentIdx === -1) return 0;
  if (currentIdx === 0) return 100;
  const currentRankPts = Math.ceil((RANKS[currentIdx].pct / 100) * maxScore);
  const nextRankPts = Math.ceil((RANKS[currentIdx - 1].pct / 100) * maxScore);
  if (nextRankPts <= currentRankPts) return 100;
  return Math.min(
    100,
    ((score - currentRankPts) / (nextRankPts - currentRankPts)) * 100,
  );
}

/** Colorize each character: center = accent, puzzle letters = primary, others = tertiary. */
export function colorizeWord(
  word: string,
  center: string,
  allLetters: Set<string>,
): ColorizedChar[] {
  return [...word].map((char) => {
    if (char === '-') return { char, color: 'tertiary' as const };
    if (char === center) return { char, color: 'accent' as const };
    if (allLetters.has(char)) return { char, color: 'primary' as const };
    return { char, color: 'tertiary' as const };
  });
}

/** Split an array of items into columns of a given size. */
export function toColumns<T>(items: T[], perColumn: number = 10): T[][] {
  const cols: T[][] = [];
  for (let i = 0; i < items.length; i += perColumn) {
    cols.push(items.slice(i, i + perColumn));
  }
  return cols;
}
