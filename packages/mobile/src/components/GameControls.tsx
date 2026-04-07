import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
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

/** Share / upload icon */
function ShareIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L12 15M12 3L8 7M12 3L16 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Shuffle / circular arrows icon */
function ShuffleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* Arrowhead at top-right */}
      <Path
        d="M16 3L21 3L21 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Long diagonal: bottom-left → top-right */}
      <Path
        d="M4 20L21 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Arrowhead at bottom-right */}
      <Path
        d="M21 16L21 21L16 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Short diagonal → bottom-right */}
      <Path
        d="M15 15L21 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Short diagonal from top-left */}
      <Path d="M4 4L9 9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
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
        <ShareIcon color={theme.textPrimary} />
      </ScaleButton>

      {/* Narrow: Shuffle icon */}
      <ScaleButton onPress={handleShuffle} flex={1} bgColor={theme.bgSecondary}>
        <ShuffleIcon color={theme.textPrimary} />
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
