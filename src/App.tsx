/**
 * Root application component. Wires the Zustand game store to all
 * presentational components, hooks up keyboard input, and manages
 * the game timer and midnight rollover.
 *
 * Uses selective Zustand subscriptions to avoid full re-renders on
 * every state change.
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
import { HintPanels } from './components/HintPanels.js';

/* ------------------------------------------------------------------ */
/*  Zustand selectors — subscribe to individual slices of state        */
/* ------------------------------------------------------------------ */

const usePuzzle = () => useGameStore((s) => s.puzzle);
const useLoading = () => useGameStore((s) => s.loading);
const useFetchError = () => useGameStore((s) => s.fetchError);
const useCurrentWord = () => useGameStore((s) => s.currentWord);
const useScore = () => useGameStore((s) => s.score);
const useFoundWords = () => useGameStore((s) => s.foundWords);
const useOuterLetters = () => useGameStore((s) => s.outerLetters);
const useMessage = () => useGameStore((s) => s.message);
const useMessageType = () => useGameStore((s) => s.messageType);
const useShowRules = () => useGameStore((s) => s.showRules);
const useShowRanks = () => useGameStore((s) => s.showRanks);
const useShowAllFoundWords = () => useGameStore((s) => s.showAllFoundWords);
const useCelebration = () => useGameStore((s) => s.celebration);
const useWordShake = () => useGameStore((s) => s.wordShake);
const useLastResubmittedWord = () => useGameStore((s) => s.lastResubmittedWord);
const useShareCopied = () => useGameStore((s) => s.shareCopied);
const useHintsUnlocked = () => useGameStore((s) => s.hintsUnlocked);
const usePressedHexIndex = () => useGameStore((s) => s.pressedHexIndex);
const useStartedAt = () => useGameStore((s) => s.startedAt);
const useTotalPausedMs = () => useGameStore((s) => s.totalPausedMs);
const useScoreBeforeHints = () => useGameStore((s) => s.scoreBeforeHints);

