import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../src/store/useGameStore';
import { rankForScore } from '@sanakenno/shared';

export default function GameScreen() {
  const puzzle = useGameStore((s) => s.puzzle);
  const loading = useGameStore((s) => s.loading);
  const fetchError = useGameStore((s) => s.fetchError);
  const score = useGameStore((s) => s.score);
  const currentWord = useGameStore((s) => s.currentWord);
  const outerLetters = useGameStore((s) => s.outerLetters);
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const addLetter = useGameStore((s) => s.addLetter);
  const deleteLetter = useGameStore((s) => s.deleteLetter);
  const clearWord = useGameStore((s) => s.clearWord);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Score and rank */}
      <View style={styles.header}>
        <Text style={styles.rank}>{rankLabel}</Text>
        <Text style={styles.score}>
          {score} / {puzzle.max_score}
        </Text>
      </View>

      {/* Current word */}
      <View style={styles.wordRow}>
        <Text style={styles.currentWord}>{currentWord || '\u00A0'}</Text>
      </View>

      {/* Letter grid — center + outer */}
      <View style={styles.letters}>
        {outerLetters.map((letter, i) => (
          <Pressable
            key={`outer-${i}`}
            style={styles.letterButton}
            onPress={() => addLetter(letter)}
          >
            <Text style={styles.letterText}>{letter}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.letterButton, styles.centerButton]}
          onPress={() => addLetter(puzzle.center)}
        >
          <Text style={[styles.letterText, styles.centerText]}>
            {puzzle.center}
          </Text>
        </Pressable>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={deleteLetter}>
          <Text style={styles.controlText}>Poista</Text>
        </Pressable>
        <Pressable style={styles.controlButton} onPress={clearWord}>
          <Text style={styles.controlText}>Tyhjennä</Text>
        </Pressable>
      </View>

      {/* Puzzle info */}
      <Text style={styles.puzzleInfo}>Peli #{puzzle.puzzle_number}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  score: {
    fontSize: 14,
    color: '#CCBBAA',
    marginTop: 4,
  },
  wordRow: {
    alignItems: 'center',
    paddingVertical: 16,
    minHeight: 56,
  },
  currentWord: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  letters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  letterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    backgroundColor: '#D4A843',
  },
  letterText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  centerText: {
    color: '#3A3A3A',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4A4A4A',
  },
  controlText: {
    fontSize: 16,
    color: '#CCBBAA',
  },
  puzzleInfo: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888888',
    marginTop: 'auto',
    paddingBottom: 8,
  },
});
