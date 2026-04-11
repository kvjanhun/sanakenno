/**
 * Deep link landing screen for transfer auth.
 *
 * Expo Router matches sanakenno://auth?connect=xxx to this file and provides
 * the token via useLocalSearchParams. Uses transfer token then immediately
 * navigates to the main tabs.
 *
 * @module app/auth
 */

import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

export default function AuthCallback() {
  const { connect } = useLocalSearchParams<{ connect: string }>();

  useEffect(() => {
    const go = async () => {
      if (typeof connect === 'string') {
        await useAuthStore.getState().useTransfer(connect);
      }
      router.replace('/(tabs)');
    };
    void go();
  }, [connect]);

  return null;
}
