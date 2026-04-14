import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react-native';
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

const PAGE_SIZE = 8;

export default function ArchiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const currentPuzzleNumber = useGameStore((s) => s.puzzle?.puzzle_number);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ArchiveEntry | null>(null);
  const [page, setPage] = useState(0);
  const hasFetched = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;

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
          setPage(0);
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

  useEffect(() => {
    if (!selectedEntry) return;

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(24);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedEntry, backdropOpacity, sheetTranslateY]);

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

  const revealedPuzzles = useMemo(() => {
    const set = new Set<number>();
    for (const entry of entries) {
      if (storage.getRaw(`revealed_${entry.puzzle_number}`) === 'true') {
        set.add(entry.puzzle_number);
      }
    }
    return set;
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

  const pageCountRef = useRef(1);
  const goPrevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);
  const goNextPage = useCallback(() => {
    setPage((p) => Math.min(pageCountRef.current - 1, p + 1));
  }, []);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          'worklet';
          const fastEnough = Math.abs(e.velocityX) > 400;
          const farEnough = Math.abs(e.translationX) > 60;
          if (!fastEnough && !farEnough) return;
          if (e.translationX < 0) {
            runOnJS(goNextPage)();
          } else {
            runOnJS(goPrevPage)();
          }
        }),
    [goNextPage, goPrevPage],
  );

  const animateSheetOut = useCallback(
    (onClosed?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 24,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedEntry(null);
        onClosed?.();
      });
    },
    [backdropOpacity, sheetTranslateY],
  );

  const closeSheet = useCallback(() => {
    animateSheetOut();
  }, [animateSheetOut]);

  const handlePlay = useCallback(() => {
    if (!selectedEntry) return;
    const puzzleNumber = selectedEntry.puzzle_number;
    animateSheetOut(() => {
      fetchPuzzle(puzzleNumber);
      router.back();
    });
  }, [selectedEntry, animateSheetOut, fetchPuzzle, router]);

  const handleViewWords = useCallback(() => {
    if (!selectedEntry) return;
    const number = selectedEntry.puzzle_number;
    animateSheetOut(() => {
      router.push(`/puzzle-words?number=${number}`);
    });
  }, [selectedEntry, animateSheetOut, router]);

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
  const pageCount = Math.max(1, Math.ceil(pastEntries.length / PAGE_SIZE));
  pageCountRef.current = pageCount;
  const pageEntries = pastEntries.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView
        edges={['top']}
        style={[
          styles.flex,
          { backgroundColor: theme.bgPrimary, paddingBottom: tabBarHeight },
        ]}
      >
        {/* Today's card — always visible, never scrolls away */}
        {today && (
          <View style={styles.todaySection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Tämänpäiväinen kenno
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
                { color: theme.textSecondary, marginTop: 30 },
              ]}
            >
              Aikaisemmat kennot
            </Text>
          </View>
        )}

        {/* Past puzzles — paginated, swipe horizontally to change page */}
        <GestureDetector gesture={swipeGesture}>
          <ScrollView
            contentContainerStyle={styles.pageList}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {pageEntries.map((item) => {
              const isCurrent = item.puzzle_number === currentPuzzleNumber;
              const progress = savedProgress.get(item.puzzle_number);
              const isRevealed = revealedPuzzles.has(item.puzzle_number);
              return (
                <Pressable
                  key={item.puzzle_number}
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
                    {isRevealed && <Eye size={16} color={theme.accent} />}
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
                          style={[
                            styles.rankText,
                            { color: theme.textSecondary },
                          ]}
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
            })}
          </ScrollView>
        </GestureDetector>

        {pageCount > 1 && (
          <View style={styles.paginationBar}>
            <Pressable
              onPress={() => setPage(0)}
              disabled={page === 0}
              hitSlop={12}
            >
              <ChevronsLeft
                size={20}
                strokeWidth={2}
                color={page === 0 ? theme.border : theme.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              hitSlop={12}
            >
              <ChevronLeft
                size={20}
                strokeWidth={2}
                color={page === 0 ? theme.border : theme.textSecondary}
              />
            </Pressable>
            <Text
              style={[styles.pageIndicator, { color: theme.textSecondary }]}
            >
              {page + 1} / {pageCount}
            </Text>
            <Pressable
              onPress={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              hitSlop={12}
            >
              <ChevronRight
                size={20}
                strokeWidth={2}
                color={
                  page >= pageCount - 1 ? theme.border : theme.textSecondary
                }
              />
            </Pressable>
            <Pressable
              onPress={() => setPage(pageCount - 1)}
              disabled={page >= pageCount - 1}
              hitSlop={12}
            >
              <ChevronsRight
                size={20}
                strokeWidth={2}
                color={
                  page >= pageCount - 1 ? theme.border : theme.textSecondary
                }
              />
            </Pressable>
          </View>
        )}

        {/* Bottom sheet for past puzzle options */}
        <Modal
          visible={selectedEntry !== null}
          transparent
          animationType="none"
          onRequestClose={closeSheet}
        >
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropOpacity }]}
            />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: theme.bgPrimary,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {selectedEntry && (
              <>
                <Text
                  style={[styles.sheetTitle, { color: theme.textSecondary }]}
                >
                  Kenno #{selectedEntry.puzzle_number + 1} ·{' '}
                  {formatFinnishDate(selectedEntry.date)}
                </Text>
                {revealedPuzzles.has(selectedEntry.puzzle_number) && (
                  <View
                    style={[
                      styles.sheetNotice,
                      {
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sheetNoticeText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Vastaukset on jo paljastettu. Tästä kennosta ei enää kerry
                      tilastoja.
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={handlePlay}
                  style={[
                    styles.sheetButton,
                    { backgroundColor: theme.accent },
                  ]}
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
                    style={[
                      styles.sheetButtonText,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Näytä vastaukset
                  </Text>
                </Pressable>
                <Pressable onPress={closeSheet} style={styles.sheetCancel}>
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
          </Animated.View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  pageList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 48,
    textAlign: 'center',
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
  sheetNotice: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
  },
  sheetNoticeText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
