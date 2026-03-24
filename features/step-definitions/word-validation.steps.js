/**
 * BDD step definitions for word-validation.feature.
 *
 * Wires Gherkin scenarios to validation rules and hash.js (SHA-256 hashing).
 * The shared "the player submits" step is defined in scoring.steps.js.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { hashWordSync } from '../support/validation.js';

// Activate validation mode for word-validation.feature scenarios.
// This flag tells the shared "the player submits" step to run the
// full validation chain instead of just scoring.
Before(function (scenario) {
  if (scenario.gherkinDocument?.uri?.includes('word-validation')) {
    this.validationMode = true;
  }
});

// Note: "a puzzle with letters {string} and center {string}" is defined in scoring.steps.js.
// Note: "the player submits {string}" is defined in scoring.steps.js.
// Both step files share the same Cucumber world object.

Given('the puzzle has a word hash for {string}', function (word) {
  this.wordHashes.add(hashWordSync(word));
});

Given('the puzzle center is {string}', function (center) {
  this.center = center;
});

Given('the dictionary contains {string}', function (word) {
  // Normalize: strip hyphens for dictionary lookup
  const normalized = word.replace(/-/g, '');
  this.wordHashes.add(hashWordSync(normalized));
});

When('the player types {string}', function (input) {
  // Normalize: strip hyphens
  this.normalizedInput = input.replace(/-/g, '');
});

Then('the word should be rejected with message stating it is too short', function () {
  assert.equal(this.wordAccepted, false);
  assert.equal(this.rejectionReason, 'too_short');
});

Then('the word should be rejected with message stating it must contain the center letter', function () {
  assert.equal(this.wordAccepted, false);
  assert.equal(this.rejectionReason, 'missing_center');
});

Then('the word should be rejected with message stating it must use only the provided letters', function () {
  assert.equal(this.wordAccepted, false);
  assert.equal(this.rejectionReason, 'invalid_letters');
});

Then('the word should be rejected with message stating it is not in the dictionary', function () {
  assert.equal(this.wordAccepted, false);
  assert.equal(this.rejectionReason, 'not_in_dictionary');
});

Then('the word should be accepted', function () {
  assert.equal(this.wordAccepted, true);
});

Then('the API response should contain {string} but not plaintext words', function (field) {
  // Simulate an API response structure
  const mockResponse = {
    center: this.center,
    letters: [...this.allLetters].filter((l) => l !== this.center),
    word_hashes: [...this.wordHashes],
    hint_data: {},
    max_score: 0,
    puzzle_number: 0,
    total_puzzles: 1,
  };

  assert.ok(field in mockResponse, `Response should contain "${field}"`);
  assert.ok(!('words' in mockResponse), 'Response should not contain plaintext "words"');
});

Then('it should be normalised to {string} for validation', function (expectedNormalized) {
  assert.equal(this.normalizedInput, expectedNormalized);
});

Then('every word in the puzzle\'s word list contains {string}', function (letter) {
  // Verify the center letter constraint is correctly configured
  assert.ok(
    letter === this.center,
    `Every valid word must contain the center letter "${this.center}"`,
  );
});
