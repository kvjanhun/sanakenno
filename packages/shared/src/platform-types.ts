/**
 * Platform service interfaces.
 *
 * These define the boundary between shared domain logic and
 * platform-specific capabilities. Each platform (web, mobile)
 * provides its own implementations.
 *
 * @module src/platform/types
 */

import type { AuthToken } from './auth-types';

/** Key-value storage with JSON serialization and raw string access. */
export interface StorageService {
  save<T>(key: string, data: T): void;
  load<T>(key: string): T | null;
  remove(key: string): void;
  getRaw(key: string): string | null;
  setRaw(key: string, value: string): void;
}

/** Cryptographic primitives needed by the game domain. */
export interface CryptoService {
  hashSHA256(input: string): Promise<string>;
  randomUUID(): string;
}

/** Native sharing and clipboard access. */
export interface ShareService {
  copyToClipboard(text: string): Promise<boolean>;
}

/** Environment configuration. */
export interface ConfigService {
  readonly apiBase: string;
}

/** Player authentication token storage. */
export interface AuthService {
  getToken(): AuthToken | null;
  setToken(token: AuthToken): void;
  clearToken(): void;
}

/** Aggregate of all platform services. */
export interface PlatformServices {
  storage: StorageService;
  crypto: CryptoService;
  share: ShareService;
  config: ConfigService;
  auth: AuthService;
}
