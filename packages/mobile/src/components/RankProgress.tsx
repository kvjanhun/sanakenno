import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { rankThresholds } from '@sanakenno/shared';
import type { Theme } from '../theme';

interface RankProgressProps {
  rankLabel: string;
  progress: number;
  score: number;
  maxScore: number;
  scoreBeforeHints: number | null;
  hintsUsed: boolean;
  theme: Theme;
}

export function RankProgress({
  rankLabel,
  progress,
  score,
  maxScore,
  scoreBeforeHints,
  hintsUsed,
  theme,
}: RankProgressProps) {
  const animatedProgress = useSharedValue(0);
  const [expanded, setExpanded] = useState(false);
  const panelHeight = useSharedValue(0);

  const thresholds = rankThresholds(rankLabel, maxScore);

  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 18,
      stiffness: 200,
    });
  }, [progress, animatedProgress]);

  useEffect(() => {
    // Each row ~44px + 8px gap, padding 12 top/bottom, footer ~40px
    const rows = thresholds.length;
    const footerH = hintsUsed ? 40 : 0;
    const target = expanded ? rows * 52 + 24 + footerH : 0;
    panelHeight.value = withTiming(target, { duration: 250 });
  }, [expanded, thresholds.length, hintsUsed, panelHeight]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: panelHeight.value > 0 ? 1 : 0,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={[styles.rankPill, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.rankText}>
            {rankLabel} {expanded ? '▲' : '▼'}
          </Text>
        </Pressable>
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

      <Animated.View style={[styles.panel, panelStyle]}>
        {thresholds.map((item) => (
          <View
            key={item.name}
            style={[
              styles.thresholdRow,
              {
                backgroundColor: item.isCurrent
                  ? theme.accent + '18'
                  : 'transparent',
                borderColor: item.isCurrent ? theme.accent : theme.border,
                borderWidth: item.isCurrent ? 2 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.thresholdName,
                {
                  color: item.isCurrent ? theme.accent : theme.textPrimary,
                  fontWeight: item.isCurrent ? '700' : '400',
                },
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.thresholdPoints,
                {
                  color: item.isCurrent ? theme.accent : theme.textSecondary,
                },
              ]}
            >
              {item.points} p
            </Text>
          </View>
        ))}
        {hintsUsed && scoreBeforeHints !== null && (
          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            Ilman apuja: {scoreBeforeHints} pistettä
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
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
    paddingVertical: 6,
    borderRadius: 999,
    minHeight: 32,
    justifyContent: 'center',
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
  panel: {
    overflow: 'hidden',
    gap: 8,
    paddingTop: 12,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thresholdName: {
    fontSize: 16,
  },
  thresholdPoints: {
    fontSize: 15,
  },
  footer: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
