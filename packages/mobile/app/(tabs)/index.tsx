import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGameStore } from '../../src/store/useGameStore';
import { Honeycomb } from '../../src/components/Honeycomb';
import { MessageBar } from '../../src/components/MessageBar';
import { WordInput } from '../../src/components/WordInput';
import { GameControls } from '../../src/components/GameControls';
import { RankProgress } from '../../src/components/RankProgress';
import { FoundWords } from '../../src/components/FoundWords';
import { HintPanel } from '../../src/components/HintPanel';
import { Celebration } from '../../src/components/Celebration';
import { useGameTimer } from '../../src/hooks/useGameTimer';
import { useMidnightRollover } from '../../src/hooks/useMidnightRollover';
import { rankForScore, progressToNextRank } from '@sanakenno/shared';
import { useTheme } from '../../src/theme';
import { share } from '../../src/platform';

export default function GameScreen() {
  const theme = useTheme();
  const timer = useGameTimer();

  // Midnight rollover: refetch puzzle when a new day starts
  useMidnightRollover();

  const puzzle = useGameStore((s) => s.puzzle);
  const loading = useGameStore((s) => s.loading);
  const fetchError = useGameStore((s) => s.fetchError);
  const score = useGameStore((s) => s.score);
  const currentWord = useGameStore((s) => s.currentWord);
  const wordRejected = useGameStore((s) => s.wordRejected);
  const outerLetters = useGameStore((s) => s.outerLetters);
  const foundWords = useGameStore((s) => s.foundWords);
  const message = useGameStore((s) => s.message);
  const messageType = useGameStore((s) => s.messageType);
  const startedAt = useGameStore((s) => s.startedAt);
  const totalPausedMs = useGameStore((s) => s.totalPausedMs);
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const addLetter = useGameStore((s) => s.addLetter);
  const deleteLetter = useGameStore((s) => s.deleteLetter);
  const submitWord = useGameStore((s) => s.submitWord);
  const shuffleLetters = useGameStore((s) => s.shuffleLetters);
  const hintsUnlocked = useGameStore((s) => s.hintsUnlocked);
  const scoreBeforeHints = useGameStore((s) => s.scoreBeforeHints);
  const unlockHint = useGameStore((s) => s.unlockHint);
  const celebration = useGameStore((s) => s.celebration);
  const setCelebration = useGameStore((s) => s.setCelebration);

  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  // Start or restore timer when puzzle loads
  useEffect(() => {
    if (puzzle && startedAt) {
      timer.restore(startedAt, totalPausedMs);
    } else if (puzzle) {
      timer.start();
    }
  }, [puzzle, startedAt, totalPausedMs, timer]);

  if (loading || !puzzle) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      >
        <View style={styles.center}>
          {fetchError ? (
            <Text style={[styles.error, { color: '#FF6B6B' }]}>
              {fetchError}
            </Text>
          ) : (
            <ActivityIndicator size="large" color={theme.accent} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const rankLabel = rankForScore(score, puzzle.max_score);
  const progress = progressToNextRank(score, puzzle.max_score);
  const allLetters = new Set([...puzzle.letters, puzzle.center]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      >
        <RankProgress
          rankLabel={rankLabel}
          progress={progress}
          score={score}
          maxScore={puzzle.max_score}
          scoreBeforeHints={scoreBeforeHints}
          hintsUsed={hintsUnlocked.size > 0}
          theme={theme}
        />

        {puzzle.hint_data && (
          <HintPanel
            hintData={puzzle.hint_data}
            foundWords={foundWords}
            allLetters={allLetters}
            hintsUnlocked={hintsUnlocked}
            onUnlock={unlockHint}
            theme={theme}
          />
        )}

        <MessageBar message={message} messageType={messageType} theme={theme} />

        <WordInput
          currentWord={currentWord}
          wordRejected={wordRejected}
          center={puzzle.center}
          allLetters={allLetters}
          theme={theme}
        />

        <Honeycomb
          center={puzzle.center}
          outerLetters={outerLetters}
          onLetterPress={addLetter}
          theme={theme}
        />

        <GameControls
          onDelete={deleteLetter}
          onShuffle={shuffleLetters}
          onSubmit={submitWord}
          theme={theme}
        />

        <FoundWords foundWords={foundWords} theme={theme} />

        <Celebration
          celebration={celebration}
          score={score}
          onDismiss={() => setCelebration(null)}
          onShare={() => {
            const text =
              celebration === 'taysikenno'
                ? `Sanakenno: Täysi kenno! ${score} pistettä 🏆`
                : `Sanakenno: Ällistyttävä! ${score} pistettä ⭐`;
            share.copyToClipboard(text);
          }}
          theme={theme}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});
