/**
 * BDD step definitions for infrastructure.feature.
 *
 * Container-level scenarios (non-root user, image contents) are
 * marked pending — they require a running Docker container.
 * Health check and logging format are tested via the Hono app.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import app from '../../server/index';
import type { SanakennoWorld } from './types';

interface InfrastructureWorld extends SanakennoWorld {
  capturedConsoleLogs?: string[];
}

// --- Security & Environment (container-only) ---

Given('the Sanakenno container is running', function (this: SanakennoWorld) {
  return 'pending';
});

When('I check the process owner', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'it should not be {string}',
  function (this: SanakennoWorld, _user: string) {
    return 'pending';
  },
);

Then(
  'the process should have no write access to the root filesystem',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Given(
  'the container is started with PORT={int} and DATA_DIR=\\/data',
  function (this: SanakennoWorld, _port: number) {
    return 'pending';
  },
);

Then(
  'the Hono server should listen on port {int}',
  function (this: SanakennoWorld, _port: number) {
    return 'pending';
  },
);

Then(
  'achievements should be stored in \\/data\\/achievements.db',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

// --- Health & Observability ---

When(
  'a GET request is made to \\/api\\/health',
  async function (this: SanakennoWorld) {
    this.response = await app.request('/api/health');
    this.responseJson = (await this.response.json()) as Record<string, unknown>;
  },
);

Then(
  'the server should respond with {int} {string}',
  function (this: SanakennoWorld, status: number, _statusText: string) {
    assert.equal(this.response.status, status);
  },
);

Then(
  'the response should confirm the database is reachable',
  function (this: SanakennoWorld) {
    assert.equal(this.responseJson.status, 'ok');
  },
);

When(
  'the server processes a request',
  async function (this: InfrastructureWorld) {
    const previousLogLevel = process.env.LOG_LEVEL;
    const testConsole = globalThis.console;
    const originalLog = testConsole.log;
    const captured: string[] = [];

    process.env.LOG_LEVEL = 'info';
    testConsole.log = (value?: unknown, ...args: unknown[]) => {
      captured.push([value, ...args].map((item) => String(item)).join(' '));
    };

    try {
      await app.request('/api/health');
    } finally {
      testConsole.log = originalLog;
      if (previousLogLevel === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = previousLogLevel;
      }
    }

    this.capturedConsoleLogs = captured;
  },
);

Then(
  'it should emit a structured log to stdout \\(console\\)',
  function (this: InfrastructureWorld) {
    assert.ok(
      this.capturedConsoleLogs && this.capturedConsoleLogs.length > 0,
      'Expected at least one console log entry',
    );
    assert.doesNotThrow(() => JSON.parse(this.capturedConsoleLogs![0]));
  },
);

Then(
  'the log should include level, method, path, and response time',
  function (this: InfrastructureWorld) {
    const entry = JSON.parse(this.capturedConsoleLogs![0]) as {
      level?: string;
      method?: string;
      path?: string;
      status?: number;
      response_time_ms?: number;
    };
    assert.equal(entry.level, 'info');
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/api/health');
    assert.equal(entry.status, 200);
    assert.equal(typeof entry.response_time_ms, 'number');
  },
);

// --- Multi-stage Build (container-only) ---

When('I inspect the production image', function (this: SanakennoWorld) {
  return 'pending';
});

Then(
  'it should not contain build tools \\(npm, compiler, source code\\)',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

Then(
  'it should be based on a minimal Node.js alpine image',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);
