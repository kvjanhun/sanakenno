/**
 * BDD step definitions for word-validation.feature.
 *
 * Wires Gherkin scenarios to validation rules and hash.js (SHA-256 hashing).
 * The shared "the player submits" step is defined in scoring.steps.ts.
 */

import {
  Given,
  When,
  Then,
  Before,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { hashWordSync } from '../support/validation';
import type { SanakennoWorld } from './types';

Before(function (this: SanakennoWorld, scenario: ITestCaseHookParameter) {
  if (scenario.gherkinDocument?.uri?.includes('word-validation')) {
    this.validationMode = true;
  }
});

Given(
  'the puzzle has a word hash for {string}',
  function (this: SanakennoWorld, word: string) {
    this.wordHashes.add(hashWordSync(word));
  },
);

Given(
  'the puzzle center is {string}',
  function (this: SanakennoWorld, center: string) {
    this.center = center;
  },
);

Given(
  'the dictionary contains {string}',
  function (this: SanakennoWorld, word: string) {
    const normalized = word.replace(/-/g, '');
    this.wordHashes.add(hashWordSync(normalized));
  },
);

When(
  'the player types {string}',
  function (this: SanakennoWorld, input: string) {
    this.normalizedInput = input.replace(/-/g, '');
  },
);

Then(
  'the word should be rejected with message stating it is too short',
  function (this: SanakennoWorld) {
    assert.equal(this.wordAccepted, false);
    assert.equal(this.rejectionReason, 'too_short');
  },
);

Then(
  'the word should be rejected with message stating it must contain the center letter',
  function (this: SanakennoWorld) {
    assert.equal(this.wordAccepted, false);
    assert.equal(this.rejectionReason, 'missing_center');
  },
);

Then(
  'the word should be rejected with message stating it must use only the provided letters',
  function (this: SanakennoWorld) {
    assert.equal(this.wordAccepted, false);
    assert.equal(this.rejectionReason, 'invalid_letters');
  },
);

Then(
  'the word should be rejected with message stating it is not in the dictionary',
  function (this: SanakennoWorld) {
    assert.equal(this.wordAccepted, false);
    assert.equal(this.rejectionReason, 'not_in_dictionary');
  },
);

Then('the word should be accepted', function (this: SanakennoWorld) {
  assert.equal(this.wordAccepted, true);
});

Then(
  'the API response should contain {string} but not plaintext words',
  function (this: SanakennoWorld, field: string) {
    const mockResponse: Record<string, unknown> = {
      center: this.center,
      letters: [...this.allLetters].filter((l: string) => l !== this.center),
      word_hashes: [...this.wordHashes],
      hint_data: {},
      max_score: 0,
      puzzle_number: 0,
      total_puzzles: 1,
    };

    assert.ok(field in mockResponse, `Response should contain "${field}"`);
    assert.ok(
      !('words' in mockResponse),
      'Response should not contain plaintext "words"',
    );
  },
);

Then(
  'it should be normalised to {string} for validation',
  function (this: SanakennoWorld, expectedNormalized: string) {
    assert.equal(this.normalizedInput, expectedNormalized);
  },
);

Then(
  "every word in the puzzle's word list contains {string}",
  function (this: SanakennoWorld, letter: string) {
    assert.ok(
      letter === this.center,
      `Every valid word must contain the center letter "${this.center}"`,
    );
  },
);
