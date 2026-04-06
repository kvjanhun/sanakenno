import { View, Text, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/useSettingsStore';

function SettingRow({
  label,
  value,
  onValueChange,
  disabled,
  accentColor,
  labelColor,
  borderColor,
  isLast,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accentColor: string;
  labelColor: string;
  borderColor: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
      ]}
    >
      <Text style={[styles.rowLabel, { color: disabled ? borderColor : labelColor }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#767577', true: accentColor }}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
}

function SettingGroup({
  children,
  backgroundColor,
}: {
  children: React.ReactNode;
  backgroundColor: string;
}) {
  return (
    <View style={[styles.group, { backgroundColor }]}>{children}</View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);

  const followSystem = themePreference === 'system';
  const darkMode = themePreference === 'dark';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
    >
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Teema</Text>
      <SettingGroup backgroundColor={theme.bgSecondary}>
        <SettingRow
          label="Tumma tila"
          value={followSystem ? false : darkMode}
          onValueChange={(v) => setThemePreference(v ? 'dark' : 'light')}
          disabled={followSystem}
          accentColor={theme.accent}
          labelColor={theme.textPrimary}
          borderColor={theme.border}
        />
        <SettingRow
          label="Seuraa laitetta"
          value={followSystem}
          onValueChange={(v) => {
            if (v) {
              setThemePreference('system');
            } else {
              setThemePreference('light');
            }
          }}
          accentColor={theme.accent}
          labelColor={theme.textPrimary}
          borderColor={theme.border}
          isLast
        />
      </SettingGroup>

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Palaute</Text>
      <SettingGroup backgroundColor={theme.bgSecondary}>
        <SettingRow
          label="Värinät"
          value={hapticsEnabled}
          onValueChange={setHapticsEnabled}
          accentColor={theme.accent}
          labelColor={theme.textPrimary}
          borderColor={theme.border}
          isLast
        />
      </SettingGroup>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  group: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: 'transparent',
  },
  rowLabel: {
    fontSize: 16,
  },
});
