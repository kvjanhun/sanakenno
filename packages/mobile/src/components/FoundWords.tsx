import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildKotusUrl } from '@sanakenno/shared';
import type { Theme } from '../theme';

// How far the sheet extends below the visible screen edge to prevent gaps
const OVERHANG = 40;

interface FoundWordsProps {
  foundWords: Set<string>;
  lastResubmittedWord: string | null;
  center: string;
  allLetters: Set<string>;
  theme: Theme;
}

export function FoundWords({
  foundWords,
  lastResubmittedWord,
  center,
  allLetters,
  theme,
}: FoundWordsProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = screenHeight * 0.5;

  const [modalVisible, setModalVisible] = useState(false);
  const closingRef = useRef(false);
  const animatedHeight = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const fullHeight = sheetHeight + OVERHANG;

  const sorted = useMemo(
    () =>
      [...foundWords].sort(
        (a, b) =>
          a.localeCompare(b, 'fi', { sensitivity: 'base' }) ||
          a.length - b.length,
      ),
    [foundWords],
  );
  // Most recent first (reverse insertion order)
  const recent = useMemo(() => [...foundWords].slice(-8).reverse(), [foundWords]);

  // Fit as many columns as the longest word allows (~8px per char at fontSize 13)
  const numCols = useMemo(() => {
    const maxLen = sorted.reduce((m, w) => Math.max(m, w.length), 4);
    const available = screenWidth - 32; // 16px padding each side
    const minColWidth = maxLen * 8 + 4; // +4 for paddingRight
    return Math.min(6, Math.max(2, Math.floor(available / minColWidth)));
  }, [sorted, screenWidth]);

  // Split sorted words into numCols columns (column-major: top→bottom per column)
  const columns = useMemo(() => {
    const numRows = Math.ceil(sorted.length / numCols);
    const cols: string[][] = Array.from({ length: numCols }, () => []);
    sorted.forEach((word, i) => {
      cols[Math.floor(i / numRows)].push(word);
    });
    return cols;
  }, [sorted, numCols]);
  const itemWidth = `${(100 / numCols).toFixed(2)}%` as `${number}%`;

  const openSheet = useCallback(() => {
    closingRef.current = false;
    setModalVisible(true);
    animatedHeight.value = withTiming(fullHeight, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(1, { duration: 160 });
  }, [animatedHeight, backdropOpacity, fullHeight]);

  const closeSheet = useCallback(() => {
    animatedHeight.value = withTiming(0, {
      duration: 160,
      easing: Easing.in(Easing.cubic),
    });
    backdropOpacity.value = withTiming(0, { duration: 140 }, () => {
      runOnJS(setModalVisible)(false);
    });
  }, [animatedHeight, backdropOpacity]);

  // Drag on the handle / header area
  const dragGesture = Gesture.Pan()
    .activeOffsetY([5, Infinity])
    .onUpdate((e) => {
      animatedHeight.value = Math.max(0, fullHeight - e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 60 || e.velocityY > 400) {
        runOnJS(closeSheet)();
      } else {
        animatedHeight.value = withTiming(fullHeight, {
          duration: 160,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  // Close as soon as the bounce pulls content 40px below the top — fires during
  // the pull, so the sheet closes before the bounce springs back.
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!closingRef.current && e.nativeEvent.contentOffset.y < -40) {
        closingRef.current = true;
        closeSheet();
      }
    },
    [closeSheet],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (foundWords.size === 0) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={openSheet} style={styles.headerRow}>
        <Text style={[styles.headerText, { color: theme.textSecondary }]}>
          Löydetyt sanat ({foundWords.size})
        </Text>
        <Text style={[styles.chevron, { color: theme.textTertiary }]}>▲</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {recent.map((word) => {
          const isFlash = word === lastResubmittedWord;
          return (
            <Pressable
              key={word}
              onPress={() => Linking.openURL(buildKotusUrl(word))}
              style={[
                styles.pill,
                {
                  backgroundColor: isFlash ? theme.accent : theme.bgSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isFlash ? theme.onAccent : theme.textPrimary },
                ]}
              >
                {word}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        {/* Animated dim layer — pointer-events off so touches fall through to sheet or backdrop Pressable */}
        <Animated.View
          style={[styles.dimLayer, backdropStyle]}
          pointerEvents="none"
        />

        {/* Backdrop Pressable — only covers the area above the sheet */}
        <Pressable
          style={{ height: screenHeight - sheetHeight }}
          onPress={closeSheet}
        />

        {/* Sheet — grows upward from screen bottom, bottom anchored below visible edge */}
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.bgPrimary },
            sheetStyle,
          ]}
        >
          {/* Handle + header: drag gesture lives here */}
          <GestureDetector gesture={dragGesture}>
            <View>
              <View style={styles.dragZone}>
                <View
                  style={[
                    styles.sheetHandle,
                    { backgroundColor: theme.border },
                  ]}
                />
              </View>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                  Löydetyt sanat ({foundWords.size})
                </Text>
                <Pressable
                  onPress={closeSheet}
                  style={[
                    styles.doneBtn,
                    { backgroundColor: theme.bgSecondary },
                  ]}
                >
                  <Text style={[styles.doneBtnText, { color: theme.accent }]}>
                    Valmis
                  </Text>
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          {/* Word list: pull-down-to-close when already at top */}
          <ScrollView
            contentContainerStyle={[
              styles.wordsContent,
              { paddingBottom: insets.bottom + OVERHANG },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View style={styles.wordsGrid}>
              {columns.map((col, ci) => (
                <View key={ci} style={[styles.wordsCol, { width: itemWidth }]}>
                  {col.map((word) => {
                    const isFlash = word === lastResubmittedWord;
                    const isCenter = word.includes(center);
                    const isPangram = [...allLetters].every((c) =>
                      word.includes(c),
                    );
                    return (
                      <Pressable
                        key={word}
                        onPress={() => Linking.openURL(buildKotusUrl(word))}
                      >
                        <Text
                          style={[
                            styles.wordText,
                            {
                              color:
                                isFlash || isCenter
                                  ? theme.accent
                                  : theme.textPrimary,
                              fontWeight: isPangram ? '700' : '400',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {word}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 11,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: -OVERHANG,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  dragZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    // Generous hit area for the drag gesture
    paddingHorizontal: 80,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  wordsContent: {
    paddingHorizontal: 16,
  },
  wordsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wordsCol: {
    // width set inline via itemWidth
  },
  wordItem: {
    paddingRight: 4,
  },
  wordText: {
    fontSize: 13,
    lineHeight: 22,
  },
});
