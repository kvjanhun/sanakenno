/**
 * Authentication and sync types shared between web, mobile, and server.
 *
 * No platform-specific code. No React, no DOM, no Node APIs.
 *
 * @module @sanakenno/shared/auth-types
 */

import type { PlayerStats } from './stats';

/** localStorage / MMKV key where the player auth token is persisted. */
export const AUTH_TOKEN_STORAGE_KEY = 'sanakenno_auth_token';

/** Stored auth token shape. Persisted via the platform AuthService. */
export interface AuthToken {
  token: string;
  playerId: number;
  expiresAt: string; // ISO 8601
  /**
   * Stable pairing code: the raw `player_key` returned by /auth/init (or a
   * subsequent /auth/rotate). Used to pair additional devices. Optional
   * because legacy clients upgrading from the one-shot transfer-token flow
   * won't have it until they rotate once.
   */
  playerKey?: string;
  /** Legacy local UI flag from older builds. New builds persist this separately. */
  linked?: boolean;
}

/** Wire shape for a puzzle state in sync requests and responses. */
export interface SyncPuzzleState {
  puzzle_number: number;
  found_words: string[];
  score: number;
  hints_unlocked: string[];
  started_at: number; // epoch ms
  total_paused_ms: number;
  score_before_hints: number | null;
}

/** Valid identifiers for the color palette ("Väriteema") selection. */
export const THEME_IDS = [
  'hehku',
  'meri',
  'metsa',
  'yo',
  'aamu',
  'mono',
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Player-scoped display preferences, synced across devices via the account.
 *
 * `updated_at` is an ISO 8601 timestamp used for last-writer-wins resolution
 * when reconciling client and server values.
 */
export interface PlayerPreferences {
  themeId?: ThemeId;
  themePreference?: ThemePreference;
  updated_at: string;
}

/** Full sync payload returned by GET /api/player/sync and POST /api/player/auth/transfer/use. */
export interface SyncPayload {
  stats: PlayerStats;
  puzzle_states: SyncPuzzleState[];
  preferences?: PlayerPreferences | null;
}
