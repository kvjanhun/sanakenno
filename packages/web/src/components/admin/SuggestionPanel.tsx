import { WandSparkles } from 'lucide-react';
import type { PuzzleSuggestion } from './useAdminSuggestion';

/** No-spoiler game suggestion panel for the puzzle editor. */
export function SuggestionPanel({
  suggestion,
  suggestionError,
  suggestionLoading,
  saving,
  pangramSpoilersVisible,
  onFetchSuggestion,
  onTogglePangrams,
  onRejectSuggestion,
  onAcceptSuggestion,
}: {
  suggestion: PuzzleSuggestion | null;
  suggestionError: string | null;
  suggestionLoading: boolean;
  saving: boolean;
  pangramSpoilersVisible: boolean;
  onFetchSuggestion: () => void;
  onTogglePangrams: () => void;
  onRejectSuggestion: () => void;
  onAcceptSuggestion: () => void;
}) {
  const surfaceButtonStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };
  const dangerButtonStyle = {
    backgroundColor:
      'color-mix(in srgb, var(--color-error) 10%, var(--color-bg-primary))',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
  };

  return (
    <section
      className="rounded-2xl border shadow-sm overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl font-semibold bg-emerald-500/10 text-emerald-500">
            <WandSparkles size={18} />
          </span>
          <div>
            <h2
              className="text-md font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Peliavustaja
            </h2>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Ehdota automaattisesti laadukkaita, arvioituja pelejä kiertoon
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onFetchSuggestion}
          disabled={suggestionLoading || saving}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-sm hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
          style={surfaceButtonStyle}
        >
          <WandSparkles size={13} />
          {suggestionLoading ? 'Haetaan...' : 'Ehdota peliä'}
        </button>
      </div>

      <div className="p-5 min-h-[340px] flex flex-col justify-between">
        {suggestionError && (
          <div
            className="text-sm p-3 rounded-lg border border-red-500/10 bg-red-500/5 mb-4"
            style={{ color: 'var(--color-error)' }}
          >
            {suggestionError}
          </div>
        )}

        {suggestion ? (
          <div className="space-y-5 flex-1 flex flex-col justify-between">
            <div className="flex flex-col gap-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Ehdotetun pelin kirjaimet
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {suggestion.letters.map((letter) => (
                  <span
                    key={letter}
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl font-mono font-bold text-base sm:text-lg flex items-center justify-center shadow-xs select-none border"
                    style={{
                      backgroundColor:
                        letter === suggestion.center
                          ? 'var(--color-accent)'
                          : 'var(--color-bg-primary)',
                      borderColor:
                        letter === suggestion.center
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                      color:
                        letter === suggestion.center
                          ? 'var(--color-on-accent)'
                          : 'var(--color-text-primary)',
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Sanamäärä
                </div>
                <div
                  className="text-lg font-bold mt-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {suggestion.word_count}{' '}
                  <span className="text-xs font-normal opacity-70">sanaa</span>
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {suggestion.max_score} p maksimi
                </div>
              </div>

              <div
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Pangrammit
                </div>
                <div
                  className="text-lg font-bold mt-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {suggestion.pangram_count}{' '}
                  <span className="text-xs font-normal opacity-70">kpl</span>
                </div>
                <div className="text-xs mt-0.5 truncate font-medium flex items-center gap-1">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      suggestion.quality_grade === 'good'
                        ? 'bg-emerald-500'
                        : suggestion.quality_grade === 'ok'
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                    }`}
                  />
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {suggestion.quality_label}
                  </span>
                </div>
              </div>

              <div
                className="p-3 rounded-xl border col-span-2 sm:col-span-1"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Valintatesti
                </div>
                <div
                  className="text-lg font-bold mt-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {suggestion.score}{' '}
                  <span className="text-xs font-normal opacity-70">
                    valintaa
                  </span>
                </div>
                <div
                  className="text-xs mt-0.5 truncate"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Havaitut kandidaatit
                </div>
              </div>
            </div>

            <div
              className="p-3.5 rounded-xl border text-xs space-y-2"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Päällekkäisyys kierrossa:
                </span>
                <div
                  className="flex flex-wrap gap-x-4 gap-y-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <span>
                    <strong className="opacity-70">Edellinen:</strong>{' '}
                    {suggestion.overlaps.previous.shared_short_words} lyhyttä /{' '}
                    {suggestion.overlaps.previous.shared_letters} kirjainta
                  </span>
                  <span>
                    <strong className="opacity-70">Alku:</strong>{' '}
                    {suggestion.overlaps.next.shared_short_words} lyhyttä /{' '}
                    {suggestion.overlaps.next.shared_letters} kirjainta
                  </span>
                </div>
              </div>

              {suggestion.reasons.length > 0 && (
                <div className="flex gap-2">
                  <span
                    className="font-semibold shrink-0"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Huomiot:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {suggestion.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-amber-500/5 text-amber-500 border-amber-500/10"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {pangramSpoilersVisible && suggestion.pangrams && (
              <div
                aria-label="Pangrammien spoilerit"
                className="p-4 rounded-xl border border-dashed text-xs space-y-2 animate-fade-in"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Pangrammit sanakirjassa
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.pangrams.map((pangram) => (
                    <span
                      key={pangram}
                      className="bg-neutral-800 border border-neutral-700 font-mono font-bold text-xs text-neutral-200 rounded-lg px-2 py-0.5"
                    >
                      {pangram}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={onTogglePangrams}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold border shadow-xs hover:bg-[color-mix(in srgb,var(--color-text-primary)_5%,transparent)] transition-all cursor-pointer"
                style={surfaceButtonStyle}
                aria-expanded={pangramSpoilersVisible}
              >
                {pangramSpoilersVisible
                  ? 'Piilota pangrammit'
                  : 'Näytä pangrammit'}
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onRejectSuggestion}
                  className="flex-1 sm:flex-initial h-9 rounded-lg px-4 text-xs font-semibold hover:bg-[color-mix(in srgb,var(--color-error)_12%,var(--color-bg-primary))] transition-all shadow-xs border cursor-pointer"
                  style={dangerButtonStyle}
                >
                  Hylkää
                </button>
                <button
                  type="button"
                  onClick={onAcceptSuggestion}
                  className="flex-1 sm:flex-initial h-9 rounded-lg px-4 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-on-accent)',
                    border: '1px solid var(--color-accent)',
                  }}
                >
                  Hyväksy
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="text-center py-6 border border-dashed rounded-xl flex-1 flex items-center justify-center p-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Paina "Ehdota peliä" saadaksesi tekoälyn valitseman uuden
              peliehdotuksen.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
