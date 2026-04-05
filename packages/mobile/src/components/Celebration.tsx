import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
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

  useEffect(() => {
    if (celebration) {
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });

      const delay = celebration === 'taysikenno' ? 8000 : 5000;
      const timer = setTimeout(() => {
        dismiss();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
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
  }));

  if (!celebration) return null;

  const title = celebration === 'taysikenno' ? 'Täysi kenno!' : 'Ällistyttävä!';
  const isGolden = celebration === 'taysikenno';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000' },
            backdropAnim,
          ]}
        />
      </Pressable>
      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isGolden ? '#fbbf24' : theme.accent,
            },
            cardAnim,
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.score}>{score} pistettä</Text>
          <Pressable onPress={onShare} style={styles.shareBtn}>
            <Text style={styles.shareText}>Jaa</Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  score: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  shareBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  shareText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
