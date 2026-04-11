import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { Info, ChevronDown } from 'lucide-react-native';
import { rankThresholds } from '@sanakenno/shared';
import type { Theme } from '../theme';

interface RankProgressProps {
  rankLabel: string;
  progress: number;
  score: number;
  maxScore: number;
  scoreBeforeHints: number | null;
  puzzleNumber: number;
  theme: Theme;
}

export function RankProgress({
  rankLabel,
  progress,
  score,
  maxScore,
  scoreBeforeHints,
  puzzleNumber,
  theme,
}: RankProgressProps) {
  const animatedProgress = useSharedValue(progress);
  const prevScoreRef = useRef(score);
  const [displayScore, setDisplayScore] = useState(score);
  const fromRef = useRef(score);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | undefined>(
    undefined,
  );
  const [rankOpen, setRankOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);

  const thresholds = rankThresholds(rankLabel, maxScore);

  useEffect(() => {
    const delta = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (delta > 10) {
      animatedProgress.value = withSpring(progress, {
        damping: 18,
        stiffness: 200,
      });
    } else {
      animatedProgress.value = withTiming(progress, { duration: 250 });
    }
  }, [progress, score, animatedProgress]);

  // Animate score counter from previous value to new value (cubic ease-out, 300ms)
  useEffect(() => {
    const from = fromRef.current;
    const to = score;
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    if (from === to) return;
    const duration = 300;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, animatedProgress.value))}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          {/* Score */}
          <Text style={[styles.scoreText, { color: theme.textPrimary }]}>
            {displayScore} p
          </Text>

          {/* Score info button */}
          <Pressable onPress={() => setScoreOpen(true)} hitSlop={8}>
            <Info size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Rank pill → opens rank overlay, centered */}
        <View style={styles.rowCenter} pointerEvents="box-none">
          <Pressable
            onPress={() => setRankOpen(true)}
            style={[styles.chip, { backgroundColor: theme.accent }]}
          >
            <View style={styles.chipContent}>
              <Text
                style={[styles.chipText, { color: '#fff', fontWeight: '600' }]}
                numberOfLines={1}
              >
                {rankLabel}
              </Text>
              <ChevronDown size={14} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* Puzzle number */}
        <Text
          style={[styles.puzzleNumber, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          Kenno #{puzzleNumber + 1}
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

      {/* Rank thresholds overlay */}
      <Modal
        visible={rankOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRankOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRankOpen(false)}>
          <Pressable
            style={[
              styles.overlayCard,
              { backgroundColor: theme.bgPrimary, borderColor: theme.border },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.overlayTitle, { color: theme.textSecondary }]}>
              Pisteet / taso
            </Text>
            <ScrollView
              style={styles.rankScroll}
              showsVerticalScrollIndicator={false}
            >
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
                      borderWidth: item.isCurrent
                        ? 2
                        : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.thresholdName,
                      {
                        color: item.isCurrent
                          ? theme.accent
                          : theme.textPrimary,
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
                        color: item.isCurrent
                          ? theme.accent
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {item.points} p
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* "Pisteet ilman apuja" overlay */}
      <Modal
        visible={scoreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScoreOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setScoreOpen(false)}>
          <Pressable
            style={[
              styles.overlayCard,
              styles.scoreCard,
              { backgroundColor: theme.bgPrimary, borderColor: theme.border },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.scoreCardValue, { color: theme.textPrimary }]}>
              {displayScore} / {maxScore} p
            </Text>
            <Text style={[styles.scoreCardSub, { color: theme.textSecondary }]}>
              Ilman vihjeitä: {scoreBeforeHints ?? score} p
            </Text>
            <View
              style={[
                styles.scoreCardDivider,
                { backgroundColor: theme.border },
              ]}
            />
            <Text style={[styles.overlayTitle, { color: theme.textSecondary }]}>
              Pisteytys
            </Text>
            <View style={styles.scoreCardList}>
              <Text
                style={[styles.scoreCardItem, { color: theme.textSecondary }]}
              >
                • 4-kirjaiminen sana: 1 piste
              </Text>
              <Text
                style={[styles.scoreCardItem, { color: theme.textSecondary }]}
              >
                • Pidempi sana: pisteitä sanan pituuden verran
              </Text>
              <Text
                style={[styles.scoreCardItem, { color: theme.textSecondary }]}
              >
                • Pangrammi: +7 lisäpistettä
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rowRight: {
    flex: 1,
  },
  scoreText: {
    fontSize: 26,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontSize: 13,
  },
  puzzleNumber: {
    position: 'absolute',
    right: 0,
    fontSize: 18,
    fontWeight: '500',
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  overlayTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rankScroll: {
    flexGrow: 0,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 6,
  },
  thresholdName: {
    fontSize: 16,
  },
  thresholdPoints: {
    fontSize: 15,
  },
  scoreCard: {
    maxWidth: 300,
    alignItems: 'flex-start',
  },
  scoreCardList: {
    gap: 2,
  },
  scoreCardItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  scoreCardCaption: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  scoreCardDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  scoreCardValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreCardSub: {
    fontSize: 18,
    marginTop: 4,
  },
});
