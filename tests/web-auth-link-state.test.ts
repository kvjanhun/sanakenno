import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_STORAGE_KEY } from '@sanakenno/shared';

const LINKED_STATE_STORAGE_KEY = 'sanakenno_device_linked';

async function waitForLoggedIn(
  getState: () => {
    isLoggedIn: boolean;
    isLinked: boolean;
  },
): Promise<void> {
  await vi.waitFor(() => {
    expect(getState().isLoggedIn).toBe(true);
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('web auth linked state persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-palette');
  });

  it('keeps sharing enabled after the player reveals share options and restarts', async () => {
    window.localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({
        token: 'stored-token',
        playerId: 7,
        playerKey: 'stored-player-key',
        expiresAt: '2026-12-31T00:00:00.000Z',
      }),
    );

    const firstLoad = await import('../packages/web/src/store/useAuthStore');
    firstLoad.useAuthStore.getState().revealShareOptions();

    expect(window.localStorage.getItem(LINKED_STATE_STORAGE_KEY)).toBe('true');

    vi.resetModules();

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ player_id: 7 }))
        .mockResolvedValueOnce(
          jsonResponse({
            stats: { records: [], version: 1 },
            puzzle_states: [],
            preferences: null,
          }),
        ),
    );

    const { useAuthStore } =
      await import('../packages/web/src/store/useAuthStore');
    useAuthStore.getState().initialize();
    await waitForLoggedIn(() => useAuthStore.getState());

    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: true,
      playerId: 7,
      playerKey: 'stored-player-key',
      isLinked: true,
    });
  });

  it('migrates legacy linked state out of the auth token object', async () => {
    window.localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({
        token: 'stored-token',
        playerId: 9,
        playerKey: 'stored-player-key',
        expiresAt: '2026-12-31T00:00:00.000Z',
        linked: true,
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ player_id: 9 }))
        .mockResolvedValueOnce(
          jsonResponse({
            stats: { records: [], version: 1 },
            puzzle_states: [],
            preferences: null,
          }),
        ),
    );

    const { useAuthStore } =
      await import('../packages/web/src/store/useAuthStore');
    useAuthStore.getState().initialize();
    await waitForLoggedIn(() => useAuthStore.getState());

    expect(window.localStorage.getItem(LINKED_STATE_STORAGE_KEY)).toBe('true');
    expect(useAuthStore.getState().isLinked).toBe(true);
  });
});
