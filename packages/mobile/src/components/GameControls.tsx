import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Theme } from '../theme';

interface GameControlsProps {
  onDelete: () => void;
  onShuffle: () => void;
  onSubmit: () => void;
  theme: Theme;
}

export function GameControls({
  onDelete,
  onShuffle,
  onSubmit,
  theme,
}: GameControlsProps) {
  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete();
  };

  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShuffle();
  };

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit();
  };

  return (
    <View style={styles.controls}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.bgSecondary },
          pressed && styles.pressed,
        ]}
        onPress={handleDelete}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Poista
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.bgSecondary },
          pressed && styles.pressed,
        ]}
        onPress={handleShuffle}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Sekoita
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}
        onPress={handleSubmit}
      >
        <Text style={[styles.buttonText, styles.submitText]}>OK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
