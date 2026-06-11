/**
 * Collapsible list of words the player has found. Shows the most
 * recent words when collapsed; alphabetically sorted columns when
 * expanded. Highlights a re-submitted word briefly.
 *
 * @module src/components/FoundWords
 */

import { useMemo, useRef, useEffect } from 'react';
import { animated, useReducedMotion, useSpring } from '@react-spring/web';
import { ChevronDown } from 'lucide-react';
import { toColumns, buildKotusUrl, isPangram } from '@sanakenno/shared';
import { SpringCollapse } from './SpringCollapse';
import { DROPDOWN_SPRING } from '../utils/motion';

/** Props for {@link FoundWords}. */
export interface FoundWordsProps {
  /** All words found so far (insertion order). */
  foundWords: string[];
  /** Recently found words (subset, used for collapsed view ordering). */
  recentWords: string[];
  /** Whether to show the full alphabetical list. */
  showAll: boolean;
  /** All letters in the current puzzle, used to emphasize pangrams. */
  allLetters: Set<string>;
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
  allLetters,
  onToggleShowAll,
  lastResubmittedWord,
}: FoundWordsProps): React.JSX.Element | null {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const sorted = useMemo(
    () => [...foundWords].sort((a, b) => a.localeCompare(b, 'fi')),
    [foundWords],
  );

  const columns = useMemo(() => toColumns(sorted), [sorted]);

  const count = recentWords.length;
  const latestWord = recentWords[0];
  const chevronSpring = useSpring({
    rotate: showAll ? 180 : 0,
    config: DROPDOWN_SPRING,
    immediate: prefersReducedMotion === true,
  });
  const [contentSpring, contentApi] = useSpring(() => ({
    opacity: 1,
    y: 0,
    config: DROPDOWN_SPRING,
  }));

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [count, latestWord]);

  useEffect(() => {
    if (prefersReducedMotion) {
      void contentApi.start({ opacity: 1, y: 0, immediate: true });
      return;
    }

    void contentApi.start({
      from: { opacity: 0.9, y: showAll ? -4 : 4 },
      to: { opacity: 1, y: 0 },
      config: DROPDOWN_SPRING,
    });
  }, [contentApi, prefersReducedMotion, showAll]);

  if (foundWords.length === 0) return null;

  const countText =
    foundWords.length === 1 ? 'löydetty sana' : 'löydettyä sanaa';
  const showToggle = foundWords.length >= 1;
  const collapsed = recentWords;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={`flex items-center gap-1.5 text-sm font-medium ${showAll ? '' : 'pl-2'}`}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span style={{ color: 'var(--color-accent)' }}>
            {foundWords.length}
          </span>
          <span>{countText}</span>
        </div>
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="flex items-center gap-1 text-sm font-medium cursor-pointer bg-transparent border-none p-0 transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            <span>{showAll ? 'Vähemmän' : 'Kaikki'}</span>
            <animated.span
              aria-hidden="true"
              className="inline-flex h-3.5 w-3.5 items-center justify-center"
              style={{
                rotate: chevronSpring.rotate.to((value) => `${value}deg`),
              }}
            >
              <ChevronDown size={14} strokeWidth={2.5} />
            </animated.span>
          </button>
        )}
      </div>

      <SpringCollapse open>
        <animated.div
          style={{
            opacity: contentSpring.opacity,
            y: contentSpring.y,
          }}
        >
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
                        fontWeight: isPangram(word, allLetters) ? 700 : 400,
                      }}
                    >
                      <a
                        href={buildKotusUrl(word)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Avaa sanan "${word}" määritelmä Kotuksessa`}
                        aria-label={`Avaa sanan "${word}" määritelmä Kotuksessa`}
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {word}
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          ) : (
            /* Collapsed: single row of chips, horizontally scrollable */
            <div
              ref={scrollContainerRef}
              className="w-full overflow-x-auto scrollbar-none"
            >
              <div
                className="flex gap-1.5"
                style={{ flexWrap: 'nowrap', width: 'max-content' }}
              >
                {collapsed.map((word) => (
                  <a
                    key={word}
                    className="font-[var(--font-mono)] text-sm px-2 py-0.5 rounded-full transition-colors duration-300 animate-pill-slide-in"
                    href={buildKotusUrl(word)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Avaa sanan "${word}" määritelmä Kotuksessa`}
                    aria-label={`Avaa sanan "${word}" määritelmä Kotuksessa`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flexShrink: 0,
                      backgroundColor:
                        word === lastResubmittedWord
                          ? 'var(--color-accent)'
                          : 'var(--color-bg-secondary)',
                      color:
                        word === lastResubmittedWord
                          ? 'var(--color-on-accent)'
                          : 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                      fontWeight: isPangram(word, allLetters) ? 700 : 400,
                      textDecoration: 'none',
                    }}
                  >
                    {word}
                  </a>
                ))}
              </div>
            </div>
          )}
        </animated.div>
      </SpringCollapse>
    </section>
  );
}
