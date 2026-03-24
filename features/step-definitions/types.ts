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
}
