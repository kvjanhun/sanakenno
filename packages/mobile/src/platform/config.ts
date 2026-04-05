import Constants from 'expo-constants';
import type { ConfigService } from '@sanakenno/shared';

/**
 * API base URL for the mobile app.
 *
 * In development, uses the Expo dev server host to reach the local API.
 * In production, uses the live API.
 */
function resolveApiBase(): string {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (__DEV__ && debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3001`;
  }
  return 'https://sanakenno.fi';
}

export const mobileConfig: ConfigService = {
  get apiBase() {
    return resolveApiBase();
  },
};
