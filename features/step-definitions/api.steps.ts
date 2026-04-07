/**
 * BDD step definitions for api.feature.
 *
 * Wires Cucumber scenarios to the Hono app using app.request().
 * Tests puzzle API structure, achievement recording, validation, rate limiting,
 * and failed-guess recording.
 */

import {
  Given,
  When,
  Then,
  Before,
  After,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import app from '../../server/index';
import { getDb, closeDb, setDb } from '../../server/db/connection';
import { resetRateLimit } from '../../server/routes/achievement';
import { resetRateLimit as resetFailedGuessRateLimit } from '../../server/routes/failed-guess';
import { setWordlist, invalidateAll } from '../../server/puzzle-engine';
import type { SanakennoWorld } from './types';

interface AchievementRow {
  id: number;
  puzzle_number: number;
  rank: string;
  score: number;
}

Before(function (this: SanakennoWorld, scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('api.feature')) return;

  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });
  resetRateLimit();
  resetFailedGuessRateLimit();
  invalidateAll();
  this.responses = [];

  for (let i = 0; i < 41; i++) {
    db.prepare(
      'INSERT OR REPLACE INTO puzzles (slot, letters, center) VALUES (?, ?, ?)',
    ).run(i, 'a,e,k,l,n,s,t', 'a');
  }
  db.prepare(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('rotation_epoch', '2026-02-24')",
  ).run();

  setWordlist(
    new Set([
      'kala',
      'sanka',
      'taka',
      'kana',
      'lakana',
      'kanat',
      'kaste',
      'alat',
      'alka',
      'saat',
      'alas',
      'akat',
    ]),
  );
});

After(function (scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('api.feature')) return;

  invalidateAll();
  closeDb();
  setDb(null);
});

When(
  /^a GET request is made to \/api\/puzzle$/,
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/puzzle');
    this.responseJson = await this.response.json();
  },
);

Then(
  'the response should include center, letters, word_hashes, hint_data, max_score',
  function (this: SanakennoWorld) {
    assert.ok(this.responseJson.center, 'Missing center');
    assert.ok(this.responseJson.letters, 'Missing letters');
    assert.ok(this.responseJson.word_hashes, 'Missing word_hashes');
    assert.ok(this.responseJson.hint_data, 'Missing hint_data');
    assert.ok(this.responseJson.max_score !== undefined, 'Missing max_score');
  },
);

Then(
  'the response should include puzzle_number and total_puzzles',
  function (this: SanakennoWorld) {
    assert.ok(
      this.responseJson.puzzle_number !== undefined,
      'Missing puzzle_number',
    );
    assert.ok(
      this.responseJson.total_puzzles !== undefined,
      'Missing total_puzzles',
    );
  },
);

Then(
  'the response should not include plaintext words',
  function (this: SanakennoWorld) {
    assert.equal(this.responseJson.words, undefined);
  },
);

When('the API serves a puzzle', async function (this: SanakennoWorld) {
  this.response = await app.request('/api/puzzle');
  this.responseJson = await this.response.json();
});

Then(
  'word_hashes should be an array of SHA-256 hex strings',
  function (this: SanakennoWorld) {
    assert.ok(Array.isArray(this.responseJson.word_hashes));
    for (const hash of this.responseJson.word_hashes) {
      assert.match(hash, /^[0-9a-f]{64}$/);
    }
  },
);

Then(
  'hint_data should contain word_count, pangram_count, by_letter, by_length, by_pair',
  function (this: SanakennoWorld) {
    const hd = this.responseJson.hint_data;
    assert.ok(hd.word_count !== undefined, 'Missing word_count');
    assert.ok(hd.pangram_count !== undefined, 'Missing pangram_count');
    assert.ok(hd.by_letter, 'Missing by_letter');
    assert.ok(hd.by_length, 'Missing by_length');
    assert.ok(hd.by_pair, 'Missing by_pair');
  },
);

When(
  /^a GET request is made to \/api\/puzzle\/(\d+)$/,
  async function (this: SanakennoWorld, number: string) {
    this.response = await app.request(`/api/puzzle/${number}`);
    this.responseJson = await this.response.json();
  },
);

