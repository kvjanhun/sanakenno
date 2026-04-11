import Constants from 'expo-constants';
import type { ConfigService } from '@sanakenno/shared';

/**
 * API base URL for the mobile app.
 *
 * In development (expo run:ios / expo start), resolves the Metro bundler host
 * and assumes the API runs on port 3001 of the same machine. Falls back to
 * localhost when hostUri is not populated (common with expo run:ios).
 * In production, uses the live API.
 */
function resolveApiBase(): string {
  if (!__DEV__) return 'https://sanakenno.fi';
  // hostUri is set in Expo Go; may be absent in expo run:ios dev builds.
  // localhost always reaches the Mac from the iOS simulator.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:3001`;
}

export const mobileConfig: ConfigService = {
  get apiBase() {
    return resolveApiBase();
  },
};
