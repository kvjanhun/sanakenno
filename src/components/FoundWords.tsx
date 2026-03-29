/**
 * Collapsible list of words the player has found. Shows the most
 * recent words when collapsed; alphabetically sorted columns when
 * expanded. Highlights a re-submitted word briefly.
 *
 * @module src/components/FoundWords
 */

import { useMemo } from 'react';
import { toColumns } from '../utils/scoring.js';

/** Props for {@link FoundWords}. */
export interface FoundWordsProps {
  /** All words found so far (insertion order). */
  foundWords: string[];
  /** Recently found words (subset, used for collapsed view ordering). */
  recentWords: string[];
  /** Whether to show the full alphabetical list. */
  showAll: boolean;
  /** Toggle between collapsed / expanded view. */
  onToggleShowAll: () => void;
  /** Word that was re-submitted (highlight briefly). */
  lastResubmittedWord: string | null;
}

/**
 * Render the found-words panel.
 */
export function FoundWords({
  foundWords,
  recentWords,
  showAll,
  onToggleShowAll,
  lastResubmittedWord,
}: FoundWordsProps): React.JSX.Element | null {
  const sorted = useMemo(
    () => [...foundWords].sort((a, b) => a.localeCompare(b, 'fi')),
    [foundWords],
  );

  const columns = useMemo(() => toColumns(sorted), [sorted]);

  if (foundWords.length === 0) return null;

  const showToggle = foundWords.length > 6 || showAll;
  const collapsed = recentWords.slice(-8);

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Löydetyt sanat ({foundWords.length}):
        </span>
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-sm cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--color-accent)' }}
          >
            {showAll ? 'Vähemmän \u25B2' : 'Kaikki \u25BC'}
          </button>
        )}
      </div>

      {showAll ? (
        /* Expanded: alphabetical columns */
        <div className="flex gap-6 flex-wrap">
          {columns.map((col, ci) => (
            <ul key={ci} className="list-none p-0 m-0">
              {col.map((word) => (
                <li
                  key={word}
                  className="font-[var(--font-mono)] text-sm transition-colors duration-300"
                  style={{
                    color:
                      word === lastResubmittedWord
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                  }}
                >
                  {word}
                </li>
              ))}
            </ul>
          ))}
        </div>
      ) : (
        /* Collapsed: last 8 words as wrapping chips */
        <div className="flex flex-wrap gap-1.5">
          {collapsed.map((word) => (
            <span
              key={word}
              className="font-[var(--font-mono)] text-sm px-2 py-0.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  word === lastResubmittedWord
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-secondary)',
                color:
                  word === lastResubmittedWord
                    ? '#ffffff'
                    : 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
