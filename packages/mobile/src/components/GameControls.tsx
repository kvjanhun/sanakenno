import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as PreparedHaptics from 'prepared-haptics';
import type { Theme } from '../theme';

interface GameControlsProps {
  onDelete: () => void;
  onShuffle: () => void;
  onSubmit: () => void;
  theme: Theme;
}

function ScaleButton({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: object[];
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[...style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function GameControls({
  onDelete,
  onShuffle,
  onSubmit,
  theme,
}: GameControlsProps) {
  const handleDelete = () => {
    PreparedHaptics.trigger();
    onDelete();
  };

  const handleShuffle = () => {
    PreparedHaptics.triggerImpact('medium');
    onShuffle();
  };

  const handleSubmit = () => {
    PreparedHaptics.triggerImpact('medium');
    onSubmit();
  };

  return (
    <View style={styles.controls}>
      <ScaleButton
        onPress={handleDelete}
        style={[styles.button, { backgroundColor: theme.bgSecondary }]}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Poista
        </Text>
      </ScaleButton>
      <ScaleButton
        onPress={handleShuffle}
        style={[styles.button, { backgroundColor: theme.bgSecondary }]}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Sekoita
        </Text>
      </ScaleButton>
      <ScaleButton
        onPress={handleSubmit}
        style={[styles.button, { backgroundColor: theme.accent }]}
      >
        <Text
          style={[
            styles.buttonText,
            { color: theme.onAccent, fontWeight: '600' },
          ]}
        >
          OK
        </Text>
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  button: {
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
  },
});
