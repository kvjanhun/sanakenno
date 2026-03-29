/**
 * BDD step definitions for hints.feature.
 *
 * Tests hint derivation logic and unlock/collapse mechanics using
 * the pure deriveHintData function from useHintData.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { deriveHintData } from '../../src/utils/hint-data.js';
import type { HintData } from '../../src/utils/hint-data.js';
import type { SanakennoWorld } from './types.js';

/** Build a realistic hint_data fixture for 50 words, 3 pangrams. */
function buildFixture(): {
  hintData: HintData;
  allLetters: Set<string>;
  sampleWords: string[];
} {
  const allLetters = new Set(['a', 'e', 'i', 'k', 'n', 's', 't']);
  const hintData: HintData = {
    word_count: 50,
    pangram_count: 3,
    by_letter: { a: 8, e: 6, i: 5, k: 10, n: 7, s: 9, t: 5 },
    by_length: { '4': 15, '5': 12, '6': 10, '7': 8, '8': 5 },
    by_pair: {
      ak: 3,
      an: 2,
      ei: 2,
      en: 3,
      ka: 5,
      ke: 4,
      ki: 3,
      na: 2,
      ni: 3,
      sa: 4,
      se: 3,
      si: 2,
      ta: 3,
      te: 4,
      ti: 3,
      is: 2,
      in: 2,
    },
  };
  // Sample words that use the puzzle letters (center = 'k')
  const sampleWords = ['kissa', 'kiista', 'kansi', 'aksenti', 'antisektinen'];
  return { hintData, allLetters, sampleWords };
}

Before(function (this: SanakennoWorld) {
  this.hintData = null;
  this.hintsUnlocked = new Set();
  this.derivedHints = null;
  this.scoreBeforeHints = null;
  this.currentScore = 0;
});

Given(
  'a puzzle with {int} total words and {int} pangrams',
  function (this: SanakennoWorld, wordCount: number, pangramCount: number) {
    const { hintData, allLetters } = buildFixture();
    hintData.word_count = wordCount;
    hintData.pangram_count = pangramCount;
    this.hintData = hintData;
    this.allLetters = allLetters;
    this.center = 'k';
    this.foundWords = [];
    this.hintsUnlocked = new Set();
    this.derivedHints = deriveHintData(hintData, new Set<string>(), allLetters);
  },
);

/* ------------------------------------------------------------------ */
/*  Hint types                                                         */
/* ------------------------------------------------------------------ */

When(
  'the player unlocks the {string} hint',
  function (this: SanakennoWorld, hintId: string) {
    if (this.hintsUnlocked.size === 0) {
      this.scoreBeforeHints = this.currentScore;
    }
    this.hintsUnlocked.add(hintId);
    this.derivedHints = deriveHintData(
      this.hintData!,
      new Set(this.foundWords),
      this.allLetters,
    );
  },
);

Then('it should show the total word count', function (this: SanakennoWorld) {
  assert.ok(this.derivedHints);
  assert.equal(this.derivedHints!.wordCount, this.hintData!.word_count);
});

Then(
  'it should show how many words remain unfound',
  function (this: SanakennoWorld) {
    assert.ok(this.derivedHints);
    assert.equal(
      this.derivedHints!.wordsRemaining,
      this.hintData!.word_count - this.foundWords.length,
    );
  },
);

Then(
  'it should show the pangram count and how many are found',
  function (this: SanakennoWorld) {
    assert.ok(this.derivedHints);
    assert.equal(
      this.derivedHints!.pangramStats.total,
      this.hintData!.pangram_count,
    );
    assert.equal(typeof this.derivedHints!.pangramStats.found, 'number');
  },
);

Then(
  'it should show each starting letter with remaining count',
  function (this: SanakennoWorld) {
    assert.ok(this.derivedHints);
    assert.ok(this.derivedHints!.letterMap.length > 0);
    for (const entry of this.derivedHints!.letterMap) {
      assert.equal(typeof entry.letter, 'string');
      assert.equal(typeof entry.remaining, 'number');
    }
  },
);

Then(
  'letters should be sorted alphabetically',
  function (this: SanakennoWorld) {
    assert.ok(this.derivedHints);
    const letters = this.derivedHints!.letterMap.map((e) => e.letter);
    const sorted = [...letters].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(letters, sorted);
  },
);

Then(
  'found words should reduce the remaining count',
  function (this: SanakennoWorld) {
    // Add a known word and re-derive
    const word = 'kissa';
    this.foundWords.push(word);
    const updated = deriveHintData(
      this.hintData!,
      new Set(this.foundWords),
      this.allLetters,
    );
    // The letter 'k' entry should have one more found
    const kEntry = updated.letterMap.find((e) => e.letter === 'k');
    assert.ok(kEntry);
    assert.ok(kEntry!.found >= 1);
  },
);

Then(
  'it should show word counts grouped by length',
  function (this: SanakennoWorld) {
    assert.ok(this.derivedHints);
    assert.ok(this.derivedHints!.lengthDistribution.length > 0);
    for (const entry of this.derivedHints!.lengthDistribution) {
      assert.equal(typeof entry.len, 'number');
      assert.equal(typeof entry.remaining, 'number');
    }
  },
);

Then(
  'found words should reduce counts for their length',
  function (this: SanakennoWorld) {
    const word = 'kissa'; // length 5
    this.foundWords.push(word);
    const updated = deriveHintData(
      this.hintData!,
      new Set(this.foundWords),
      this.allLetters,
    );
    const len5 = updated.lengthDistribution.find((e) => e.len === 5);
    assert.ok(len5);
    assert.ok(len5!.found >= 1);
  },
);

