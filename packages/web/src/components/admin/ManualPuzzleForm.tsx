/** Manual puzzle creation form used by the admin editor. */
export function ManualPuzzleForm({
  newLetters,
  newCenter,
  saving,
  onLettersChange,
  onCenterChange,
  onCreate,
}: {
  newLetters: string;
  newCenter: string;
  saving: boolean;
  onLettersChange: (value: string) => void;
  onCenterChange: (value: string) => void;
  onCreate: () => void;
}) {
  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };
  const primaryButtonStyle = {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-on-accent)',
    border: '1px solid var(--color-accent)',
  };

  return (
    <div
      className="p-5 border-t animate-slide-down"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--color-accent) 4%, var(--color-bg-secondary))',
        borderColor: 'var(--color-border)',
      }}
    >
      <h3
        className="text-sm font-bold mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Luo peli käsin
      </h3>
      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-7">
          <input
            type="text"
            value={newLetters}
            onChange={(e) => onLettersChange(e.target.value)}
            placeholder="7 kirjainta (esim. a,b,c,d,e,f,g)"
            className="h-10 w-full rounded-lg px-3 text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-accent"
            style={inputStyle}
          />
        </div>
        <div className="sm:col-span-3">
          <input
            type="text"
            value={newCenter}
            onChange={(e) => onCenterChange(e.target.value)}
            placeholder="Keskus"
            maxLength={1}
            className="h-10 w-full rounded-lg px-3 text-center text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-accent uppercase"
            style={inputStyle}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={onCreate}
            disabled={saving || !newLetters.trim() || !newCenter.trim()}
            className="h-10 w-full rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
            style={primaryButtonStyle}
          >
            Luo
          </button>
        </div>
      </div>
    </div>
  );
}
