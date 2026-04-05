/**
 * BDD step definitions for definitions.feature.
 *
 * Tests the pure Kotus URL builder function.
 */

import { Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { buildKotusUrl } from '@sanakenno/shared';
import type { SanakennoWorld } from './types.js';

Given(
  'the found word is {string}',
  function (this: SanakennoWorld, word: string) {
    this.kotusUrl = buildKotusUrl(word);
  },
);

Then(
  'the Kotus URL should be {string}',
  function (this: SanakennoWorld, expected: string) {
    assert.equal(this.kotusUrl, expected);
  },
);
