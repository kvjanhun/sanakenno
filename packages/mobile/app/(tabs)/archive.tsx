import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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

export default function ArchiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const currentPuzzleNumber = useGameStore((s) => s.puzzle?.puzzle_number);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasFetched = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Show spinner only on first visit; silently update on subsequent focuses
      if (!hasFetched.current) setLoading(true);
      fetch(`${config.apiBase}/api/archive`)
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

  // Keep currentPuzzleNumber-dependent highlight fresh (no extra fetch needed)
  useEffect(() => {}, [currentPuzzleNumber]);

  // Build a map of puzzleNumber → { score, rank } from local storage
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

  const handlePress = useCallback(
    (puzzleNumber: number) => {
      fetchPuzzle(puzzleNumber);
      router.back();
    },
    [fetchPuzzle, router],
  );

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

  return (
    <FlatList
      data={entries.filter((e) => !e.is_today)}
      keyExtractor={(item) => String(item.puzzle_number)}
      style={{ backgroundColor: theme.bgPrimary, flex: 1 }}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={() => {
        const today = entries.find((e) => e.is_today);
        if (!today) return null;
        const isCurrent = today.puzzle_number === currentPuzzleNumber;
        const progress = savedProgress.get(today.puzzle_number);
        return (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Tänään
            </Text>
            <Pressable
              onPress={() => handlePress(today.puzzle_number)}
              style={[
                styles.row,
                {
                  backgroundColor: theme.bgSecondary,
                  borderColor: isCurrent ? theme.accent : theme.border,
                  borderWidth: isCurrent ? 2 : 1,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <Text
                  style={[styles.puzzleNum, { color: theme.textSecondary }]}
                >
                  #{today.puzzle_number + 1}
                </Text>
                <Text style={[styles.date, { color: theme.textPrimary }]}>
                  {formatFinnishDate(today.date)}
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
                <Text style={[styles.letters, { color: theme.textSecondary }]}>
                  {today.letters
                    .map((l, i) =>
                      l === today.center ? (
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
          </>
        );
      }}
      renderItem={({ item }) => {
        const isCurrent = item.puzzle_number === currentPuzzleNumber;
        const progress = savedProgress.get(item.puzzle_number);
        return (
          <Pressable
            onPress={() => handlePress(item.puzzle_number)}
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
              <Text style={[styles.puzzleNum, { color: theme.textSecondary }]}>
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
              <Text style={[styles.letters, { color: theme.textSecondary }]}>
                {item.letters
                  .map((l, i) =>
                    l === item.center ? (
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
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
