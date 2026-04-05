/**
 * BDD step definitions for theme.feature.
 *
 * All scenarios require DOM access (data-theme attribute, localStorage) —
 * marked pending until E2E infrastructure is available.
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

When(
  'the player taps the theme toggle button',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then('the theme should change to dark', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'the theme preference should be saved in localStorage',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given('the player has set the theme to dark', function (this: SanakennoWorld) {
  return 'pending';
});

Then('the theme should remain dark', function (this: SanakennoWorld) {
  return 'pending';
});
