/**
 * BDD step definitions for theme.feature.
 *
 * All scenarios are @e2e (require DOM / device access) — returned as pending.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import type { SanakennoWorld } from './types';

When('the player first loads the app', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the theme should match their system preference \\(light or dark)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given('the current theme is light', function (this: SanakennoWorld) {
  return 'pending';
});

Given('the current theme is dark', function (this: SanakennoWorld) {
  return 'pending';
});

Given(
  'the active color palette is {string}',
  function (this: SanakennoWorld, _palette: string) {
    return 'pending';
  },
);

When('the player selects dark theme', function (this: SanakennoWorld) {
  return 'pending';
});

When('the player selects light theme', function (this: SanakennoWorld) {
  return 'pending';
});

When('the player selects system theme', function (this: SanakennoWorld) {
  return 'pending';
});

Then('the theme should change to dark', function (this: SanakennoWorld) {
  return 'pending';
});

Then('the theme should change to light', function (this: SanakennoWorld) {
  return 'pending';
});

Then('the theme preference should be saved', function (this: SanakennoWorld) {
  return 'pending';
});

Given('the player has set the theme to dark', function (this: SanakennoWorld) {
  return 'pending';
});

Then('the theme should remain dark', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  "accent-colored controls should use the palette's on-accent text color",
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the player has found all words in the puzzle',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the completed honeycomb center hex should keep the active palette accent',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);
