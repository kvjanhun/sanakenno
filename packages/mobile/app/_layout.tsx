import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTheme } from '../src/theme';
import { useGameStore } from '../src/store/useGameStore';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

// Keep the splash screen visible while we fetch the initial puzzle
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const puzzle = useGameStore((s) => s.puzzle);

  // Hide splash screen once the puzzle is loaded
  useEffect(() => {
    if (puzzle) {
      SplashScreen.hideAsync();
    }
  }, [puzzle]);

  // Propagate explicit dark/light preference to the native layer (tab bar, alerts, etc.).
  // For 'system': only call setColorScheme(null) when we previously set an override —
  // never on first mount, so the native UIUserInterfaceStyle=Automatic works correctly
  // and useColorScheme() can track live system changes.
  const didSetOverride = useRef(false);
  useEffect(() => {
    if (pref === 'system') {
      if (didSetOverride.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Appearance.setColorScheme(null as any);
        didSetOverride.current = false;
      }
    } else {
      Appearance.setColorScheme(pref);
      didSetOverride.current = true;
    }
  }, [pref]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bgPrimary },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
