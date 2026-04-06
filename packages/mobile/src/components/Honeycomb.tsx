import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as PreparedHaptics from 'prepared-haptics';
import type { Theme } from '../theme';

interface HoneycombProps {
  center: string;
  outerLetters: string[];
  onLetterPress: (letter: string) => void;
  theme: Theme;
}

interface HexCell {
  x: number;
  y: number;
  letter: string;
  isCenter: boolean;
}

const R = 50;
const DX = R * Math.sqrt(3);
const DY = R * 1.5;
const CX = 150;
const CY = 125; // shifted up from 150: top margin = CY-DY-HEX_R = 4px instead of 29px
const HEX_R = 46;

/** Generate SVG points string for a pointy-top hexagon. */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(
      `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return pts.join(' ');
}

/** Compute the 7 hex positions in a flower layout. */
function computeHexes(center: string, outerLetters: string[]): HexCell[] {
  const ol = outerLetters;
  return [
    { x: CX - DX / 2, y: CY - DY, letter: ol[0] ?? '', isCenter: false },
    { x: CX + DX / 2, y: CY - DY, letter: ol[1] ?? '', isCenter: false },
    { x: CX - DX, y: CY, letter: ol[2] ?? '', isCenter: false },
    { x: CX, y: CY, letter: center, isCenter: true },
    { x: CX + DX, y: CY, letter: ol[3] ?? '', isCenter: false },
    { x: CX - DX / 2, y: CY + DY, letter: ol[4] ?? '', isCenter: false },
    { x: CX + DX / 2, y: CY + DY, letter: ol[5] ?? '', isCenter: false },
  ];
}

/** Individual hex cell with press animation via Reanimated. */
function HexButton({
  hex,
  index,
  onPress,
  fillHi,
  fillLo,
  strokeColor,
  textColor,
}: {
  hex: HexCell;
  index: number;
  onPress: (letter: string) => void;
  fillHi: string;
  fillLo: string;
  strokeColor: string;
  textColor: string;
}) {
  const scale = useSharedValue(1);
  const gradId = `hex-grad-${index}`;

  const handlePress = useCallback(() => {
    onPress(hex.letter);
    PreparedHaptics.trigger();
  }, [onPress, hex.letter]);

  const tap = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
      runOnJS(handlePress)();
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isSolid = fillHi === fillLo;
  const fill = isSolid ? fillHi : `url(#${gradId})`;

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: hex.x - HEX_R,
            top: hex.y - HEX_R,
            width: HEX_R * 2,
            height: HEX_R * 2,
          },
          animatedStyle,
        ]}
      >
        <Svg width={HEX_R * 2} height={HEX_R * 2} viewBox="0 0 92 92">
          {!isSolid && (
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={fillHi} />
                <Stop offset="100%" stopColor={fillLo} />
              </LinearGradient>
            </Defs>
          )}
          <Polygon
            points={hexPoints(46, 46, HEX_R)}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
          <SvgText
            x="46"
            y="46"
            textAnchor="middle"
            alignmentBaseline="central"
            fontSize="24"
            fontWeight="600"
            fill={textColor}
          >
            {hex.letter.toUpperCase()}
          </SvgText>
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

export function Honeycomb({
  center,
  outerLetters,
  onLetterPress,
  theme,
}: HoneycombProps) {
  const hexes = useMemo(
    () => computeHexes(center, outerLetters),
    [center, outerLetters],
  );

  return (
    <View style={styles.container}>
      {hexes.map((hex, i) => (
        <HexButton
          key={i}
          hex={hex}
          index={i}
          onPress={onLetterPress}
          fillHi={hex.isCenter ? theme.accent : theme.hexHi}
          fillLo={hex.isCenter ? theme.accent : theme.hexLo}
          strokeColor={hex.isCenter ? theme.accent : theme.hexStroke}
          textColor={hex.isCenter ? theme.hexCenterText : theme.textPrimary}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 250, // CY+DY+HEX_R+4 = 125+75+46+4; was 300
    alignSelf: 'center',
  },
});
