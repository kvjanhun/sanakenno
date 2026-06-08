import { Search } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CombinationEntry } from '../../store/useAdminStore';
import type { CombinationFilters } from './useAdminCombinations';
import { CombinationResultsTable } from './CombinationResultsTable';

/** Filterable combination search panel in the admin editor. */
export function CombinationSearchPanel({
  filters,
  comboTotal,
  comboLoading,
  comboResults,
  selectedCombo,
  savedLetters,
  onFilterChange,
  onSelectCombo,
  onSort,
  sortIndicator,
}: {
  filters: CombinationFilters;
  comboTotal: number;
  comboLoading: boolean;
  comboResults: CombinationEntry[];
  selectedCombo: string | null;
  savedLetters: string;
  onFilterChange: (key: keyof CombinationFilters, value: string) => void;
  onSelectCombo: (combo: CombinationEntry) => void;
  onSort: (column: string) => void;
  sortIndicator: (column: string) => string;
}) {
  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
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
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Search size={18} />
          </span>
          <div>
            <h2
              className="text-md font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Yhdistelmähaku
            </h2>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Selaa ja suodata kaikkia suomen kielen kirjainkombinaatioita
            </p>
          </div>
        </div>

        {!comboLoading && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded bg-[color-mix(in srgb,var(--color-text-primary)_6%,transparent)] text-neutral-400 shrink-0"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {comboTotal} tulosta
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-1">
            <label
              className="text-xs font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sisältää kirjaimet
            </label>
            <input
              type="text"
              value={filters.requires}
              onChange={(e) => onFilterChange('requires', e.target.value)}
              placeholder="Sisältää..."
              className="w-full h-9 px-3 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ei sisällä
            </label>
            <input
              type="text"
              value={filters.excludes}
              onChange={(e) => onFilterChange('excludes', e.target.value)}
              placeholder="Poissulje kirjaimet"
              className="w-full h-9 px-3 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1 col-span-2">
            <label
              className="text-xs font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Kierron status
            </label>
            <select
              value={filters.in_rotation}
              onChange={(e) => onFilterChange('in_rotation', e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              style={inputStyle}
            >
              <option value="">Kaikki yhdistelmät</option>
              <option value="true">Nykyisessä kierrossa (*)</option>
              <option value="false">Kierron ulkopuoliset</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <span
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Yhdistelmätason rajoitukset
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumericRange
              label="Pangrammit"
              minValue={filters.min_pangrams}
              maxValue={filters.max_pangrams}
              minLabel="Pangrammeja vähintään"
              maxLabel="Pangrammeja enintään"
              onMinChange={(value) => onFilterChange('min_pangrams', value)}
              onMaxChange={(value) => onFilterChange('max_pangrams', value)}
              inputStyle={inputStyle}
            />
            <NumericRange
              label="Väh. sanoja/keskus"
              minValue={filters.min_words_min}
              maxValue={filters.max_words_min}
              minLabel="Vähemmän sanojen määrä vähintään"
              maxLabel="Vähemmän sanojen määrä enintään"
              onMinChange={(value) => onFilterChange('min_words_min', value)}
              onMaxChange={(value) => onFilterChange('max_words_min', value)}
              inputStyle={inputStyle}
            />
            <NumericRange
              label="Naj. sanoja/keskus"
              minValue={filters.min_words}
              maxValue={filters.max_words}
              minLabel="Enemmän sanojen määrä vähintään"
              maxLabel="Enemmän sanojen määrä enintään"
              onMinChange={(value) => onFilterChange('min_words', value)}
              onMaxChange={(value) => onFilterChange('max_words', value)}
              inputStyle={inputStyle}
            />
          </div>
        </div>

        <CombinationResultsTable
          comboLoading={comboLoading}
          comboResults={comboResults}
          selectedCombo={selectedCombo}
          savedLetters={savedLetters}
          onSelectCombo={onSelectCombo}
          onSort={onSort}
          sortIndicator={sortIndicator}
        />
      </div>
    </section>
  );
}

function NumericRange({
  label,
  minValue,
  maxValue,
  minLabel,
  maxLabel,
  onMinChange,
  onMaxChange,
  inputStyle,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  minLabel: string;
  maxLabel: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  inputStyle: CSSProperties;
}) {
  return (
    <div
      className="space-y-1 bg-neutral-900/10 p-2.5 rounded-lg border border-neutral-800/10"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <span
        className="text-xs font-semibold block"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5 mt-1">
        <input
          type="number"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder="min"
          className="w-full h-8 px-1 rounded text-center text-xs"
          style={inputStyle}
          aria-label={minLabel}
        />
        <span className="text-xs text-neutral-400">–</span>
        <input
          type="number"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder="max"
          className="w-full h-8 px-1 rounded text-center text-xs"
          style={inputStyle}
          aria-label={maxLabel}
        />
      </div>
    </div>
  );
}
