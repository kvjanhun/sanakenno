import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as PreparedHaptics from 'prepared-haptics';
import type { Theme } from '../theme';

interface GameControlsProps {
  onDelete: () => void;
  onShuffle: () => void;
  onSubmit: () => void;
  onShare: () => void;
  theme: Theme;
}

function ScaleButton({
  onPress,
  flex,
  bgColor,
  children,
}: {
  onPress: () => void;
  flex: number;
  bgColor: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    // flex must be on Pressable (the direct child of the row container)
    <Pressable
      style={{ flex }}
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.buttonInner,
          { backgroundColor: bgColor },
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function GameControls({
  onDelete,
  onShuffle,
  onSubmit,
  onShare,
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

  const handleShare = () => {
    PreparedHaptics.triggerImpact('medium');
    onShare();
  };

  return (
    <View style={styles.controls}>
      {/* Wide: Poista */}
      <ScaleButton onPress={handleDelete} flex={2} bgColor={theme.bgSecondary}>
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Poista
        </Text>
      </ScaleButton>

      {/* Narrow: Share icon */}
      <ScaleButton onPress={handleShare} flex={1} bgColor={theme.bgSecondary}>
        <Ionicons name="share-outline" size={22} color={theme.textPrimary} />
      </ScaleButton>

      {/* Narrow: Shuffle icon */}
      <ScaleButton onPress={handleShuffle} flex={1} bgColor={theme.bgSecondary}>
        <Ionicons name="shuffle" size={22} color={theme.textPrimary} />
      </ScaleButton>

      {/* Wide: OK */}
      <ScaleButton onPress={handleSubmit} flex={2} bgColor={theme.accent}>
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
    gap: 10,
    paddingVertical: 10,
  },
  // Applied to the Animated.View inside each Pressable.
  // No flex: 1 here — flex on a child of an unconstrained parent collapses
  // that parent to 0, making the controls row too short and overlapping FoundWords.
  buttonInner: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
  },
});
