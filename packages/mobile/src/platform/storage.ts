import { createMMKV } from 'react-native-mmkv';
import type { StorageService } from '@sanakenno/shared';

const mmkv = createMMKV({ id: 'sanakenno' });

export const mobileStorage: StorageService = {
  save<T>(key: string, data: T): void {
    try {
      mmkv.set(key, JSON.stringify(data));
    } catch {
      // Storage full or serialization error — silently drop like web version
    }
  },

  load<T>(key: string): T | null {
    const raw = mmkv.getString(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    mmkv.remove(key);
  },

  getRaw(key: string): string | null {
    return mmkv.getString(key) ?? null;
  },

  setRaw(key: string, value: string): void {
    mmkv.set(key, value);
  },
};
