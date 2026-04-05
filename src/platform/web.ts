/**
 * Web (browser) implementations of platform services.
 *
 * @module src/platform/web
 */

import type {
  StorageService,
  CryptoService,
  ShareService,
  ConfigService,
} from './types.js';

export const webStorage: StorageService = {
  save<T>(key: string, data: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.warn(`[storage] QuotaExceededError writing key "${key}"`);
        return;
      }
      throw err;
    }
  },

  load<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[storage] Failed to parse key "${key}", returning null`);
      return null;
    }
  },

  remove(key: string): void {
    window.localStorage.removeItem(key);
  },

  getRaw(key: string): string | null {
    return window.localStorage.getItem(key);
  },

  setRaw(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.warn(`[storage] QuotaExceededError writing key "${key}"`);
        return;
      }
      throw err;
    }
  },
};

export const webCrypto: CryptoService = {
  async hashSHA256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },

  randomUUID(): string {
    return crypto.randomUUID();
  },
};

export const webShare: ShareService = {
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
};

export const webConfig: ConfigService = {
  apiBase: import.meta.env.BASE_URL.replace(/\/$/, ''),
};
