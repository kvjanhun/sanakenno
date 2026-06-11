/**
 * Full-screen celebration overlay shown when the player reaches
 * the "Ällistyttävä" or "Täysi kenno" rank.
 *
 * @module src/components/Celebration
 */

import { useEffect, useState } from 'react';
import { animated, useReducedMotion, useTransition } from '@react-spring/web';
import { PRESENCE_SPRING } from '../utils/motion';

type CelebrationType = 'allistyttava' | 'nohint-allistyttava' | 'taysikenno';

/** Props for {@link Celebration}. */
export interface CelebrationProps {
  /** Whether the overlay is visible. */
  show: boolean;
  /** Which celebration to show. */
  type: CelebrationType | null;
  /** Player's current score. */
  score: number;
  /** Maximum possible score for today's puzzle. */
  maxScore: number;
  /** Close the overlay. */
  onClose: () => void;
  /** Share the result (e.g. copy to clipboard). */
  onShare: () => void;
}

interface CelebrationConfig {
  title: string;
  description: string;
  target: number;
  closeLabel: string;
  cardClass: string;
}

/**
 * Render a celebratory modal overlay.
 */
export function Celebration({
  show,
  type,
  score,
  maxScore,
  onClose,
  onShare,
}: CelebrationProps): React.JSX.Element {
  const [displayType, setDisplayType] = useState<CelebrationType | null>(type);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (show && type) setDisplayType(type);
  }, [show, type]);

  const activeType = show && type ? type : displayType;
  const transitions = useTransition(show && activeType !== null, {
    from: { overlayOpacity: 0, panelOpacity: 0, scale: 0.985, y: 8 },
    enter: { overlayOpacity: 1, panelOpacity: 1, scale: 1, y: 0 },
    leave: { overlayOpacity: 0, panelOpacity: 0, scale: 0.985, y: 8 },
    config: PRESENCE_SPRING,
    immediate: prefersReducedMotion === true,
  });

  const autoCloseMs = activeType === 'taysikenno' ? 8000 : 5000;

  useEffect(() => {
    if (!show || !activeType) return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [activeType, onClose, autoCloseMs, show]);

  if (!activeType) return <>{null}</>;

  const config: CelebrationConfig =
    activeType === 'taysikenno'
      ? {
          title: 'Täysi kenno!',
          description: 'Täydellinen tulos! Löysit kaikki sanat.',
          target: maxScore,
          closeLabel: 'OK',
          cardClass: 'celebration-card-intense',
        }
      : activeType === 'nohint-allistyttava'
        ? {
            title: 'Ällistyttävä ilman apuja!',
            description: 'Saavutit 70 % kennon pisteistä avaamatta apuja.',
            target: maxScore,
            closeLabel: 'Jatka pelaamista',
            cardClass: 'celebration-card',
          }
        : {
            title: 'Ällistyttävä!',
            description: 'Huikea suoritus! Olet saavuttanut huipputason.',
            target: maxScore,
            closeLabel: 'Jatka pelaamista',
            cardClass: 'celebration-card',
          };

  const handleShare = (): void => {
    onShare();
    onClose();
  };

  return (
    <>
      {transitions((spring, item) =>
        item ? (
          <animated.div
            aria-hidden={!show}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: spring.overlayOpacity.to(
                (opacity) => `rgba(0, 0, 0, ${opacity * 0.5})`,
              ),
              pointerEvents: show ? 'auto' : 'none',
            }}
            onClick={show ? onClose : undefined}
          >
            <animated.div
              className={`rounded-xl p-8 max-w-sm w-full mx-4 shadow-lg text-center ${config.cardClass}`}
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                opacity: spring.panelOpacity,
                scale: spring.scale,
                transformOrigin: '50% 52%',
                y: spring.y,
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={config.title}
            >
              <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
              <p
                className="text-sm mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {config.description}
              </p>
              <p className="text-lg font-semibold mb-6">
                {score}/{config.target} pistettä
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2 rounded-lg font-semibold cursor-pointer border-none"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-on-accent)',
                  }}
                >
                  Jaa tulos
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-semibold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {config.closeLabel}
                </button>
              </div>
            </animated.div>
          </animated.div>
        ) : null,
      )}
    </>
  );
}
