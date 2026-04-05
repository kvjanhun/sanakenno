import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface HoneycombProps {
  center: string;
  outerLetters: string[];
  onLetterPress: (letter: string) => void;
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
const CY = 150;
const HEX_R = 46;

const OUTER_FILL = '#555555';
const CENTER_FILL = '#D4A843';
const TEXT_COLOR = '#FFFFFF';
const CENTER_TEXT_COLOR = '#3A3A3A';

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
  onPress,
}: {
  hex: HexCell;
  onPress: (letter: string) => void;
}) {
  const scale = useSharedValue(1);

  const tap = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.88, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    })
    .onEnd(() => {
      onPress(hex.letter);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
          <Polygon
            points={hexPoints(46, 46, HEX_R)}
            fill={hex.isCenter ? CENTER_FILL : OUTER_FILL}
          />
          <SvgText
            x="46"
            y="46"
            textAnchor="middle"
            alignmentBaseline="central"
            fontSize="24"
            fontWeight="600"
            fill={hex.isCenter ? CENTER_TEXT_COLOR : TEXT_COLOR}
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
}: HoneycombProps) {
  const hexes = useMemo(
    () => computeHexes(center, outerLetters),
    [center, outerLetters],
  );

  return (
    <View style={styles.container}>
      {hexes.map((hex, i) => (
        <HexButton key={i} hex={hex} onPress={onLetterPress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 300,
    alignSelf: 'center',
  },
});
