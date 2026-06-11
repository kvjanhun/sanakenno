/**
 * Modal overlay presenting the game rules in Finnish.
 * Content matches the original web_kontissa SanakennoRulesModal.
 *
 * @module src/components/RulesModal
 */

import { Check, HelpCircle, Sparkles } from 'lucide-react';
import { ModalShell } from './ModalShell';

/** Props for {@link RulesModal}. */
export interface RulesModalProps {
  /** Whether the modal is visible. */
  show: boolean;
  /** Close the modal. */
  onClose: () => void;
}

/**
 * Render a full-screen modal with the game rules.
 */
export function RulesModal({
  show,
  onClose,
}: RulesModalProps): React.JSX.Element {
  return (
    <ModalShell
      show={show}
      title="Pelin säännöt"
      titleId="rules-modal-title"
      onClose={onClose}
      className="flex flex-col"
      style={{ maxHeight: '85vh', overflowY: 'hidden' }}
    >
      <div
        className="flex-1 min-h-0 overflow-y-auto text-sm space-y-4 mt-2 pr-1"
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
            </span>{' '}
            ovat molemmat hyväksyttäviä.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
