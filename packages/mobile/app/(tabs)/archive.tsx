import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { config } from '../../src/platform';
import { useGameStore } from '../../src/store/useGameStore';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
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

  useEffect(() => {
    fetch(`${config.apiBase}/api/archive`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ArchiveEntry[]>;
      })
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
      data={entries}
      keyExtractor={(item) => String(item.puzzle_number)}
      style={{ backgroundColor: theme.bgPrimary, flex: 1 }}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item }) => {
        const isCurrent = item.puzzle_number === currentPuzzleNumber;
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
              <Text style={[styles.date, { color: theme.textPrimary }]}>
                {formatFinnishDate(item.date)}
              </Text>
              {item.is_today && (
                <View
                  style={[styles.todayBadge, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.todayText}>tänään</Text>
                </View>
              )}
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.letters, { color: theme.textSecondary }]}>
                {item.letters
                  .map((l) => (l === item.center ? '' : l.toUpperCase()))
                  .filter(Boolean)
                  .join(' ')}
              </Text>
              <Text style={[styles.centerLetter, { color: theme.accent }]}>
                {item.center.toUpperCase()}
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
  todayBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  letters: {
    fontSize: 14,
    letterSpacing: 2,
  },
  centerLetter: {
    fontSize: 16,
    fontWeight: '700',
  },
});
