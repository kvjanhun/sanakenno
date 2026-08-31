/**
 * Rank progression rules. Replaces the former ranks.feature BDD scenarios
 * (the celebration/UI scenarios live in tests/e2e/ranks.spec.ts).
 */
import { describe, it, expect } from 'vitest';
import {
  noHintAchievementStates,
  rankForScore,
  rankThresholds,
  progressToNextRank,
} from '@sanakenno/shared';

const MAX_SCORE = 100;

describe('rank thresholds (percentage of max score)', () => {
  it.each([
    [0, 'Etsi sanoja!'],
    [1, 'Etsi sanoja!'],
    [2, 'Hyvä alku'],
    [9, 'Hyvä alku'],
    [10, 'Nyt mennään!'],
    [19, 'Nyt mennään!'],
    [20, 'Onnistuja'],
    [39, 'Onnistuja'],
    [40, 'Sanavalmis'],
    [69, 'Sanavalmis'],
    [70, 'Ällistyttävä'],
    [99, 'Ällistyttävä'],
    [100, 'Täysi kenno'],
  ])('score %i → rank "%s"', (score, rank) => {
    expect(rankForScore(score, MAX_SCORE)).toBe(rank);
  });
});

describe('rank progress', () => {
  it('shows percentage toward the next rank', () => {
    // Score 5 sits at "Hyvä alku"; 37% of the way to "Nyt mennään!".
    expect(rankForScore(5, MAX_SCORE)).toBe('Hyvä alku');
    expect(Math.floor(progressToNextRank(5, MAX_SCORE))).toBe(37);
  });

  it('is 100% at max rank', () => {
    expect(Math.floor(progressToNextRank(100, MAX_SCORE))).toBe(100);
  });
});

describe('rank list visibility', () => {
  it('always shows "Täysi kenno" in the rank list', () => {
    const names = rankThresholds('Ällistyttävä', MAX_SCORE).map((t) => t.name);
    expect(names).toContain('Täysi kenno');
  });
});

describe('no-hint achievement tiers', () => {
  it.each([
    [24, 'Omin avuin', false],
    [25, 'Omin avuin', true],
    [49, 'Apuitta taitava', false],
    [50, 'Apuitta taitava', true],
    [69, 'Ällistyttävä ilman apuja', false],
    [70, 'Ällistyttävä ilman apuja', true],
  ])('no-hint score %i → "%s" unlocked=%s', (score, name, unlocked) => {
    const achievement = noHintAchievementStates(score, MAX_SCORE).find(
      (item) => item.name === name,
    );
    expect(achievement).toBeDefined();
    expect(achievement!.unlocked).toBe(unlocked);
  });
});
