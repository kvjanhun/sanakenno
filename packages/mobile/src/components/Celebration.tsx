import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { Theme } from '../theme';
import type { CelebrationType } from '../store/useGameStore';

interface Props {
  celebration: CelebrationType;
  score: number;
  onDismiss: () => void;
  onShare: () => void;
  theme: Theme;
}

export function Celebration({
  celebration,
  score,
  onDismiss,
  onShare,
  theme,
}: Props) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const glowRadius = useSharedValue(8);

  useEffect(() => {
    if (celebration) {
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });

      // Looping glow: subtle for ällistyttävä, intense for täysi kenno
      const maxRadius = celebration === 'taysikenno' ? 30 : 16;
      glowRadius.value = withRepeat(
        withSequence(
          withTiming(maxRadius, {
            duration: 900,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      const delay = celebration === 'taysikenno' ? 8000 : 5000;
      const timer = setTimeout(() => {
        dismiss();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      glowRadius.value = 8;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values & dismiss are stable
  }, [celebration]);

  function dismiss() {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  }

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
  }));

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    shadowRadius: glowRadius.value,
    shadowOpacity: 0.8,
  }));

  if (!celebration) return null;

  const title = celebration === 'taysikenno' ? 'Täysi kenno!' : 'Ällistyttävä!';
  const isGolden = celebration === 'taysikenno';
  const cardColor = isGolden ? theme.golden : theme.accent;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.backdrop },
            backdropAnim,
          ]}
        />
      </Pressable>
      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardColor,
              shadowColor: isGolden ? theme.goldenShadow : theme.accent,
            },
            cardAnim,
          ]}
        >
          <Text style={[styles.title, { color: theme.onAccent }]}>{title}</Text>
          <Text style={[styles.score, { color: theme.onAccent }]}>
            {score} pistettä
          </Text>
          <Pressable onPress={onShare} style={styles.shareBtn}>
            <Text style={[styles.shareText, { color: theme.onAccent }]}>
              Jaa
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    minWidth: 240,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  score: {
    fontSize: 18,
    opacity: 0.9,
  },
  shareBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  shareText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
