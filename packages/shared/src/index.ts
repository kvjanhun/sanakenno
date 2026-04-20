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
  computeRankDistribution,
  computeAverageCompletion,
  emptyStats,
} from './stats';
export type { StatsRecord, PlayerStats } from './stats';

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
  SyncPayload,
  PlayerPreferences,
  ThemeId,
  ThemePreference,
} from './auth-types';

// Sync merge utilities
export { mergeStatsRecord, mergePuzzleState } from './sync-merge';
