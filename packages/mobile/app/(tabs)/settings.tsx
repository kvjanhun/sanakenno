import {
  View,
  Text,
  Switch,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import * as PreparedHaptics from 'prepared-haptics';
import {
  useTheme,
  useResolvedScheme,
  getPaletteAccent,
  getPaletteOnAccent,
  PALETTE_ORDER,
  type ThemeId,
} from '../../src/theme';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { AuthSection } from '../../src/components/AuthSection';
import type { HapticsIntensity } from '../../src/store/useSettingsStore';

const APP_VERSION = Constants.expoConfig?.version ?? '?';

function SettingRow({
  label,
  value,
  onValueChange,
  disabled,
  activeTrackColor,
  labelColor,
  borderColor,
  isLast,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  activeTrackColor: string;
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
        trackColor={{ false: borderColor, true: activeTrackColor }}
        ios_backgroundColor={borderColor}
      />
    </View>
  );
}

const HAPTICS_OPTIONS: Array<{ value: HapticsIntensity; label: string }> = [
  { value: 'off', label: 'Pois' },
  { value: 'light', label: 'Kevyt' },
  { value: 'medium', label: 'Normaali' },
  { value: 'heavy', label: 'Voimakas' },
];

function HapticsSegmentedControl({
  value,
  onChange,
  accentColor,
  labelColor,
  selectedLabelColor,
  bgColor,
  borderColor,
}: {
  value: HapticsIntensity;
  onChange: (v: HapticsIntensity) => void;
  accentColor: string;
  labelColor: string;
  selectedLabelColor: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.row, styles.rowColumn]}>
      <Text style={[styles.rowLabel, { color: labelColor }]}>Voimakkuus</Text>
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
                  {
                    color: isSelected ? selectedLabelColor : labelColor,
                  },
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

function PalettePicker({
  value,
  onChange,
  scheme,
  labelColor,
  borderColor,
}: {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
  scheme: 'light' | 'dark';
  labelColor: string;
  borderColor: string;
}) {
  return (
    <View style={styles.paletteRow}>
      {PALETTE_ORDER.map((palette) => {
        const isSelected = palette.id === value;
        const accent = getPaletteAccent(palette.id, scheme);
        const onAccent = getPaletteOnAccent(palette.id, scheme);
        return (
          <Pressable
            key={palette.id}
            onPress={() => onChange(palette.id)}
            accessibilityRole="button"
            accessibilityLabel={palette.label}
            accessibilityState={{ selected: isSelected }}
            style={styles.paletteItem}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: accent,
                  borderColor: isSelected ? labelColor : borderColor,
                  borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              {isSelected ? (
                <Check size={18} strokeWidth={3} color={onAccent} />
              ) : null}
            </View>
            <Text
              style={[
                styles.paletteLabel,
                {
                  color: labelColor,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {palette.label}
            </Text>
          </Pressable>
        );
      })}
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
  const scheme = useResolvedScheme();
  const router = useRouter();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const themeId = useSettingsStore((s) => s.themeId);
  const hapticsIntensity = useSettingsStore((s) => s.hapticsIntensity);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const setThemeId = useSettingsStore((s) => s.setThemeId);
  const setHapticsIntensity = useSettingsStore((s) => s.setHapticsIntensity);

  const tabBarHeight = useBottomTabBarHeight();
  const followSystem = themePreference === 'system';
  const darkMode = themePreference === 'dark';

  const handleHapticsChange = (value: HapticsIntensity) => {
    setHapticsIntensity(value);
    if (value !== 'off') {
      PreparedHaptics.trigger();
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Väriteema
        </Text>
        <SettingGroup backgroundColor={theme.bgSecondary}>
          <View style={styles.paletteContainer}>
            <PalettePicker
              value={themeId}
              onChange={(id) => {
                setThemeId(id);
                if (hapticsIntensity !== 'off') {
                  PreparedHaptics.trigger();
                }
              }}
              scheme={scheme}
              labelColor={theme.textPrimary}
              borderColor={theme.border}
            />
          </View>
        </SettingGroup>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Teema
        </Text>
        <SettingGroup backgroundColor={theme.bgSecondary}>
          <SettingRow
            label="Tumma teema"
            value={followSystem ? false : darkMode}
            onValueChange={(v) => setThemePreference(v ? 'dark' : 'light')}
            disabled={followSystem}
            activeTrackColor={theme.switchTrackActive}
            labelColor={theme.textPrimary}
            borderColor={theme.border}
          />
          <SettingRow
            label="Seuraa laitteen asetusta"
            value={followSystem}
            onValueChange={(v) => {
              if (v) {
                setThemePreference('system');
              } else {
                setThemePreference('light');
              }
            }}
            activeTrackColor={theme.switchTrackActive}
            labelColor={theme.textPrimary}
            borderColor={theme.border}
            isLast
          />
        </SettingGroup>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Värinäpalaute
        </Text>
        <SettingGroup backgroundColor={theme.bgSecondary}>
          <HapticsSegmentedControl
            value={hapticsIntensity}
            onChange={handleHapticsChange}
            accentColor={theme.accent}
            labelColor={theme.textPrimary}
            selectedLabelColor={theme.onAccent}
            bgColor={theme.bgSecondary}
            borderColor={theme.border}
          />
        </SettingGroup>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Tili
        </Text>
        <AuthSection theme={theme} />

        <Pressable
          style={[styles.licensesLink]}
          onPress={() => router.push('/licenses')}
        >
          <Text style={[styles.licensesText, { color: theme.textSecondary }]}>
            Lisenssit
          </Text>
          <ChevronRight size={16} strokeWidth={2} color={theme.textTertiary} />
        </Pressable>

        <Text style={[styles.versionText, { color: theme.textTertiary }]}>
          v{APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  paletteContainer: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  paletteItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  licensesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  licensesText: {
    fontSize: 14,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 12,
  },
});
