/**
 * BDD step definitions for server-errors.feature.
 *
 * Tests structured error responses from the API.
 * Uses in-memory DB to ensure clean state.
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
import { setWordlist, invalidateAll } from '../../server/puzzle-engine';
import { resetRateLimit } from '../../server/routes/achievement';
import type { SanakennoWorld } from './types';

Before(function (this: SanakennoWorld, scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('server-errors.feature')) return;

  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });
  invalidateAll();
  resetRateLimit();

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
  if (!scenario.gherkinDocument?.uri?.includes('server-errors.feature')) return;

  invalidateAll();
  closeDb();
  setDb(null);
});

Given('the puzzle database is empty', function (this: SanakennoWorld) {
  const db = getDb();
  db.prepare('DELETE FROM puzzles').run();
  invalidateAll();
});

When(
  'the puzzle endpoint is called with slot {int}',
  async function (this: SanakennoWorld, number: number) {
    this.response = await app.request(`/api/puzzle/${number}`);
    const text = await this.response.text();
    try {
      this.responseJson = JSON.parse(text);
    } catch {
      this.responseJson = { raw: text };
    }
  },
);

When(
  'the achievement endpoint receives invalid JSON',
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    this.responseJson = await this.response.json();
  },
);

When(
  'the achievement endpoint receives a body with missing fields',
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle_number: 1 }),
    });
    this.responseJson = await this.response.json();
  },
);

When('the health endpoint is called', async function (this: SanakennoWorld) {
  this.response = await app.request('/api/health');
  this.responseJson = await this.response.json();
});

Then(
  'the server-error response status should be {int}',
  function (this: SanakennoWorld, status: number) {
    assert.equal(this.response.status, status);
  },
);

Then(
  'the response should include an error message',
  function (this: SanakennoWorld) {
    assert.ok(
      typeof this.responseJson.error === 'string',
      'Response should include an error field',
    );
  },
);

Then(
  'the response should include status {string}',
  function (this: SanakennoWorld, status: string) {
    assert.equal(this.responseJson.status, status);
  },
);
