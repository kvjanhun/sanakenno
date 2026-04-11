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

export interface AuthState {
  isLoggedIn: boolean;
  playerId: number | null;
  transferToken: string | null;
  isLoading: boolean;
  error: string | null;
  initialize(): void;
  initPlayer(): Promise<void>;
  createTransfer(email?: string): Promise<void>;
  useTransfer(token: string): Promise<void>;
  clearTransferToken(): void;
  logout(): Promise<void>;
  pullAndMerge(payload: SyncPayload): boolean;
  syncStatsRecord(record: StatsRecord): Promise<void>;
  syncPuzzleState(state: SyncPuzzleState): Promise<void>;
}

function apiUrl(path: string): string {
  return `${config.apiBase}${path}`;
}

function authHeader(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

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
      const saved = JSON.parse(raw) as {
        foundWords: string[];
        score: number;
        hintsUnlocked: string[];
        startedAt: number;
        totalPausedMs: number;
        scoreBeforeHints: number | null;
      };
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
      // Ignore unparseable state.
    }
  }

  return { stats, puzzle_states };
}

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

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  playerId: null,
  transferToken: null,
  isLoading: false,
  error: null,

  initialize() {
    const stored = authService.getToken();
    if (!stored) {
      void get().initPlayer();
      return;
    }

    fetch(apiUrl('/api/player/me'), {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          authService.clearToken();
          storage.remove(AUTH_TOKEN_STORAGE_KEY);
          await get().initPlayer();
          return;
        }
        const body = (await res.json()) as { player_id: number };
        set({ isLoggedIn: true, playerId: body.player_id });

        const syncRes = await fetch(apiUrl('/api/player/sync'), {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        if (!syncRes.ok) return;
        const payload = (await syncRes.json()) as {
          stats: PlayerStats;
          puzzle_states: SyncPuzzleState[];
        };
        const changed = get().pullAndMerge(payload);

        const local = gatherLocalData();
        for (const record of local.stats.records) {
          void get().syncStatsRecord(record);
        }
        for (const state of local.puzzle_states) {
          void get().syncPuzzleState(state);
        }

        if (changed) window.location.reload();
      })
      .catch(() => {
        set({ isLoggedIn: true, playerId: stored.playerId });
      });
  },

  async initPlayer() {
    if (authService.getToken()) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/player/auth/init'), {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(await safeErrorMessage(res, 'Alustus epäonnistui'));
      }
      const body = (await res.json()) as {
        token: string;
        player_id: number;
        player_key: string;
      };
      const authToken: AuthToken = {
        token: body.token,
        playerId: body.player_id,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      authService.setToken(authToken);
      set({ isLoggedIn: true, playerId: body.player_id, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Alustus epäonnistui',
        isLoading: false,
      });
    }
  },

  async createTransfer(email?: string) {
    const stored = authService.getToken();
    if (!stored) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/player/auth/transfer/create'), {
        method: 'POST',
        headers: authHeader(stored.token),
        body: JSON.stringify(email ? { email } : {}),
      });
      if (!res.ok) {
        throw new Error(
          await safeErrorMessage(res, 'Laitteen lisäys epäonnistui'),
        );
      }
      const body = (await res.json()) as { transfer_token: string };
      set({ transferToken: body.transfer_token, isLoading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Laitteen lisäys epäonnistui',
        isLoading: false,
      });
    }
  },

  async useTransfer(token: string) {
    set({ isLoading: true, error: null });
    try {
      const { stats, puzzle_states } = gatherLocalData();
      const res = await fetch(apiUrl('/api/player/auth/transfer/use'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, stats, puzzle_states }),
      });
      if (!res.ok) {
        throw new Error(
          await safeErrorMessage(res, 'Yhdistäminen epäonnistui'),
        );
      }
      const body = (await res.json()) as {
        token: string;
        player_id: number;
        stats: PlayerStats;
        puzzle_states: SyncPuzzleState[];
      };
      const authToken: AuthToken = {
        token: body.token,
        playerId: body.player_id,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      authService.setToken(authToken);
      set({
        isLoggedIn: true,
        playerId: body.player_id,
        transferToken: null,
        isLoading: false,
      });
      get().pullAndMerge({
        stats: body.stats,
        puzzle_states: body.puzzle_states,
      });
      window.location.reload();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Yhdistäminen epäonnistui',
        isLoading: false,
      });
    }
  },

  clearTransferToken() {
    set({ transferToken: null, error: null });
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
    set({ isLoggedIn: false, playerId: null, transferToken: null });
    await get().initPlayer();
  },

  pullAndMerge(payload: SyncPayload): boolean {
    let changed = false;
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
        const saved = JSON.parse(rawLocal) as {
          foundWords: string[];
          score: number;
          hintsUnlocked: string[];
          startedAt: number;
          totalPausedMs: number;
          scoreBeforeHints: number | null;
        };
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
        // Ignore parse errors.
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
