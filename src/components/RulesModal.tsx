/**
 * Modal overlay presenting the game rules in Finnish.
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

const RULES: string[] = [
  'Muodosta sanoja annetuista kirjaimista.',
  'Jokaisen sanan on sisällettävä keskuskirjain.',
  'Sanojen on oltava vähintään 4 kirjainta pitkiä.',
  'Kirjaimia saa käyttää useammin kuin kerran.',
  '4-kirjaiminen sana = 1 piste, pidemmät = kirjainten määrä.',
  'Pangrammi (kaikki 7 kirjainta) = +7 bonuspistettä.',
];

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Säännöt"
      >
        <h2 className="text-xl font-bold mb-4">Säännöt</h2>
        <ol
          className="list-decimal pl-5 space-y-2 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {RULES.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2 rounded-lg text-white font-semibold cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          Sulje
        </button>
      </div>
    </div>
  );
}
