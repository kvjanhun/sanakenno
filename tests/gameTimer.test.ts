/**
 * Unit tests for the useGameTimer hook.
 *
 * Covers elapsed-time tracking and pause/resume accumulation logic
 * using Vitest fake timers (no browser needed).
 *
 * Corresponds to: timer.feature (non-@e2e scenarios)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameTimer } from '../packages/web/src/hooks/useGameTimer.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useGameTimer — elapsed time', () => {
  it('getElapsedMs returns 0 before start', () => {
    const { result } = renderHook(() => useGameTimer());
    expect(result.current.getElapsedMs()).toBe(0);
  });

  it('tracks elapsed time after start', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current.getElapsedMs()).toBeCloseTo(60_000, -2);
  });

  it('start is idempotent — calling twice does not reset the timer', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));
    act(() => result.current.start()); // no-op
    act(() => vi.advanceTimersByTime(10_000));

    expect(result.current.getElapsedMs()).toBeCloseTo(20_000, -2);
  });

  it('reset clears all state', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(30_000));
    act(() => result.current.reset());

    expect(result.current.getElapsedMs()).toBe(0);
    expect(result.current.getStartedAt()).toBeNull();
    expect(result.current.getTotalPausedMs()).toBe(0);
  });
});

describe('useGameTimer — pause and resume', () => {
  it('pause stops elapsed time accumulation', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));

    // Simulate tab hidden → pause
    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const elapsedAtPause = result.current.getElapsedMs();
    act(() => vi.advanceTimersByTime(30_000)); // 30s hidden — should not count

    expect(result.current.getElapsedMs()).toBeCloseTo(elapsedAtPause, -2);
  });

  it('resume continues accumulation without counting paused time', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000)); // 10s active

    // Hide tab for 20s
    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => vi.advanceTimersByTime(20_000));

    // Show tab, continue for 15s
    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => vi.advanceTimersByTime(15_000)); // 15s active

    // Total active: 10 + 15 = 25s; 20s paused must not count
    expect(result.current.getElapsedMs()).toBeCloseTo(25_000, -2);
    expect(result.current.getTotalPausedMs()).toBeCloseTo(20_000, -2);
  });

  it('multiple pause/resume cycles accumulate correctly', () => {
    const { result } = renderHook(() => useGameTimer());

    const hide = () =>
      act(() => {
        Object.defineProperty(document, 'hidden', {
          value: true,
          configurable: true,
          writable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

    const show = () =>
      act(() => {
        Object.defineProperty(document, 'hidden', {
          value: false,
          configurable: true,
          writable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

    act(() => result.current.start());

    act(() => vi.advanceTimersByTime(30_000)); // 30s active
    hide();
    act(() => vi.advanceTimersByTime(10_000)); // 10s paused
    show();
    act(() => vi.advanceTimersByTime(20_000)); // 20s active
    hide();
    act(() => vi.advanceTimersByTime(5_000)); //  5s paused
    show();
    act(() => vi.advanceTimersByTime(0)); // resume

    // Active: 30 + 20 = 50s; Paused: 10 + 5 = 15s
    expect(result.current.getElapsedMs()).toBeCloseTo(50_000, -2);
    expect(result.current.getTotalPausedMs()).toBeCloseTo(15_000, -2);
  });

  it('pagehide triggers a pause', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));

    act(() => window.dispatchEvent(new Event('pagehide')));

    const elapsedAtPause = result.current.getElapsedMs();
    act(() => vi.advanceTimersByTime(5_000));

    expect(result.current.getElapsedMs()).toBeCloseTo(elapsedAtPause, -2);
  });

  it('pagehide when already paused does not double-record', () => {
    const { result } = renderHook(() => useGameTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));

    // Hide tab (first pause)
    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => vi.advanceTimersByTime(5_000));

    // pagehide fires while already paused — should be a no-op
    act(() => window.dispatchEvent(new Event('pagehide')));
    act(() => vi.advanceTimersByTime(5_000));

    // totalPausedMs should count only the first pause interval (started at hide)
    // We can't read exact ms here since pagehide doesn't resume, just verify
    // elapsed has not changed since the first pause
    const elapsed = result.current.getElapsedMs();
    expect(elapsed).toBeCloseTo(10_000, -2);
  });
});

describe('useGameTimer — restore', () => {
  it('restore sets startedAt and totalPausedMs from saved values', () => {
    const { result } = renderHook(() => useGameTimer());
    const now = Date.now();

    act(() => result.current.restore(now - 90_000, 30_000));

    // Active time = (now - startedAt) - totalPausedMs = 90s - 30s = 60s
    expect(result.current.getElapsedMs()).toBeCloseTo(60_000, -2);
    expect(result.current.getStartedAt()).toBe(now - 90_000);
    expect(result.current.getTotalPausedMs()).toBe(30_000);
  });
});
