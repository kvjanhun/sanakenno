/**
 * Player authentication store.
 *
 * Manages the magic link auth flow and incremental server sync.
 * Works in concert with useGameStore: after each word is accepted,
 * useGameStore calls syncStatsRecord and syncPuzzleState (fire-and-forget).
 *
 * The store persists its auth token via the platform AuthService (localStorage).
 * All Finnish-facing error messages live in the UI layer; this store uses English
 * error keys.
 *
 * @module src/store/useAuthStore
 */

import { create } from 'zustand';
import {
  STATS_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  mergeStatsRecord,
  mergePuzzleState,
  emptyStats,
  updateStatsRecord,
} from '@sanakenno/shared';
import type {
  StatsRecord,
  PlayerStats,
  SyncPuzzleState,
  SyncPayload,
  AuthToken,
} from '@sanakenno/shared';
import { auth as authService, storage, config } from '../platform';
import { loadFromStorage, saveToStorage } from '../utils/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthState {
  isLoggedIn: boolean;
  email: string | null;
  playerId: number | null;
  /** Set after requestLink(); cleared after verifyToken() or logout(). */
  pendingEmail: string | null;
  isLoading: boolean;
  error: string | null;

  /** Restore token from storage on app mount. */
  initialize(): void;
  /** POST /api/player/auth/request — sends magic link email. */
  requestLink(email: string): Promise<void>;
  /** POST /api/player/auth/verify — exchanges token for session. */
  verifyToken(token: string): Promise<void>;
  /** POST /api/player/auth/logout — invalidates session. */
  logout(): Promise<void>;
  /** Merge server data into local storage. Returns true if local data changed. */
  pullAndMerge(payload: SyncPayload): boolean;
  /** Fire-and-forget push of a stats record. Only fires when logged in. */
  syncStatsRecord(record: StatsRecord): Promise<void>;
  /** Fire-and-forget push of a puzzle state. Only fires when logged in. */
  syncPuzzleState(state: SyncPuzzleState): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiUrl(path: string): string {
  return `${config.apiBase}${path}`;
}

