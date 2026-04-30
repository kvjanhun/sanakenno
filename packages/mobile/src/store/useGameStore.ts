import { create } from 'zustand';
import { config, crypto, storage, share } from '../platform';
import { useAuthStore } from './useAuthStore';
import * as PreparedHaptics from 'prepared-haptics';
import {
  scoreWord,
  rankForScore,
  STATS_STORAGE_KEY,
  updateStatsRecord,
  emptyStats,
} from '@sanakenno/shared';

// Each rejection gets a unique ID so its auto-clear timer doesn't cancel a later rejection
let rejectionCounter = 0;
import type { HintData, PlayerStats } from '@sanakenno/shared';

/** Map mobile hint tab IDs to share emoji (same visual meaning as web). */
const HINT_ICONS: Record<string, string> = {
  overview: '\u{1F4CA}', // 📊
  lengths: '\u{1F4CF}', // 📋
  pairs: '\u{1F520}', // 🔠
};
const HINT_ORDER: string[] = ['overview', 'lengths', 'pairs'];

export type CelebrationType = 'allistyttava' | 'taysikenno' | null;

/** Shape of the puzzle payload from GET /api/puzzle. */
export interface Puzzle {
  center: string;
  letters: string[];
  word_hashes: string[];
  hint_data: HintData;
  max_score: number;
  puzzle_number: number;
  total_puzzles: number;
}

export type MessageType = 'ok' | 'error' | 'special';

interface GameState {
  puzzle: Puzzle | null;
  outerLetters: string[];
  loading: boolean;
  fetchError: string;
  currentWord: string;
  score: number;
  foundWords: Set<string>;
  message: string;
  messageType: MessageType;
  pointsBubble: string | null;
  wordRejected: boolean;
  startedAt: number | null;
  totalPausedMs: number;
  hintsUnlocked: Set<string>;
  scoreBeforeHints: number | null;
  celebration: CelebrationType;
  postedRanks: Set<string>;
  lastResubmittedWord: string | null;
  shareCopied: boolean;
  lastFetchedDate: string | null;
  /** Longest word found in the current puzzle session. */
  longestWord: string;
  /** Number of pangrams found in the current puzzle session. */
  pangramsFound: number;

  fetchPuzzle: (overrideNumber?: number) => Promise<void>;
  reloadStateFromStorage: () => void;
  addLetter: (letter: string) => void;
  deleteLetter: () => void;
  clearWord: () => void;
  submitWord: () => Promise<void>;
  shuffleLetters: () => void;
  saveState: () => void;
  unlockHint: (id: string) => void;
  setCelebration: (value: CelebrationType) => void;
  copyStatus: () => Promise<void>;
}

/** Persistence key for a given puzzle number. */
function stateKey(puzzleNumber: number): string {
  return `game_state_${puzzleNumber}`;
}

