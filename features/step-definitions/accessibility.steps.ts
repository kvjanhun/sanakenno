/**
 * BDD step definitions for accessibility.feature.
 *
 * All scenarios require a real browser (keyboard events, touch handling,
 * CSS inspection) — marked pending until Playwright E2E is available.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import type { SanakennoWorld } from './types.js';

Given('the puzzle is loaded', function (this: SanakennoWorld) {
  return 'pending';
});

When(
  'the player presses Ctrl+A, Alt+K, or Cmd+S',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'no letters should be added to the current word',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When('the player presses Tab', function (this: SanakennoWorld) {
  return 'pending';
});

Then('no letter should be added', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'default browser focus behaviour should not be prevented',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When(
  'the player presses a letter key \\(a-z, ä, ö, or hyphen)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the letter should be appended to the current word',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When(
  'the player presses any other key \\(numbers, symbols)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the app is running in standalone mode on iOS',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When(
  'the player taps twice quickly on a hexagon',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('the page should not zoom', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'both taps should register as letter input',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When('the page loads', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'all interactive elements should have touch-action: manipulation',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'pinch-to-zoom should be the only allowed gesture besides taps',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the app is running on a device with a notch or home indicator',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the UI should not be obscured by the notch',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the bottom controls should clear the home indicator area',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);
