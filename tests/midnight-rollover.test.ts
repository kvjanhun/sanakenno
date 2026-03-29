/**
 * Unit tests for the midnight rollover utility.
 *
 * @module tests/midnight-rollover.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  msUntilMidnight,
  getHelsinkiDateString,
} from '../src/hooks/useMidnightRollover.js';

describe('msUntilMidnight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates time correctly during a normal day', () => {
    // Set system time to 2026-03-27 12:00:00 UTC
    // Helsinki is UTC+2 (EET) — March 27 is before DST (starts March 29 2026).
    // 12:00 UTC = 14:00 Helsinki → 10 hours until midnight.
    const date = new Date('2026-03-27T12:00:00Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 60 * 60 * 1000);
  });

  it('handles time just before midnight', () => {
    // 21:59:50 UTC = 23:59:50 Helsinki (UTC+2) → 10 seconds until midnight.
    const date = new Date('2026-03-27T21:59:50Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 1000);
  });

  it('handles time just after midnight', () => {
    // 22:00:05 UTC = 00:00:05 Helsinki (UTC+2) on March 28.
    // Next midnight is 23h 59m 55s away.
    const date = new Date('2026-03-27T22:00:05Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    const expected = (23 * 3600 + 59 * 60 + 55) * 1000;
    expect(ms).toBe(expected);
  });

  it('handles exactly at midnight', () => {
    // 22:00:00 UTC = exactly 00:00:00 Helsinki (UTC+2) on March 28.
    // Next midnight is exactly 24 hours away.
    const date = new Date('2026-03-27T22:00:00Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  it('accounts for Helsinki DST transition (Spring forward)', () => {
    // March 29, 2026: DST starts at 03:00 Helsinki (clocks move to 04:00).
    // Before the transition: 21:59:50 UTC on March 28 = 23:59:50 Helsinki (UTC+2).
    // Midnight is 10 seconds away.
    const date = new Date('2026-03-28T21:59:50Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 1000);
  });

  it('accounts for Helsinki DST transition (Autumn fallback)', () => {
    // Oct 25, 2026: DST ends — clocks go back from UTC+3 to UTC+2 at 01:00 UTC.
    // After the transition Helsinki is UTC+2.
    // 21:59:50 UTC on Oct 25 = 23:59:50 Helsinki (UTC+2) → 10 seconds until midnight.
    const date = new Date('2026-10-25T21:59:50Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 1000);
  });

  it('handles year boundary (New Year Eve just before midnight)', () => {
    // Dec 31, 2026 at 23:59:50 Helsinki (UTC+2) → 22:00:00 UTC is midnight.
    // 21:59:50 UTC on Dec 31 = 23:59:50 Helsinki → 10 seconds until Jan 1.
    const date = new Date('2026-12-31T21:59:50Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 1000);
  });
});

describe('getHelsinkiDateString', () => {
  it('returns the Helsinki calendar date for a UTC date in the same Helsinki day', () => {
    // 2026-03-27 12:00 UTC = 14:00 Helsinki — same calendar day.
    const date = new Date('2026-03-27T12:00:00Z');
    const result = getHelsinkiDateString(date);
    expect(result).toBe(new Date('2026-03-27T14:00:00').toDateString());
  });

  it('returns the next Helsinki calendar day for a UTC time that has crossed Helsinki midnight', () => {
    // 2026-03-27 22:30 UTC = 00:30 Helsinki on March 28 (UTC+2).
    // The Helsinki calendar date is March 28, even though the UTC date is still March 27.
    const date = new Date('2026-03-27T22:30:00Z');
    const result = getHelsinkiDateString(date);
    expect(result).toContain('Mar 28 2026');
  });

  it('returns the same day as UTC when Helsinki is still on the same calendar day', () => {
    // 2026-03-27 10:00 UTC = 12:00 Helsinki — same date both ways.
    const date = new Date('2026-03-27T10:00:00Z');
    const result = getHelsinkiDateString(date);
    expect(result).toContain('Mar 27 2026');
  });

  it('reflects DST — Helsinki is UTC+3 in summer', () => {
    // 2026-07-01 21:30 UTC = 00:30 Helsinki July 2 (UTC+3 EEST).
    const date = new Date('2026-07-01T21:30:00Z');
    const result = getHelsinkiDateString(date);
    expect(result).toContain('Jul 02 2026');
  });
});
