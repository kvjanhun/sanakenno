/**
 * BDD step definitions for stats.feature.
 *
 * Tests the pure stat computation functions.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  emptyStats,
  updateStatsRecord,
  computeStreak,
  computeRankDistribution,
  computeAverageCompletion,
} from '@sanakenno/shared';
import type { StatsRecord } from '@sanakenno/shared';
import type { SanakennoWorld } from './types';

Before(function (this: SanakennoWorld) {
  this.playerStats = emptyStats();
});

/** Helper to build a minimal stats record. */
function makeRecord(
  overrides: Partial<StatsRecord> & { puzzle_number: number; date: string },
): StatsRecord {
  return {
    best_rank: 'Etsi sanoja!',
    best_score: 0,
    max_score: 100,
    words_found: 0,
    hints_used: 0,
    elapsed_ms: 0,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Data recording                                                     */
/* ------------------------------------------------------------------ */

Given('the player has no stats yet', function (this: SanakennoWorld) {
  this.playerStats = emptyStats();
});

When(
  'the player finds their first word on puzzle {int} dated {string}',
  function (this: SanakennoWorld, puzzleNum: number, date: string) {
    this.playerStats = updateStatsRecord(
      this.playerStats,
      makeRecord({
        puzzle_number: puzzleNum,
        date,
        best_rank: 'Hyvä alku',
        best_score: 1,
        words_found: 1,
      }),
    );
  },
);

Then(
  'a stats record should exist for puzzle {int}',
  function (this: SanakennoWorld, puzzleNum: number) {
    const rec = this.playerStats.records.find(
      (r) => r.puzzle_number === puzzleNum,
    );
    assert.ok(rec, `No record found for puzzle ${puzzleNum}`);
  },
);

Given(
  'a stats record for puzzle {int} with best_rank {string}',
  function (this: SanakennoWorld, puzzleNum: number, rank: string) {
    this.playerStats = updateStatsRecord(
      this.playerStats,
      makeRecord({
        puzzle_number: puzzleNum,
        date: '2026-04-01',
        best_rank: rank,
        best_score: 20,
      }),
    );
  },
);

When(
  'the stats record is updated with rank {string} on puzzle {int}',
  function (this: SanakennoWorld, rank: string, puzzleNum: number) {
    this.playerStats = updateStatsRecord(
      this.playerStats,
      makeRecord({
        puzzle_number: puzzleNum,
        date: '2026-04-01',
        best_rank: rank,
        best_score: 40,
      }),
    );
  },
);

Then(
  'the stats record best_rank should be {string}',
  function (this: SanakennoWorld, expected: string) {
    const rec = this.playerStats.records[this.playerStats.records.length - 1];
    assert.ok(rec);
    assert.equal(rec.best_rank, expected);
  },
);

Then(
  'the stats record best_rank should still be {string}',
  function (this: SanakennoWorld, expected: string) {
    const rec = this.playerStats.records[this.playerStats.records.length - 1];
    assert.ok(rec);
    assert.equal(rec.best_rank, expected);
  },
);

/* ------------------------------------------------------------------ */
/*  Streaks                                                            */
/* ------------------------------------------------------------------ */

Given(
  'stats records for dates {string}',
  function (this: SanakennoWorld, datesStr: string) {
    const dates = datesStr.split('|');
    this.playerStats = emptyStats();
    dates.forEach((date, i) => {
      this.playerStats = updateStatsRecord(
        this.playerStats,
        makeRecord({
          puzzle_number: i,
          date,
          best_rank: 'Onnistuja',
          best_score: 20,
        }),
      );
    });
  },
);

Then(
  'the current streak should be {int}',
  function (this: SanakennoWorld, expected: number) {
    // Use the latest date in records as "today"
    const dates = this.playerStats.records
      .map((r) => r.date)
      .sort()
      .reverse();
    const { current } = computeStreak(this.playerStats.records, dates[0]);
    assert.equal(current, expected);
  },
);

Then(
  'the best streak should be {int}',
  function (this: SanakennoWorld, expected: number) {
    const dates = this.playerStats.records
      .map((r) => r.date)
      .sort()
      .reverse();
    const { best } = computeStreak(this.playerStats.records, dates[0]);
    assert.equal(best, expected);
  },
);

/* ------------------------------------------------------------------ */
/*  Rank distribution                                                  */
/* ------------------------------------------------------------------ */

Given(
  'stats records with best ranks {string}',
  function (this: SanakennoWorld, ranksStr: string) {
    const ranks = ranksStr.split('|');
    this.playerStats = emptyStats();
    ranks.forEach((rank, i) => {
      this.playerStats = updateStatsRecord(
        this.playerStats,
        makeRecord({
          puzzle_number: i,
          date: `2026-03-${String(i + 1).padStart(2, '0')}`,
          best_rank: rank,
          best_score: 20,
        }),
      );
    });
  },
);

Then(
  'the rank distribution should show Onnistuja: {int} and Sanavalmis: {int}',
  function (this: SanakennoWorld, oCount: number, sCount: number) {
    const dist = computeRankDistribution(this.playerStats.records);
    assert.equal(dist['Onnistuja'] || 0, oCount);
    assert.equal(dist['Sanavalmis'] || 0, sCount);
  },
);

/* ------------------------------------------------------------------ */
/*  Average completion                                                 */
/* ------------------------------------------------------------------ */

Given(
  'a stats record with score {int} and max_score {int}',
  function (this: SanakennoWorld, score: number, maxScore: number) {
    const idx = this.playerStats.records.length;
    this.playerStats = updateStatsRecord(
      this.playerStats,
      makeRecord({
        puzzle_number: 100 + idx,
        date: `2026-03-${String(idx + 1).padStart(2, '0')}`,
        best_score: score,
        max_score: maxScore,
        best_rank: 'Onnistuja',
      }),
    );
  },
);

Then(
  'the average completion should be {float}%',
  function (this: SanakennoWorld, expected: number) {
    const avg = computeAverageCompletion(this.playerStats.records);
    assert.ok(
      Math.abs(avg - expected) < 0.1,
      `Expected ~${expected}%, got ${avg}%`,
    );
  },
);
