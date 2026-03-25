/**
 * Root application component. Wires the Zustand game store to all
 * presentational components, hooks up keyboard input, and manages
 * the game timer and midnight rollover.
 *
 * @module src/App
 */

import { useEffect, useCallback } from 'react';
import { useGameStore } from './store/useGameStore.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useGameTimer } from './hooks/useGameTimer.js';
import { useMidnightRollover } from './hooks/useMidnightRollover.js';
import { Honeycomb } from './components/Honeycomb/Honeycomb.js';
import { WordInput } from './components/WordInput.js';
import { FoundWords } from './components/FoundWords.js';
import { RankProgress } from './components/RankProgress.js';
import { RulesModal } from './components/RulesModal.js';
import { ErrorState } from './components/ErrorState.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { Celebration } from './components/Celebration.js';
import { MessageBar } from './components/MessageBar.js';
import { GameControls } from './components/GameControls.js';

function App() {
  const store = useGameStore();
  const timer = useGameTimer();

  const fetchPuzzle = store.fetchPuzzle;
  const puzzle = store.puzzle;
  const startedAt = store.startedAt;
  const totalPausedMs = store.totalPausedMs;

  // Fetch puzzle on mount
  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  // Start timer when puzzle loads; restore persisted timer state
  useEffect(() => {
    if (puzzle && startedAt) {
      timer.restore(startedAt, totalPausedMs);
    } else if (puzzle) {
      timer.start();
    }
  }, [puzzle, startedAt, totalPausedMs, timer]);

  useMidnightRollover();

  // Keyboard handler
  const handleEscape = useCallback(() => {
    if (store.showRules) store.setShowRules(false);
  }, [store]);

  useKeyboard({
    onLetter: store.addLetter,
    onBackspace: store.deleteLetter,
    onEnter: () => store.submitWord(),
    onEscape: handleEscape,
    enabled: !store.showRules && !!store.puzzle,
  });

  // Derived values
  const center = store.center();
  const allLetters = store.allLetters();
  const rank = store.rank();
  const recentFoundWords = store.recentFoundWords();
  const sortedFoundWords = store.sortedFoundWords();
  const allFound =
    store.puzzle !== null &&
    store.foundWords.size === store.puzzle.hint_data.word_count;

  // Share button handler
  const handleShare = useCallback(async () => {
    await store.copyStatus();
  }, [store]);

  return (
    <>
      {/* Fixed title bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="max-w-sm mx-auto px-6 h-12 flex justify-between items-center">
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sanakenno
          </span>
          <h1
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sanakenno
            {store.puzzle && (
              <span style={{ color: 'var(--color-text-tertiary)' }}>
                {' '}
                — #{store.puzzle.puzzle_number + 1}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => store.setShowRules(true)}
              className="p-2 rounded-lg text-sm font-semibold bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--color-text-tertiary)' }}
              aria-label="Säännöt"
            >
              ?
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Rules modal */}
      <RulesModal
        show={store.showRules}
        onClose={() => store.setShowRules(false)}
      />

      {/* Main content */}
      <div
        className="max-w-sm mx-auto"
        style={{
          touchAction: 'manipulation',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
        }}
      >
        {/* Spacer for fixed header */}
        <div
          style={{ height: 'calc(env(safe-area-inset-top) + 3rem)' }}
          aria-hidden="true"
        />

        {store.loading && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Ladataan...
          </div>
        )}

        {!store.loading && store.fetchError && (
          <ErrorState
            message="Lataus epäonnistui."
            onRetry={() => store.fetchPuzzle()}
          />
        )}

        {!store.loading && !store.fetchError && store.puzzle && (
          <>
            {/* Score + rank + share */}
            <div
              className="sticky z-10"
              style={{
                top: 'calc(env(safe-area-inset-top) + 3rem)',
                backgroundColor: 'var(--color-bg-primary)',
                paddingTop: '0.5rem',
                paddingBottom: '0.25rem',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <RankProgress
                  score={store.score}
                  maxScore={store.puzzle.max_score}
                  rank={rank}
                  showRanks={store.showRanks}
                  onToggleRanks={() => store.setShowRanks(!store.showRanks)}
                />
              </div>
              <div className="flex items-center gap-2 ml-auto justify-end">
                {store.shareCopied && (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Kopioitu!
                  </span>
                )}
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded cursor-pointer"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={handleShare}
                >
                  Jaa tulos
                </button>
              </div>
            </div>

            {/* Word input */}
            <div className="mb-2">
              <WordInput
                currentWord={store.currentWord}
                center={center}
                allLetters={allLetters}
                shake={store.wordShake}
                allFound={allFound}
                wordCount={store.puzzle.hint_data.word_count}
              />
            </div>

            {/* Message bar */}
            {!allFound && (
              <div className="mb-2">
                <MessageBar message={store.message} type={store.messageType} />
              </div>
            )}

            {/* Honeycomb */}
            <div
              className="flex justify-center mb-3"
              style={{ opacity: allFound ? 0.7 : 1 }}
            >
              <Honeycomb
                center={center}
                outerLetters={store.outerLetters}
                pressedHexIndex={store.pressedHexIndex}
                disabled={allFound}
                onLetterPress={store.addLetter}
                onHexDown={store.setPressedHexIndex}
                onHexUp={() => store.setPressedHexIndex(null)}
              />
            </div>

            {/* Controls */}
            {!allFound && (
              <div className="mb-3">
                <GameControls
                  onDelete={store.deleteLetter}
                  onShuffle={store.shuffleLetters}
                  onSubmit={() => store.submitWord()}
                />
              </div>
            )}

            {/* Found words */}
            <FoundWords
              foundWords={sortedFoundWords}
              recentWords={recentFoundWords}
              showAll={store.showAllFoundWords}
              onToggleShowAll={() =>
                store.setShowAllFoundWords(!store.showAllFoundWords)
              }
              lastResubmittedWord={store.lastResubmittedWord}
            />
          </>
        )}
      </div>

      {/* Celebration overlay */}
      {store.celebration && store.puzzle && (
        <Celebration
          type={store.celebration}
          score={store.score}
          maxScore={store.puzzle.max_score}
          onClose={() => store.setCelebration(null)}
          onShare={handleShare}
        />
      )}
    </>
  );
}

export default App;
