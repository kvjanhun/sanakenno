import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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

function SimpleButton({
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
    <Pressable
      style={{ flex }}
      onPressIn={() => {
        scale.value = withTiming(0.94, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
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
      <SimpleButton onPress={handleDelete} flex={2} bgColor={theme.bgSecondary}>
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Poista
        </Text>
      </SimpleButton>

      {/* Narrow: Share icon */}
      <SimpleButton onPress={handleShare} flex={1} bgColor={theme.bgSecondary}>
        <Ionicons name="share-outline" size={22} color={theme.textPrimary} />
      </SimpleButton>

      {/* Narrow: Shuffle icon */}
      <SimpleButton
        onPress={handleShuffle}
        flex={1}
        bgColor={theme.bgSecondary}
      >
        <Ionicons name="shuffle" size={22} color={theme.textPrimary} />
      </SimpleButton>

      {/* Wide: OK */}
      <SimpleButton onPress={handleSubmit} flex={2} bgColor={theme.accent}>
        <Text
          style={[
            styles.buttonText,
            { color: theme.onAccent, fontWeight: '600' },
          ]}
        >
          OK
        </Text>
      </SimpleButton>
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
