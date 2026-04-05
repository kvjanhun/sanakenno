import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import type { Theme } from '../theme';

interface RankProgressProps {
  rankLabel: string;
  progress: number;
  score: number;
  maxScore: number;
  foundCount: number;
  theme: Theme;
}

export function RankProgress({
  rankLabel,
  progress,
  score,
  maxScore,
  foundCount,
  theme,
}: RankProgressProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 18,
      stiffness: 200,
    });
  }, [progress, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.rankPill, { backgroundColor: theme.accent }]}>
          <Text style={styles.rankText}>{rankLabel}</Text>
        </View>
        <Text style={[styles.score, { color: theme.textPrimary }]}>
          {score} pistettä
        </Text>
      </View>
      <View
        style={[styles.progressTrack, { backgroundColor: theme.bgSecondary }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: theme.accent },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rankPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  score: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
