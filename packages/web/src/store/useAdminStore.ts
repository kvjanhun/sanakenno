/**
 * Zustand store for admin panel state.
 *
 * Manages authentication, puzzle editing, and admin API interactions.
 * All API calls include the Vite base path prefix and CSRF token.
 *
 * @module src/store/useAdminStore
 */

import { create } from 'zustand';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// --- Types ---

export interface VariationData {
  center: string;
  word_count: number;
  max_score: number;
  pangram_count: number;
  is_active?: boolean;
}

export interface BlockedWord {
  id: number;
  word: string;
  blocked_at: string;
}

export interface ScheduleEntry {
  date: string;
  slot: number;
  display_number: number;
  letters: string[] | null;
  center: string | null;
  is_today: boolean;
}

export interface CombinationEntry {
  letters: string;
  total_pangrams: number;
  min_word_count: number;
  max_word_count: number;
  min_max_score: number;
  max_max_score: number;
  variations: VariationData[];
  in_rotation: boolean;
}

export interface AchievementDay {
  date: string;
  counts: Record<string, number>;
  total: number;
}

export interface FailedGuessDay {
  date: string;
  total_count: number;
  words: { word: string; count: number }[];
}

export interface WordFindEntry {
  word: string;
  find_count: number;
}

/**
 * Outcome of a puzzle write. 'needs_force' means the server refused but would
 * accept a repeat with force=true; the reason is left in `forcePrompt` so the
 * caller can put it in front of the admin before retrying.
 */
export type ActionResult = 'ok' | 'needs_force' | 'error';

interface AdminState {
  // Auth
  authenticated: boolean;
  username: string | null;
  csrfToken: string | null;
  loginError: string | null;
  loginLoading: boolean;

  // Puzzle editor
  totalPuzzles: number;
  currentSlot: number;
  /** 1-based position among active puzzles; null while soft-deleted. */
  currentDisplayNumber: number | null;
  /** Adjacent stored slots, soft-deleted ones included so they stay reachable. */
  prevSlot: number | null;
  nextSlot: number | null;
  /** Active slots in rotation order; index + 1 is the display number. */
  activeSlots: number[];
  /** Server explanation for the last action that asked for force confirmation. */
  forcePrompt: string | null;
  savedLetters: string;
  savedCenter: string;
  activeLetters: string;
  activeCenter: string;
  variations: VariationData[];
  isActive: boolean;
  words: string[];
  wordsLoading: boolean;
  puzzleLoading: boolean;
  saving: boolean;
  statusMessage: string | null;
  statusType: 'success' | 'error' | 'warning' | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  loadSlot: (slot: number) => Promise<void>;
  loadDisplayNumber: (displayNumber: number) => Promise<void>;
  refreshSlots: () => Promise<void>;
  saveSlot: (force?: boolean) => Promise<ActionResult>;
  changeCenter: (center: string, force?: boolean) => Promise<ActionResult>;
  swapSlots: (otherSlot: number, force?: boolean) => Promise<ActionResult>;
  deleteSlot: (force?: boolean) => Promise<void>;
  reactivateSlot: () => Promise<void>;
  createPuzzle: (
    letters: string[],
    center: string,
    options?: { loadAfterCreate?: boolean; force?: boolean },
  ) => Promise<ActionResult>;
  previewCombo: (letters: string[], center?: string) => Promise<void>;
  blockWord: (word: string) => Promise<void>;
  setActiveLetters: (letters: string) => void;
  setActiveCenter: (center: string) => void;
  setCurrentSlot: (slot: number) => void;
  setStatusMessage: (
    message: string | null,
    type?: 'success' | 'error' | 'warning',
  ) => void;
}

/**
 * Helper for authenticated API calls with CSRF token.
 */
async function adminFetch(
  path: string,
  csrfToken: string | null,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
}

/**
 * Load a puzzle into the editor by whichever key the caller has.
 *
 * The server answers with both the slot and its display number, so the editor
 * can address puzzles by the number the admin sees while still writing back
 * to the underlying slot. `optimisticSlot` is set immediately when known, so
 * navigation feels instant while the request is in flight.
 */
