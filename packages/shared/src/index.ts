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
  NO_HINT_ACHIEVEMENTS,
  scoreWord,
  isPangram,
  recalcScore,
  rankForScore,
  rankThresholds,
  noHintAchievementStates,
  progressToNextRank,
  colorizeWord,
  toColumns,
} from './scoring';
export type {
  Rank,
  NoHintAchievement,
  NoHintAchievementState,
  ColorizedChar,
  RankThreshold,
} from './scoring';

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
  bestNoHintScoreForRecord,
  computeStreak,
  computeLifetimeStats,
  computeLifetimeNoHintStats,
  getHelsinkiDateString,
  computeRankDistribution,
  computeAverageCompletion,
  emptyStats,
} from './stats';
export type {
  StatsRecord,
  PlayerStats,
  LifetimeStats,
  LifetimeNoHintStats,
} from './stats';

// Share text
export { buildShareText } from './share-text';
export type { ShareTextInput } from './share-text';

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
