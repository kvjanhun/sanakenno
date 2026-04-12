import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { config, storage } from '../../src/platform';
import { useGameStore } from '../../src/store/useGameStore';
import { rankForScore } from '@sanakenno/shared';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
  max_score: number;
}

interface SavedGameState {
  score?: number;
}

function formatFinnishDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

function LetterDisplay({
  letters,
  center,
  theme,
}: {
  letters: string[];
  center: string;
  theme: ReturnType<typeof import('../../src/theme').useTheme>;
}) {
  return (
    <Text style={[styles.letters, { color: theme.textSecondary }]}>
      {letters
        .map((l, i) =>
          l === center ? (
            <Text key={i} style={{ color: theme.accent }}>
              {l.toUpperCase()}
            </Text>
          ) : (
            l.toUpperCase()
          ),
        )
        .reduce<React.ReactNode[]>((acc, el, i) => {
          if (i === 0) return [el];
          return [...acc, ' ', el];
        }, [])}
    </Text>
  );
}

export default function ArchiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const currentPuzzleNumber = useGameStore((s) => s.puzzle?.puzzle_number);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ArchiveEntry | null>(null);
  const hasFetched = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFetched.current) setLoading(true);
      fetch(`${config.apiBase}/api/archive?all=true`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ArchiveEntry[]>;
        })
        .then((data) => {
          setEntries(data);
          setLoading(false);
          hasFetched.current = true;
        })
        .catch((err: Error) => {
          if (!hasFetched.current) {
            setError(err.message);
            setLoading(false);
          }
        });
    }, []),
  );

  useEffect(() => {}, [currentPuzzleNumber]);

  const savedProgress = useMemo(() => {
    const map = new Map<number, { score: number; rank: string }>();
    for (const entry of entries) {
      const saved = storage.load<SavedGameState>(
        `game_state_${entry.puzzle_number}`,
      );
      if (saved?.score != null && saved.score > 0) {
        map.set(entry.puzzle_number, {
          score: saved.score,
          rank: rankForScore(saved.score, entry.max_score),
        });
      }
    }
    return map;
  }, [entries]);

  const handleTodayPress = useCallback(
    (puzzleNumber: number) => {
      fetchPuzzle(puzzleNumber);
      router.back();
    },
    [fetchPuzzle, router],
  );

  const handlePastPress = useCallback((entry: ArchiveEntry) => {
    setSelectedEntry(entry);
  }, []);

  const handlePlay = useCallback(() => {
    if (!selectedEntry) return;
    setSelectedEntry(null);
    fetchPuzzle(selectedEntry.puzzle_number);
    router.back();
  }, [selectedEntry, fetchPuzzle, router]);

  const handleViewWords = useCallback(() => {
    if (!selectedEntry) return;
    const number = selectedEntry.puzzle_number;
    setSelectedEntry(null);
    router.push(`/puzzle-words?number=${number}`);
  }, [selectedEntry, router]);

  if (loading) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.center, { backgroundColor: theme.bgPrimary }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.center, { backgroundColor: theme.bgPrimary }]}
      >
        <Text style={{ color: theme.textSecondary }}>{error}</Text>
      </SafeAreaView>
    );
  }

  const today = entries.find((e) => e.is_today);
  const pastEntries = entries.filter((e) => !e.is_today);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bgPrimary }]}>
      {/* Today's card — always visible, never scrolls away */}
      {today && (
        <View style={styles.todaySection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Tänään
          </Text>
          <Pressable
            onPress={() => handleTodayPress(today.puzzle_number)}
            style={[
              styles.row,
              {
                backgroundColor: theme.bgSecondary,
                borderColor:
                  today.puzzle_number === currentPuzzleNumber
                    ? theme.accent
                    : theme.border,
                borderWidth:
                  today.puzzle_number === currentPuzzleNumber ? 2 : 1,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.puzzleNum, { color: theme.textSecondary }]}>
                #{today.puzzle_number + 1}
              </Text>
              <Text style={[styles.date, { color: theme.textPrimary }]}>
                {formatFinnishDate(today.date)}
              </Text>
            </View>
            <View style={styles.rowRight}>
              {savedProgress.get(today.puzzle_number) && (
                <View
                  style={[
                    styles.rankBadge,
                    {
                      backgroundColor: theme.bgPrimary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.rankText, { color: theme.textSecondary }]}
                  >
                    {savedProgress.get(today.puzzle_number)!.rank} ·{' '}
                    {savedProgress.get(today.puzzle_number)!.score}p
                  </Text>
                </View>
              )}
              <LetterDisplay
                letters={today.letters}
                center={today.center}
                theme={theme}
              />
            </View>
          </Pressable>
          <Text
            style={[
              styles.sectionLabel,
              { color: theme.textSecondary, marginTop: 8 },
            ]}
          >
            Arkisto
          </Text>
        </View>
      )}

      {/* Past puzzles list */}
      <FlatList
        data={pastEntries}
        keyExtractor={(item) => String(item.puzzle_number)}
        style={styles.flex}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }) => {
          const isCurrent = item.puzzle_number === currentPuzzleNumber;
          const progress = savedProgress.get(item.puzzle_number);
          return (
            <Pressable
              onPress={() => handlePastPress(item)}
              style={[
                styles.row,
                {
                  borderColor: isCurrent ? theme.accent : theme.border,
                  borderWidth: isCurrent ? 2 : 1,
                  backgroundColor: theme.bgSecondary,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <Text
                  style={[styles.puzzleNum, { color: theme.textSecondary }]}
                >
                  #{item.puzzle_number + 1}
                </Text>
                <Text style={[styles.date, { color: theme.textPrimary }]}>
                  {formatFinnishDate(item.date)}
                </Text>
              </View>
              <View style={styles.rowRight}>
                {progress && (
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor: theme.bgPrimary,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.rankText, { color: theme.textSecondary }]}
                    >
                      {progress.rank} · {progress.score}p
                    </Text>
                  </View>
                )}
                <LetterDisplay
                  letters={item.letters}
                  center={item.center}
                  theme={theme}
                />
              </View>
            </Pressable>
          );
        }}
      />

      {/* Bottom sheet for past puzzle options */}
      <Modal
        visible={selectedEntry !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedEntry(null)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[styles.bottomSheet, { backgroundColor: theme.bgPrimary }]}
        >
          {selectedEntry && (
            <>
              <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>
                Kenno #{selectedEntry.puzzle_number + 1} ·{' '}
                {formatFinnishDate(selectedEntry.date)}
              </Text>
              <Pressable
                onPress={handlePlay}
                style={[styles.sheetButton, { backgroundColor: theme.accent }]}
              >
                <Text
                  style={[styles.sheetButtonText, { color: theme.onAccent }]}
                >
                  Pelaa
                </Text>
              </Pressable>
              <Pressable
                onPress={handleViewWords}
                style={[
                  styles.sheetButton,
                  { backgroundColor: theme.bgSecondary },
                ]}
              >
                <Text
                  style={[styles.sheetButtonText, { color: theme.textPrimary }]}
                >
                  Näytä vastaukset
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedEntry(null)}
                style={styles.sheetCancel}
              >
                <Text
                  style={[
                    styles.sheetCancelText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Peruuta
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todaySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  puzzleNum: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 36,
  },
  letters: {
    fontSize: 13,
    letterSpacing: 0,
  },
  rankBadge: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  sheetTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetCancel: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  sheetCancelText: {
    fontSize: 15,
  },
});