async function loadPuzzleInto(
  get: () => AdminState,
  set: (partial: Partial<AdminState>) => void,
  query: string,
  optimisticSlot: number | null,
): Promise<void> {
  const { csrfToken } = get();
  set({
    puzzleLoading: true,
    ...(optimisticSlot !== null ? { currentSlot: optimisticSlot } : {}),
  });
  try {
    const res = await adminFetch(
      `/api/admin/puzzle/variations?${query}`,
      csrfToken,
    );
    if (!res.ok) {
      const data = await res.json();
      set({
        puzzleLoading: false,
        statusMessage: data.error || 'Lataus epäonnistui',
        statusType: 'error',
      });
      return;
    }
    const data = await res.json();
    const letters = data.letters.sort().join('');
    const activeCenter =
      data.variations.find((v: VariationData) => v.is_active)?.center ||
      data.letters[0];

    set({
      currentSlot: data.slot,
      currentDisplayNumber: data.display_number ?? null,
      prevSlot: data.prev_slot ?? null,
      nextSlot: data.next_slot ?? null,
      savedLetters: letters,
      savedCenter: activeCenter,
      activeLetters: letters,
      activeCenter: activeCenter,
      variations: data.variations,
      isActive: data.is_active ?? true,
      puzzleLoading: false,
      ...(typeof data.total_puzzles === 'number'
        ? { totalPuzzles: data.total_puzzles }
        : {}),
    });

    // Load words for active center
    get().previewCombo(data.letters, activeCenter);
  } catch {
    set({
      puzzleLoading: false,
      statusMessage: 'Yhteysvirhe',
      statusType: 'error',
    });
  }
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  authenticated: false,
  username: null,
  csrfToken: null,
  loginError: null,
  loginLoading: false,

  totalPuzzles: 0,
  currentSlot: 0,
  currentDisplayNumber: null,
  prevSlot: null,
  nextSlot: null,
  activeSlots: [],
  forcePrompt: null,
  savedLetters: '',
  savedCenter: '',
  activeLetters: '',
  activeCenter: '',
  variations: [],
  isActive: true,
  words: [],
  wordsLoading: false,
  puzzleLoading: false,
  saving: false,
  statusMessage: null,
  statusType: null,

  // --- Auth actions ---

  login: async (username, password) => {
    set({ loginLoading: true, loginError: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        set({
          loginError: data.error || 'Kirjautuminen epäonnistui',
          loginLoading: false,
        });
        return false;
      }
      set({
        authenticated: true,
        username: data.username,
        csrfToken: data.csrf_token,
        loginLoading: false,
        loginError: null,
      });
      return true;
    } catch {
      set({ loginError: 'Yhteysvirhe', loginLoading: false });
      return false;
    }
  },

  logout: async () => {
    const { csrfToken } = get();
    try {
      await adminFetch('/api/auth/logout', csrfToken, { method: 'POST' });
    } catch {
      // Ignore errors on logout
    }
    set({
      authenticated: false,
      username: null,
      csrfToken: null,
    });
  },

  checkSession: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/session`, {
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.authenticated) {
        set({
          authenticated: true,
          username: data.username,
          csrfToken: data.csrf_token,
        });
        return true;
      }
    } catch {
      // Session check failed
    }
    set({ authenticated: false });
    return false;
  },

  // --- Puzzle editor actions ---

  loadSlot: async (slot) => {
    await loadPuzzleInto(get, set, `slot=${slot}`, slot);
  },

  loadDisplayNumber: async (displayNumber) => {
    await loadPuzzleInto(get, set, `display_number=${displayNumber}`, null);
  },

  refreshSlots: async () => {
    const { csrfToken } = get();
    try {
      const res = await adminFetch('/api/admin/puzzle/slots', csrfToken);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.slots)) {
        set({ activeSlots: data.slots, totalPuzzles: data.total_puzzles });
      }
    } catch {
      // Leave the previous mapping in place on a transient failure.
    }
  },

  saveSlot: async (force) => {
    const { csrfToken, currentSlot, activeLetters, activeCenter } = get();
    set({ saving: true });
    try {
      const letters = activeLetters.split('');
      const res = await adminFetch('/api/admin/puzzle', csrfToken, {
        method: 'POST',
        body: JSON.stringify({
          slot: currentSlot,
          letters,
          center: activeCenter,
          force,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.requires_force) {
          set({ saving: false, forcePrompt: data.error });
          return 'needs_force';
        }
        set({
          saving: false,
          statusMessage: data.error || 'Tallennus epäonnistui',
          statusType: 'error',
        });
        return 'error';
      }
      set({
        saving: false,
        forcePrompt: null,
        savedLetters: activeLetters,
        savedCenter: activeCenter,
        totalPuzzles: data.total_puzzles,
        statusMessage: 'Tallennettu',
        statusType: 'success',
      });
      // Reload variations
      get().loadSlot(currentSlot);
      get().refreshSlots();
      return 'ok';
    } catch {
      set({ saving: false, statusMessage: 'Yhteysvirhe', statusType: 'error' });
      return 'error';
    }
  },

  changeCenter: async (center, force) => {
    const { csrfToken, currentSlot } = get();
    set({ saving: true });
    try {
      const res = await adminFetch('/api/admin/puzzle/center', csrfToken, {
        method: 'POST',
        body: JSON.stringify({ slot: currentSlot, center, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.requires_force) {
          set({ saving: false, forcePrompt: data.error });
          return 'needs_force';
        }
        set({
          saving: false,
          statusMessage: data.error || 'Muutos epäonnistui',
          statusType: 'error',
        });
        return 'error';
      }
      set({
        saving: false,
        forcePrompt: null,
        savedCenter: center,
        activeCenter: center,
        statusMessage: 'Keskuskirjain vaihdettu',
        statusType: 'success',
      });
      get().loadSlot(currentSlot);
      return 'ok';
    } catch {
      set({ saving: false, statusMessage: 'Yhteysvirhe', statusType: 'error' });
      return 'error';
    }
  },

  swapSlots: async (otherSlot, force) => {
    const { csrfToken, currentSlot } = get();
    set({ saving: true });
    try {
      const res = await adminFetch('/api/admin/puzzle/swap', csrfToken, {
        method: 'POST',
        body: JSON.stringify({
          slot_a: currentSlot,
          slot_b: otherSlot,
          force,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.requires_force) {
          set({ saving: false, forcePrompt: data.error });
          return 'needs_force';
        }
        set({
          saving: false,
          statusMessage: data.error || 'Vaihto epäonnistui',
          statusType: 'error',
        });
        return 'error';
      }
      set({
        saving: false,
        forcePrompt: null,
        statusMessage: 'Pelit vaihdettu',
        statusType: 'success',
      });
      get().loadSlot(currentSlot);
      return 'ok';
    } catch {
      set({ saving: false, statusMessage: 'Yhteysvirhe', statusType: 'error' });
      return 'error';
    }
  },

  deleteSlot: async (force) => {
    const { csrfToken, currentSlot } = get();
    set({ saving: true });
    try {
      const forceParam = force ? '?force=true' : '';
      const res = await adminFetch(
        `/api/admin/puzzle/${currentSlot}${forceParam}`,
        csrfToken,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.requires_force) {
          set({
            saving: false,
            statusMessage: data.error,
            statusType: 'warning',
          });
          return;
        }
        set({
          saving: false,
          statusMessage: data.error || 'Poisto epäonnistui',
          statusType: 'error',
        });
        return;
      }
      set({
        saving: false,
        totalPuzzles: data.total_puzzles,
        statusMessage: 'Peli poistettu',
        statusType: 'success',
      });
      // Stay on the deleted slot so it can be restored; reloading refreshes
      // its now-null display number and the shifted total.
      get().loadSlot(currentSlot);
      get().refreshSlots();
    } catch {
      set({ saving: false, statusMessage: 'Yhteysvirhe', statusType: 'error' });
    }
  },

  reactivateSlot: async () => {
    const { csrfToken, currentSlot, activeLetters, activeCenter } = get();
    set({ saving: true });
    try {
      const letters = activeLetters.split('');
      const res = await adminFetch('/api/admin/puzzle', csrfToken, {
        method: 'POST',
        body: JSON.stringify({
          slot: currentSlot,
          letters,
          center: activeCenter,
          force: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({
          saving: false,
          statusMessage: data.error || 'Palautus epäonnistui',
          statusType: 'error',
        });
        return;
      }
      set({
        saving: false,
        isActive: true,
        statusMessage: 'Peli palautettu kiertoon',
        statusType: 'success',
      });
      get().loadSlot(currentSlot);
      get().refreshSlots();
    } catch {
      set({ saving: false, statusMessage: 'Yhteysvirhe', statusType: 'error' });
    }
  },

  createPuzzle: async (letters, center, options) => {
    const { csrfToken } = get();
    set({ saving: true });
    try {
      const res = await adminFetch('/api/admin/puzzle', csrfToken, {
        method: 'POST',
        body: JSON.stringify({ letters, center, force: options?.force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.requires_force) {
          set({ saving: false, forcePrompt: data.error });
          return 'needs_force';
        }
        set({
          saving: false,
          statusMessage: data.error || 'Luonti epäonnistui',
          statusType: 'error',
        });
        return 'error';
      }
      set({
        saving: false,
        forcePrompt: null,
        totalPuzzles: data.total_puzzles,
        statusMessage: `Uusi peli #${data.display_number ?? data.slot + 1} luotu`,
        statusType: 'success',
      });
      get().refreshSlots();
      if (options?.loadAfterCreate !== false) {
        get().loadSlot(data.slot);
      }
      return 'ok';
    } catch {
      set({ saving: false, statusMessage: 'Yhteysvirhe', statusType: 'error' });
      return 'error';
    }
  },

  previewCombo: async (letters, center) => {
    const { csrfToken } = get();
    set({ wordsLoading: true });
    try {
      const res = await adminFetch('/api/admin/preview', csrfToken, {
        method: 'POST',
        body: JSON.stringify({ letters, center }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ wordsLoading: false });
        return;
      }
      set({
        variations: data.variations,
        words: data.words || [],
        wordsLoading: false,
      });
    } catch {
      set({ wordsLoading: false });
    }
  },

  blockWord: async (word) => {
    const { csrfToken, words } = get();
    try {
      const res = await adminFetch('/api/admin/block', csrfToken, {
        method: 'POST',
        body: JSON.stringify({ word }),
      });
      if (res.ok) {
        set({
          words: words.filter((w) => w !== word),
          statusMessage: `"${word}" estetty`,
          statusType: 'success',
        });
      }
    } catch {
      set({ statusMessage: 'Estäminen epäonnistui', statusType: 'error' });
    }
  },

  setActiveLetters: (letters) => set({ activeLetters: letters }),
  setActiveCenter: (center) => set({ activeCenter: center }),
  setCurrentSlot: (slot) => set({ currentSlot: slot }),
  setStatusMessage: (message, type = 'success') =>
    set({ statusMessage: message, statusType: message ? type : null }),
}));
