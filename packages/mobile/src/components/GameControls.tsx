import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getHoneycombCenterOverlayStops } from '@sanakenno/shared';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Share, Shuffle } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as PreparedHaptics from 'prepared-haptics';
import type { Theme } from '../theme';

interface GameControlsProps {
  onDelete: () => void;
  onShuffle: () => void;
  onSubmit: () => void;
  onShare: () => void;
  theme: Theme;
}

type ControlVariant = 'neutral' | 'accent';

function ButtonSurface({
  variant,
  theme,
  surfaceId,
}: {
  variant: ControlVariant;
  theme: Theme;
  surfaceId: string;
}) {
  const backgroundId = `control-bg-${surfaceId}`;
  const glossId = `control-gloss-${surfaceId}`;
  const accentGlossStops = getHoneycombCenterOverlayStops(
    theme.centerHexOverlayVariant,
  );
  const borderColor =
    variant === 'accent' ? theme.accentFaded : theme.hexStroke;
  const glossStops =
    variant === 'accent'
      ? accentGlossStops.map((stop) => (
          <Stop
            key={`${surfaceId}-${stop.offset}`}
            offset={stop.offset}
            stopColor={stop.color}
            stopOpacity={stop.opacity * 0.7}
          />
        ))
      : [
          <Stop
            key={`${surfaceId}-gloss-top`}
            offset="0%"
            stopColor="#ffffff"
            stopOpacity={0.12}
          />,
          <Stop
            key={`${surfaceId}-gloss-mid`}
            offset="40%"
            stopColor="#ffffff"
            stopOpacity={0.03}
          />,
          <Stop
            key={`${surfaceId}-gloss-fade`}
            offset="70%"
            stopColor="#ffffff"
            stopOpacity={0}
          />,
        ];

  return (
    <View style={[styles.buttonSurface, { borderColor }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 48"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <LinearGradient id={backgroundId} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={variant === 'accent' ? theme.accent : theme.hexHi}
            />
            <Stop
              offset="100%"
              stopColor={variant === 'accent' ? theme.accent : theme.hexLo}
            />
          </LinearGradient>
          <LinearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
            {glossStops}
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100"
          height="48"
          rx="12"
          fill={`url(#${backgroundId})`}
        />
        <Rect
          x="0"
          y="0"
          width="100"
          height="48"
          rx="12"
          fill={`url(#${glossId})`}
        />
      </Svg>
    </View>
  );
}

function SimpleButton({
  onPress,
  onPressIn,
  flex,
  variant,
  surfaceId,
  theme,
  children,
}: {
  onPress: () => void;
  onPressIn?: () => void;
  flex: number;
  variant: ControlVariant;
  surfaceId: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - scale.value) * 20 }, { scale: scale.value }],
  }));

  return (
    <Pressable
      style={{ flex }}
      onPressIn={() => {
        onPressIn?.();
        scale.value = withTiming(0.97, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.buttonOuter,
          { shadowColor: theme.buttonShadow },
          animatedStyle,
        ]}
      >
        <ButtonSurface variant={variant} theme={theme} surfaceId={surfaceId} />
        <View style={styles.buttonContent}>{children}</View>
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
    onDelete();
  };

  const handleShuffle = () => {
    onShuffle();
  };

  const handleSubmit = () => {
    onSubmit();
  };

  const handleShare = () => {
    onShare();
  };

  return (
    <View style={styles.controls}>
      {/* Wide: Poista */}
      <SimpleButton
        onPress={handleDelete}
        onPressIn={PreparedHaptics.trigger}
        flex={2}
        variant="neutral"
        surfaceId="delete"
        theme={theme}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Poista
        </Text>
      </SimpleButton>

      {/* Narrow: Share icon */}
      <SimpleButton
        onPress={handleShare}
        onPressIn={() => PreparedHaptics.triggerImpact('medium')}
        flex={1}
        variant="neutral"
        surfaceId="share"
        theme={theme}
      >
        <Share size={22} strokeWidth={1.5} color={theme.textPrimary} />
      </SimpleButton>

      {/* Narrow: Shuffle icon */}
      <SimpleButton
        onPress={handleShuffle}
        onPressIn={() => PreparedHaptics.triggerImpact('medium')}
        flex={1}
        variant="neutral"
        surfaceId="shuffle"
        theme={theme}
      >
        <Shuffle size={22} strokeWidth={1.5} color={theme.textPrimary} />
      </SimpleButton>

      {/* Wide: OK */}
      <SimpleButton
        onPress={handleSubmit}
        onPressIn={() => PreparedHaptics.triggerImpact('medium')}
        flex={2}
        variant="accent"
        surfaceId="submit"
        theme={theme}
      >
        <Text style={[styles.buttonText, { color: theme.onAccent }]}>OK</Text>
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
  // No flex: 1 here — flex on a child of an unconstrained parent collapses
  // that parent to 0, making the controls row too short and overlapping FoundWords.
  buttonOuter: {
    height: 48,
    borderRadius: 12,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
