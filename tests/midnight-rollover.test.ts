/**
 * Unit tests for the midnight rollover utility.
 *
 * @module tests/midnight-rollover.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { msUntilMidnight } from '../src/hooks/useMidnightRollover.js';

describe('msUntilMidnight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates time correctly during a normal day', () => {
    // Set system time to 2026-03-27 12:00:00 UTC
    // Helsinki is UTC+2 (EET) or UTC+3 (EEST).
    // March 27 2026 is before DST (starts March 29), so Helsinki is UTC+2.
    // 12:00 UTC = 14:00 Helsinki.
    // Time until midnight (24:00) is 10 hours = 36,000,000 ms.
    const date = new Date('2026-03-27T12:00:00Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 60 * 60 * 1000);
  });

  it('handles time just before midnight', () => {
    // 21:59:50 UTC = 23:59:50 Helsinki (UTC+2)
    const date = new Date('2026-03-27T21:59:50Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 1000); // 10 seconds
  });

  it('handles time just after midnight', () => {
    // 22:00:05 UTC = 00:00:05 Helsinki (UTC+2) on the next day
    // Next midnight is 23 hours, 59 minutes, 55 seconds away.
    const date = new Date('2026-03-27T22:00:05Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    const expected = (23 * 3600 + 59 * 60 + 55) * 1000;
    expect(ms).toBe(expected);
  });

  it('accounts for Helsinki DST transition (Spring)', () => {
    // March 29, 2026: DST starts at 03:00 (clocks move to 04:00)
    // 21:59:50 UTC on March 28 is 23:59:50 Helsinki (UTC+2).
    // Midnight is 10 seconds away.
    const date = new Date('2026-03-28T21:59:50Z');
    vi.setSystemTime(date);

    const ms = msUntilMidnight();
    expect(ms).toBe(10 * 1000);
  });
});
