/**
 * Score display, rank badge, progress bar, and expandable rank
 * thresholds list.
 *
 * @module src/components/RankProgress
 */

import { useRef, useEffect, useState } from 'react';
import {
  animated,
  useReducedMotion,
  useSpring,
  useTransition,
} from '@react-spring/web';
import { ChevronDown, Circle, CircleOff, CircleStar } from 'lucide-react';
import {
  noHintAchievementStates,
  rankThresholds,
  progressToNextRank,
} from '@sanakenno/shared';
import {
  clampProgress,
  progressSpringConfigForScoreDelta,
  progressWidth,
} from '../utils/progressSpring';
import { DROPDOWN_SPRING } from '../utils/motion';

/** Props for {@link RankProgress}. */
export interface RankProgressProps {
  /** Player's current score. */
  score: number;
  /** Maximum possible score for today's puzzle. */
  maxScore: number;
  /** Current rank name (Finnish). */
  rank: string;
  /** Whether the rank thresholds panel is expanded. */
  showRanks: boolean;
  /** Toggle the rank thresholds panel. */
  onToggleRanks: () => void;
  /** Score to display as "Pisteet ilman apuja". Mirrors current score until first hint is unlocked. */
  scoreBeforeHints: number;
  /** Whether any hint has been unlocked in the current game. */
  hasUnlockedHints: boolean;
}

/**
 * Render score, rank pill, progress bar, and optional rank list.
 */

export function RankProgress({
  score,
  maxScore,
  rank,
  showRanks,
  onToggleRanks,
  scoreBeforeHints,
  hasUnlockedHints,
}: RankProgressProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = progressToNextRank(score, maxScore);
  const thresholds = rankThresholds(rank, maxScore);
  const noHintAchievements = noHintAchievementStates(
    scoreBeforeHints,
    maxScore,
  );
  const currentNoHintAchievement = [...noHintAchievements]
    .reverse()
    .find((item) => item.unlocked);
  const currentNoHintText =
    currentNoHintAchievement?.name === 'Ällistyttävä ilman apuja'
      ? 'uskomatonta!'
      : currentNoHintAchievement?.name === 'Apuitta taitava'
        ? 'taidokasta!'
        : currentNoHintAchievement?.name === 'Omin avuin'
          ? 'hyvä!'
          : '';
  const noHintSuffix = ` ilman apuja${
    currentNoHintText ? `, ${currentNoHintText}` : ''
  }`;
  const progressSpringWidth = useRankProgressWidth(progress, score);
  const prefersReducedMotion = useReducedMotion();
  const rankPanelTransitions = useTransition(showRanks, {
    from: { opacity: 0, scaleY: 0.98, y: -4 },
    enter: { opacity: 1, scaleY: 1, y: 0 },
    leave: { opacity: 0, scaleY: 0.98, y: -4 },
    config: DROPDOWN_SPRING,
    immediate: prefersReducedMotion === true,
  });
  const rankChevronSpring = useSpring({
    rotate: showRanks ? 180 : 0,
    config: DROPDOWN_SPRING,
    immediate: prefersReducedMotion === true,
  });

  // Animate score counter from previous value to new value.
  const [displayScore, setDisplayScore] = useState(score);
  const fromRef = useRef(score);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = score;
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    if (from === to) return;
    const duration = 300;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  useEffect(() => {
    if (!showRanks) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onToggleRanks();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showRanks, onToggleRanks]);

  return (
    <div ref={containerRef} className="w-full" style={{ position: 'relative' }}>
      {/* Rank + score + share */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[26px] font-bold leading-none"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-game)',
          }}
        >
          {displayScore} pistettä
        </span>
        <button
          key={rank}
          type="button"
          onClick={onToggleRanks}
          className="flex items-center gap-1 pl-4.5 pr-3 py-1 text-sm rounded-full cursor-pointer border-none rank-pulse"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-on-accent)',
            fontWeight: 600,
            flexShrink: 0,
          }}
          aria-expanded={showRanks}
        >
          <span>{rank}</span>
          <animated.span
            aria-hidden="true"
            className="inline-flex h-3.5 w-3.5 items-center justify-center"
            style={{
              rotate: rankChevronSpring.rotate.to((value) => `${value}deg`),
            }}
          >
            <ChevronDown size={14} strokeWidth={2.5} />
          </animated.span>
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={maxScore}
      >
        <animated.div
          className="h-full rounded-full"
          style={{
            width: progressSpringWidth,
            backgroundColor: 'var(--color-accent)',
            willChange: 'width',
          }}
        />
      </div>

      {/* Expandable rank thresholds — floats over content below, does not affect layout */}
      {rankPanelTransitions((spring, item) =>
        item ? (
          <animated.div
            aria-hidden={!showRanks}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 20,
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '0 0 8px 8px',
              marginTop: '0.25rem',
              opacity: spring.opacity,
              overflow: 'hidden',
              pointerEvents: showRanks ? 'auto' : 'none',
              scaleY: spring.scaleY,
              transformOrigin: 'top center',
              y: spring.y,
            }}
          >
            <ul
              className="list-none p-0 m-0 text-sm space-y-1"
              style={{ padding: '0.5rem 0.75rem' }}
            >
              {thresholds.map((t) => (
                <li
                  key={t.name}
                  className="flex justify-between"
                  style={{
                    color: t.isCurrent
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                    fontWeight: t.isCurrent ? 700 : 400,
                  }}
                >
                  <span>{t.name}</span>
                  <span>{t.points}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                padding: '0.6rem 0.75rem',
                background: 'var(--color-bg-secondary)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="min-w-0 truncate whitespace-nowrap text-sm"
                  data-no-hint-current
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <strong className="font-bold" data-no-hint-points>
                    {scoreBeforeHints} p.
                  </strong>
                  {noHintSuffix}
                </span>
                <div
                  className="flex shrink-0 items-center gap-1"
                  aria-label={`Ilman apuja: ${
                    noHintAchievements.filter((item) => item.unlocked).length
                  } / ${noHintAchievements.length} saavutusta`}
                >
                  {noHintAchievements.map((achievement, index) => (
                    <NoHintAchievementIcon
                      key={achievement.name}
                      index={index}
                      name={achievement.name}
                      unlocked={achievement.unlocked}
                      inactive={hasUnlockedHints && !achievement.unlocked}
                    />
                  ))}
                </div>
              </div>
            </div>
          </animated.div>
        ) : null,
      )}
    </div>
  );
}

