import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGameStore } from '../src/store/useGameStore';
import { Honeycomb } from '../src/components/Honeycomb';
import { rankForScore, progressToNextRank } from '@sanakenno/shared';
import { useTheme } from '../src/theme';

export default function GameScreen() {
  const theme = useTheme();

  const puzzle = useGameStore((s) => s.puzzle);
  const loading = useGameStore((s) => s.loading);
  const fetchError = useGameStore((s) => s.fetchError);
  const score = useGameStore((s) => s.score);
  const currentWord = useGameStore((s) => s.currentWord);
  const outerLetters = useGameStore((s) => s.outerLetters);
  const foundWords = useGameStore((s) => s.foundWords);
  const message = useGameStore((s) => s.message);
  const messageType = useGameStore((s) => s.messageType);
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const addLetter = useGameStore((s) => s.addLetter);
  const deleteLetter = useGameStore((s) => s.deleteLetter);
  const submitWord = useGameStore((s) => s.submitWord);
  const shuffleLetters = useGameStore((s) => s.shuffleLetters);

  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

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

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      >
        {/* Title bar */}
        <View style={[styles.titleBar, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Sanakenno
            <Text style={{ fontWeight: '400' }}> — </Text>
            <Text style={{ color: theme.accent, fontWeight: '400' }}>
              #{puzzle.puzzle_number + 1}
            </Text>
          </Text>
        </View>

        {/* Rank and score */}
        <View style={styles.header}>
          <Text style={[styles.rank, { color: theme.textPrimary }]}>
            {rankLabel}
          </Text>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: theme.bgSecondary },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: theme.accent },
              ]}
            />
          </View>
          <Text style={[styles.score, { color: theme.textSecondary }]}>
            {score} / {puzzle.max_score} · {foundWords.size} sanaa
          </Text>
        </View>

        {/* Message bar */}
        {message ? (
          <View style={styles.messageBar}>
            <Text
              style={[
                styles.messageText,
                {
                  color:
                    messageType === 'error'
                      ? '#FF6B6B'
                      : messageType === 'special'
                        ? theme.accent
                        : theme.textPrimary,
                },
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        {/* Current word */}
        <View style={styles.wordRow}>
          <Text style={[styles.currentWord, { color: theme.textPrimary }]}>
            {currentWord || '\u00A0'}
          </Text>
        </View>

        {/* Honeycomb */}
        <Honeycomb
          center={puzzle.center}
          outerLetters={outerLetters}
          onLetterPress={addLetter}
          theme={theme}
        />

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={[
              styles.controlButton,
              { backgroundColor: theme.bgSecondary },
            ]}
            onPress={deleteLetter}
          >
            <Text style={[styles.controlText, { color: theme.textSecondary }]}>
              Poista
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.controlButton,
              { backgroundColor: theme.bgSecondary },
            ]}
            onPress={shuffleLetters}
          >
            <Text style={[styles.controlText, { color: theme.textSecondary }]}>
              Sekoita
            </Text>
          </Pressable>
          <Pressable
            style={[styles.controlButton, { backgroundColor: theme.accent }]}
            onPress={submitWord}
          >
            <Text
              style={[
                styles.controlText,
                { color: '#ffffff', fontWeight: '600' },
              ]}
            >
              Syötä
            </Text>
          </Pressable>
        </View>

        {/* Found words count */}
        <Text style={[styles.puzzleInfo, { color: theme.textTertiary }]}>
          {foundWords.size > 0
            ? `${[...foundWords].map((w) => w.toUpperCase()).join(' · ')}`
            : ''}
        </Text>
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
  titleBar: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  rank: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressTrack: {
    width: '60%',
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  score: {
    fontSize: 14,
    marginTop: 6,
  },
  messageBar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
  },
  wordRow: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  currentWord: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 16,
  },
  puzzleInfo: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 'auto',
    paddingBottom: 8,
  },
});
