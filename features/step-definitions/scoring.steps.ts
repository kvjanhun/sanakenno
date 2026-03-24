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
import type { SanakennoWorld } from './types.js';

Before(function (this: SanakennoWorld) {
  this.allLetters = new Set();
  this.center = '';
  this.foundWords = [];
  this.totalScore = 0;
  this.message = null;
  this.lastWordWasPangram = false;
  this.lastScoreIncrease = 0;
  this.wordHashes = new Set();
  this.rejectionReason = null;
  this.wordAccepted = false;
  this.validationMode = false;
});

Given('a puzzle with letters {string} and center {string}', function (this: SanakennoWorld, lettersStr: string, center: string) {
  const letters = lettersStr.split(',').map((l) => l.trim());
  this.allLetters = new Set(letters);
  this.center = center;
});

When('the player submits {string}', function (this: SanakennoWorld, word: string) {
  if (this.validationMode) {
    const result = validateWord(word, this.center, this.allLetters, this.wordHashes);
    this.wordAccepted = result.accepted;
    this.rejectionReason = result.reason;
    if (!result.accepted) return;
  }

  if (this.foundWords.includes(word)) {
    this.message = 'Löysit jo tämän!';
    this.lastScoreIncrease = 0;
    return;
  }

  const score = scoreWord(word, this.allLetters);
  const isPangram = [...this.allLetters].every((c: string) => word.includes(c));

  this.foundWords.push(word);
  this.lastScoreIncrease = score;
  this.lastWordWasPangram = isPangram;
  this.totalScore = recalcScore(this.foundWords, this.allLetters);
  this.message = null;
});

When('the player submits {string} again', function (this: SanakennoWorld, word: string) {
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

Then('the score should increase by {int}', function (this: SanakennoWorld, expectedIncrease: number) {
  assert.equal(this.lastScoreIncrease, expectedIncrease);
});

Then('the word should be marked as a pangram', function (this: SanakennoWorld) {
  assert.equal(this.lastWordWasPangram, true);
});

Then('the total score should be {int}', function (this: SanakennoWorld, expectedTotal: number) {
  assert.equal(this.totalScore, expectedTotal);
});

Then('the message {string} should appear', function (this: SanakennoWorld, expectedMessage: string) {
  assert.equal(this.message, expectedMessage);
});
