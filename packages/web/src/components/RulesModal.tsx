/**
 * Modal overlay presenting the game rules in Finnish.
 * Content matches the original web_kontissa SanakennoRulesModal.
 *
 * @module src/components/RulesModal
 */

import { useEffect, useRef, useState } from 'react';
import { msUntilMidnight } from '../hooks/useMidnightRollover';

const LICENSES = [
  { name: 'React', license: 'MIT', copyright: 'Meta Platforms, Inc.' },
  { name: 'Vite', license: 'MIT', copyright: 'Evan You' },
  { name: 'Tailwind CSS', license: 'MIT', copyright: 'Tailwind Labs, Inc.' },
  { name: 'Zustand', license: 'MIT', copyright: 'Paul Henschel' },
  { name: 'Hono', license: 'MIT', copyright: 'Yusuke Wada' },
  { name: 'better-sqlite3', license: 'MIT', copyright: 'Joshua Wise' },
  {
    name: 'vite-plugin-pwa',
    license: 'MIT',
    copyright: 'Anthony Fu',
  },
];

/** Props for {@link RulesModal}. */
export interface RulesModalProps {
  /** Whether the modal is visible. */
  show: boolean;
  /** Close the modal. */
  onClose: () => void;
}

/**
 * Format milliseconds as HH:MM:SS for display.
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Render a full-screen modal with the game rules.
 */
export function RulesModal({
  show,
  onClose,
}: RulesModalProps): React.JSX.Element | null {
  const [timeRemaining, setTimeRemaining] = useState<string>('00:00:00');
  const [msRemaining, setMsRemaining] = useState<number>(0);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const licensesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;

    const updateTimer = () => {
      const ms = msUntilMidnight();
      setMsRemaining(ms);
      setTimeRemaining(formatTimeRemaining(ms));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-4 overflow-y-auto max-h-[90vh]"
        style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
      >
        <div className="flex justify-between items-center mb-1">
          <h2
            id="rules-modal-title"
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pelin säännöt
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-xl leading-none bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label="Sulje"
          >
            ✕
          </button>
        </div>
        <div
          className="text-xs mb-3 text-right"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Seuraava kenno:{' '}
          <span
            className="font-bold"
            style={{
              color:
                msRemaining < 30 * 60 * 1000
                  ? 'var(--color-accent)'
                  : 'var(--color-text-primary)',
            }}
          >
            {timeRemaining}
          </span>
        </div>

        <div
          className="text-sm space-y-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <p>
            Yritä löytää mahdollisimman monta sanaa seitsemästä annetusta
            kirjaimesta.
          </p>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Hyväksyttävien sanojen täytyy
            </p>
            <ul className="space-y-1 list-none pl-0">
              <li>
                • Sisältää{' '}
                <span style={{ color: 'var(--color-accent)' }}>
                  oranssi keskikirjain
                </span>
              </li>
              <li>• Olla vähintään 4 kirjaimen pituisia</li>
              <li>
                • Koostua vain annetuista kirjaimista — samaa kirjainta voi
                käyttää useasti
              </li>
              <li>
                • Löytyä Kotuksen sanalistasta (
                <a
                  href="https://kotus.fi/sanakirjat/kielitoimiston-sanakirja/nykysuomen-sana-aineistot/nykysuomen-sanalista"
                  target="_blank"
                  rel="noopener"
                  style={{
                    color: 'var(--color-accent)',
                    textDecoration: 'underline',
                  }}
                >
                  Kotus
                </a>
                )
              </li>
            </ul>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Pisteytys
            </p>
            <ul className="space-y-1 list-none pl-0">
              <li>• 4-kirjaiminen sana: 1 piste</li>
              <li>• Pidempi sana: pisteitä sanan pituuden verran</li>
              <li>• Pangrammi: +7 lisäpistettä</li>
              <li style={{ color: 'var(--color-text-tertiary)' }}>
                Sana on pangrammi sen sisältäessä kaikki 7 kirjainta.
              </li>
            </ul>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Avut:
            </p>
            <ul className="space-y-1 list-none pl-0">
              <li>• Yleiskuva: mm. sanojen ja pangrammien määrä</li>
              <li>• Pituudet: jäljellä olevien sanojen pituusjakauma</li>
              <li>• Alkuparit: sanojen ensimmäiset 2 kirjainta</li>
            </ul>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Yhdyssanat
            </p>
            <p>Sanalista sisältää myös yhdyssanoja.</p>
            <p>
              Yhdysviivallisen sanan voi kirjoittaa joko viivalla tai ilman eli
              esimerkiksi{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>palo-ovi</span>{' '}
              tai{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>paloovi</span>{' '}
              ovat molemmat hyväksyttyjä muotoja.
            </p>
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--color-border)',
              margin: '0.5rem 0 0.5rem 0',
            }}
          />

          <p
            className="text-xs text-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <a
              href="https://erez.ac"
              target="_blank"
              rel="noopener"
              style={{
                color: 'var(--color-text-tertiary)',
                textDecoration: 'underline',
              }}
            >
              erez.ac
            </a>
            {'  ·  '}Lähdekoodi{' '}
            <a
              href="https://github.com/kvjanhun/sanakenno"
              target="_blank"
              rel="noopener"
              style={{
                color: 'var(--color-text-tertiary)',
                textDecoration: 'underline',
              }}
            >
              GitHub
            </a>
          </p>
          <p
            className="text-xs text-center mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            v{__APP_VERSION__}
          </p>

          <p className="text-xs text-center mt-1">
            <button
              onClick={() => {
                const next = !licensesOpen;
                setLicensesOpen(next);
                if (next) {
                  setTimeout(() => {
                    licensesRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }
              }}
              style={{
                color: 'var(--color-text-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit',
                padding: 0,
              }}
            >
              Lisenssit {licensesOpen ? '▲' : '▼'}
            </button>
          </p>

          {licensesOpen && (
            <div ref={licensesRef} className="mt-2 space-y-1">
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Sanakenno käyttää seuraavia avoimen lähdekoodin kirjastoja:
              </p>
              {LICENSES.map((entry) => (
                <div
                  key={entry.name}
                  className="text-xs rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span className="font-medium">{entry.name}</span>
                  {' — '}
                  <span style={{ color: 'var(--color-accent)' }}>
                    {entry.license}
                  </span>
                  {' — '}
                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                    {entry.copyright}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
