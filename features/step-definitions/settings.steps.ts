/**
 * BDD step definitions for settings.feature.
 *
 * Tests theme preference logic: default value, selection, persistence.
 * The @e2e scenario is skipped by the BDD runner.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { SanakennoWorld } from './types';

type ThemePreference = 'light' | 'dark' | 'system';

/** In-memory store simulating MMKV persistence. */
let persisted: Record<string, string> = {};
let activePreference: ThemePreference = 'system';

function loadPreference(): ThemePreference {
  const raw = persisted['sanakenno_settings'];
  if (!raw) return 'system';
  try {
    const parsed = JSON.parse(raw) as { themePreference?: string };
    if (
      parsed.themePreference === 'light' ||
      parsed.themePreference === 'dark' ||
      parsed.themePreference === 'system'
    ) {
      return parsed.themePreference;
    }
  } catch {
    // ignore
  }
  return 'system';
}

function savePreference(pref: ThemePreference): void {
  persisted['sanakenno_settings'] = JSON.stringify({
    themePreference: pref,
  });
}

/* ------------------------------------------------------------------ */

Given('no theme preference has been saved', function (this: SanakennoWorld) {
  persisted = {};
  activePreference = 'system';
});

When('the player opens the settings', function (this: SanakennoWorld) {
  // Opening settings loads the stored preference
  activePreference = loadPreference();
});

Then(
  'the active theme preference should be {string}',
  function (this: SanakennoWorld, expected: string) {
    assert.equal(activePreference, expected);
  },
);

Given(
  'the active theme preference is {string}',
  function (this: SanakennoWorld, pref: string) {
    activePreference = pref as ThemePreference;
    persisted = {};
  },
);

When(
  'the player selects theme {string}',
  function (this: SanakennoWorld, pref: string) {
    activePreference = pref as ThemePreference;
    savePreference(activePreference);
  },
);

Then(
  'the theme preference {string} should be persisted',
  function (this: SanakennoWorld, expected: string) {
    const loaded = loadPreference();
    assert.equal(loaded, expected);
  },
);

Given(
  'the theme preference {string} has been persisted',
  function (this: SanakennoWorld, pref: string) {
    savePreference(pref as ThemePreference);
  },
);

When('the settings store is initialised', function (this: SanakennoWorld) {
  activePreference = loadPreference();
});
