import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import {
  useSettingsStore,
  type ThemePreference,
} from '../../src/store/useSettingsStore';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Vaalea' },
  { value: 'dark', label: 'Tumma' },
  { value: 'system', label: 'Järjestelmä' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
    >
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Teema
      </Text>
      <View
        style={[
          styles.segmented,
          { backgroundColor: theme.bgSecondary, borderColor: theme.border },
        ]}
      >
        {OPTIONS.map((opt) => {
          const isActive = themePreference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setThemePreference(opt.value)}
              style={[
                styles.segment,
                isActive && {
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: isActive ? '#ffffff' : theme.textSecondary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 15,
  },
});
