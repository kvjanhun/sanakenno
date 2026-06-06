/**
 * Modal overlay presenting the game rules in Finnish.
 * Content matches the original web_kontissa SanakennoRulesModal.
 *
 * @module src/components/RulesModal
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Sparkles, HelpCircle, Smartphone } from 'lucide-react';
import { msUntilMidnight } from '../hooks/useMidnightRollover';
import { ModalShell } from './ModalShell';

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
  { name: 'Lucide Icons', license: 'MIT', copyright: 'Lucide Contributors' },
  { name: 'qrcode', license: 'MIT', copyright: 'Ryan Day' },
  { name: 'validator', license: 'MIT', copyright: "Chris O'Hara" },
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
    <ModalShell
      title="Pelin säännöt"
      titleId="rules-modal-title"
      onClose={onClose}
    >
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
        className="text-sm space-y-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <p>
          Yritä löytää mahdollisimman monta sanaa seitsemästä annetusta
          kirjaimesta.
        </p>

        {/* Säännöt card */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="font-semibold text-xs uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Säännöt
          </div>
          <ul className="space-y-1.5 pl-0 m-0 list-none">
            <li className="flex items-start gap-2 text-xs">
              <Check
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>
                Sanan täytyy sisältää{' '}
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  keskimmäinen kirjain
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <Check
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>Sanan pituus on vähintään 4 kirjainta</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <Check
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>
                Vain annettuja kirjaimia (samaa kirjainta voi käyttää useasti)
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <Check
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>
                Sanan täytyy löytyä Kotuksen sanalistasta (
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
              </span>
            </li>
          </ul>
        </div>

        {/* Pisteytys card */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="font-semibold text-xs uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pisteytys
          </div>
          <ul className="space-y-1.5 pl-0 m-0 list-none">
            <li className="flex items-start gap-2 text-xs">
              <Sparkles
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>4-kirjaiminen sana: 1 piste</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <Sparkles
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>Pidempi sana: 1 piste jokaisesta kirjaimesta</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <Sparkles
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>
                Pangrammi (sisältää kaikki 7 kirjainta): +7 lisäpistettä
              </span>
            </li>
          </ul>
        </div>

        {/* Avut card */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="font-semibold text-xs uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Avut
          </div>
          <ul className="space-y-1.5 pl-0 m-0 list-none">
            <li className="flex items-start gap-2 text-xs">
              <HelpCircle
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>Yleiskuva: sanojen ja pangrammien kokonaismäärä</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <HelpCircle
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>Pituudet: jäljellä olevien sanojen pituusjakauma</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <HelpCircle
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>Alkuparit: sanojen ensimmäiset 2 kirjainta</span>
            </li>
          </ul>
        </div>

        {/* Yhdyssanat card */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="font-semibold text-xs uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Yhdyssanat
          </div>
          <p className="text-xs m-0 leading-relaxed">
            Sanalista sisältää myös yhdyssanoja. Yhdysviivallisen sanan voi
            kirjoittaa joko viivalla tai ilman (esim.{' '}
            <span
              className="font-mono bg-[var(--color-bg-primary)] px-1 py-0.5 rounded border"
              style={{ borderColor: 'var(--color-border)' }}
            >
              palo-ovi
            </span>{' '}
            tai{' '}
            <span
              className="font-mono bg-[var(--color-bg-primary)] px-1 py-0.5 rounded border"
              style={{ borderColor: 'var(--color-border)' }}
            >
              paloovi
            </span>
            ).
          </p>
        </div>

        {/* Asennus card */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="font-semibold text-xs uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pelaa sovelluksena
          </div>
          <ul className="space-y-1.5 pl-0 m-0 list-none">
            <li className="flex items-start gap-2 text-xs">
              <Smartphone
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>
                Voit asentaa Sanakennon sovelluksena kotinäytöllesi selaimesi
                valikon kautta (&quot;Lisää kotinäytölle&quot; tai &quot;Asenna
                sovellus&quot;).
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <Smartphone
                size={14}
                style={{
                  color: 'var(--color-accent)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span>
                Jo ladattua päivän peliä ja tilastojasi voi jatkaa myös ilman
                verkkoyhteyttä. Uuden päivän peli tai synkronointi vaatii
                internetyhteyden.
              </span>
            </li>
          </ul>
        </div>

        <div
          className="flex items-center justify-center gap-2.5 text-xs mt-4"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <a
            href="https://erez.ac"
            target="_blank"
            rel="noopener"
            className="hover:underline"
            style={{ color: 'inherit' }}
          >
            erez.ac
          </a>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>
            ·
          </span>
          <a
            href="https://github.com/kvjanhun/sanakenno"
            target="_blank"
            rel="noopener"
            className="hover:underline"
            style={{ color: 'inherit' }}
          >
            GitHub
          </a>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>
            ·
          </span>
          <span>v{__APP_VERSION__}</span>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>
            ·
          </span>
          <button
            type="button"
            onClick={() => {
              const next = !licensesOpen;
              setLicensesOpen(next);
              if (next) {
                setTimeout(() => {
                  licensesRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }
            }}
            className="bg-transparent border-none cursor-pointer p-0 text-xs hover:underline"
            style={{ color: 'inherit' }}
          >
            Lisenssit {licensesOpen ? '▲' : '▼'}
          </button>
        </div>

        {licensesOpen && (
          <div ref={licensesRef} className="mt-4 space-y-2.5">
            <p
              className="text-xs text-center m-0"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sanakenno käyttää seuraavia avoimen lähdekoodin kirjastoja:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LICENSES.map((entry) => (
                <div
                  key={entry.name}
                  className="rounded-lg p-2 flex flex-col justify-between border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <div className="flex justify-between items-center gap-1.5 mb-0.5">
                    <span
                      className="font-semibold text-[11px]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {entry.name}
                    </span>
                    <span
                      className="px-1 py-0.2 rounded font-mono text-[9px]"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-primary))',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {entry.license}
                    </span>
                  </div>
                  <div
                    className="truncate text-[9.5px]"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {entry.copyright}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
