import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../src/theme';

interface LicenseEntry {
  name: string;
  license: string;
  copyright: string;
}

const LICENSES: LicenseEntry[] = [
  {
    name: 'React',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates',
  },
  {
    name: 'React Native',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates',
  },
  {
    name: 'Expo',
    license: 'MIT',
    copyright: 'Copyright (c) 650 Industries',
  },
  {
    name: 'Expo Router',
    license: 'MIT',
    copyright: 'Copyright (c) 650 Industries',
  },
  {
    name: 'Lucide Icons',
    license: 'MIT',
    copyright: 'Copyright (c) Lucide Contributors',
  },
  {
    name: 'Zustand',
    license: 'MIT',
    copyright: 'Copyright (c) 2019 Paul Henschel',
  },
  {
    name: 'React Native Reanimated',
    license: 'MIT',
    copyright: 'Copyright (c) 2016 Software Mansion',
  },
  {
    name: 'React Native Gesture Handler',
    license: 'MIT',
    copyright: 'Copyright (c) 2016 Software Mansion',
  },
  {
    name: 'React Native SVG',
    license: 'MIT',
    copyright: 'Copyright (c) 2015-present Software Mansion',
  },
  {
    name: 'React Native MMKV',
    license: 'MIT',
    copyright: 'Copyright (c) 2021 Marc Rousavy',
  },
  {
    name: 'React Native Bottom Tabs',
    license: 'MIT',
    copyright: 'Copyright (c) 2024 Oskar Kwaśniewski',
  },
  {
    name: 'React Native Safe Area Context',
    license: 'MIT',
    copyright: 'Copyright (c) 2019 Th3rd Wave',
  },
  {
    name: 'React Native Screens',
    license: 'MIT',
    copyright: 'Copyright (c) 2018 Software Mansion',
  },
  {
    name: 'react-native-qrcode-svg',
    license: 'MIT',
    copyright: 'Copyright (c) 2017 Tony Xia',
  },
  {
    name: 'validator',
    license: 'MIT',
    copyright: "Copyright (c) 2018 Chris O'Hara",
  },
];

export default function LicensesScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} strokeWidth={2} color={theme.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Lisenssit
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          Sanakenno käyttää seuraavia avoimen lähdekoodin kirjastoja.
        </Text>
        {LICENSES.map((entry) => (
          <View
            key={entry.name}
            style={[
              styles.card,
              {
                backgroundColor: theme.bgSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.cardName, { color: theme.textPrimary }]}>
              {entry.name}
            </Text>
            <Text style={[styles.cardLicense, { color: theme.accent }]}>
              {entry.license}
            </Text>
            <Text style={[styles.cardCopyright, { color: theme.textTertiary }]}>
              {entry.copyright}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 10,
  },
  intro: {
    fontSize: 14,
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 2,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardLicense: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardCopyright: {
    fontSize: 12,
  },
});
