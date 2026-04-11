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
  /** True once the player has explicitly linked devices via useTransfer(). */
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

/** Full sync payload returned by GET /api/player/sync and POST /api/player/auth/transfer/use. */
export interface SyncPayload {
  stats: PlayerStats;
  puzzle_states: SyncPuzzleState[];
}
