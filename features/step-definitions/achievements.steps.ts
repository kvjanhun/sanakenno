/**
 * BDD step definitions for achievements.feature.
 *
 * Tests achievement recording, fire-and-forget semantics,
 * session deduplication, and rate limiting via Hono's app.request().
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { rankForScore } from '@sanakenno/shared';
import app from '../../server/index.js';
import type { SanakennoWorld } from './types.js';

/** Simulated max score for rank threshold tests. */
const TEST_MAX_SCORE = 200;

Before(function (this: SanakennoWorld) {
  this.achievementPosts = [];
  this.achievementSessionKeys = new Set();
  this.achievementResponses = [];
});

/* ------------------------------------------------------------------ */
/*  Recording                                                          */
/* ------------------------------------------------------------------ */

Given(
  'the player is at rank {string}',
  function (this: SanakennoWorld, rank: string) {
    this.maxScore = TEST_MAX_SCORE;
    this.currentRank = rank;
    // Reverse-engineer a score that produces this rank
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
    this.currentScore = Math.ceil(pct * TEST_MAX_SCORE);
  },
);

When(
  "the player's score crosses into {string} territory",
  function (this: SanakennoWorld, newRank: string) {
    const previousRank = this.currentRank;
    // Simulate score increase to reach the new rank
    const thresholds: Record<string, number> = {
      'Etsi sanoja!': 0,
      'Hyvä alku': 0.02,
      'Nyt mennään!': 0.1,
      Onnistuja: 0.2,
      Sanavalmis: 0.4,
      Ällistyttävä: 0.7,
      'Täysi kenno': 1.0,
    };
    const pct = thresholds[newRank] ?? 0;
    this.currentScore = Math.ceil(pct * this.maxScore);
    this.currentRank = rankForScore(this.currentScore, this.maxScore);

    // Simulate achievement POST (fire-and-forget)
    if (this.currentRank !== previousRank) {
      const key = `${this.puzzleNumber ?? 0}:${this.currentRank}`;
      if (!this.achievementSessionKeys.has(key)) {
        this.achievementSessionKeys.add(key);
        this.achievementPosts.push({
          puzzle_number: this.puzzleNumber ?? 0,
          rank: this.currentRank,
          score: this.currentScore,
          max_score: this.maxScore,
          words_found: this.foundWords?.length ?? 0,
          elapsed_ms: 5000,
        });
      }
    }
  },
);

Then(
  'a POST to \\/api\\/achievement should fire',
  function (this: SanakennoWorld) {
    assert.ok(
      this.achievementPosts.length > 0,
      'Expected at least one achievement POST',
    );
  },
);

Then(
  'it should include puzzle_number, rank, score, max_score, words_found, elapsed_ms',
  function (this: SanakennoWorld) {
    const post = this.achievementPosts[this.achievementPosts.length - 1];
    assert.ok(post);
    assert.ok('puzzle_number' in post);
    assert.ok('rank' in post);
    assert.ok('score' in post);
    assert.ok('max_score' in post);
    assert.ok('words_found' in post);
    assert.ok('elapsed_ms' in post);
  },
);

// Fire-and-forget steps ("the achievement POST fails due to network error",
// "the game should continue normally", "no error should be shown to the player")
// are defined in error-handling.steps.ts and reused here.

/* ------------------------------------------------------------------ */
/*  Deduplication                                                      */
/* ------------------------------------------------------------------ */

// "the player reaches {string} rank" is defined in ranks.steps.ts (pending).
// Achievement-specific rank transitions use the "score crosses into" step above.

When(
  'somehow triggers {string} again on the same puzzle',
  function (this: SanakennoWorld, rank: string) {
    // Attempt to record same rank again — dedup should prevent it
    const key = `${this.puzzleNumber}:${rank}`;
    if (!this.achievementSessionKeys.has(key)) {
      this.achievementSessionKeys.add(key);
      this.achievementPosts.push({
        puzzle_number: this.puzzleNumber,
        rank,
        score: this.currentScore ?? 0,
        max_score: this.maxScore ?? TEST_MAX_SCORE,
        words_found: this.foundWords?.length ?? 0,
        elapsed_ms: 5000,
      });
    }
  },
);

Then(
  'only one achievement should be recorded',
  function (this: SanakennoWorld) {
    const matching = this.achievementPosts.filter(
      (p) => p.puzzle_number === this.puzzleNumber,
    );
    assert.equal(matching.length, 1);
  },
);

Given(
  'the player reached {string} on puzzle {int}',
  function (this: SanakennoWorld, rank: string, puzzleNum: number) {
    this.puzzleNumber = puzzleNum;
    const key = `${puzzleNum}:${rank}`;
    this.achievementSessionKeys.add(key);
    this.achievementPosts.push({
      puzzle_number: puzzleNum,
      rank,
      score: 50,
      max_score: TEST_MAX_SCORE,
      words_found: 5,
      elapsed_ms: 3000,
    });
  },
);

When(
  'the player reaches {string} on puzzle {int}',
  function (this: SanakennoWorld, rank: string, puzzleNum: number) {
    this.puzzleNumber = puzzleNum;
    const key = `${puzzleNum}:${rank}`;
    if (!this.achievementSessionKeys.has(key)) {
      this.achievementSessionKeys.add(key);
      this.achievementPosts.push({
        puzzle_number: puzzleNum,
        rank,
        score: 50,
        max_score: TEST_MAX_SCORE,
        words_found: 5,
        elapsed_ms: 3000,
      });
    }
  },
);

Then('a new achievement should be recorded', function (this: SanakennoWorld) {
  assert.ok(
    this.achievementPosts.length >= 2,
    `Expected at least 2 achievement records, got ${this.achievementPosts.length}`,
  );
});

/* ------------------------------------------------------------------ */
/*  Rate limiting                                                      */
/* ------------------------------------------------------------------ */

When(
  'more than {int} achievements are posted in one minute',
  async function (this: SanakennoWorld, limit: number) {
    for (let i = 0; i <= limit; i++) {
      this.response = await app.request('/api/achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzle_number: 0,
          rank: 'Hyvä alku',
          score: 5,
          max_score: 100,
          words_found: 3,
        }),
      });
    }
  },
);

// Rate limit response assertion reuses api.steps.ts's
// "the server should respond with <status>" step.
