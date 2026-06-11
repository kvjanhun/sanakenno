import type { SpringConfig } from '@react-spring/web';

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;
const SUBTLE_BOUNCE_SCORE_DELTA = 7;
const LARGE_BOUNCE_SCORE_DELTA = 10;

const SMALL_SCORE_TIMING = {
  duration: 250,
  easing: easeInOutQuad,
} satisfies SpringConfig;

const SUBTLE_SCORE_SPRING = {
  tension: 200,
  friction: 36,
  mass: 4,
  precision: 0.01,
} satisfies SpringConfig;

const LARGE_SCORE_SPRING = {
  tension: 200,
  friction: 18,
  mass: 4,
  precision: 0.01,
} satisfies SpringConfig;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Clamp a progress-bar percentage so spring overshoot cannot leave the track. */
export function clampProgress(value: number): number {
  return Math.max(MIN_PROGRESS, Math.min(MAX_PROGRESS, value));
}

function formatProgressPercentage(value: number): string {
  return `${Math.round(value * 1000) / 1000}%`;
}

/** Convert a spring sample into the bounded CSS width used by the rank bar. */
export function progressWidth(value: number): string {
  return formatProgressPercentage(clampProgress(value));
}

/** Pick the timing/spring behavior used by mobile rank progress. */
export function progressSpringConfigForScoreDelta(
  scoreDelta: number,
): SpringConfig {
  if (scoreDelta >= LARGE_BOUNCE_SCORE_DELTA) return LARGE_SCORE_SPRING;
  if (scoreDelta >= SUBTLE_BOUNCE_SCORE_DELTA) return SUBTLE_SCORE_SPRING;
  return SMALL_SCORE_TIMING;
}
