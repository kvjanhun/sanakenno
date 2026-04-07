import { View, Text, Switch, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import type { HapticsIntensity } from '../../src/store/useSettingsStore';

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
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.rowLabel,
          { color: disabled ? borderColor : labelColor },
        ]}
      >
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

const HAPTICS_OPTIONS: Array<{ value: HapticsIntensity; label: string }> = [
  { value: 'off', label: 'Ei' },
  { value: 'light', label: 'Kevyt' },
  { value: 'medium', label: 'Normaali' },
  { value: 'heavy', label: 'Voimakas' },
];

function HapticsSegmentedControl({
  value,
  onChange,
  accentColor,
  labelColor,
  bgColor,
  borderColor,
}: {
  value: HapticsIntensity;
  onChange: (v: HapticsIntensity) => void;
  accentColor: string;
  labelColor: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.row, styles.rowColumn]}>
      <Text style={[styles.rowLabel, { color: labelColor }]}>Värinät</Text>
      <View style={[styles.segmented, { borderColor }]}>
        {HAPTICS_OPTIONS.map((opt, i) => {
          const isSelected = value === opt.value;
          const isFirst = i === 0;
          const isLast = i === HAPTICS_OPTIONS.length - 1;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.segment,
                {
                  backgroundColor: isSelected ? accentColor : bgColor,
                  borderLeftWidth: isFirst ? 0 : StyleSheet.hairlineWidth,
                  borderLeftColor: borderColor,
                  borderTopLeftRadius: isFirst ? 8 : 0,
                  borderBottomLeftRadius: isFirst ? 8 : 0,
                  borderTopRightRadius: isLast ? 8 : 0,
                  borderBottomRightRadius: isLast ? 8 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isSelected ? '#fff' : labelColor },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  return <View style={[styles.group, { backgroundColor }]}>{children}</View>;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const hapticsIntensity = useSettingsStore((s) => s.hapticsIntensity);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const setHapticsIntensity = useSettingsStore((s) => s.setHapticsIntensity);

  const followSystem = themePreference === 'system';
  const darkMode = themePreference === 'dark';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
    >
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Teema
      </Text>
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
          label="Laitteen asetus"
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

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Palaute
      </Text>
      <SettingGroup backgroundColor={theme.bgSecondary}>
        <HapticsSegmentedControl
          value={hapticsIntensity}
          onChange={setHapticsIntensity}
          accentColor={theme.accent}
          labelColor={theme.textPrimary}
          bgColor={theme.bgSecondary}
          borderColor={theme.border}
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
  rowColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
