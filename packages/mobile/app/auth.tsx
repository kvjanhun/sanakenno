/**
 * Deep link landing screen for magic link auth.
 *
 * Expo Router matches sanakenno://auth?token=xxx to this file and provides
 * the token via useLocalSearchParams. Verifies the token then immediately
 * navigates to the main tabs.
 *
 * @module app/auth
 */

import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

export default function AuthCallback() {
  const { token } = useLocalSearchParams<{ token: string }>();

  useEffect(() => {
    const go = async () => {
      if (typeof token === 'string') {
        await useAuthStore.getState().verifyToken(token);
      }
      router.replace('/(tabs)');
    };
    void go();
  }, [token]);

  return null;
}
