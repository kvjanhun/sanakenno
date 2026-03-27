/**
 * Modal overlay presenting the game rules in Finnish.
 * Content matches the original web_kontissa SanakennoRulesModal.
 *
 * @module src/components/RulesModal
 */

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
}: RulesModalProps): React.JSX.Element | null {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 overflow-y-auto max-h-[90vh]"
        style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
      >
        <div className="flex justify-between items-center mb-4">
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
          className="text-sm space-y-4"
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
              Hyväksyttävien sanojen täytyy:
            </p>
            <ul className="space-y-1 list-none pl-0">
              <li>
                ✦ Sisältää{' '}
                <span style={{ color: 'var(--color-accent)' }}>
                  oranssi keskikirjain
                </span>
              </li>
              <li>✦ Olla vähintään 4 kirjaimen pituisia</li>
              <li>
                ✦ Koostua vain annetuista kirjaimista — samaa kirjainta voi
                käyttää useasti
              </li>
              <li>
                ✦ Löytyä Kotuksen sanalistasta (
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
              Pisteytys:
            </p>
            <ul className="space-y-1 list-none pl-0">
              <li>✦ 4-kirjaiminen sana: 1 piste</li>
              <li>✦ Pidempi sana: pisteitä sanan pituuden verran</li>
              <li>✦ Pangrammi: +7 lisäpistettä</li>
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
              <li>✦ Yleiskuva: mm. sanojen ja pangrammien määrä</li>
              <li>✦ Pituudet: jäljellä olevien sanojen pituusjakauma</li>
              <li>✦ Alkuparit: sanojen ensimmäiset 2 kirjainta</li>
            </ul>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Yhdyssanat:
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
              margin: '1.25rem 0 1.5rem 0',
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
        </div>
      </div>
    </div>
  );
}
