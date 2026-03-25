/**
 * BDD step definitions for persistence.feature.
 *
 * All scenarios require localStorage and Zustand store — marked pending
 * until browser/integration testing infrastructure is available.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import type { SanakennoWorld } from './types.js';

Given(
  'the player is on puzzle number {int}',
  function (this: SanakennoWorld, _puzzleNum: number) {
    return 'pending';
  },
);

When(
  'the player finds a word',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'localStorage key {string} should be updated',
  function (this: SanakennoWorld, _key: string) {
    return 'pending';
  },
);

Given(
  'the player found {int} words on puzzle {int}',
  function (this: SanakennoWorld, _wordCount: number, _puzzleNum: number) {
    return 'pending';
  },
);

When(
  'the player loads puzzle {int}',
  function (this: SanakennoWorld, _puzzleNum: number) {
    return 'pending';
  },
);

Then(
  'the found words list should be empty',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the score should be {int}',
  function (this: SanakennoWorld, _score: number) {
    return 'pending';
  },
);

When(
  'the player finds words and unlocks hints',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the found words should be restored',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the score should be restored',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the unlocked hints should be restored',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the timer start time should be restored',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the player has saved words for puzzle {int}',
  function (this: SanakennoWorld, _puzzleNum: number) {
    return 'pending';
  },
);

When(
  'a word is removed from the dictionary \\(blocked)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

When(
  'the player reloads',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the blocked word should be removed from found words',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the score should be recalculated',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'localStorage has a {string} key with puzzle number {int}',
  function (this: SanakennoWorld, _key: string, _puzzleNum: number) {
    return 'pending';
  },
);

Then(
  'the legacy data should be migrated to {string}',
  function (this: SanakennoWorld, _key: string) {
    return 'pending';
  },
);

Then(
  'the legacy key should be removed',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'localStorage does not have a {string} key',
  function (this: SanakennoWorld, _key: string) {
    return 'pending';
  },
);

Then(
  'migration should not run',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'the game should load normally',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);
