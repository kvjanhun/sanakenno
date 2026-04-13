import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useEffect, useRef, useMemo } from 'react';
import { colorizeWord } from '@sanakenno/shared';
import type { ColorizedChar } from '@sanakenno/shared';
import type { Theme } from '../theme';

interface WordInputProps {
  currentWord: string;
  wordRejected: boolean;
  center: string;
  allLetters: Set<string>;
  allFound: boolean;
  theme: Theme;
}

function BlinkingCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 400 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.cursor, { color }]}>|</Text>
    </Animated.View>
  );
}

export function WordInput({
  currentWord,
  wordRejected,
  center,
  allLetters,
  allFound,
  theme,
}: WordInputProps) {
  const shakeX = useSharedValue(0);
  const prevRejected = useRef(false);

  useEffect(() => {
    if (wordRejected && !prevRejected.current) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
    prevRejected.current = wordRejected;
  }, [wordRejected, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const colorMap: Record<ColorizedChar['color'], string> = {
    accent: theme.accent,
    primary: theme.textPrimary,
    tertiary: theme.textTertiary,
  };

  const chars = useMemo(
    () => (currentWord ? colorizeWord(currentWord, center, allLetters) : null),
    [currentWord, center, allLetters],
  );

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {chars ? (
        <View style={styles.charRow}>
          {chars.map((c, i) => (
            <Text key={i} style={[styles.char, { color: colorMap[c.color] }]}>
              {c.char.toUpperCase()}
            </Text>
          ))}
        </View>
      ) : !allFound ? (
        <BlinkingCursor color={theme.textTertiary} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 2,
    minHeight: 40,
  },
  charRow: {
    flexDirection: 'row',
  },
  char: {
    fontSize: 26,
    fontWeight: '600',
    marginHorizontal: 1,
  },
  cursor: {
    fontSize: 26,
    fontWeight: '300',
  },
});
