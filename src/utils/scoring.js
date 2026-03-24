/**
 * Pure Sanakenno game logic — no React reactivity, no DOM access.
 * Extracted for unit testing and reuse.
 *
 * Ported verbatim from web_kontissa/frontend/composables/useSanakennoLogic.js.
 *
 * @module src/utils/scoring
 */

export const RANKS = [
  { pct: 100, name: 'Täysi kenno' },
  { pct: 70,  name: 'Ällistyttävä' },
  { pct: 40,  name: 'Sanavalmis' },
  { pct: 20,  name: 'Onnistuja' },
  { pct: 10,  name: 'Nyt mennään!' },
  { pct: 2,   name: 'Hyvä alku' },
  { pct: 0,   name: 'Etsi sanoja!' },
]

/**
 * Score a single word based on its length and whether it's a pangram.
 * 4-letter words score 1 point; longer words score their length.
 * Pangrams (using all 7 puzzle letters) get a +7 bonus.
 *
 * @param {string} word - The word to score.
 * @param {Set<string>|string[]} allLetters - All 7 puzzle letters.
 * @returns {number} The word's score.
 */
export function scoreWord(word, allLetters) {
  const pts = word.length === 4 ? 1 : word.length
  const isPangram = [...allLetters].every(c => word.includes(c))
  return pts + (isPangram ? 7 : 0)
}

/**
 * Recalculate the total score for a list of found words.
 *
 * @param {string[]} words - Array of found words.
 * @param {Set<string>|string[]} allLetters - All 7 puzzle letters.
 * @returns {number} Total score.
 */
export function recalcScore(words, allLetters) {
  let total = 0
  for (const w of words) {
    total += scoreWord(w, allLetters)
  }
  return total
}

/**
 * Determine the rank name for a given score and max score.
 *
 * @param {number} score - Current score.
 * @param {number} maxScore - Maximum possible score.
 * @returns {string} The rank name (in Finnish).
 */
export function rankForScore(score, maxScore) {
  if (maxScore === 0) return RANKS[RANKS.length - 1].name
  const pct = (score / maxScore) * 100
  for (const r of RANKS) {
    if (pct >= r.pct) return r.name
  }
  return RANKS[RANKS.length - 1].name
}

/**
 * Compute point thresholds for all visible ranks.
 * Hides "Täysi kenno" unless the player has reached it.
 *
 * @param {string} currentRank - The player's current rank name.
 * @param {number} maxScore - Maximum possible score.
 * @returns {Array<{name: string, points: number, isCurrent: boolean}>} Thresholds in ascending order.
 */
export function rankThresholds(currentRank, maxScore) {
  const visible = currentRank === 'Täysi kenno'
    ? RANKS
    : RANKS.filter(r => r.name !== 'Täysi kenno')
  return [...visible].reverse().map(r => ({
    name: r.name,
    points: Math.ceil(r.pct / 100 * maxScore),
    isCurrent: currentRank === r.name,
  }))
}

/**
 * Compute the progress percentage toward the next rank.
 *
 * @param {number} score - Current score.
 * @param {number} maxScore - Maximum possible score.
 * @returns {number} Progress percentage (0–100).
 */
export function progressToNextRank(score, maxScore) {
  if (maxScore === 0) return 0
  const scorePct = (score / maxScore) * 100
  const currentIdx = RANKS.findIndex(r => scorePct >= r.pct)
  if (currentIdx === -1) return 0
  if (currentIdx === 0) return 100
  const currentRankPts = Math.ceil(RANKS[currentIdx].pct / 100 * maxScore)
  const nextRankPts = Math.ceil(RANKS[currentIdx - 1].pct / 100 * maxScore)
  if (nextRankPts <= currentRankPts) return 100
  return Math.min(100, ((score - currentRankPts) / (nextRankPts - currentRankPts)) * 100)
}

/**
 * Colorize each character in a word for display.
 * Center letter = accent, puzzle letters = primary, others = tertiary.
 *
 * @param {string} word - The word to colorize.
 * @param {string} center - The center letter.
 * @param {Set<string>} allLetters - All 7 puzzle letters as a Set.
 * @returns {Array<{char: string, color: string}>} Character-color pairs.
 */
export function colorizeWord(word, center, allLetters) {
  return [...word].map(char => {
    if (char === '-')              return { char, color: 'tertiary' }
    if (char === center)           return { char, color: 'accent' }
    if (allLetters.has(char))      return { char, color: 'primary' }
    return { char, color: 'tertiary' }
  })
}

/**
 * Split an array of words into columns of a given size.
 *
 * @param {string[]} words - Words to split.
 * @param {number} [perColumn=10] - Maximum words per column.
 * @returns {string[][]} Array of columns.
 */
export function toColumns(words, perColumn = 10) {
  const cols = []
  for (let i = 0; i < words.length; i += perColumn) {
    cols.push(words.slice(i, i + perColumn))
  }
  return cols
}
