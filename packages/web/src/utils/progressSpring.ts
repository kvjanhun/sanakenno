import type { SpringConfig } from '@react-spring/web';

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;
const LARGE_SCORE_DELTA = 10;

const SMALL_SCORE_SPRING = {
  tension: 200,
  friction: 22,
  mass: 1,
  precision: 0.01,
} satisfies SpringConfig;

const LARGE_SCORE_SPRING = {
  tension: 200,
  friction: 18,
  mass: 1,
  precision: 0.01,
} satisfies SpringConfig;

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

/** Pick spring behavior matching mobile: big spring from 10p, smaller otherwise. */
export function progressSpringConfigForScoreDelta(
  scoreDelta: number,
): SpringConfig {
  return scoreDelta >= LARGE_SCORE_DELTA
    ? LARGE_SCORE_SPRING
    : SMALL_SCORE_SPRING;
}