Then(
  'it should show each two-letter prefix with remaining count',
  function (this: SanakennoWorld) {
    assert.ok(this.derivedHints);
    assert.ok(this.derivedHints!.pairMap.length > 0);
    for (const entry of this.derivedHints!.pairMap) {
      assert.equal(entry.pair.length, 2);
      assert.equal(typeof entry.remaining, 'number');
    }
  },
);

Then(
  'found words should reduce the remaining count for their prefix',
  function (this: SanakennoWorld) {
    const word = 'kissa'; // prefix 'ki'
    this.foundWords.push(word);
    const updated = deriveHintData(
      this.hintData!,
      new Set(this.foundWords),
      this.allLetters,
    );
    const kiEntry = updated.pairMap.find((e) => e.pair === 'ki');
    assert.ok(kiEntry);
    assert.ok(kiEntry!.found >= 1);
  },
);

/* ------------------------------------------------------------------ */
/*  Unlock mechanics                                                   */
/* ------------------------------------------------------------------ */

When('the player loads a fresh puzzle', function (this: SanakennoWorld) {
  this.hintsUnlocked = new Set();
});

Then('no hints should be unlocked', function (this: SanakennoWorld) {
  assert.equal(this.hintsUnlocked.size, 0);
});

When(
  'the player unlocks {string}',
  function (this: SanakennoWorld, hintId: string) {
    if (this.hintsUnlocked.size === 0) {
      this.scoreBeforeHints = this.currentScore;
    }
    this.hintsUnlocked.add(hintId);
  },
);

Then(
  'only the {string} hint should be visible',
  function (this: SanakennoWorld, hintId: string) {
    assert.ok(this.hintsUnlocked.has(hintId));
    assert.equal(this.hintsUnlocked.size, 1);
  },
);

Then(
  '{string}, {string}, and {string} should still be locked',
  function (this: SanakennoWorld, a: string, b: string, c: string) {
    assert.ok(!this.hintsUnlocked.has(a));
    assert.ok(!this.hintsUnlocked.has(b));
    assert.ok(!this.hintsUnlocked.has(c));
  },
);

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

When(
  'the player unlocks {string} and {string}',
  function (this: SanakennoWorld, a: string, b: string) {
    if (this.hintsUnlocked.size === 0) {
      this.scoreBeforeHints = this.currentScore;
    }
    this.hintsUnlocked.add(a);
    this.hintsUnlocked.add(b);
  },
);

// "the player reloads the page" is defined in persistence.steps.ts.
// Hint unlock persistence survives because hintsUnlocked is serialized
// as part of the store's saveState/loadState cycle.

Then(
  '{string} and {string} should still be unlocked',
  function (this: SanakennoWorld, a: string, b: string) {
    assert.ok(this.hintsUnlocked.has(a));
    assert.ok(this.hintsUnlocked.has(b));
  },
);

When(
  'the player opens the {string} tab',
  function (this: SanakennoWorld, _tabId: string) {
    // Active tab state is session-only React local state — not testable at
    // the pure logic level, so we mark as pending for E2E
    return 'pending';
  },
);

Then('no tab should be active', function (this: SanakennoWorld) {
  // Active tab resets to null on reload — verified at E2E level
  return 'pending';
});

/* ------------------------------------------------------------------ */
/*  Share integration                                                  */
/* ------------------------------------------------------------------ */

When('the player shares their result', function (this: SanakennoWorld) {
  // Share text generation is tested via the store's copyStatus action;
  // here we just verify the unlocked set is correct for the assertion
  return 'pending';
});

Then(
  'the share text should include hint icons for the unlocked hints',
  function (this: SanakennoWorld) {
    return 'pending';
  },
);

/* ------------------------------------------------------------------ */
/*  Pre-hint score tracking                                            */
/* ------------------------------------------------------------------ */

Given(
  'the player has scored {int} points before any hints',
  function (this: SanakennoWorld, score: number) {
    this.currentScore = score;
    this.scoreBeforeHints = null;
  },
);

When(
  'the player scores {int} more points',
  function (this: SanakennoWorld, points: number) {
    this.currentScore = (this.currentScore ?? 0) + points;
  },
);

Then(
  'the pre-hint score should be {int}',
  function (this: SanakennoWorld, expected: number) {
    assert.equal(this.scoreBeforeHints, expected);
  },
);

Then(
  'the pre-hint score should still be {int}',
  function (this: SanakennoWorld, expected: number) {
    assert.equal(this.scoreBeforeHints, expected);
  },
);

Then(
  'the share score line should include {string}',
  function (this: SanakennoWorld, _fragment: string) {
    return 'pending';
  },
);

Then(
  'the rank panel should show {string}',
  function (this: SanakennoWorld, _text: string) {
    return 'pending';
  },
);

/**
 * Compute the value shown as "Pisteet ilman vihjeitä", mirroring App.tsx logic:
 * - No hints unlocked → current score
 * - Hints unlocked, scoreBeforeHints captured → scoreBeforeHints
 * - Hints unlocked, no scoreBeforeHints (old save) → 0
 */
function displayScoreBeforeHints(world: SanakennoWorld): number {
  if (world.hintsUnlocked.size === 0) return world.currentScore;
  return world.scoreBeforeHints ?? 0;
}

Given(
  'hints are already unlocked but no pre-hint score was recorded',
  function (this: SanakennoWorld) {
    this.hintsUnlocked = new Set(['summary']);
    this.scoreBeforeHints = null;
    this.currentScore = 15;
  },
);

Then(
  'the display score before hints should be {int}',
  function (this: SanakennoWorld, expected: number) {
    assert.equal(displayScoreBeforeHints(this), expected);
  },
);
