import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Appearance, AppState, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTheme } from '../src/theme';
import { useGameStore } from '../src/store/useGameStore';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

// Keep the native splash visible while the JS bundle bootstraps
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const puzzle = useGameStore((s) => s.puzzle);
  const fetchError = useGameStore((s) => s.fetchError);
  const lastFetchedDate = useGameStore((s) => s.lastFetchedDate);
  const fetchPuzzle = useGameStore((s) => s.fetchPuzzle);
  const overlayOpacity = useSharedValue(1);
  const ready = puzzle !== null || fetchError !== '';

  // Once puzzle (or an error) is available, fade out the JS overlay and hide native splash
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [ready, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    // Once fully transparent, stop blocking touches
    pointerEvents: overlayOpacity.value === 0 ? 'none' : 'auto',
  }));

  // Midnight rollover: when the app becomes active, refetch if the date has changed
  const lastFetchedDateRef = useRef(lastFetchedDate);
  useEffect(() => {
    lastFetchedDateRef.current = lastFetchedDate;
  }, [lastFetchedDate]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const today = new Date().toISOString().slice(0, 10);
        if (
          lastFetchedDateRef.current !== null &&
          today !== lastFetchedDateRef.current
        ) {
          fetchPuzzle();
        }
      }
    });
    return () => sub.remove();
  }, [fetchPuzzle]);

  // Propagate explicit dark/light preference to the native layer (tab bar, alerts, etc.).
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
        <Stack.Screen
          name="licenses"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
      {/* JS-level overlay that covers the skeleton/wireframe until the puzzle loads */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.bgPrimary },
          overlayStyle,
        ]}
        pointerEvents={ready ? 'none' : 'auto'}
      />
    </SafeAreaProvider>
  );
}
