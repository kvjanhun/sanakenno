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
  {
    name: 'React',
    license: 'MIT',
    copyright: 'Meta Platforms, Inc.',
    url: 'https://react.dev',
  },
  {
    name: 'Vite',
    license: 'MIT',
    copyright: 'Evan You',
    url: 'https://vite.dev',
  },
  {
    name: 'Tailwind CSS',
    license: 'MIT',
    copyright: 'Tailwind Labs, Inc.',
    url: 'https://tailwindcss.com',
  },
  {
    name: 'Zustand',
    license: 'MIT',
    copyright: 'Paul Henschel',
    url: 'https://github.com/pmndrs/zustand',
  },
  {
    name: 'Hono',
    license: 'MIT',
    copyright: 'Yusuke Wada',
    url: 'https://hono.dev',
  },
  {
    name: 'better-sqlite3',
    license: 'MIT',
    copyright: 'Joshua Wise',
    url: 'https://github.com/WiseLibs/better-sqlite3',
  },
  {
    name: 'vite-plugin-pwa',
    license: 'MIT',
    copyright: 'Anthony Fu',
    url: 'https://github.com/vite-pwa/vite-plugin-pwa',
  },
  {
    name: 'Lucide Icons',
    license: 'MIT',
    copyright: 'Lucide Contributors',
    url: 'https://lucide.dev',
  },
  {
    name: 'qrcode',
    license: 'MIT',
    copyright: 'Ryan Day',
    url: 'https://github.com/soldair/node-qrcode',
  },
  {
    name: 'validator',
    license: 'MIT',
    copyright: "Chris O'Hara",
    url: 'https://github.com/validatorjs/validator.js',
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
          Tavoitteenasi on löytää mahdollisimman monta sanaa seitsemästä
          annetusta kirjaimesta.
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
              <span className="h-4 flex items-center shrink-0">
                <Check
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>
                Sanan täytyy sisältää{' '}
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-accent)' }}
                >
                  keskimmäinen kirjain.
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <Check
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>Sanan pituus on vähintään 4 kirjainta.</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <Check
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>Samaa kirjainta voi käyttää useasti.</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <Check
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
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
                ).
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
              <span className="h-4 flex items-center shrink-0">
                <Sparkles
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>4-kirjaiminen sana: 1 piste</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <Sparkles
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>Pidempi sana: 1 piste jokaisesta kirjaimesta</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <Sparkles
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
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
              <span className="h-4 flex items-center shrink-0">
                <HelpCircle
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>Yleiskuva: sanojen ja pangrammien kokonaismäärä</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <HelpCircle
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>Pituudet: sanojen pituusjakauma</span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <HelpCircle
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
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
            kirjoittaa joko viivalla tai ilman. Esimerkiksi{' '}
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
            ovat molemmat hyväksyttäviä.
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
              <span className="h-4 flex items-center shrink-0">
                <Smartphone
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>
                Voit asentaa Sanakennon sovelluksena kotinäytöllesi selaimesi
                valikon kautta (&quot;Lisää kotinäytölle&quot; tai &quot;Asenna
                sovellus&quot;).
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs">
              <span className="h-4 flex items-center shrink-0">
                <Smartphone
                  size={14}
                  style={{
                    color: 'var(--color-accent)',
                  }}
                />
              </span>
              <span>
                Jo ladattua peliä voi pelata ilman internet-yhteyttä. Uuden
                pelin lataaminen tai edistymisen synkronointi vaatii
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
          <div ref={licensesRef} className="mt-5 space-y-3">
            <p
              className="text-xs text-center mb-4 pb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sanakenno käyttää seuraavia avoimen lähdekoodin kirjastoja:
            </p>
            <div className="space-y-1">
              {LICENSES.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0"
                  style={{
                    borderColor:
                      'color-mix(in srgb, var(--color-border) 30%, transparent)',
                  }}
                >
                  <div className="min-w-0 flex-1 flex items-baseline gap-2">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener"
                      className="font-semibold text-xs hover:underline truncate text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      {entry.name}
                    </a>
                    <span className="text-[10px] truncate text-[var(--color-text-tertiary)]">
                      {entry.copyright}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] font-bold tracking-wide shrink-0 opacity-80 text-[var(--color-accent)]">
                    {entry.license}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
