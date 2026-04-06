import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { toColumns, buildKotusUrl } from '@sanakenno/shared';
import type { Theme } from '../theme';

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
  const [expanded, setExpanded] = useState(false);
  const panelHeight = useSharedValue(0);

  const sorted = useMemo(
    () => [...foundWords].sort((a, b) => a.localeCompare(b, 'fi')),
    [foundWords],
  );
  const columns = useMemo(() => toColumns(sorted, 10), [sorted]);
  const recent = useMemo(() => [...foundWords].slice(-8), [foundWords]);

  // Animate panel height
  useEffect(() => {
    // ~22px per word row, columns side by side, plus padding
    const maxRows = Math.max(...columns.map((c) => c.length), 0);
    const target = expanded ? maxRows * 30 + 24 : 0;
    panelHeight.value = withTiming(target, { duration: 250 });
  }, [expanded, columns, panelHeight]);

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: panelHeight.value > 0 ? 1 : 0,
  }));

  if (foundWords.size === 0) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <Text style={[styles.header, { color: theme.textSecondary }]}>
          Löydetyt sanat ({foundWords.size}) {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Collapsed: recent pills */}
      {!expanded && (
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
      )}

      {/* Expanded: all words in columns with Kotus links */}
      <Animated.View style={[styles.expandedPanel, panelStyle]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.columnsRow}
        >
          {columns.map((col, ci) => (
            <View key={ci} style={styles.column}>
              {col.map((word) => {
                const isFlash = word === lastResubmittedWord;
                return (
                  <Pressable
                    key={word}
                    onPress={() => Linking.openURL(buildKotusUrl(word))}
                  >
                    <Text
                      style={[
                        styles.wordText,
                        {
                          color: isFlash
                            ? theme.accent
                            : isCenterWord(word, center)
                              ? theme.accent
                              : theme.textPrimary,
                          fontWeight: isPangram(word, allLetters)
                            ? '700'
                            : '400',
                        },
                      ]}
                    >
                      {word}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function isCenterWord(word: string, center: string): boolean {
  return word.includes(center);
}

function isPangram(word: string, allLetters: Set<string>): boolean {
  return [...allLetters].every((c) => word.includes(c));
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  header: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
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
  expandedPanel: {
    overflow: 'hidden',
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 8,
  },
  column: {
    gap: 2,
  },
  wordText: {
    fontSize: 14,
    lineHeight: 28,
  },
});
