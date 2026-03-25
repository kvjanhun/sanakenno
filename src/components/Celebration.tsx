/**
 * Full-screen celebration overlay shown when the player reaches
 * the "Ällistyttävä" or "Täysi kenno" rank.
 *
 * @module src/components/Celebration
 */

import { useEffect } from 'react';
import styles from './animations.module.css';

/** Props for {@link Celebration}. */
export interface CelebrationProps {
  /** Which celebration to show. */
  type: 'allistyttava' | 'taysikenno';
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
  type,
  score,
  maxScore,
  onClose,
  onShare,
}: CelebrationProps): React.JSX.Element {
  const config: CelebrationConfig =
    type === 'taysikenno'
      ? {
          title: 'Täysi kenno!',
          description: 'Täydellinen tulos! Löysit kaikki sanat.',
          target: maxScore,
          closeLabel: 'OK',
          cardClass: styles.celebrationCardIntense,
        }
      : {
          title: 'Ällistyttävä!',
          description: 'Huikea suoritus! Olet saavuttanut huipputason.',
          target: Math.ceil(0.7 * maxScore),
          closeLabel: 'Jatka pelaamista',
          cardClass: styles.celebrationCard,
        };

  const autoCloseMs = type === 'taysikenno' ? 8000 : 5000;

  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [onClose, autoCloseMs]);

  const handleShare = (): void => {
    onShare();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className={`rounded-xl p-8 max-w-sm w-full mx-4 shadow-lg text-center ${config.cardClass}`}
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
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
            className="px-4 py-2 rounded-lg font-semibold cursor-pointer border-none text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
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
      </div>
    </div>
  );
}
