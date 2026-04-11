import type { AuthService, AuthToken } from '@sanakenno/shared';
import { AUTH_TOKEN_STORAGE_KEY } from '@sanakenno/shared';
import { mobileStorage } from './storage';

export const mobileAuth: AuthService = {
  getToken(): AuthToken | null {
    return mobileStorage.load<AuthToken>(AUTH_TOKEN_STORAGE_KEY);
  },

  setToken(token: AuthToken): void {
    mobileStorage.save(AUTH_TOKEN_STORAGE_KEY, token);
  },

  clearToken(): void {
    mobileStorage.remove(AUTH_TOKEN_STORAGE_KEY);
  },
};
