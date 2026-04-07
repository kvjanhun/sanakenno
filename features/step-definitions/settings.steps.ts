/**
 * BDD step definitions for settings.feature.
 *
 * Tests theme preference and haptics intensity logic: default value, selection,
 * persistence, and legacy migration. The @e2e scenario is skipped by the BDD runner.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { SanakennoWorld } from './types';

type ThemePreference = 'light' | 'dark' | 'system';
type HapticsIntensity = 'off' | 'light' | 'medium' | 'heavy';

/** In-memory store simulating MMKV persistence. */
let persisted: Record<string, string> = {};
let activePreference: ThemePreference = 'system';
let activeHapticsIntensity: HapticsIntensity = 'off';

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
  const existing = persisted['sanakenno_settings'];
  const base = existing ? (JSON.parse(existing) as Record<string, unknown>) : {};
  persisted['sanakenno_settings'] = JSON.stringify({
    ...base,
    themePreference: pref,
  });
}

function loadHapticsIntensity(): HapticsIntensity {
  const raw = persisted['sanakenno_settings'];
  if (!raw) return 'off';
  try {
    const parsed = JSON.parse(raw) as {
      hapticsIntensity?: string;
      hapticsEnabled?: boolean;
    };
    if (
      parsed.hapticsIntensity === 'off' ||
      parsed.hapticsIntensity === 'light' ||
      parsed.hapticsIntensity === 'medium' ||
      parsed.hapticsIntensity === 'heavy'
    ) {
      return parsed.hapticsIntensity;
    }
    // Legacy migration: boolean hapticsEnabled → intensity
    if (typeof parsed.hapticsEnabled === 'boolean') {
      return parsed.hapticsEnabled ? 'medium' : 'off';
    }
  } catch {
    // ignore
  }
  return 'off';
}

function saveHapticsIntensity(intensity: HapticsIntensity): void {
  const existing = persisted['sanakenno_settings'];
  const base = existing ? (JSON.parse(existing) as Record<string, unknown>) : {};
  persisted['sanakenno_settings'] = JSON.stringify({
    ...base,
    hapticsIntensity: intensity,
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
  activeHapticsIntensity = loadHapticsIntensity();
});

/* ------------------------------------------------------------------ */
/* Haptics intensity */
/* ------------------------------------------------------------------ */

Given(
  'no haptics preference has been saved',
  function (this: SanakennoWorld) {
    persisted = {};
    activeHapticsIntensity = 'off';
  },
);

Then(
  'the active haptics intensity should be {string}',
  function (this: SanakennoWorld, expected: string) {
    assert.equal(activeHapticsIntensity, expected);
  },
);

Given(
  'the active haptics intensity is {string}',
  function (this: SanakennoWorld, intensity: string) {
    activeHapticsIntensity = intensity as HapticsIntensity;
    persisted = {};
  },
);

When(
  'the player selects haptics intensity {string}',
  function (this: SanakennoWorld, intensity: string) {
    activeHapticsIntensity = intensity as HapticsIntensity;
    saveHapticsIntensity(activeHapticsIntensity);
  },
);

Then(
  'the haptics intensity {string} should be persisted',
  function (this: SanakennoWorld, expected: string) {
    const loaded = loadHapticsIntensity();
    assert.equal(loaded, expected);
  },
);

Given(
  'the haptics intensity {string} has been persisted',
  function (this: SanakennoWorld, intensity: string) {
    saveHapticsIntensity(intensity as HapticsIntensity);
  },
);

Given(
  'haptics was previously saved as enabled boolean {word}',
  function (this: SanakennoWorld, boolStr: string) {
    const enabled = boolStr === 'true';
    persisted['sanakenno_settings'] = JSON.stringify({
      hapticsEnabled: enabled,
    });
  },
);
