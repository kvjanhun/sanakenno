/**
 * Shared world interface for Cucumber step definitions.
 *
 * Defines the shape of `this` context passed between Given/When/Then steps.
 */

export interface SanakennoWorld {
  allLetters: Set<string>;
  center: string;
  foundWords: string[];
  totalScore: number;
  message: string | null;
  lastWordWasPangram: boolean;
  lastScoreIncrease: number;
  wordHashes: Set<string>;
  rejectionReason: string | null;
  wordAccepted: boolean;
  validationMode: boolean;
  normalizedInput: string;
  response: Response;
  responseJson: Record<string, unknown>;
  responses: Response[];
  expectedTotalPuzzles: number;
  simulatedDate: Date;
  puzzleSlotA: number;
  puzzleSlotB: number;
  puzzleSlot1: number;
  puzzleSlot2: number;
  totalPuzzles: number;
  puzzleNumber: number;
  maxScore: number;
  currentScore: number;
  currentRank: string;
  timerStartedAt: number | null;
  timerTotalPausedMs: number;
  timerHiddenAt: number | null;
  /* Phase 4: Hints */
  hintData: {
    word_count: number;
    pangram_count: number;
    by_letter: Record<string, number>;
    by_length: Record<string, number>;
    by_pair: Record<string, number>;
  } | null;
  hintsUnlocked: Set<string>;
  derivedHints: import('@sanakenno/shared').DerivedHintData | null;
  /* Phase 4: Achievements */
  achievementPosts: Array<Record<string, unknown>>;
  achievementSessionKeys: Set<string>;
  achievementResponses: Response[];
  /* Pre-hint score */
  scoreBeforeHints: number | null;
  /* Word definitions */
  kotusUrl: string;
  /* Player stats */
  playerStats: import('@sanakenno/shared').PlayerStats;
  serverStatsRecord: import('@sanakenno/shared').StatsRecord | null;
  /* Archive */
  archiveEntries: Array<{
    date: string;
    puzzle_number: number;
    letters: string[];
    center: string;
    is_today: boolean;
  }>;
}
