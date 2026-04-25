/**
 * @sanakenno/shared — pure domain logic, types, and constants.
 *
 * No platform-specific code. No React, no DOM, no Node APIs.
 *
 * @module @sanakenno/shared
 */

// Scoring
export {
  RANKS,
  scoreWord,
  isPangram,
  recalcScore,
  rankForScore,
  rankThresholds,
  progressToNextRank,
  colorizeWord,
  toColumns,
} from './scoring';
export type { Rank, ColorizedChar, RankThreshold } from './scoring';

// Hint data
export { deriveHintData } from './hint-data';
export type {
  HintData,
  LetterEntry,
  LengthEntry,
  PairEntry,
  PangramStats,
  DerivedHintData,
} from './hint-data';

// Stats
export {
  STATS_STORAGE_KEY,
  rankIndex,
  updateStatsRecord,
  computeStreak,
  computeLifetimeStats,
  getHelsinkiDateString,
  computeRankDistribution,
  computeAverageCompletion,
  emptyStats,
} from './stats';
export type { StatsRecord, PlayerStats, LifetimeStats } from './stats';

// Kotus
export { buildKotusUrl } from './kotus';

// Platform interfaces
export type {
  StorageService,
  CryptoService,
  ShareService,
  ConfigService,
  AuthService,
  PlatformServices,
} from './platform-types';

// Auth and sync types
export {
  AUTH_TOKEN_STORAGE_KEY,
  DEFAULT_THEME_ID,
  THEME_IDS,
} from './auth-types';
export type {
  AuthToken,
  SyncPuzzleState,
  SyncProgressPayload,
  SyncPayload,
  PlayerPreferences,
  ThemeId,
  ThemePreference,
} from './auth-types';

// Theme-derived honeycomb styling
export {
  getHoneycombCenterOverlayStops,
  getHoneycombCenterOverlayVariant,
} from './honeycomb-theme';
export type {
  HoneycombCenterOverlayVariant,
  HoneycombCenterOverlayStop,
} from './honeycomb-theme';

// Sync merge utilities
export {
  mergeStatsRecord,
  mergePuzzleState,
  isStatsRecordBetterThanServer,
  isPuzzleStateBetterThanServer,
} from './sync-merge';
