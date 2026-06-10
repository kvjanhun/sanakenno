import { describe, expect, it } from 'vitest';
import {
  clampProgress,
  progressSpringConfigForScoreDelta,
  progressWidth,
} from '../packages/web/src/utils/progressSpring';

describe('rank progress spring helpers', () => {
  it('clamps visible progress to the track bounds like mobile', () => {
    expect(clampProgress(-12)).toBe(0);
    expect(clampProgress(42)).toBe(42);
    expect(clampProgress(112)).toBe(100);
  });

  it('formats spring samples as bounded CSS widths', () => {
    expect(progressWidth(-12)).toBe('0%');
    expect(progressWidth(42.5)).toBe('42.5%');
    expect(progressWidth(112)).toBe('100%');
  });

  it('uses a bigger spring for score gains of 10 points or more', () => {
    const small = progressSpringConfigForScoreDelta(9);
    const large = progressSpringConfigForScoreDelta(10);

    expect(large.friction).toBeLessThan(small.friction ?? 0);
    expect(large.tension).toBe(small.tension);
  });
});
