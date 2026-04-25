import { create } from 'zustand';
import {
  STATS_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  mergeStatsRecord,
  mergePuzzleState,
  isStatsRecordBetterThanServer,
  isPuzzleStateBetterThanServer,
  emptyStats,
  updateStatsRecord,
} from '@sanakenno/shared';
import type {
  StatsRecord,
  PlayerStats,
  SyncPuzzleState,
  SyncProgressPayload,
  SyncPayload,
  AuthToken,
  PlayerPreferences,
} from '@sanakenno/shared';
import { auth as authService, storage, config } from '../platform';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { usePaletteStore } from './usePaletteStore';
import { useThemePreferenceStore } from './useThemePreferenceStore';

const PREFERENCES_UPDATED_AT_KEY = 'sanakenno_preferences_updated_at';
const LINKED_STATE_STORAGE_KEY = 'sanakenno_device_linked';

export interface AuthState {
  isLoggedIn: boolean;
  playerId: number | null;
  /** Stable pairing code for this player. Null while /auth/init is pending or for legacy clients that haven't rotated yet. */
  playerKey: string | null;
  isLinked: boolean;
  isLoading: boolean;
  error: string | null;
  initialize(): void;
  initPlayer(): Promise<void>;
  /** Mark this device as "shared" — reveals share options. No server call. */
  revealShareOptions(): void;
  /** Send the pairing code to an email address. */
  sendTransferEmail(email: string): Promise<void>;
  useTransfer(token: string): Promise<void>;
  /** Regenerate the player_key and invalidate other paired devices. */
  rotatePlayerKey(): Promise<void>;
  clearError(): void;
  logout(): Promise<void>;
  pullAndMerge(payload: SyncPayload): boolean;
  syncStatsRecord(record: StatsRecord): Promise<void>;
  syncPuzzleState(state: SyncPuzzleState): Promise<void>;
  syncProgress(payload: SyncProgressPayload): Promise<void>;
  syncPreferences(): Promise<void>;
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

function buildLocalPreferences(): PlayerPreferences {
  return {
    themeId: usePaletteStore.getState().themeId,
    themePreference: useThemePreferenceStore.getState().preference,
    updated_at:
      loadFromStorage<string>(PREFERENCES_UPDATED_AT_KEY) ??
      new Date(0).toISOString(),
  };
}

/**
 * Reconcile a server preferences record with the local one. Newer timestamp
 * wins; if local is newer, we push; if server is newer, we apply via the
 * non-echoing `setLocal` setters and advance our local timestamp.
 */
function applyServerPreferences(
  server: PlayerPreferences | null | undefined,
  syncPush: () => void,
): void {
  const localTs =
    loadFromStorage<string>(PREFERENCES_UPDATED_AT_KEY) ??
    new Date(0).toISOString();

  if (!server) {
    // Server has nothing yet — seed it with whatever we have locally.
    if (Date.parse(localTs) > 0) syncPush();
    return;
  }

  if (Date.parse(localTs) >= Date.parse(server.updated_at)) {
    // Local is at least as fresh — push the local snapshot.
    if (Date.parse(localTs) > Date.parse(server.updated_at)) syncPush();
    return;
  }

  // Server is newer — apply without re-pushing.
  if (server.themeId) usePaletteStore.getState().setLocal(server.themeId);
  if (server.themePreference) {
    useThemePreferenceStore.getState().setLocal(server.themePreference);
  }
  saveToStorage(PREFERENCES_UPDATED_AT_KEY, server.updated_at);
}

/**
 * Mark local preferences as changed at `now` and trigger a push. Called from
 * the palette / theme-preference store setters whenever the player changes a
 * value locally.
 */
export function markLocalPreferencesUpdated(): void {
  saveToStorage(PREFERENCES_UPDATED_AT_KEY, new Date().toISOString());
  void useAuthStore.getState().syncPreferences();
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

function persistLinkedState(value: boolean): void {
  storage.setRaw(LINKED_STATE_STORAGE_KEY, value ? 'true' : 'false');
}

function readLinkedState(stored: AuthToken): boolean {
  const persisted = storage.getRaw(LINKED_STATE_STORAGE_KEY);
  if (persisted === 'true') return true;
  if (persisted === 'false') return false;

  // Older builds stored this UI-only flag inside the auth token object.
  // Backfill the dedicated key once so later auth-token writes can't drop it.
  const linked = stored.linked ?? false;
  persistLinkedState(linked);
  return linked;
}

function pushLocalDataAheadOfServer(
  local: ReturnType<typeof gatherLocalData>,
  server: SyncPayload,
  actions: Pick<AuthState, 'syncStatsRecord' | 'syncPuzzleState'>,
): void {
  const serverStatsByPuzzle = new Map(
    server.stats.records.map((record) => [record.puzzle_number, record]),
  );
  const serverStatesByPuzzle = new Map(
    server.puzzle_states.map((state) => [state.puzzle_number, state]),
  );

  for (const record of local.stats.records) {
    if (
      isStatsRecordBetterThanServer(
        record,
        serverStatsByPuzzle.get(record.puzzle_number),
      )
    ) {
      void actions.syncStatsRecord(record);
    }
  }

  for (const state of local.puzzle_states) {
    if (
      isPuzzleStateBetterThanServer(
        state,
        serverStatesByPuzzle.get(state.puzzle_number),
      )
    ) {
      void actions.syncPuzzleState(state);
    }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  playerId: null,
  playerKey: null,
  isLinked: false,
  isLoading: false,
  error: null,

  initialize() {
    const stored = authService.getToken();
    if (!stored) {
      void get().initPlayer();
      return;
    }
    const isLinked = readLinkedState(stored);

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
        set({
          isLoggedIn: true,
          playerId: body.player_id,
          playerKey: stored.playerKey ?? null,
          isLinked,
          isLoading: false,
        });

        const syncRes = await fetch(apiUrl('/api/player/sync'), {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        if (!syncRes.ok) return;
        const payload = (await syncRes.json()) as {
          stats: PlayerStats;
          puzzle_states: SyncPuzzleState[];
          preferences?: PlayerPreferences | null;
        };
        applyServerPreferences(payload.preferences, () => {
          void get().syncPreferences();
        });
        const changed = get().pullAndMerge(payload);

        const local = gatherLocalData();
        pushLocalDataAheadOfServer(local, payload, get());

        if (changed) window.location.reload();
      })
      .catch(() => {
        set({
          isLoggedIn: true,
          playerId: stored.playerId,
          playerKey: stored.playerKey ?? null,
          isLinked,
          isLoading: false,
        });
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
        playerKey: body.player_key,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      authService.setToken(authToken);
      persistLinkedState(false);
      set({
        isLoggedIn: true,
        playerId: body.player_id,
        playerKey: body.player_key,
        isLinked: false,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Alustus epäonnistui',
        isLoading: false,
      });
    }
  },

  revealShareOptions() {
    persistLinkedState(true);
    set({ isLinked: true });
  },

  async sendTransferEmail(email: string) {
    const stored = authService.getToken();
    if (!stored) return;
    const playerKey = stored.playerKey ?? get().playerKey;
    if (!playerKey) {
      set({
        error:
          'Luo ensin tunniste painamalla "Vaihda tunniste" tallentaaksesi laitekoodin.',
      });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/player/auth/transfer/create'), {
        method: 'POST',
        headers: authHeader(stored.token),
        body: JSON.stringify({ email, player_key: playerKey }),
      });
      if (!res.ok) {
        throw new Error(
          await safeErrorMessage(res, 'Sähköpostin lähetys epäonnistui'),
        );
      }
      persistLinkedState(true);
      set({ isLoading: false, isLinked: true });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : 'Sähköpostin lähetys epäonnistui',
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
        preferences?: PlayerPreferences | null;
      };
      // The pasted token IS this player's stable player_key — persist it so
      // this device can also share it onward without a round-trip.
      const authToken: AuthToken = {
        token: body.token,
        playerId: body.player_id,
        playerKey: token,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      authService.setToken(authToken);
      persistLinkedState(true);
      set({
        isLoggedIn: true,
        playerId: body.player_id,
        playerKey: token,
        isLinked: true,
        isLoading: false,
      });
      applyServerPreferences(body.preferences, () => {
        void get().syncPreferences();
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

  async rotatePlayerKey() {
    const stored = authService.getToken();
    if (!stored) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/player/auth/rotate'), {
        method: 'POST',
        headers: authHeader(stored.token),
      });
      if (!res.ok) {
        throw new Error(
          await safeErrorMessage(res, 'Tunnisteen vaihto epäonnistui'),
        );
      }
      const body = (await res.json()) as { player_key: string };
      authService.setToken({
        ...stored,
        playerKey: body.player_key,
      });
      persistLinkedState(true);
      set({ playerKey: body.player_key, isLinked: true, isLoading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Tunnisteen vaihto epäonnistui',
        isLoading: false,
      });
    }
  },

  clearError() {
    set({ error: null });
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
    persistLinkedState(false);
    set({
      isLoggedIn: false,
      playerId: null,
      playerKey: null,
      isLinked: false,
    });
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
        if (JSON.stringify(merged) !== JSON.stringify(localSyncState)) {
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

  async syncProgress(payload: SyncProgressPayload) {
    const { isLoggedIn } = get();
    if (!isLoggedIn) return;
    const stored = authService.getToken();
    if (!stored) return;
    fetch(apiUrl('/api/player/sync/progress'), {
      method: 'POST',
      headers: authHeader(stored.token),
      body: JSON.stringify(payload),
    }).catch(() => {});
  },

  async syncPreferences() {
    const { isLoggedIn } = get();
    if (!isLoggedIn) return;
    const stored = authService.getToken();
    if (!stored) return;
    const prefs = buildLocalPreferences();
    fetch(apiUrl('/api/player/sync/preferences'), {
      method: 'POST',
      headers: authHeader(stored.token),
      body: JSON.stringify(prefs),
    }).catch(() => {});
  },
}));
