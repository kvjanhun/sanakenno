/**
 * BDD step definitions for archive.feature.
 *
 * Tests the /api/archive endpoint via Hono's app.request().
 */

import {
  When,
  Then,
  Before,
  After,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import app from '../../server/index';
import { getDb, closeDb, setDb } from '../../server/db/connection';
import {
  setWordlist,
  invalidateAll,
  getPuzzleForDate,
} from '../../server/puzzle-engine';
import type { SanakennoWorld } from './types';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
  max_score: number;
}

Before(function (this: SanakennoWorld, scenario: ITestCaseHookParameter) {
  if (!scenario.gherkinDocument?.uri?.includes('archive.feature')) return;

  closeDb();
  setDb(null);
  const db = getDb({ inMemory: true });
  invalidateAll();
  this.archiveEntries = [];

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
  if (!scenario.gherkinDocument?.uri?.includes('archive.feature')) return;

  invalidateAll();
  closeDb();
  setDb(null);
});

When(
  'a GET request is made to \\/api\\/archive',
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/archive');
    this.responseJson = await this.response.json();
    this.archiveEntries = this.responseJson as unknown as ArchiveEntry[];
  },
);

Then(
  'the response status should be {int}',
  function (this: SanakennoWorld, status: number) {
    assert.equal(this.response.status, status);
  },
);

Then(
  'the response should contain {int} entries',
  function (this: SanakennoWorld, count: number) {
    assert.equal(this.archiveEntries.length, count);
  },
);

Then(
  'each entry should include date, puzzle_number, letters, center, and max_score',
  function (this: SanakennoWorld) {
    for (const entry of this.archiveEntries) {
      assert.ok(typeof entry.date === 'string', 'date should be a string');
      assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(
        typeof entry.puzzle_number === 'number',
        'puzzle_number should be a number',
      );
      assert.ok(Array.isArray(entry.letters), 'letters should be an array');
      assert.ok(entry.letters.length === 7, 'letters should have 7 items');
      assert.ok(typeof entry.center === 'string', 'center should be a string');
      assert.ok(
        typeof entry.is_today === 'boolean',
        'is_today should be a boolean',
      );
      assert.ok(
        typeof entry.max_score === 'number',
        'max_score should be a number',
      );
    }
  },
);

Then(
  'the first entry should have is_today true',
  function (this: SanakennoWorld) {
    assert.equal(this.archiveEntries[0].is_today, true);
  },
);

Then(
  'the last entry should be 6 days before the first',
  function (this: SanakennoWorld) {
    const first = new Date(this.archiveEntries[0].date + 'T12:00:00');
    const last = new Date(
      this.archiveEntries[this.archiveEntries.length - 1].date + 'T12:00:00',
    );
    const diffDays = Math.round(
      (first.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
    assert.equal(diffDays, 6);
  },
);

Then(
  'exactly one entry should have is_today true',
  function (this: SanakennoWorld) {
    const todayCount = this.archiveEntries.filter(
      (e: ArchiveEntry) => e.is_today,
    ).length;
    assert.equal(todayCount, 1);
  },
);

When(
  /^a GET request is made to \/api\/archive\?all=true$/,
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/archive?all=true');
    this.responseJson = await this.response.json();
    this.archiveEntries = this.responseJson as unknown as ArchiveEntry[];
  },
);

Then(
  'the response should contain more than {int} entries',
  function (this: SanakennoWorld, minCount: number) {
    assert.ok(
      this.archiveEntries.length > minCount,
      `Expected more than ${minCount} entries, got ${this.archiveEntries.length}`,
    );
  },
);

When(
  'a GET request is made to \\/api\\/puzzle\\/{int}\\/words',
  async function (this: SanakennoWorld, puzzleNumber: number) {
    this.response = await app.request(`/api/puzzle/${puzzleNumber}/words`);
    this.responseJson = await this.response.clone().json();
  },
);

When(
  /^a GET request is made to \/api\/puzzle\/([a-zA-Z][a-zA-Z0-9]*)\/words$/,
  async function (this: SanakennoWorld, identifier: string) {
    if (identifier === 'today') {
      const now = new Date();
      const helsinki = new Date(
        now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
      );
      const todaySlot = getPuzzleForDate(helsinki);
      this.response = await app.request(`/api/puzzle/${todaySlot}/words`);
    } else {
      this.response = await app.request(`/api/puzzle/${identifier}/words`);
    }
    this.responseJson = await this.response.clone().json();
  },
);

Then(
  'the response should contain a {string} array',
  function (this: SanakennoWorld, field: string) {
    assert.ok(
      Array.isArray((this.responseJson as Record<string, unknown>)[field]),
      `Expected "${field}" to be an array`,
    );
  },
);
