/**
 * Platform services — web implementations.
 *
 * This module is the single import point for platform services.
 * In the workspace layout, each app (web/mobile) provides its own
 * index.ts exporting platform-appropriate implementations.
 *
 * @module src/platform
 */

export {
  webStorage as storage,
  webCrypto as crypto,
  webShare as share,
  webConfig as config,
} from './web';

export type {
  StorageService,
  CryptoService,
  ShareService,
  ConfigService,
  PlatformServices,
} from '@sanakenno/shared';
