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

export default function GameScreen() {
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
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          {fetchError ? (
            <Text style={styles.error}>{fetchError}</Text>
          ) : (
            <ActivityIndicator size="large" color="#F5E6C8" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const rankLabel = rankForScore(score, puzzle.max_score);
  const progress = progressToNextRank(score, puzzle.max_score);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container}>
        {/* Rank and score */}
        <View style={styles.header}>
          <Text style={styles.rank}>{rankLabel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.score}>
            {score} / {puzzle.max_score} · {foundWords.size} sanaa
          </Text>
        </View>

        {/* Message bar */}
        {message ? (
          <View style={styles.messageBar}>
            <Text
              style={[
                styles.messageText,
                messageType === 'error' && styles.messageError,
                messageType === 'special' && styles.messageSpecial,
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        {/* Current word */}
        <View style={styles.wordRow}>
          <Text style={styles.currentWord}>{currentWord || '\u00A0'}</Text>
        </View>

        {/* Honeycomb */}
        <Honeycomb
          center={puzzle.center}
          outerLetters={outerLetters}
          onLetterPress={addLetter}
        />

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={deleteLetter}>
            <Text style={styles.controlText}>Poista</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={shuffleLetters}>
            <Text style={styles.controlText}>Sekoita</Text>
          </Pressable>
          <Pressable
            style={[styles.controlButton, styles.submitButton]}
            onPress={submitWord}
          >
            <Text style={[styles.controlText, styles.submitText]}>Syötä</Text>
          </Pressable>
        </View>

        {/* Puzzle info */}
        <Text style={styles.puzzleInfo}>Peli #{puzzle.puzzle_number}</Text>
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
    backgroundColor: '#3A3A3A',
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  rank: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5E6C8',
  },
  progressTrack: {
    width: '60%',
    height: 4,
    backgroundColor: '#555555',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4A843',
    borderRadius: 2,
  },
  score: {
    fontSize: 14,
    color: '#CCBBAA',
    marginTop: 6,
  },
  messageBar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5E6C8',
  },
  messageError: {
    color: '#FF6B6B',
  },
  messageSpecial: {
    color: '#D4A843',
  },
  wordRow: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  currentWord: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#4A4A4A',
  },
  submitButton: {
    backgroundColor: '#D4A843',
  },
  controlText: {
    fontSize: 16,
    color: '#CCBBAA',
  },
  submitText: {
    color: '#3A3A3A',
    fontWeight: '600',
  },
  puzzleInfo: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888888',
    marginTop: 'auto',
    paddingBottom: 8,
  },
});