/** Animate progress with React Spring, scaling bounce by scoring move size. */
function useRankProgressWidth(progress: number, score: number) {
  const prefersReducedMotion = useReducedMotion();
  const previousScoreRef = useRef(score);
  const [progressSpring, progressApi] = useSpring(() => ({
    fill: clampProgress(progress),
  }));

  useEffect(() => {
    const target = clampProgress(progress);
    const scoreDelta = score - previousScoreRef.current;
    const config = progressSpringConfigForScoreDelta(scoreDelta);
    previousScoreRef.current = score;

    if (prefersReducedMotion || scoreDelta <= 0) {
      void progressApi.start({ fill: target, immediate: true });
      return;
    }

    void progressApi.start({ fill: target, config });
  }, [prefersReducedMotion, progress, progressApi, score]);

  return progressSpring.fill.to(progressWidth);
}

function NoHintAchievementIcon({
  index,
  name,
  unlocked,
  inactive,
}: {
  index: number;
  name: string;
  unlocked: boolean;
  inactive: boolean;
}): React.JSX.Element {
  const iconName = unlocked
    ? 'circle-star'
    : inactive
      ? 'circle-off'
      : 'circle';
  const color = unlocked
    ? 'var(--color-accent)'
    : inactive
      ? 'color-mix(in srgb, var(--color-text-tertiary) 40%, var(--color-bg-secondary))'
      : 'var(--color-text-tertiary)';

  return (
    <span
      className="flex h-7 w-7 items-center justify-center"
      data-no-hint-indicator={index + 1}
      data-no-hint-state={unlocked ? 'unlocked' : 'locked'}
      data-no-hint-icon={iconName}
      title={name}
      style={{ color }}
    >
      {unlocked ? (
        <CircleStar size={22} strokeWidth={2.3} aria-hidden="true" />
      ) : inactive ? (
        <CircleOff size={22} strokeWidth={2.3} aria-hidden="true" />
      ) : (
        <Circle size={21} strokeWidth={2.3} aria-hidden="true" />
      )}
    </span>
  );
}
