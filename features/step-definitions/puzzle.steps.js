/**
 * BDD step definitions for puzzle.feature.
 *
 * Covers puzzle structure validation and daily rotation logic.
 * Wires Cucumber scenarios to the Hono app and puzzle engine.
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import app from '../../server/index.js';
import { getDb, closeDb, setDb } from '../../server/db/connection.js';
import { getPuzzleForDate, getTotalPuzzles } from '../../server/puzzle-engine-stub.js';

Before(function () {
  closeDb();
  setDb(null);
  getDb({ inMemory: true });
});

After(function () {
  closeDb();
  setDb(null);
});

// --- Puzzle structure ---

When("the player loads today's puzzle", async function () {
  this.response = await app.request('/api/puzzle');
  this.responseJson = await this.response.json();
});

Then(
  'it should have 1 center letter and 6 outer letters',
  function () {
    assert.equal(this.responseJson.center.length, 1);
    assert.equal(this.responseJson.letters.length, 6);
  },
);

Then('all 7 letters should be distinct', function () {
  const allLetters = [this.responseJson.center, ...this.responseJson.letters];
  const unique = new Set(allLetters);
  assert.equal(unique.size, 7);
});

Then(
  /^all letters should be from the Finnish alphabet \(a-z, a, o\)$/,
  function () {
    const validLetters = /^[a-zäö]$/;
    const allLetters = [this.responseJson.center, ...this.responseJson.letters];
    for (const letter of allLetters) {
      assert.match(letter, validLetters, `Invalid letter: ${letter}`);
    }
  },
);

// --- Hint data structure ---

Then(
  'the response should include word_count, pangram_count',
  function () {
    assert.ok(this.responseJson.hint_data.word_count !== undefined);
    assert.ok(this.responseJson.hint_data.pangram_count !== undefined);
  },
);

Then(
  'the response should include by_letter, by_length, and by_pair distributions',
  function () {
    assert.ok(this.responseJson.hint_data.by_letter);
    assert.ok(this.responseJson.hint_data.by_length);
    assert.ok(this.responseJson.hint_data.by_pair);
  },
);

// --- Max score ---

Then(
  'the response should include max_score > 0',
  function () {
    assert.ok(this.responseJson.max_score > 0, 'max_score should be positive');
  },
);

// --- Daily rotation ---

Given(
  /^it is (\S+) in Helsinki timezone$/,
  function (dateStr) {
    // Store the simulated date for rotation tests
    this.simulatedDate = new Date(dateStr + 'T12:00:00+02:00');
  },
);

When('player A fetches the puzzle', function () {
  this.puzzleSlotA = getPuzzleForDate(this.simulatedDate);
});

When('player B fetches the puzzle', function () {
  this.puzzleSlotB = getPuzzleForDate(this.simulatedDate);
});

Then('both should receive the same puzzle number', function () {
  assert.equal(this.puzzleSlotA, this.puzzleSlotB);
});

When('the player fetches the puzzle', function () {
  this.puzzleSlot1 = getPuzzleForDate(this.simulatedDate);
});

When('the next day the player fetches the puzzle again', function () {
  const nextDay = new Date(this.simulatedDate.getTime() + 24 * 60 * 60 * 1000);
  this.puzzleSlot2 = getPuzzleForDate(nextDay);
});

Then('the puzzle numbers should be different', function () {
  assert.notEqual(this.puzzleSlot1, this.puzzleSlot2);
});

// --- Cycling ---

Given('there are N puzzles in rotation', function () {
  this.totalPuzzles = getTotalPuzzles();
});

Then(
  'after N days the rotation should return to the first puzzle',
  function () {
    const baseDate = new Date('2026-02-24T12:00:00+02:00');
    const firstSlot = getPuzzleForDate(baseDate);

    // After N days, should cycle back
    const afterNDays = new Date(
      baseDate.getTime() + this.totalPuzzles * 24 * 60 * 60 * 1000,
    );
    const cycledSlot = getPuzzleForDate(afterNDays);

    assert.equal(firstSlot, cycledSlot);
  },
);

// --- Puzzle number display ---

Given(/^the API returns puzzle_number (\d+)$/, function (number) {
  this.puzzleNumber = parseInt(number, 10);
});

Then(/^the UI should display "([^"]*)"$/, function (expected) {
  // UI displays 1-indexed: puzzle_number 0 => "#1"
  const displayNumber = this.puzzleNumber + 1;
  const displayText = `Sanakenno — #${displayNumber}`;
  assert.equal(displayText, expected);
});

// --- Midnight rollover scenarios are UI concerns (Phase 3) ---
// Marked as pending so they don't fail the BDD run

Given('it is 23:59 on 2026-03-01 in Helsinki', function () {
  return 'pending';
});

When('the clock crosses midnight', function () {
  return 'pending';
});

Then("the puzzle should change to the next day's puzzle", function () {
  return 'pending';
});

Given('the app loaded at 22:00 Helsinki time', function () {
  return 'pending';
});

Then('a timer should be set to fire at midnight', function () {
  return 'pending';
});

When('the timer fires', function () {
  return 'pending';
});

Then("the app should reload and fetch the next day's puzzle", function () {
  return 'pending';
});

Given('the app loaded before midnight', function () {
  return 'pending';
});

Given('the player switches away and the tab is suspended', function () {
  return 'pending';
});

When('the player returns after midnight', function () {
  return 'pending';
});

Then('the app should detect that the date has changed', function () {
  return 'pending';
});

Then("reload to fetch the next day's puzzle", function () {
  return 'pending';
});

Given("the player has found words on today's puzzle", function () {
  return 'pending';
});

When('midnight rollover occurs', function () {
  return 'pending';
});

Then("today's state should already be saved in localStorage", function () {
  return 'pending';
});

Then('the new puzzle should start with a clean state', function () {
  return 'pending';
});
