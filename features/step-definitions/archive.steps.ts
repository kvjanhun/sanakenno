/**
 * BDD step definitions for archive.feature.
 *
 * Tests the /api/archive endpoint via Hono's app.request().
 */

import { When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import app from '../../server/index.js';
import type { SanakennoWorld } from './types.js';

interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
}

Before(function (this: SanakennoWorld) {
  this.archiveEntries = [];
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
  'each entry should include date, puzzle_number, letters, and center',
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