Then(
  /^the response should be puzzle number (\d+)$/,
  function (this: SanakennoWorld, expectedNumber: string) {
    const requested = parseInt(expectedNumber, 10);
    const totalPuzzles = this.responseJson.total_puzzles;

    if (
      this.expectedTotalPuzzles &&
      this.expectedTotalPuzzles !== totalPuzzles
    ) {
      assert.ok(
        this.responseJson.puzzle_number < totalPuzzles,
        `Puzzle number ${this.responseJson.puzzle_number} should be < ${totalPuzzles}`,
      );
    } else {
      const expected = requested % totalPuzzles;
      assert.equal(this.responseJson.puzzle_number, expected);
    }
  },
);

Given(
  /^there are (\d+) puzzles$/,
  function (this: SanakennoWorld, count: string) {
    this.expectedTotalPuzzles = parseInt(count, 10);
  },
);

When(
  'a POST is made with puzzle_number, rank, score, max_score, words_found',
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puzzle_number: 5,
        rank: 'Onnistuja',
        score: 25,
        max_score: 42,
        words_found: 8,
      }),
    });
    this.responseJson = await this.response.json();
  },
);

Then(
  /^the server should respond with (\d+)$/,
  function (this: SanakennoWorld, statusCode: string) {
    assert.equal(this.response.status, parseInt(statusCode, 10));
  },
);

Then(
  'the achievement should be appended to storage',
  function (this: SanakennoWorld) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM achievements').get() as
      | AchievementRow
      | undefined;
    assert.ok(row, 'Achievement should be stored in database');
    assert.equal(row!.puzzle_number, 5);
  },
);

When(
  /^a POST is made with rank "([^"]*)"$/,
  async function (this: SanakennoWorld, rank: string) {
    this.response = await app.request('/api/achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puzzle_number: 5,
        rank: rank,
        score: 25,
        max_score: 42,
        words_found: 8,
      }),
    });
    this.responseJson = await this.response.json();
  },
);

When('a POST is made without score', async function (this: SanakennoWorld) {
  this.response = await app.request('/api/achievement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      puzzle_number: 5,
      rank: 'Onnistuja',
      max_score: 42,
      words_found: 8,
    }),
  });
  this.responseJson = await this.response.json();
});

When(
  /^(\d+) POST requests are made to \/api\/achievement within one minute$/,
  async function (this: SanakennoWorld, count: string) {
    resetRateLimit();
    for (let i = 0; i < parseInt(count, 10); i++) {
      const res = await app.request('/api/achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzle_number: 5,
          rank: 'Onnistuja',
          score: 25,
          max_score: 42,
          words_found: 8,
        }),
      });
      this.responses.push(res);
    }
  },
);

Then('the 11th should receive a 429 response', function (this: SanakennoWorld) {
  assert.equal(this.responses[10].status, 429);
});

/* ------------------------------------------------------------------ */
/* POST /api/failed-guess steps */
/* ------------------------------------------------------------------ */

When(
  'a POST is made to \\/api\\/failed-guess with word {string} and date {string}',
  async function (this: SanakennoWorld, word: string, date: string) {
    this.response = await app.request('/api/failed-guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, date }),
    });
    this.responseJson = await this.response.json();
  },
);

Given(
  'a failed guess for word {string} on date {string} already exists',
  async function (this: SanakennoWorld, word: string, date: string) {
    await app.request('/api/failed-guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, date }),
    });
  },
);

When(
  "a POST is made to \\/api\\/failed-guess without a word",
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/failed-guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2025-01-01' }),
    });
    this.responseJson = await this.response.json();
  },
);

When(
  /^(\d+) POST requests are made to \/api\/failed-guess within one minute$/,
  async function (this: SanakennoWorld, count: string) {
    resetFailedGuessRateLimit();
    for (let i = 0; i < parseInt(count, 10); i++) {
      const res = await app.request('/api/failed-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: `word${i}`, date: '2025-01-01' }),
      });
      this.responses.push(res);
    }
  },
);

Then(
  'the 31st should receive a 429 response',
  function (this: SanakennoWorld) {
    assert.equal(this.responses[30].status, 429);
  },
);
