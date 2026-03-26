/**
 * BDD step definitions for ranks.feature.
 *
 * Tests rank progression logic via the pure scoring utilities.
 * Celebration/message display scenarios are marked pending (need E2E/Zustand).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  rankForScore,
  rankThresholds,
  progressToNextRank,
} from '../../src/utils/scoring.js';
import type { SanakennoWorld } from './types.js';

Given(
  'a puzzle with a max score of {int}',
  function (this: SanakennoWorld, maxScore: number) {
    this.maxScore = maxScore;
    this.currentScore = 0;
    this.currentRank = rankForScore(0, maxScore);
  },
);

When(
  "the player's score is {int}",
  function (this: SanakennoWorld, score: number) {
    this.currentScore = score;
    this.currentRank = rankForScore(score, this.maxScore);
  },
);

When(
  "the player's rank is {string}",
  function (this: SanakennoWorld, rank: string) {
    this.currentRank = rank;
  },
);

When(
  'the player reaches {string} rank',
  function (this: SanakennoWorld, rank: string) {
    const thresholds: Record<string, number> = {
      'Etsi sanoja!': 0,
      'Hyvä alku': 0.02,
      'Nyt mennään!': 0.1,
      Onnistuja: 0.2,
      Sanavalmis: 0.4,
      Ällistyttävä: 0.7,
      'Täysi kenno': 1.0,
    };
    const pct = thresholds[rank] ?? 0;
    this.maxScore = this.maxScore || 200;
    this.currentScore = Math.ceil(pct * this.maxScore);
    this.currentRank = rank;
    this.puzzleNumber = this.puzzleNumber ?? 0;

    const key = `${this.puzzleNumber}:${rank}`;
    if (!this.achievementSessionKeys.has(key)) {
      this.achievementSessionKeys.add(key);
      this.achievementPosts.push({
        puzzle_number: this.puzzleNumber,
        rank,
        score: this.currentScore,
        max_score: this.maxScore,
        words_found: this.foundWords?.length ?? 0,
        elapsed_ms: 5000,
      });
    }
  },
);

Then(
  "the player's rank should be {string}",
  function (this: SanakennoWorld, expectedRank: string) {
    assert.equal(this.currentRank, expectedRank);
  },
);

Then(
  'the rank should be {string}',
  function (this: SanakennoWorld, expectedRank: string) {
    assert.equal(this.currentRank, expectedRank);
  },
);

Then(
  'the progress toward {string} should be {int}%',
  function (this: SanakennoWorld, _nextRank: string, expectedPct: number) {
    const progress = progressToNextRank(this.currentScore, this.maxScore);
    assert.equal(Math.floor(progress), expectedPct);
  },
);

Then(
  'the progress should be {int}%',
  function (this: SanakennoWorld, expectedPct: number) {
    const progress = progressToNextRank(this.currentScore, this.maxScore);
    assert.equal(Math.floor(progress), expectedPct);
  },
);

Then(
  'the rank list should not show {string}',
  function (this: SanakennoWorld, hiddenRank: string) {
    const thresholds = rankThresholds(this.currentRank, this.maxScore);
    const names = thresholds.map((t) => t.name);
    assert.ok(
      !names.includes(hiddenRank),
      `Expected "${hiddenRank}" to be hidden but it was in the list`,
    );
  },
);

Then(
  'the rank list should show {string}',
  function (this: SanakennoWorld, visibleRank: string) {
    const thresholds = rankThresholds(this.currentRank, this.maxScore);
    const names = thresholds.map((t) => t.name);
    assert.ok(
      names.includes(visibleRank),
      `Expected "${visibleRank}" to be visible but it was not in the list`,
    );
  },
);

Then(
  'a celebration banner should appear for {int} seconds',
  function (this: SanakennoWorld, _seconds: number) {
    return 'pending';
  },
);

Then(
  'a golden celebration should appear for {int} seconds',
  function (this: SanakennoWorld, _seconds: number) {
    return 'pending';
  },
);

Then(
  'the message {string} should appear for {int} seconds',
  function (this: SanakennoWorld, _message: string, _seconds: number) {
    return 'pending';
  },
);
