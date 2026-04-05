import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import type { Theme } from '../theme';
import type { MessageType } from '../store/useGameStore';

interface MessageBarProps {
  message: string;
  messageType: MessageType;
  theme: Theme;
}

const chipStyles: Record<
  MessageType,
  (theme: Theme) => { bg: string; color: string; isPill: boolean }
> = {
  ok: (theme) => ({
    bg: 'transparent',
    color: theme.textSecondary,
    isPill: false,
  }),
  error: (theme) => ({
    bg: theme.textPrimary,
    color: theme.bgPrimary,
    isPill: true,
  }),
  special: (theme) => ({
    bg: theme.accent,
    color: '#ffffff',
    isPill: true,
  }),
};

export function MessageBar({ message, messageType, theme }: MessageBarProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    if (message) {
      opacity.value = withTiming(1, { duration: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 100 });
      translateY.value = -8;
    }
  }, [message, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  const chip = chipStyles[messageType](theme);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        style={[
          styles.chip,
          chip.isPill && styles.pill,
          chip.isPill && { backgroundColor: chip.bg },
        ]}
      >
        <Text style={[styles.text, { color: chip.color }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 28,
  },
  chip: {},
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
