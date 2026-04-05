/**
 * BDD step definitions for interaction.feature.
 *
 * These scenarios test UI interactions (keyboard input, hexagon taps,
 * animations, clipboard) that require a real browser environment.
 * All steps return 'pending' — they will be implemented as Playwright E2E tests.
 *
 * Steps shared with other feature files (accessibility, scoring, word-validation)
 * are defined in those respective step files to avoid ambiguity.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import type { SanakennoWorld } from './types';

// --- Input methods ---
// Note: "the puzzle is loaded" is defined in accessibility.steps.ts

When(
  'the player presses {string}, {string}, {string}, {string}',
  function (
    this: SanakennoWorld,
    _a: string,
    _b: string,
    _c: string,
    _d: string,
  ) {
    return 'pending';
  },
);

Then(
  'the current word display should show {string}',
  function (this: SanakennoWorld, _word: string) {
    return 'pending';
  },
);

When(
  'the player taps the hexagon for {string}',
  function (this: SanakennoWorld, _letter: string) {
    return 'pending';
  },
);

When(
  'taps the hexagon for {string}',
  function (this: SanakennoWorld, _letter: string) {
    return 'pending';
  },
);

Given(
  'the current word is {string}',
  function (this: SanakennoWorld, _word: string) {
    return 'pending';
  },
);

When('the player presses Backspace', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the current word should be {string}',
  function (this: SanakennoWorld, _word: string) {
    return 'pending';
  },
);

When(
  'the player taps the {string} button',
  function (this: SanakennoWorld, _button: string) {
    return 'pending';
  },
);

Given(
  'the current word is {string} and it is valid',
  function (this: SanakennoWorld, _word: string) {
    return 'pending';
  },
);

When('the player presses Enter', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the word should be submitted for validation',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given('the rules modal is open', function (this: SanakennoWorld) {
  return 'pending';
});

When('the player presses any letter key', function (this: SanakennoWorld) {
  return 'pending';
});

Then('the current word should not change', function (this: SanakennoWorld) {
  return 'pending';
});

// --- Feedback and Validation ---

Given('the player submits an invalid word', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the word should shake and show an error message',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the word should remain visible for 2 seconds before clearing',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given('a rejected word is currently visible', function (this: SanakennoWorld) {
  return 'pending';
});

When(
  'the player presses a letter or Backspace',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('the rejected word should be cleared', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the new input should be processed normally',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

// --- Honeycomb ---

When('the puzzle loads', function (this: SanakennoWorld) {
  return 'pending';
});

Then('7 hexagons should be rendered', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the center hexagon should be visually distinct',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the center hexagon should show the center letter',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  /^the outer letters are in position \[(.+)\]$/,
  function (this: SanakennoWorld, _letters: string) {
    return 'pending';
  },
);

When('the player presses the shuffle button', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the outer letters should be in a different order',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the center letter should remain unchanged',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

// --- Found words display ---

Given(
  'the player has found {int} words',
  function (this: SanakennoWorld, _count: number) {
    return 'pending';
  },
);

Given(
  'the player has found at least {int} word',
  function (this: SanakennoWorld, _count: number) {
    return 'pending';
  },
);

Then(
  'the {int} most recently found should be visible',
  function (this: SanakennoWorld, _count: number) {
    return 'pending';
  },
);

Then('an expand button should be available', function (this: SanakennoWorld) {
  return 'pending';
});

When(
  'the player expands the found words list',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'all words should be shown sorted alphabetically',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('the words should be grouped by length', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the shortest words of each first letter should be first',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the player already found {string}',
  function (this: SanakennoWorld, _word: string) {
    return 'pending';
  },
);

// Note: "the player submits {string} again" is defined in scoring.steps.ts

Then(
  '{string} should briefly flash orange in the found list',
  function (this: SanakennoWorld, _word: string) {
    return 'pending';
  },
);

// --- Word display colouring ---
// Note: "the center letter is {string}" defined in ranks.steps.ts or elsewhere if needed

Given(
  /^the center letter is "([^"]*)"$/,
  function (this: SanakennoWorld, _letter: string) {
    return 'pending';
  },
);

// Note: "the player types {string}" is defined in word-validation.steps.ts

Then(
  'the {string} characters should be in accent colour',
  function (this: SanakennoWorld, _char: string) {
    return 'pending';
  },
);

Then(
  'the {string} and {string} should be in primary colour',
  function (this: SanakennoWorld, _a: string, _b: string) {
    return 'pending';
  },
);

// --- Share ---

Given(
  'the player has score {int} on puzzle {int} with rank {string}',
  function (
    this: SanakennoWorld,
    _score: number,
    _puzzle: number,
    _rank: string,
  ) {
    return 'pending';
  },
);

When('the player taps the share button', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the clipboard should contain the puzzle number, rank, score, progress bar, and hints',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'a {string} popup should appear below the share button without shifting layout',
  function (this: SanakennoWorld, _text: string) {
    return 'pending';
  },
);

Given(
  'the player has score {int} of max {int} on puzzle {int}',
  function (
    this: SanakennoWorld,
    _score: number,
    _max: number,
    _puzzle: number,
  ) {
    return 'pending';
  },
);

Given('the rank is {string}', function (this: SanakennoWorld, _rank: string) {
  return 'pending';
});

Given(
  'hints {string} and {string} are unlocked',
  function (this: SanakennoWorld, _a: string, _b: string) {
    return 'pending';
  },
);

Given(
  'score before hints is {int}',
  function (this: SanakennoWorld, _score: number) {
    return 'pending';
  },
);

Then(
  'the clipboard text should match this format:',
  function (this: SanakennoWorld, _docString: string) {
    return 'pending';
  },
);

Given('no hints are unlocked', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the share text rank line should start with {string}',
  function (this: SanakennoWorld, _prefix: string) {
    return 'pending';
  },
);

When('the player shares their result', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the share text should not include a hint icon line',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

// --- Midnight countdown (Rules modal) ---

Given('the player opens the rules modal', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'a midnight countdown timer should be visible',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'it should display {string} label',
  function (this: SanakennoWorld, _label: string) {
    return 'pending';
  },
);

Then(
  'it should show time in HH:mm:ss \\(24-hour) format',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'it should be based on Helsinki timezone \\(Europe/Helsinki)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When('1 second passes', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the countdown should decrease by 1 second',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('the display should update', function (this: SanakennoWorld) {
  return 'pending';
});

When(
  'the countdown reaches 29:59 \\(less than 30 minutes)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the timer text should be displayed in accent colour',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the label {string} should remain in default color',
  function (this: SanakennoWorld, _label: string) {
    return 'pending';
  },
);