export const useGameStore = create<GameState>()((set, get) => ({
  puzzle: null,
  outerLetters: [],
  loading: false,
  fetchError: '',
  currentWord: '',
  score: 0,
  foundWords: new Set<string>(),
  message: '',
  messageType: 'ok' as MessageType,
  pointsBubble: null,
  wordRejected: false,
  startedAt: null,
  totalPausedMs: 0,
  hintsUnlocked: new Set<string>(),
  scoreBeforeHints: null,
  celebration: null,
  postedRanks: new Set<string>(),
  lastResubmittedWord: null,
  shareCopied: false,
  lastFetchedDate: null,
  longestWord: '',
  pangramsFound: 0,

  fetchPuzzle: async (overrideNumber?: number) => {
    set({ loading: true, fetchError: '' });
    try {
      const base = config.apiBase;
      const url =
        overrideNumber !== undefined
          ? `${base}/api/puzzle/${overrideNumber}`
          : `${base}/api/puzzle`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Puzzle;
      const outerLetters = data.letters.filter((l) => l !== data.center);
      set({
        puzzle: data,
        outerLetters,
        loading: false,
        currentWord: '',
        foundWords: new Set<string>(),
        score: 0,
        message: '',
        fetchError: '',
        wordRejected: false,
        startedAt: Date.now(),
        totalPausedMs: 0,
        hintsUnlocked: new Set<string>(),
        scoreBeforeHints: null,
        celebration: null,
        postedRanks: new Set<string>(),
        longestWord: '',
        pangramsFound: 0,
        ...(overrideNumber === undefined && {
          lastFetchedDate: new Date().toISOString().slice(0, 10),
        }),
      });

      // Restore persisted state
      const saved = storage.load<{
        foundWords: string[];
        score: number;
        startedAt?: number;
        totalPausedMs?: number;
        hintsUnlocked?: string[];
        scoreBeforeHints?: number | null;
        longestWord?: string;
        pangramsFound?: number;
      }>(stateKey(data.puzzle_number));
      if (saved) {
        set({
          foundWords: new Set(saved.foundWords),
          score: saved.score,
          startedAt: saved.startedAt ?? Date.now(),
          totalPausedMs: saved.totalPausedMs ?? 0,
          hintsUnlocked: new Set(saved.hintsUnlocked ?? []),
          scoreBeforeHints: saved.scoreBeforeHints ?? null,
          longestWord: saved.longestWord ?? '',
          pangramsFound: saved.pangramsFound ?? 0,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tuntematon virhe';
      set({ loading: false, fetchError: msg });
    }
  },

  reloadStateFromStorage() {
    const { puzzle } = get();
    if (!puzzle) return;
    const saved = storage.load<{
      foundWords: string[];
      score: number;
      startedAt?: number;
      totalPausedMs?: number;
      hintsUnlocked?: string[];
      scoreBeforeHints?: number | null;
      longestWord?: string;
      pangramsFound?: number;
    }>(stateKey(puzzle.puzzle_number));
    if (saved) {
      set({
        foundWords: new Set(saved.foundWords),
        score: saved.score,
        startedAt: saved.startedAt ?? Date.now(),
        totalPausedMs: saved.totalPausedMs ?? 0,
        hintsUnlocked: new Set(saved.hintsUnlocked ?? []),
        scoreBeforeHints: saved.scoreBeforeHints ?? null,
        longestWord: saved.longestWord ?? '',
        pangramsFound: saved.pangramsFound ?? 0,
      });
    }
  },

  addLetter: (letter: string) => {
    const { wordRejected } = get();
    if (wordRejected) {
      set({ currentWord: letter, wordRejected: false, message: '' });
      return;
    }
    set((s) => ({ currentWord: s.currentWord + letter }));
  },

  deleteLetter: () => {
    const { wordRejected } = get();
    if (wordRejected) {
      set({ currentWord: '', wordRejected: false, message: '' });
      return;
    }
    set((s) => ({ currentWord: s.currentWord.slice(0, -1) }));
  },

  clearWord: () => {
    set({ currentWord: '', wordRejected: false });
  },

  submitWord: async () => {
    const state = get();
    const { puzzle, currentWord, foundWords } = state;
    if (!puzzle) return;

    const normalized = currentWord.toLowerCase().replace(/-/g, '');

    const showError = (msg: string) => {
      rejectionCounter++;
      const myId = rejectionCounter;
      set({ message: msg, messageType: 'error', wordRejected: true });
      PreparedHaptics.triggerNotification('error');
      setTimeout(() => {
        const s = get();
        if (rejectionCounter === myId && s.wordRejected) {
          set({ currentWord: '', wordRejected: false, message: '' });
        }
      }, 2000);
    };

    // Too short
    if (normalized.length < 4) {
      showError('Liian lyhyt!');
      return;
    }

    // Missing center letter
    if (!normalized.includes(puzzle.center)) {
      showError(`Kirjain '${puzzle.center.toUpperCase()}' puuttuu!`);
      return;
    }

    // Invalid letters
    const validLetters = new Set([...puzzle.letters, puzzle.center]);
    for (const ch of normalized) {
      if (!validLetters.has(ch)) {
        showError('Käytä vain annettuja kirjaimia!');
        return;
      }
    }

    // Already found
    if (foundWords.has(normalized)) {
      rejectionCounter++;
      const myId = rejectionCounter;
      set({
        message: 'Löysit jo tämän!',
        messageType: 'error',
        wordRejected: true,
        lastResubmittedWord: normalized,
      });
      PreparedHaptics.trigger();
      setTimeout(() => set({ lastResubmittedWord: null }), 1500);
      setTimeout(() => {
        const s = get();
        if (rejectionCounter === myId && s.wordRejected) {
          set({ currentWord: '', wordRejected: false, message: '' });
        }
      }, 2000);
      return;
    }

    // Hash check
    const wordHash = await crypto.hashSHA256(normalized);
    const hashSet = new Set(puzzle.word_hashes);
    if (!hashSet.has(wordHash)) {
      showError('Ei sanakirjassa');
      // Fire-and-forget: record non-dictionary guess on server
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Europe/Helsinki',
      });
      fetch(`${config.apiBase}/api/failed-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: normalized, date: today }),
      }).catch(() => {
        // Silently ignore network errors
      });
      return;
    }

    // Valid word — score and update
    const pts = scoreWord(normalized, validLetters);
    const isPangram = [...validLetters].every((c) => normalized.includes(c));
    const newFoundWords = new Set(foundWords);
    newFoundWords.add(normalized);
    const newScore = state.score + pts;
    const previousRank = rankForScore(state.score, puzzle.max_score);
    const newRank = rankForScore(newScore, puzzle.max_score);
    const newLongestWord =
      normalized.length > state.longestWord.length
        ? normalized
        : state.longestWord;
    const newPangramsFound = state.pangramsFound + (isPangram ? 1 : 0);

    let msg: string;
    let msgType: MessageType = 'ok';
    if (isPangram) {
      msg = 'Pangrammi!';
      msgType = 'special';
    } else if (newRank !== previousRank) {
      msg = newRank.endsWith('!') ? newRank : `${newRank}!`;
      msgType = 'special';
    } else {
      msg = `+${pts}`;
    }

    set({
      foundWords: newFoundWords,
      score: newScore,
      currentWord: '',
      wordRejected: false,
      message: msg,
      messageType: msgType,
      pointsBubble: isPangram || newRank !== previousRank ? `+${pts}` : null,
      longestWord: newLongestWord,
      pangramsFound: newPangramsFound,
    });
    PreparedHaptics.triggerNotification('success');

    fetch(`${config.apiBase}/api/word-find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: normalized,
        puzzle_number: puzzle.puzzle_number,
      }),
    }).catch(() => {
      // Silently ignore network errors
    });

    // Auto-clear the success message after 2 seconds
    setTimeout(() => {
      const s = get();
      if (s.message === msg) {
        set({ message: '', pointsBubble: null });
      }
    }, 2000);

    // Trigger celebration on special ranks
    if (newRank !== previousRank) {
      if (newRank === 'Täysi kenno') {
        set({ celebration: 'taysikenno' });
      } else if (newRank === 'Ällistyttävä') {
        set({ celebration: 'allistyttava' });
      }

      // Fire-and-forget achievement POST (session-deduped)
      const dedupeKey = `${puzzle.puzzle_number}:${newRank}`;
      const { postedRanks } = get();
      if (!postedRanks.has(dedupeKey)) {
        postedRanks.add(dedupeKey);
        set({ postedRanks: new Set(postedRanks) });
        const elapsed =
          state.startedAt != null
            ? Date.now() - state.startedAt - state.totalPausedMs
            : 0;
        fetch(`${config.apiBase}/api/achievement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzle_number: puzzle.puzzle_number,
            rank: newRank,
            score: newScore,
            max_score: puzzle.max_score,
            words_found: newFoundWords.size,
            elapsed_ms: elapsed,
          }),
        }).catch(() => {});
      }
    }

    // Record stats on every accepted word (matches web).
    // Skip if this puzzle's answers have been revealed (revealed_N flag).
    const isRevealed =
      storage.getRaw(`revealed_${puzzle.puzzle_number}`) === 'true';
    if (!isRevealed) {
      const elapsed =
        state.startedAt != null
          ? Date.now() - state.startedAt - state.totalPausedMs
          : 0;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA', {
        timeZone: 'Europe/Helsinki',
      });
      const existing =
        storage.load<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats();
      const updated = updateStatsRecord(existing, {
        puzzle_number: puzzle.puzzle_number,
        date: dateStr,
        best_rank: newRank,
        best_score: newScore,
        max_score: puzzle.max_score,
        words_found: newFoundWords.size,
        hints_used: state.hintsUnlocked.size,
        elapsed_ms: elapsed,
        longest_word: newLongestWord,
        pangrams_found: newPangramsFound,
      });
      storage.save(STATS_STORAGE_KEY, updated);

      // Fire-and-forget stats sync when player is logged in
      const { isLoggedIn, syncStatsRecord } = useAuthStore.getState();
      if (isLoggedIn) {
        void syncStatsRecord({
          puzzle_number: puzzle.puzzle_number,
          date: dateStr,
          best_rank: newRank,
          best_score: newScore,
          max_score: puzzle.max_score,
          words_found: newFoundWords.size,
          hints_used: state.hintsUnlocked.size,
          elapsed_ms: elapsed,
          longest_word: newLongestWord,
          pangrams_found: newPangramsFound,
        });
      }
    }

    // Persist state
    storage.save(stateKey(puzzle.puzzle_number), {
      foundWords: [...newFoundWords],
      score: newScore,
      startedAt: state.startedAt,
      totalPausedMs: state.totalPausedMs,
      hintsUnlocked: [...state.hintsUnlocked],
      scoreBeforeHints: state.scoreBeforeHints,
      longestWord: newLongestWord,
      pangramsFound: newPangramsFound,
    });

    // Fire-and-forget state sync when player is logged in (skip if revealed)
    if (!isRevealed) {
      const { isLoggedIn, syncPuzzleState } = useAuthStore.getState();
      if (isLoggedIn) {
        void syncPuzzleState({
          puzzle_number: puzzle.puzzle_number,
          found_words: [...newFoundWords],
          score: newScore,
          hints_unlocked: [...state.hintsUnlocked],
          started_at: state.startedAt ?? 0,
          total_paused_ms: state.totalPausedMs,
          score_before_hints: state.scoreBeforeHints,
        });
      }
    }
  },

  shuffleLetters: () => {
    set((s) => {
      const shuffled = [...s.outerLetters];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { outerLetters: shuffled };
    });
  },

  saveState: () => {
    const {
      puzzle,
      foundWords,
      score,
      startedAt,
      totalPausedMs,
      hintsUnlocked,
      scoreBeforeHints,
      longestWord,
      pangramsFound,
    } = get();
    if (!puzzle) return;
    storage.save(stateKey(puzzle.puzzle_number), {
      foundWords: [...foundWords],
      score,
      startedAt,
      totalPausedMs,
      hintsUnlocked: [...hintsUnlocked],
      scoreBeforeHints,
      longestWord,
      pangramsFound,
    });
  },

  unlockHint: (id: string) => {
    const { hintsUnlocked, scoreBeforeHints, score, puzzle } = get();
    if (hintsUnlocked.has(id)) return;
    const newUnlocked = new Set(hintsUnlocked);
    newUnlocked.add(id);
    const updates: Partial<GameState> = { hintsUnlocked: newUnlocked };
    // Capture score before first hint
    if (scoreBeforeHints === null) {
      updates.scoreBeforeHints = score;
    }
    set(updates);
    // Persist immediately
    if (puzzle) {
      const state = get();
      storage.save(stateKey(puzzle.puzzle_number), {
        foundWords: [...state.foundWords],
        score: state.score,
        startedAt: state.startedAt,
        totalPausedMs: state.totalPausedMs,
        hintsUnlocked: [...state.hintsUnlocked],
        scoreBeforeHints: state.scoreBeforeHints,
        longestWord: state.longestWord,
        pangramsFound: state.pangramsFound,
      });
    }
  },

  setCelebration: (value: CelebrationType) => {
    set({ celebration: value });
  },

  copyStatus: async () => {
    const { puzzle, score, hintsUnlocked, scoreBeforeHints } = get();
    if (!puzzle) return;

    const rank = rankForScore(score, puzzle.max_score);
    const hasTrophy = rank === 'Ällistyttävä' || rank === 'Täysi kenno';
    const rankPrefix = hasTrophy ? '🏆 ' : '';

    // Progress bar: 10 blocks proportional to score/max_score
    const filled = Math.round((score / puzzle.max_score) * 10);
    const bar = '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);

    const lines: string[] = [
      `Sanakenno \u2014 Kenno #${puzzle.puzzle_number + 1}`,
      `${rankPrefix}${rank} \u00B7 ${score}/${puzzle.max_score}`,
      bar,
    ];

    const unlockedIcons = HINT_ORDER.filter((id) => hintsUnlocked.has(id)).map(
      (id) => HINT_ICONS[id],
    );
    if (unlockedIcons.length > 0) {
      const beforeHints = scoreBeforeHints ?? 0;
      lines.push(`Avut: ${unlockedIcons.join('')} (${beforeHints} p. ilman)`);
    }

    lines.push('sanakenno.fi');

    const text = lines.join('\n');
    const ok = await share.copyToClipboard(text);
    if (ok) {
      set({ shareCopied: true });
      setTimeout(() => set({ shareCopied: false }), 2000);
    }
  },
}));
