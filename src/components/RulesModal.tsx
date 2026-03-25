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
            Ohjeet
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
            Löydä mahdollisimman monta sanaa seitsemästä annetusta kirjaimesta.
          </p>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Jokaisen sanan täytyy:
            </p>
            <ul className="space-y-1 list-none pl-0">
              <li>
                ✦ Sisältää{' '}
                <span style={{ color: 'var(--color-accent)' }}>
                  oranssin keskikirjaimen
                </span>
              </li>
              <li>✦ Olla vähintään 4 kirjainta pitkä</li>
              <li>
                ✦ Koostua vain annetuista kirjaimista — samaa kirjainta voi
                käyttää useasti
              </li>
              <li>
                ✦ Löytyä suomen kielen sanakirjasta (
                <a
                  href="https://kaino.kotus.fi/sanat/nykysuomi/"
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
              <li>✦ 4-kirjaiminen sana = 1 piste</li>
              <li>✦ Pidempi sana = pisteitä sanan pituuden verran</li>
              <li>
                ✦ Pangrammi (kaikki 7 kirjainta käytetty) = +7 lisäpistettä
              </li>
            </ul>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Yhdyssanat:
            </p>
            <p>
              Yhdysviivallisen sanan voi kirjoittaa myös ilman viivaa — esim.{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>palo-ovi</span>{' '}
              tai{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>paloovi</span>.
            </p>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Tasot:
            </p>
            <p>
              Pisteesi määrittävät tason. Tavoittele tasoa{' '}
              <span style={{ color: 'var(--color-accent)' }}>Ällistyttävä</span>
              !
            </p>
          </div>

          <div>
            <p
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Avut:
            </p>
            <p>Neljä vihjettä, jotka jäävät auki koko pelin ajaksi.</p>
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--color-border)',
              margin: '0.5rem 0',
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
          </p>
        </div>
      </div>
    </div>
  );
}