function authHeader(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/** Read all puzzle state keys referenced by the current stats records. */
function gatherLocalData(): {
  stats: PlayerStats;
  puzzle_states: SyncPuzzleState[];
} {
  const stats = loadFromStorage<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats();
  const puzzle_states: SyncPuzzleState[] = [];

  for (const record of stats.records) {
    const key = `sanakenno_state_${record.puzzle_number}`;
    const raw = storage.getRaw(key);
    if (!raw) continue;
    try {
      interface PersistedState {
        foundWords: string[];
        score: number;
        hintsUnlocked: string[];
        startedAt: number;
        totalPausedMs: number;
        scoreBeforeHints: number | null;
      }
      const saved = JSON.parse(raw) as PersistedState;
      puzzle_states.push({
        puzzle_number: record.puzzle_number,
        found_words: saved.foundWords ?? [],
        score: saved.score ?? 0,
        hints_unlocked: saved.hintsUnlocked ?? [],
        started_at: saved.startedAt ?? 0,
        total_paused_ms: saved.totalPausedMs ?? 0,
        score_before_hints: saved.scoreBeforeHints ?? null,
      });
    } catch {
      // Ignore unparseable state
    }
  }

  return { stats, puzzle_states };
}

/** Safely extract an error message from a failed response body. */
async function safeErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  email: null,
  playerId: null,
  pendingEmail: null,
  isLoading: false,
  error: null,

  initialize() {
    const stored = authService.getToken();
    if (!stored) return;

    // Token exists — verify it's still valid, then pull latest server data
    fetch(apiUrl('/api/player/me'), {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          authService.clearToken();
          return;
        }
        interface MeBody {
          player_id: number;
          email: string;
        }
        const body = (await res.json()) as MeBody;
        set({ isLoggedIn: true, email: body.email, playerId: body.player_id });

        // Pull latest server data and merge into local storage
        const syncRes = await fetch(apiUrl('/api/player/sync'), {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        if (!syncRes.ok) return;
        interface SyncBody {
          stats: PlayerStats;
          puzzle_states: SyncPuzzleState[];
        }
        const payload = (await syncRes.json()) as SyncBody;
        const changed = get().pullAndMerge(payload);
        if (changed) window.location.reload();
      })
      .catch(() => {
        // Network error — assume still logged in (offline-first)
        set({
          isLoggedIn: true,
          email: stored.email,
          playerId: stored.playerId,
        });
      });
  },

  async requestLink(email: string) {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/player/auth/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error(await safeErrorMessage(res, 'Pyyntö epäonnistui'));
      }
      set({ pendingEmail: email, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Pyyntö epäonnistui',
        isLoading: false,
      });
    }
  },

  async verifyToken(token: string) {
    set({ isLoading: true, error: null });
    try {
      const { stats, puzzle_states } = gatherLocalData();
      const res = await fetch(apiUrl('/api/player/auth/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, stats, puzzle_states }),
      });
      if (!res.ok) {
        throw new Error(await safeErrorMessage(res, 'Vahvistus epäonnistui'));
      }
      interface VerifyBody {
        token: string;
        player_id: number;
        email: string;
        stats: PlayerStats;
        puzzle_states: SyncPuzzleState[];
      }
      const body = (await res.json()) as VerifyBody;
      const authToken: AuthToken = {
        token: body.token,
        playerId: body.player_id,
        email: body.email,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      authService.setToken(authToken);
      set({
        isLoggedIn: true,
        email: body.email,
        playerId: body.player_id,
        pendingEmail: null,
        isLoading: false,
      });
      get().pullAndMerge({
        stats: body.stats,
        puzzle_states: body.puzzle_states,
      });
      // Reload so the game store re-reads merged data from localStorage.
      window.location.reload();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Vahvistus epäonnistui',
        isLoading: false,
      });
    }
  },

  async logout() {
    const stored = authService.getToken();
    if (stored) {
      fetch(apiUrl('/api/player/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored.token}` },
      }).catch(() => {});
    }
    authService.clearToken();
    storage.remove(AUTH_TOKEN_STORAGE_KEY);
    set({ isLoggedIn: false, email: null, playerId: null, pendingEmail: null });
  },

  pullAndMerge(payload: SyncPayload): boolean {
    let changed = false;

    // Merge server stats into local stats (MAX strategy)
    const localStats =
      loadFromStorage<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats();
    let mergedStats = localStats;

    for (const serverRecord of payload.stats.records) {
      const existing = mergedStats.records.find(
        (r) => r.puzzle_number === serverRecord.puzzle_number,
      );
      if (!existing) {
        mergedStats = {
          ...mergedStats,
          records: [...mergedStats.records, serverRecord],
        };
        changed = true;
      } else {
        const merged = mergeStatsRecord(existing, serverRecord);
        mergedStats = {
          ...mergedStats,
          records: mergedStats.records.map((r) =>
            r.puzzle_number === serverRecord.puzzle_number ? merged : r,
          ),
        };
      }
    }
    saveToStorage(STATS_STORAGE_KEY, mergedStats);

    // Merge server puzzle states into local
    for (const serverState of payload.puzzle_states) {
      const localKey = `sanakenno_state_${serverState.puzzle_number}`;
      const rawLocal = storage.getRaw(localKey);

      if (!rawLocal) {
        storage.save(localKey, {
          foundWords: serverState.found_words,
          score: serverState.score,
          hintsUnlocked: serverState.hints_unlocked,
          startedAt: serverState.started_at,
          totalPausedMs: serverState.total_paused_ms,
          scoreBeforeHints: serverState.score_before_hints,
        });
        changed = true;
        continue;
      }

      try {
        interface PersistedState {
          foundWords: string[];
          score: number;
          hintsUnlocked: string[];
          startedAt: number;
          totalPausedMs: number;
          scoreBeforeHints: number | null;
        }
        const saved = JSON.parse(rawLocal) as PersistedState;
        const localSyncState: SyncPuzzleState = {
          puzzle_number: serverState.puzzle_number,
          found_words: saved.foundWords ?? [],
          score: saved.score ?? 0,
          hints_unlocked: saved.hintsUnlocked ?? [],
          started_at: saved.startedAt ?? 0,
          total_paused_ms: saved.totalPausedMs ?? 0,
          score_before_hints: saved.scoreBeforeHints ?? null,
        };
        const merged = mergePuzzleState(localSyncState, serverState);
        if (merged.found_words.length > localSyncState.found_words.length) {
          changed = true;
        }
        storage.save(localKey, {
          foundWords: merged.found_words,
          score: merged.score,
          hintsUnlocked: merged.hints_unlocked,
          startedAt: merged.started_at,
          totalPausedMs: merged.total_paused_ms,
          scoreBeforeHints: merged.score_before_hints,
        });
        // Keep local stats up-to-date from merged puzzle state
        const currentStats =
          loadFromStorage<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats();
        const existingRecord = currentStats.records.find(
          (r) => r.puzzle_number === serverState.puzzle_number,
        );
        if (existingRecord) {
          const updatedWithMergedWords = updateStatsRecord(currentStats, {
            ...existingRecord,
            words_found: merged.found_words.length,
          });
          saveToStorage(STATS_STORAGE_KEY, updatedWithMergedWords);
        }
      } catch {
        // Ignore parse errors — local state wins
      }
    }

    return changed;
  },

  async syncStatsRecord(record: StatsRecord) {
    const { isLoggedIn } = get();
    if (!isLoggedIn) return;
    const stored = authService.getToken();
    if (!stored) return;

    fetch(apiUrl('/api/player/sync/stats'), {
      method: 'POST',
      headers: authHeader(stored.token),
      body: JSON.stringify(record),
    }).catch(() => {});
  },

  async syncPuzzleState(state: SyncPuzzleState) {
    const { isLoggedIn } = get();
    if (!isLoggedIn) return;
    const stored = authService.getToken();
    if (!stored) return;

    fetch(apiUrl('/api/player/sync/state'), {
      method: 'POST',
      headers: authHeader(stored.token),
      body: JSON.stringify(state),
    }).catch(() => {});
  },
}));
