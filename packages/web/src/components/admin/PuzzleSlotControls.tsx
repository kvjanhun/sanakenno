import type { FormEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Grid,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { VariationData } from '../../store/useAdminStore';
import { ManualPuzzleForm } from './ManualPuzzleForm';
import { VariationsGrid } from './VariationsGrid';

interface PuzzleSlotControlsProps {
  currentSlot: number;
  totalPuzzles: number;
  selectedCombo: string | null;
  displayVariations: VariationData[];
  activeCenter: string;
  isActive: boolean;
  isDirty: boolean;
  saving: boolean;
  puzzleLoading: boolean;
  statusMessage: string | null;
  statusType: 'success' | 'error' | 'warning' | null;
  jumpTarget: string;
  swapTarget: string;
  createMode: boolean;
  newLetters: string;
  newCenter: string;
  onJumpTargetChange: (value: string) => void;
  onSwapTargetChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onJump: (event: FormEvent<HTMLFormElement>) => void;
  onClearSelection: () => void;
  onCenterSelect: (center: string) => void;
  onSave: () => void | Promise<void>;
  onRestore: () => void;
  onSwap: () => void | Promise<void>;
  onDelete: () => void;
  onReactivate: () => void;
  onToggleCreateMode: () => void;
  onNewLettersChange: (value: string) => void;
  onNewCenterChange: (value: string) => void;
  onCreateFromForm: () => void | Promise<void>;
  onCreateFromCombo: () => void | Promise<void>;
}

export function PuzzleSlotControls({
  currentSlot,
  totalPuzzles,
  selectedCombo,
  displayVariations,
  activeCenter,
  isActive,
  isDirty,
  saving,
  puzzleLoading,
  statusMessage,
  statusType,
  jumpTarget,
  swapTarget,
  createMode,
  newLetters,
  newCenter,
  onJumpTargetChange,
  onSwapTargetChange,
  onPrev,
  onNext,
  onJump,
  onClearSelection,
  onCenterSelect,
  onSave,
  onRestore,
  onSwap,
  onDelete,
  onReactivate,
  onToggleCreateMode,
  onNewLettersChange,
  onNewCenterChange,
  onCreateFromForm,
  onCreateFromCombo,
}: PuzzleSlotControlsProps) {
  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };
  const surfaceButtonStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };
  const primaryButtonStyle = {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-on-accent)',
    border: '1px solid var(--color-accent)',
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
        className="grid grid-cols-2 gap-3 p-4 sm:flex sm:flex-row sm:items-center sm:justify-between border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="col-span-1 sm:order-1 flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl font-semibold bg-indigo-500/10 text-indigo-400 shrink-0">
            {selectedCombo ? (
              <SlidersHorizontal
                size={16}
                className="sm:h-[18px] sm:w-[18px]"
              />
            ) : (
              <Grid size={18} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            )}
          </span>
          <div className="min-w-0">
            <h2
              className="text-sm sm:text-md font-bold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {selectedCombo
                ? 'Esikatseltava peli'
                : `Peli ${currentSlot + 1} / ${totalPuzzles}`}
              {!selectedCombo && !isActive && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-500">
                  Poistettu
                </span>
              )}
            </h2>
            <p
              className={`text-[10px] sm:text-xs text-ellipsis overflow-hidden ${
                selectedCombo ? 'line-clamp-1' : 'whitespace-nowrap'
              }`}
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {selectedCombo
                ? 'Yhdistelmähaustatustietojen esikatselu'
                : isActive
                  ? 'Kierrossa oleva peli'
                  : 'Peli on poistettu aktiivisesta kierrosta'}
            </p>
          </div>
        </div>

        {!selectedCombo && (
          <div className="col-span-1 justify-self-end sm:order-3 flex justify-end">
            <form
              onSubmit={onJump}
              className="inline-flex items-center rounded-xl p-0.5 sm:p-1 shadow-sm gap-1 shrink-0"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={onPrev}
                disabled={currentSlot <= 0 || puzzleLoading}
                title="Edellinen peli"
                aria-label="Edellinen peli"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-[color-mix(in srgb,var(--color-text-primary)_5%,transparent)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default shrink-0"
                style={{
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  background: 'none',
                }}
              >
                <ChevronLeft
                  size={16}
                  strokeWidth={2.4}
                  className="sm:h-[18px] sm:w-[18px]"
                />
              </button>
              <div className="flex items-center gap-0.5 sm:gap-1 font-mono text-[10px] sm:text-xs font-bold shrink-0">
                <span style={{ color: 'var(--color-text-secondary)' }}>#</span>
                <input
                  type="number"
                  value={jumpTarget}
                  onChange={(event) => onJumpTargetChange(event.target.value)}
                  min={1}
                  max={Math.max(1, totalPuzzles)}
                  disabled={puzzleLoading || totalPuzzles <= 0}
                  aria-label="Siirry pelinumeroon"
                  className="h-7 w-11 sm:h-8 sm:w-14 rounded-lg text-center text-[10px] sm:text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={puzzleLoading || totalPuzzles <= 0}
                className="h-7 rounded-lg px-2 text-[10px] sm:text-xs font-semibold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                style={surfaceButtonStyle}
              >
                Siirry
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={currentSlot >= totalPuzzles - 1 || puzzleLoading}
                title="Seuraava peli"
                aria-label="Seuraava peli"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-[color-mix(in srgb,var(--color-text-primary)_5%,transparent)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default shrink-0"
                style={{
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  background: 'none',
                }}
              >
                <ChevronRight
                  size={16}
                  strokeWidth={2.4}
                  className="sm:h-[18px] sm:w-[18px]"
                />
              </button>
            </form>
          </div>
        )}

        {selectedCombo && (
          <div className="col-span-1 justify-self-end sm:order-3 flex justify-end">
            <button
              type="button"
              onClick={onClearSelection}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[color-mix(in srgb,var(--color-text-primary)_5%,transparent)] border shadow-sm cursor-pointer transition-all shrink-0"
              style={surfaceButtonStyle}
            >
              ← Kiertoon
            </button>
          </div>
        )}

        {(isDirty ||
          statusMessage === 'Tallenna' ||
          statusMessage === 'Tallennettu' ||
          (statusMessage && statusType === 'success')) && (
          <div className="col-span-2 justify-self-center sm:flex-1 sm:flex sm:justify-center px-0 sm:px-4 min-w-0 sm:order-2">
            <div className="flex justify-center">
              {isDirty ? (
                <div
                  className="flex items-center gap-1.5 sm:gap-3 bg-[color-mix(in srgb,var(--color-accent)_10%,var(--color-bg-secondary))] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl border animate-fade-in"
                  style={{ borderColor: 'var(--color-accent)' }}
                >
                  <div
                    className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold shrink-0"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span className="hidden md:inline">Muutoksia</span>
                  </div>
                  <div className="flex gap-1 sm:gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void onSave()}
                      disabled={saving}
                      className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold shadow-xs hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                      style={primaryButtonStyle}
                    >
                      {saving ? 'Tallennetaan...' : 'Tallenna'}
                    </button>
                    <button
                      type="button"
                      onClick={onRestore}
                      disabled={saving}
                      className="p-1 sm:p-1.5 rounded-lg border hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
                      style={surfaceButtonStyle}
                      title="Kumoa muutokset"
                    >
                      <Undo2 size={12} className="sm:h-[13px] sm:w-[13px]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-emerald-500/20 animate-fade-in shrink-0">
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="hidden md:inline">
                    Kaikki muutokset tallennettu
                  </span>
                  <span className="md:hidden">Tallennettu</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        {displayVariations.length > 0 && (
          <div className="space-y-2">
            <VariationsGrid
              variations={displayVariations}
              activeCenter={activeCenter}
              onSelect={onCenterSelect}
            />
          </div>
        )}

        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {selectedCombo && activeCenter && (
            <div
              className="bg-[color-mix(in srgb,var(--color-accent)_5%,var(--color-bg-primary))] p-4 rounded-xl border border-dashed flex flex-col sm:flex-row items-center justify-between gap-3"
              style={{ borderColor: 'var(--color-accent)' }}
            >
              <div
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Vaihtoehto{' '}
                <strong
                  className="font-mono text-base"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {selectedCombo}
                </strong>{' '}
                valittu keskuksella{' '}
                <strong
                  className="font-mono text-base uppercase"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {activeCenter}
                </strong>
                .
              </div>
              <button
                type="button"
                onClick={() => void onCreateFromCombo()}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
                style={primaryButtonStyle}
              >
                {saving ? 'Lisätään...' : 'Lisää uutena pelinä'}
              </button>
            </div>
          )}

          {!selectedCombo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium shrink-0 w-16"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Vaihda sij.
                </span>
                <input
                  type="number"
                  value={swapTarget}
                  onChange={(event) => onSwapTargetChange(event.target.value)}
                  placeholder="#"
                  min={1}
                  max={totalPuzzles}
                  className="h-9 w-20 rounded-lg px-2 text-center text-sm border focus:outline-none focus:ring-1 focus:ring-accent"
                  style={inputStyle}
                  aria-label="Vaihda pelin sijainti"
                />
                <button
                  type="button"
                  onClick={() => void onSwap()}
                  disabled={saving}
                  className="h-9 rounded-lg px-3 text-xs font-semibold inline-flex items-center gap-1 hover:scale-[1.02] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  style={surfaceButtonStyle}
                >
                  <Shuffle size={13} strokeWidth={2.4} />
                  Vaihda
                </button>
              </div>

              <div className="flex flex-col justify-end gap-2">
                {isDirty && (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => void onSave()}
                      disabled={saving}
                      className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      style={primaryButtonStyle}
                    >
                      <Save size={14} />
                      Tallenna muutokset
                    </button>
                    <button
                      type="button"
                      onClick={onRestore}
                      disabled={saving}
                      className="px-3 h-9 rounded-lg text-xs font-semibold border shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      style={surfaceButtonStyle}
                    >
                      <Undo2 size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 w-full">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={saving || totalPuzzles <= 0}
                      className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold hover:bg-[color-mix(in srgb,var(--color-error)_12%,var(--color-bg-primary))] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      style={dangerButtonStyle}
                    >
                      <Trash2 size={13} />
                      Poista peli #{currentSlot + 1}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onReactivate}
                      disabled={saving}
                      className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      style={primaryButtonStyle}
                    >
                      <RefreshCw size={13} />
                      Palauta kiertoon
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onToggleCreateMode}
                    disabled={saving}
                    className="h-9 rounded-lg px-3 text-xs font-semibold inline-flex items-center gap-1 border shadow-sm cursor-pointer transition-all"
                    style={{
                      backgroundColor: createMode
                        ? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-secondary))'
                        : 'var(--color-bg-primary)',
                      borderColor: createMode
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: createMode
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                    }}
                  >
                    <Plus size={14} />
                    Uusi peli
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {createMode && (
        <ManualPuzzleForm
          newLetters={newLetters}
          newCenter={newCenter}
          saving={saving}
          onLettersChange={onNewLettersChange}
          onCenterChange={onNewCenterChange}
          onCreate={onCreateFromForm}
        />
      )}
    </section>
  );
}