/* Stable action references — these don't change between renders */
const actions = () => {
  const s = useGameStore.getState();
  return {
    fetchPuzzle: s.fetchPuzzle,
    addLetter: s.addLetter,
    deleteLetter: s.deleteLetter,
    shuffleLetters: s.shuffleLetters,
    submitWord: s.submitWord,
    setShowRules: s.setShowRules,
    setShowRanks: s.setShowRanks,
    setShowAllFoundWords: s.setShowAllFoundWords,
    setPressedHexIndex: s.setPressedHexIndex,
    setCelebration: s.setCelebration,
    copyStatus: s.copyStatus,
    unlockHint: s.unlockHint,
    center: s.center,
    allLetters: s.allLetters,
    rank: s.rank,
    recentFoundWords: s.recentFoundWords,
    sortedFoundWords: s.sortedFoundWords,
  };
};

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const puzzle = usePuzzle();
  const loading = useLoading();
  const fetchError = useFetchError();
  const currentWord = useCurrentWord();
  const score = useScore();
  const foundWords = useFoundWords();
  const outerLetters = useOuterLetters();
  const message = useMessage();
  const messageType = useMessageType();
  const showRules = useShowRules();
  const showRanks = useShowRanks();
  const showAllFoundWords = useShowAllFoundWords();
  const celebration = useCelebration();
  const wordShake = useWordShake();
  const lastResubmittedWord = useLastResubmittedWord();
  const shareCopied = useShareCopied();
  const hintsUnlocked = useHintsUnlocked();
  const pressedHexIndex = usePressedHexIndex();
  const startedAt = useStartedAt();
  const totalPausedMs = useTotalPausedMs();
  const scoreBeforeHints = useScoreBeforeHints();
  // Before any hints are unlocked the displayed value tracks current score.
  // After first unlock it freezes. Old saves (hints exist but no capture) fall back to 0.
  const displayScoreBeforeHints =
    hintsUnlocked.size === 0 ? score : (scoreBeforeHints ?? 0);

  const {
    fetchPuzzle,
    addLetter,
    deleteLetter,
    shuffleLetters,
    submitWord,
    setShowRules,
    setShowRanks,
    setShowAllFoundWords,
    setPressedHexIndex,
    setCelebration,
    copyStatus,
    unlockHint,
  } = actions();

  const timer = useGameTimer();

  // Fetch puzzle on mount
  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  // Restore or start timer when puzzle loads
  useEffect(() => {
    if (puzzle && startedAt) {
      timer.restore(startedAt, totalPausedMs);
    } else if (puzzle) {
      timer.start();
    }
  }, [puzzle, startedAt, totalPausedMs, timer]);

  useMidnightRollover();

  // Keyboard handler — uses stable action refs, no dependency on store object
  const handleEscape = useCallback(() => {
    const { showRules: isOpen, setShowRules: setRules } =
      useGameStore.getState();
    if (isOpen) setRules(false);
  }, []);

  useKeyboard({
    onLetter: addLetter,
    onBackspace: deleteLetter,
    onEnter: () => submitWord(),
    onEscape: handleEscape,
    enabled: !showRules && !!puzzle,
  });

  // Derived values
  const center = actions().center();
  const allLetters = actions().allLetters();
  const rank = actions().rank();
  const recentFoundWords = actions().recentFoundWords();
  const sortedFoundWords = actions().sortedFoundWords();
  const allFound =
    puzzle !== null && foundWords.size === puzzle.hint_data.word_count;

  const handleShare = useCallback(async () => {
    await copyStatus();
  }, [copyStatus]);

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
          {/* Spacer to balance the right-side buttons */}
          <div
            className="flex items-center gap-1"
            style={{ visibility: 'hidden' }}
          >
            <span className="p-2 text-lg">?</span>
            <span style={{ width: 20 }} />
          </div>
          <h1
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sanakenno
            {puzzle && (
              <span
                style={{
                  color: 'var(--color-text-tertiary)',
                  fontWeight: 'normal',
                }}
              >
                {' '}
                — #{puzzle.puzzle_number + 1}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="p-2 rounded-lg text-lg bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--color-text-primary)' }}
              aria-label="Säännöt"
            >
              ?
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Rules modal */}
      <RulesModal show={showRules} onClose={() => setShowRules(false)} />

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

        {loading && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Ladataan...
          </div>
        )}

        {!loading && fetchError && (
          <ErrorState
            message="Lataus epäonnistui."
            onRetry={() => fetchPuzzle()}
          />
        )}

        {!loading && !fetchError && puzzle && (
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
              <RankProgress
                score={score}
                maxScore={puzzle.max_score}
                rank={rank}
                showRanks={showRanks}
                onToggleRanks={() => setShowRanks(!showRanks)}
                shareCopied={shareCopied}
                onShare={handleShare}
                scoreBeforeHints={displayScoreBeforeHints}
              />
            </div>

            {/* Hints — always reserves the full open height so the grid never moves */}
            <div style={{ minHeight: '8.5rem' }}>
              <HintPanels hintsUnlocked={hintsUnlocked} onUnlock={unlockHint} />
            </div>

            {/* Word input */}
            <div className="mb-2">
              <WordInput
                currentWord={currentWord}
                center={center}
                allLetters={allLetters}
                shake={wordShake}
                allFound={allFound}
                wordCount={puzzle.hint_data.word_count}
              />
            </div>

            {/* Message bar */}
            {!allFound && (
              <div className="mb-2">
                <MessageBar message={message} type={messageType} />
              </div>
            )}

            {/* Honeycomb */}
            <div
              className="flex justify-center mb-3"
              style={{ opacity: allFound ? 0.7 : 1 }}
            >
              <Honeycomb
                center={center}
                outerLetters={outerLetters}
                pressedHexIndex={pressedHexIndex}
                disabled={allFound}
                onLetterPress={addLetter}
                onHexDown={setPressedHexIndex}
                onHexUp={() => setPressedHexIndex(null)}
              />
            </div>

            {/* Controls */}
            {!allFound && (
              <div className="mb-3">
                <GameControls
                  onDelete={deleteLetter}
                  onShuffle={shuffleLetters}
                  onSubmit={() => submitWord()}
                />
              </div>
            )}

            {/* Found words */}
            <FoundWords
              foundWords={sortedFoundWords}
              recentWords={recentFoundWords}
              showAll={showAllFoundWords}
              onToggleShowAll={() => setShowAllFoundWords(!showAllFoundWords)}
              lastResubmittedWord={lastResubmittedWord}
            />
          </>
        )}
      </div>

      {/* Celebration overlay */}
      {celebration && puzzle && (
        <Celebration
          type={celebration}
          score={score}
          maxScore={puzzle.max_score}
          onClose={() => setCelebration(null)}
          onShare={handleShare}
        />
      )}
    </>
  );
}

export default App;
