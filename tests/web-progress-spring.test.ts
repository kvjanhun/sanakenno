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

  it('uses timing without bounce for gains of 6 points or less', () => {
    const one = progressSpringConfigForScoreDelta(1);
    const five = progressSpringConfigForScoreDelta(5);
    const six = progressSpringConfigForScoreDelta(6);

    expect(one.duration).toBe(250);
    expect(five.duration).toBe(250);
    expect(six.duration).toBe(250);
    expect(typeof six.easing).toBe('function');
  });

  it('uses a subtle spring bounce for 7 to 9 point gains', () => {
    const seven = progressSpringConfigForScoreDelta(7);
    const nine = progressSpringConfigForScoreDelta(9);
    const large = progressSpringConfigForScoreDelta(10);

    expect(seven.duration).toBeUndefined();
    expect(seven.tension).toBe(200);
    expect(seven.friction).toBe(36);
    expect(seven.mass).toBe(4);
    expect(nine.friction).toBe(seven.friction);
    expect(seven.friction).toBeGreaterThan(large.friction ?? 0);
  });

  it('uses the pronounced spring bounce for gains of 10 points or more', () => {
    const ten = progressSpringConfigForScoreDelta(10);
    const large = progressSpringConfigForScoreDelta(11);

    expect(ten.duration).toBeUndefined();
    expect(ten.tension).toBe(200);
    expect(ten.friction).toBe(18);
    expect(ten.mass).toBe(4);
    expect(large.friction).toBe(ten.friction);
  });
});
