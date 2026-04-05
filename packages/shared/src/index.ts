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
  PlatformServices,
} from './platform-types';
