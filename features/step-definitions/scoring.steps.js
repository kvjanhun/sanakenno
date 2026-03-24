/**
 * BDD step definitions for scoring.feature.
 *
 * Wires Gherkin scenarios to the pure scoring functions in src/utils/scoring.js.
 * Also handles the shared "the player submits" step used by word-validation.feature.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  scoreWord,
  recalcScore,
} from '../../src/utils/scoring.js';
import { validateWord } from '../support/validation.js';

Before(function () {
  /** @type {Set<string>} */
  this.allLetters = new Set();
  /** @type {string} */
  this.center = '';
  /** @type {string[]} */
  this.foundWords = [];
  /** @type {number} */
  this.totalScore = 0;
  /** @type {string|null} */
  this.message = null;
  /** @type {boolean} */
  this.lastWordWasPangram = false;
  /** @type {number} */
  this.lastScoreIncrease = 0;
  /** @type {Set<string>} Word hashes for validation (used by word-validation.feature). */
  this.wordHashes = new Set();
  /** @type {string|null} */
  this.rejectionReason = null;
  /** @type {boolean} */
  this.wordAccepted = false;
  /** @type {boolean} Whether validation mode is active (set by word-validation steps). */
  this.validationMode = false;
});

Given('a puzzle with letters {string} and center {string}', function (lettersStr, center) {
  const letters = lettersStr.split(',').map((l) => l.trim());
  this.allLetters = new Set(letters);
  this.center = center;
});

When('the player submits {string}', function (word) {
  // Run validation chain only in validation mode (word-validation.feature).
  // Scoring-only scenarios skip validation entirely.
  if (this.validationMode) {
    const result = validateWord(word, this.center, this.allLetters, this.wordHashes);
    this.wordAccepted = result.accepted;
    this.rejectionReason = result.reason;
    if (!result.accepted) return;
  }

  // Scoring logic (scoring.feature)
  // Check for duplicates
  if (this.foundWords.includes(word)) {
    this.message = 'Löysit jo tämän!';
    this.lastScoreIncrease = 0;
    return;
  }

  const score = scoreWord(word, this.allLetters);
  const isPangram = [...this.allLetters].every((c) => word.includes(c));

  this.foundWords.push(word);
  this.lastScoreIncrease = score;
  this.lastWordWasPangram = isPangram;
  this.totalScore = recalcScore(this.foundWords, this.allLetters);
  this.message = null;
});

When('the player submits {string} again', function (word) {
  // Same as "the player submits" — the duplicate check handles it
  if (this.foundWords.includes(word)) {
    this.message = 'Löysit jo tämän!';
    this.lastScoreIncrease = 0;
    return;
  }

  const score = scoreWord(word, this.allLetters);
  this.foundWords.push(word);
  this.lastScoreIncrease = score;
  this.totalScore = recalcScore(this.foundWords, this.allLetters);
  this.message = null;
});

Then('the score should increase by {int}', function (expectedIncrease) {
  assert.equal(this.lastScoreIncrease, expectedIncrease);
});

Then('the word should be marked as a pangram', function () {
  assert.equal(this.lastWordWasPangram, true);
});

Then('the total score should be {int}', function (expectedTotal) {
  assert.equal(this.totalScore, expectedTotal);
});

Then('the message {string} should appear', function (expectedMessage) {
  assert.equal(this.message, expectedMessage);
});
