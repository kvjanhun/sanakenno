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

import { useEffect, useCallback, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { useAuthStore } from './store/useAuthStore';
import { useKeyboard } from './hooks/useKeyboard';
import { useGameTimer } from './hooks/useGameTimer';
import { useMidnightRollover } from './hooks/useMidnightRollover';
import { Honeycomb } from './components/Honeycomb/Honeycomb';
import { WordInput } from './components/WordInput';
import { FoundWords } from './components/FoundWords';
import { RankProgress } from './components/RankProgress';
import { RulesModal } from './components/RulesModal';
import { ErrorState } from './components/ErrorState';
import { ThemeToggle } from './components/ThemeToggle';
import { Celebration } from './components/Celebration';
import { MessageBar } from './components/MessageBar';
import { GameControls } from './components/GameControls';
import { HintPanels } from './components/HintPanels';
import { ArchiveModal } from './components/ArchiveModal';
import { StatsModal } from './components/StatsModal';
import { AuthModal } from './components/AuthModal';
import { AuthLinkModal } from './components/AuthLinkModal';
import { CalendarIcon, StatsIcon } from './components/icons';

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
const useSecondaryMessage = () => useGameStore((s) => s.secondaryMessage);
const useSecondaryType = () => useGameStore((s) => s.secondaryType);
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
const useShowArchive = () => useGameStore((s) => s.showArchive);
const useShowStats = () => useGameStore((s) => s.showStats);
const useViewingPuzzleDate = () => useGameStore((s) => s.viewingPuzzleDate);

const useAuthIsLoggedIn = () => useAuthStore((s) => s.isLoggedIn);
const useAuthEmail = () => useAuthStore((s) => s.email);

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
  const authIsLoggedIn = useAuthIsLoggedIn();
  const authEmail = useAuthEmail();
  const [showAuth, setShowAuth] = useState(false);
  const [pendingLinkToken, setPendingLinkToken] = useState<string | null>(null);
  const fetchError = useFetchError();
  const currentWord = useCurrentWord();
  const score = useScore();
  const foundWords = useFoundWords();
  const outerLetters = useOuterLetters();
  const message = useMessage();
  const messageType = useMessageType();
  const secondaryMessage = useSecondaryMessage();
  const secondaryType = useSecondaryType();
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
  const showArchive = useShowArchive();
  const showStats = useShowStats();
  const viewingPuzzleDate = useViewingPuzzleDate();
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

  // Restore auth session on mount and intercept magic link token from URL
  useEffect(() => {
    useAuthStore.getState().initialize();

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Clean the URL immediately so the token is not bookmarked or shared
      window.history.replaceState({}, '', '/');
      // Show the choice modal — don't auto-verify so the app can still use the token
      setPendingLinkToken(token);
    }
  }, []);

  // Restore or start timer when puzzle loads
  useEffect(() => {
    if (puzzle && startedAt) {
      timer.restore(startedAt, totalPausedMs);
    } else if (puzzle) {
      timer.start();
    }
  }, [puzzle, startedAt, totalPausedMs, timer]);

  useMidnightRollover();

  const { setShowArchive, setShowStats, loadArchivePuzzle, returnToToday } =
    useGameStore.getState();

  // Keyboard handler — uses stable action refs, no dependency on store object
  const handleEscape = useCallback(() => {
    const state = useGameStore.getState();
    if (state.showArchive) state.setShowArchive(false);
    else if (state.showStats) state.setShowStats(false);
    else if (state.showRules) state.setShowRules(false);
  }, []);

  useKeyboard({
    onLetter: addLetter,
    onBackspace: deleteLetter,
    onEnter: () => submitWord(),
    onEscape: handleEscape,
    enabled: !showRules && !showArchive && !showStats && !!puzzle,
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
        <div className="max-w-sm mx-auto h-12 flex justify-between items-center">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowArchive(true)}
              className="py-2 pr-2 rounded-lg bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--color-text-primary)' }}
              aria-label="Arkisto"
            >
              <CalendarIcon />
            </button>
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="py-2 pr-2 pl-1 rounded-lg bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--color-text-primary)' }}
              aria-label="Tilastot"
            >
              <StatsIcon />
            </button>
          </div>
          <h1
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {viewingPuzzleDate ? (
              <>
                <button
                  type="button"
                  onClick={() => returnToToday()}
                  className="bg-transparent border-none cursor-pointer"
                  style={{
                    color: 'var(--color-accent)',
                    fontSize: '1.1em',
                    padding: '0 0.25rem',
                  }}
                  aria-label="Takaisin tähän päivään"
                >
                  ←
                </button>
                <span>
                  {new Date(viewingPuzzleDate + 'T12:00:00').toLocaleDateString(
                    'fi-FI',
                    { day: 'numeric', month: 'numeric' },
                  )}
                </span>
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
              </>
            ) : (
              <>
                Sanakenno
                <span style={{ fontWeight: 400 }}> —</span>
                {puzzle && (
                  <span
                    style={{
                      color: 'var(--color-accent)',
                      fontWeight: '400',
                    }}
                  >
                    {' '}
                    #{puzzle.puzzle_number + 1}
                  </span>
                )}
              </>
            )}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="py-2 px-2 rounded-lg bg-transparent border-none cursor-pointer text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label={authIsLoggedIn ? 'Oma tili' : 'Kirjaudu'}
              title={
                authIsLoggedIn
                  ? (authEmail ?? 'Kirjautunut')
                  : 'Kirjaudu sisään'
              }
            >
              {authIsLoggedIn
                ? (authEmail?.[0]?.toUpperCase() ?? '●')
                : 'Kirjaudu'}
            </button>
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="p-2 rounded-lg text-lg bg-transparent border-none cursor-pointer"
              style={{
                color: 'var(--color-text-primary)',
                fontWeight: '500',
                fontSize: '1.3em',
              }}
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
      <AuthModal show={showAuth} onClose={() => setShowAuth(false)} />
      {pendingLinkToken && (
        <AuthLinkModal
          token={pendingLinkToken}
          onLoginWeb={() => {
            const token = pendingLinkToken;
            setPendingLinkToken(null);
            void useAuthStore.getState().verifyToken(token);
          }}
        />
      )}
      <ArchiveModal
        show={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={loadArchivePuzzle}
        currentPuzzleNumber={puzzle?.puzzle_number ?? null}
      />
      <StatsModal show={showStats} onClose={() => setShowStats(false)} />

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

            {/* Hints — overlay panel floats over content, no height reservation needed */}
            <HintPanels hintsUnlocked={hintsUnlocked} onUnlock={unlockHint} />

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
                <MessageBar
                  message={message}
                  type={messageType}
                  secondaryMessage={secondaryMessage}
                  secondaryType={secondaryType}
                />
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
