/**
 * Combined puzzle editor and combinations browser.
 *
 * Layout from top to bottom:
 *   1. Toolbar: slot nav, swap, delete, save/restore, new-puzzle button
 *   2. New-puzzle form (collapsible): letter input + center input + create button
 *   3. Center letter selector (VariationsGrid)
 *   4. Combinations search with filters (scrollable, 10 rows visible)
 *      - When a combo row is selected and a center is active, shows
 *        "Lisää uutena pelinä" button to append it to the rotation
 *   5. Word list for active combo + center
 *
 * @module src/components/admin/PuzzleEditor
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type {
  CombinationEntry,
  VariationData,
} from '../../store/useAdminStore';
import { VariationsGrid } from './VariationsGrid';
import { WordList } from './WordList';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface Filters {
  requires: string;
  excludes: string;
  min_pangrams: string;
  max_pangrams: string;
  min_words: string;
  max_words: string;
  min_words_min: string;
  max_words_min: string;
  in_rotation: string;
}

const DEFAULT_FILTERS: Filters = {
  requires: '',
  excludes: '',
  min_pangrams: '',
  max_pangrams: '',
  min_words: '',
  max_words: '',
  min_words_min: '',
  max_words_min: '',
  in_rotation: '',
};

export function PuzzleEditor() {
  const currentSlot = useAdminStore((s) => s.currentSlot);
  const totalPuzzles = useAdminStore((s) => s.totalPuzzles);
  const savedLetters = useAdminStore((s) => s.savedLetters);
  const savedCenter = useAdminStore((s) => s.savedCenter);
  const activeLetters = useAdminStore((s) => s.activeLetters);
  const activeCenter = useAdminStore((s) => s.activeCenter);
  const variations = useAdminStore((s) => s.variations);
  const words = useAdminStore((s) => s.words);
  const wordsLoading = useAdminStore((s) => s.wordsLoading);
  const puzzleLoading = useAdminStore((s) => s.puzzleLoading);
  const saving = useAdminStore((s) => s.saving);
  const statusMessage = useAdminStore((s) => s.statusMessage);
  const statusType = useAdminStore((s) => s.statusType);
  const csrfToken = useAdminStore((s) => s.csrfToken);

  const loadSlot = useAdminStore((s) => s.loadSlot);
  const saveSlot = useAdminStore((s) => s.saveSlot);
  const changeCenter = useAdminStore((s) => s.changeCenter);
  const swapSlots = useAdminStore((s) => s.swapSlots);
  const deleteSlot = useAdminStore((s) => s.deleteSlot);
  const createPuzzle = useAdminStore((s) => s.createPuzzle);
  const blockWord = useAdminStore((s) => s.blockWord);
  const previewCombo = useAdminStore((s) => s.previewCombo);
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
  const setActiveCenter = useAdminStore((s) => s.setActiveCenter);

  const [swapTarget, setSwapTarget] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);

  // New-puzzle creation form state
  const [createMode, setCreateMode] = useState(false);
  const [newLetters, setNewLetters] = useState('');
  const [newCenter, setNewCenter] = useState('');

  // Combinations browser state
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState('words_max');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [comboResults, setComboResults] = useState<CombinationEntry[]>([]);
  const [comboTotal, setComboTotal] = useState(0);
  const [comboLoading, setComboLoading] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<VariationData[]>(
    [],
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDirty =
    activeLetters !== savedLetters || activeCenter !== savedCenter;

  // Which variations to show: from selected combo, or from current puzzle
  const displayVariations = selectedCombo ? selectedVariations : variations;

  // Load initial slot when totalPuzzles becomes available
  useEffect(() => {
    if (totalPuzzles > 0 && !initialLoaded) {
      setInitialLoaded(true);
      loadSlot(currentSlot);
    }
  }, [totalPuzzles, initialLoaded, currentSlot, loadSlot]);

  // Sync search "requires" filter to the loaded puzzle's letters
  useEffect(() => {
    if (savedLetters) {
      setFilters((prev) => ({ ...prev, requires: savedLetters }));
    }
  }, [savedLetters]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage, setStatusMessage]);

  // --- Combinations fetch ---

  const fetchCombinations = useCallback(async () => {
    setComboLoading(true);
    const params = new URLSearchParams();
    if (filters.requires) params.set('requires', filters.requires);
    if (filters.excludes) params.set('excludes', filters.excludes);
    if (filters.min_pangrams) params.set('min_pangrams', filters.min_pangrams);
    if (filters.max_pangrams) params.set('max_pangrams', filters.max_pangrams);
    if (filters.min_words) params.set('min_words', filters.min_words);
    if (filters.max_words) params.set('max_words', filters.max_words);
    if (filters.min_words_min)
      params.set('min_words_min', filters.min_words_min);
    if (filters.max_words_min)
      params.set('max_words_min', filters.max_words_min);
    if (filters.in_rotation) params.set('in_rotation', filters.in_rotation);
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', '1');
    params.set('per_page', '50');

    try {
      const res = await fetch(`${API_BASE}/api/admin/combinations?${params}`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      const data = await res.json();
      if (res.ok) {
        setComboResults(data.combinations);
        setComboTotal(data.total);
      }
    } catch {
      // Ignore
    }
    setComboLoading(false);
  }, [filters, sort, order, csrfToken]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCombinations();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchCombinations]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(col);
      setOrder('desc');
    }
  };

  const sortIndicator = (col: string) => {
    if (sort !== col) return '';
    return order === 'asc' ? ' ^' : ' v';
  };

  // --- Combo selection ---

  const handleSelectCombo = useCallback(
    (combo: CombinationEntry) => {
      if (selectedCombo === combo.letters) {
        // Deselect — revert to current puzzle
        setSelectedCombo(null);
        setSelectedVariations([]);
        return;
      }
      setSelectedCombo(combo.letters);
      setSelectedVariations(combo.variations as VariationData[]);
    },
    [selectedCombo],
  );

  /** Handle center selection from the VariationsGrid. */
  const handleCenterSelect = useCallback(
    (center: string) => {
      if (selectedCombo) {
        // Browsing a combo from search — preview it
        const letters = selectedCombo.split('');
        useAdminStore.setState({
          activeLetters: selectedCombo,
          activeCenter: center,
        });
        previewCombo(letters, center);
      } else if (center === savedCenter && activeLetters === savedLetters) {
        // Current puzzle, no local changes — persist center change to DB
        changeCenter(center);
      } else {
        // Current puzzle with local changes — just update local state
        setActiveCenter(center);
      }
    },
    [
      selectedCombo,
      savedCenter,
      savedLetters,
      activeLetters,
      previewCombo,
      changeCenter,
      setActiveCenter,
    ],
  );

  // --- Slot navigation ---

  const handlePrev = useCallback(() => {
    if (currentSlot > 0) {
      setSelectedCombo(null);
      setSelectedVariations([]);
      loadSlot(currentSlot - 1);
    }
  }, [currentSlot, loadSlot]);

  const handleNext = useCallback(() => {
    if (currentSlot < totalPuzzles - 1) {
      setSelectedCombo(null);
      setSelectedVariations([]);
      loadSlot(currentSlot + 1);
    }
  }, [currentSlot, totalPuzzles, loadSlot]);

  const handleSwap = useCallback(async () => {
    const target = parseInt(swapTarget, 10) - 1;
    if (
      isNaN(target) ||
      target < 0 ||
      target >= totalPuzzles ||
      target === currentSlot
    ) {
      return;
    }
    const result = await swapSlots(target);
    if (result === 'needs_force') {
      if (
        window.confirm(
          `Peli #${target + 1} tai #${currentSlot + 1} on tämän päivän julkaistu peli. Vaihdetaanko silti?`,
        )
      ) {
        await swapSlots(target, true);
      }
    }
  }, [swapTarget, totalPuzzles, currentSlot, swapSlots]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Poistetaanko peli #${currentSlot + 1}?`)) {
      deleteSlot();
    }
  }, [currentSlot, deleteSlot]);

  const handleRestore = useCallback(() => {
    setSelectedCombo(null);
    setSelectedVariations([]);
    useAdminStore.setState({
      activeLetters: savedLetters,
      activeCenter: savedCenter,
    });
  }, [savedLetters, savedCenter]);

  const handleBlock = useCallback(
    (word: string) => {
      if (window.confirm(`Estä sana "${word}" pysyvästi?`)) {
        blockWord(word);
      }
    },
    [blockWord],
  );

  /**
   * Create a new puzzle from the manual letter-entry form.
   * Parses the comma-separated letters and calls the store action.
   */
  const handleCreateFromForm = useCallback(async () => {
    const letters = newLetters
      .toLowerCase()
      .split(/[,\s]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const center = newCenter.toLowerCase().trim();
    await createPuzzle(letters, center);
    setCreateMode(false);
    setNewLetters('');
    setNewCenter('');
  }, [newLetters, newCenter, createPuzzle]);

  /**
   * Create a new puzzle from the currently-selected combination and center.
   * Called from the combinations browser when a combo + center are active.
   */
  const handleCreateFromCombo = useCallback(async () => {
    if (!selectedCombo || !activeCenter) return;
    const letters = activeLetters.split('');
    await createPuzzle(letters, activeCenter);
    setSelectedCombo(null);
    setSelectedVariations([]);
  }, [selectedCombo, activeLetters, activeCenter, createPuzzle]);

  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div className="space-y-4">
      {/* Status message */}
      {statusMessage && (
        <div
          className="p-2 rounded text-sm text-center"
          style={{
            backgroundColor:
              statusType === 'error'
                ? 'rgba(220, 38, 38, 0.1)'
                : statusType === 'warning'
                  ? 'rgba(234, 179, 8, 0.1)'
                  : 'rgba(22, 163, 74, 0.1)',
            color:
              statusType === 'error'
                ? '#dc2626'
                : statusType === 'warning'
                  ? '#ca8a04'
                  : '#16a34a',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-2 p-3 rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlot <= 0 || puzzleLoading}
            className="px-2 py-1 rounded text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: currentSlot <= 0 ? 0.3 : 1,
            }}
          >
            &lt;
          </button>
          <span
            className="text-sm font-mono font-semibold min-w-12 text-center"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {puzzleLoading ? '...' : `${currentSlot + 1} / ${totalPuzzles}`}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlot >= totalPuzzles - 1 || puzzleLoading}
            className="px-2 py-1 rounded text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: currentSlot >= totalPuzzles - 1 ? 0.3 : 1,
            }}
          >
            &gt;
          </button>
          {isDirty && (
            <>
              <button
                type="button"
                onClick={() => saveSlot()}
                disabled={saving}
                className="px-3 py-1 rounded text-xs font-semibold cursor-pointer ml-2"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Tallennetaan...' : 'Tallenna'}
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={saving}
                className="px-3 py-1 rounded text-xs cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Palauta
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={swapTarget}
            onChange={(e) => setSwapTarget(e.target.value)}
            placeholder="#"
            min={1}
            max={totalPuzzles}
            className="w-14 px-1 py-1 rounded text-sm text-center"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => void handleSwap()}
            disabled={saving}
            className="px-2 py-1 rounded text-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Vaihda
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || totalPuzzles <= 0}
            className="px-2 py-1 rounded text-xs cursor-pointer"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid #dc2626',
              color: '#dc2626',
            }}
          >
            Poista
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateMode((v) => !v);
              setNewLetters('');
              setNewCenter('');
            }}
            disabled={saving}
            className="px-2 py-1 rounded text-xs cursor-pointer"
            style={{
              backgroundColor: createMode
                ? 'rgba(22, 163, 74, 0.15)'
                : 'var(--color-bg-primary)',
              border: createMode
                ? '1px solid #16a34a'
                : '1px solid var(--color-border)',
              color: createMode ? '#16a34a' : 'var(--color-text-primary)',
            }}
            aria-label="Luo uusi peli"
          >
            + Uusi
          </button>
        </div>
      </div>

      {/* New-puzzle creation form */}
      {createMode && (
        <div
          className="p-3 rounded-lg space-y-2"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid #16a34a',
          }}
        >
          <div className="text-xs font-semibold" style={{ color: '#16a34a' }}>
            Uusi peli
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLetters}
              onChange={(e) => setNewLetters(e.target.value)}
              placeholder="Kirjaimet (a,b,c,d,e,f,g)"
              className="flex-1 px-2 py-1 rounded text-sm font-mono"
              style={inputStyle}
              aria-label="Uuden pelin kirjaimet"
            />
            <input
              type="text"
              value={newCenter}
              onChange={(e) => setNewCenter(e.target.value)}
              placeholder="Keskus"
              maxLength={1}
              className="w-16 px-2 py-1 rounded text-sm font-mono text-center"
              style={inputStyle}
              aria-label="Uuden pelin keskuskirjain"
            />
            <button
              type="button"
              onClick={handleCreateFromForm}
              disabled={saving || !newLetters.trim() || !newCenter.trim()}
              className="px-3 py-1 rounded text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                opacity:
                  saving || !newLetters.trim() || !newCenter.trim() ? 0.5 : 1,
              }}
            >
              {saving ? 'Luodaan...' : 'Luo'}
            </button>
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Anna 7 eri kirjainta skandit mukaan lukien. Voit myös valita
            yhdistelmän alta ja käyttää &ldquo;Lisää uutena&rdquo;-painiketta.
          </div>
        </div>
      )}

      {/* Center letter selector, with "add as new puzzle" button when browsing a combo */}
      {displayVariations.length > 0 && (
        <div className="space-y-2">
          <VariationsGrid
            variations={displayVariations}
            activeCenter={activeCenter}
            onSelect={handleCenterSelect}
          />
          {selectedCombo && activeCenter && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateFromCombo}
                disabled={saving}
                className="px-3 py-1 rounded text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  opacity: saving ? 0.5 : 1,
                }}
                aria-label="Lisää valittu yhdistelmä uutena pelinä"
              >
                {saving ? 'Lisätään...' : 'Lisää uutena pelinä'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Combinations search */}
      <div
        className="p-3 rounded-lg space-y-2"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="text-xs font-semibold mb-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Yhdistelmähaku
          {!comboLoading && (
            <span
              className="font-normal ml-2"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {comboTotal} tulosta
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <input
            type="text"
            value={filters.requires}
            onChange={(e) => updateFilter('requires', e.target.value)}
            placeholder="Sisältää..."
            className="px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
          <input
            type="text"
            value={filters.excludes}
            onChange={(e) => updateFilter('excludes', e.target.value)}
            placeholder="Ei sisällä..."
            className="px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
          <select
            value={filters.in_rotation}
            onChange={(e) => updateFilter('in_rotation', e.target.value)}
            className="px-2 py-1 rounded text-sm"
            style={inputStyle}
          >
            <option value="">Kaikki</option>
            <option value="true">Kierrossa</option>
            <option value="false">Ei kierrossa</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {/* Pangrams range */}
          <div className="space-y-1">
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Pangrammeja
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={filters.min_pangrams}
                onChange={(e) => updateFilter('min_pangrams', e.target.value)}
                placeholder="min"
                min={0}
                className="w-full px-2 py-1 rounded text-sm"
                style={inputStyle}
                aria-label="Pangrammeja vähintään"
              />
              <span
                className="text-xs shrink-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                –
              </span>
              <input
                type="number"
                value={filters.max_pangrams}
                onChange={(e) => updateFilter('max_pangrams', e.target.value)}
                placeholder="max"
                min={0}
                className="w-full px-2 py-1 rounded text-sm"
                style={inputStyle}
                aria-label="Pangrammeja enintään"
              />
            </div>
          </div>
          {/* Min words per center (least) range */}
          <div className="space-y-1">
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Väh. sanoja/keskus
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={filters.min_words_min}
                onChange={(e) => updateFilter('min_words_min', e.target.value)}
                placeholder="min"
                min={0}
                className="w-full px-2 py-1 rounded text-sm"
                style={inputStyle}
                aria-label="Vähemmän sanojen määrä vähintään"
              />
              <span
                className="text-xs shrink-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                –
              </span>
              <input
                type="number"
                value={filters.max_words_min}
                onChange={(e) => updateFilter('max_words_min', e.target.value)}
                placeholder="max"
                min={0}
                className="w-full px-2 py-1 rounded text-sm"
                style={inputStyle}
                aria-label="Vähemmän sanojen määrä enintään"
              />
            </div>
          </div>
          {/* Max words per center (most) range */}
          <div className="space-y-1">
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              En. sanoja/keskus
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={filters.min_words}
                onChange={(e) => updateFilter('min_words', e.target.value)}
                placeholder="min"
                min={0}
                className="w-full px-2 py-1 rounded text-sm"
                style={inputStyle}
                aria-label="Enemmän sanojen määrä vähintään"
              />
              <span
                className="text-xs shrink-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                –
              </span>
              <input
                type="number"
                value={filters.max_words}
                onChange={(e) => updateFilter('max_words', e.target.value)}
                placeholder="max"
                min={0}
                className="w-full px-2 py-1 rounded text-sm"
                style={inputStyle}
                aria-label="Enemmän sanojen määrä enintään"
              />
            </div>
          </div>
        </div>

        {/* Scrollable results table */}
        <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
          <table
            className="w-full text-sm"
            style={{ borderCollapse: 'collapse' }}
          >
            <thead
              className="sticky top-0"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <th
                  className="text-left py-1 px-2 cursor-pointer"
                  onClick={() => handleSort('letters')}
                >
                  Kirjaimet{sortIndicator('letters')}
                </th>
                <th
                  className="text-right py-1 px-2 cursor-pointer"
                  onClick={() => handleSort('pangrams')}
                >
                  Pg{sortIndicator('pangrams')}
                </th>
                <th
                  className="text-right py-1 px-2 cursor-pointer"
                  onClick={() => handleSort('words_max')}
                >
                  Max{sortIndicator('words_max')}
                </th>
                <th
                  className="text-right py-1 px-2 cursor-pointer"
                  onClick={() => handleSort('words_min')}
                >
                  Min{sortIndicator('words_min')}
                </th>
                <th
                  className="text-right py-1 px-2 cursor-pointer"
                  onClick={() => handleSort('score_max')}
                >
                  Pisteet{sortIndicator('score_max')}
                </th>
              </tr>
            </thead>
            <tbody>
              {comboLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-2 text-center text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Ladataan...
                  </td>
                </tr>
              )}
              {!comboLoading &&
                comboResults.map((combo) => (
                  <tr
                    key={combo.letters}
                    className="cursor-pointer"
                    onClick={() => handleSelectCombo(combo)}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor:
                        selectedCombo === combo.letters
                          ? 'rgba(255, 100, 62, 0.08)'
                          : combo.letters === savedLetters
                            ? 'rgba(22, 163, 74, 0.06)'
                            : 'transparent',
                    }}
                  >
                    <td
                      className="py-1 px-2 font-mono"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {combo.letters}
                      {combo.in_rotation && (
                        <span
                          className="ml-1 text-xs"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td
                      className="py-1 px-2 text-right"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.total_pangrams}
                    </td>
                    <td
                      className="py-1 px-2 text-right"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.max_word_count}
                    </td>
                    <td
                      className="py-1 px-2 text-right"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.min_word_count}
                    </td>
                    <td
                      className="py-1 px-2 text-right"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.max_max_score}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Word list */}
      <WordList
        words={words}
        letters={activeLetters}
        loading={wordsLoading}
        onBlock={handleBlock}
      />
    </div>
  );
}
