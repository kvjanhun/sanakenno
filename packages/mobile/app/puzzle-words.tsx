import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { config, storage } from '../src/platform';

interface SavedGameState {
  foundWords?: string[];
}

export default function PuzzleWordsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { number } = useLocalSearchParams<{ number: string }>();
  const puzzleNumber = Number(number);

  const [words, setWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!number || isNaN(puzzleNumber)) {
      setError('Virheellinen tehtävänumero');
      setLoading(false);
      return;
    }

    // Load locally found words for this puzzle
    const saved = storage.load<SavedGameState>(`game_state_${puzzleNumber}`);
    if (saved?.foundWords) {
      setFoundWords(new Set(saved.foundWords));
    }

    // Mark as revealed so stats are frozen for this puzzle
    storage.setRaw(`revealed_${puzzleNumber}`, 'true');

    // Fetch the word list from the server
    fetch(`${config.apiBase}/api/puzzle/${puzzleNumber}/words`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ words: string[] }>;
      })
      .then((data) => {
        setWords(data.words.slice().sort());
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [puzzleNumber, number]);

  if (loading) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.center, { backgroundColor: theme.bgPrimary }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.center, { backgroundColor: theme.bgPrimary }]}
      >
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
          {error}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.accent }]}>
            Takaisin
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const foundCount = words.filter((w) => foundWords.has(w)).length;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.flex, { backgroundColor: theme.bgPrimary }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.accent }]}>
            ‹ Takaisin
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Kenno #{puzzleNumber + 1}
        </Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
          {foundCount}/{words.length} löydetty
        </Text>
      </View>

      <FlatList
        data={words}
        keyExtractor={(item) => item}
        numColumns={3}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const found = foundWords.has(item);
          return (
            <View style={styles.wordCell}>
              <Text
                style={[
                  styles.word,
                  found
                    ? { color: theme.textPrimary, fontWeight: '600' }
                    : { color: theme.textTertiary },
                ]}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
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
    gap: 16,
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 13,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    padding: 12,
  },
  wordCell: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  word: {
    fontSize: 14,
  },
});
