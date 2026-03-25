/**
 * Displays the word the player is currently composing. Each
 * character is colorized to indicate whether it is the center
 * letter, a valid puzzle letter, or an invalid letter.
 *
 * @module src/components/WordInput
 */

import { colorizeWord } from '../utils/scoring.js';
import styles from './animations.module.css';

/** Props for {@link WordInput}. */
export interface WordInputProps {
  /** Current word being composed. */
  currentWord: string;
  /** Center (required) letter of the puzzle. */
  center: string;
  /** Full set of puzzle letters. */
  allLetters: Set<string>;
  /** Whether to play the shake animation. */
  shake: boolean;
  /** Whether every possible word has been found. */
  allFound: boolean;
  /** Total number of findable words (shown in celebration). */
  wordCount?: number;
}

const COLOR_MAP: Record<string, string> = {
  accent: 'var(--color-accent)',
  primary: 'var(--color-text-primary)',
  tertiary: 'var(--color-text-tertiary)',
};

/**
 * Render the current word input with per-character coloring.
 * Shows a celebration message when all words have been found.
 */
export function WordInput({
  currentWord,
  center,
  allLetters,
  shake,
  allFound,
  wordCount,
}: WordInputProps): React.JSX.Element {
  if (allFound) {
    return (
      <div
        className="text-center text-lg font-semibold"
        style={{ color: 'var(--color-accent)' }}
        aria-live="polite"
        aria-atomic="true"
      >
        Kaikki {wordCount} sanaa löydetty!
      </div>
    );
  }

  const chars = currentWord
    ? colorizeWord(currentWord, center, allLetters)
    : null;

  return (
    <div
      className={`text-center font-[var(--font-mono)] text-2xl tracking-[0.15em]${shake ? ` ${styles.wordShake}` : ''}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {chars ? (
        chars.map((c, i) => (
          <span key={i} style={{ color: COLOR_MAP[c.color] }}>
            {c.char}
          </span>
        ))
      ) : (
        <span style={{ color: 'var(--color-text-tertiary)' }}>&mdash;</span>
      )}
    </div>
  );
}
