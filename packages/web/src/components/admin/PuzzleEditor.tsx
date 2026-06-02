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
import type { FormEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Shuffle,
  Trash2,
  Undo2,
  WandSparkles,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import type {
  CombinationEntry,
  VariationData,
} from '../../store/useAdminStore';
import { VariationsGrid } from './VariationsGrid';
import { WordList } from './WordList';
import { EyeIcon } from '../icons';

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

interface SuggestionOverlap {
  slot: number | null;
  shared_letters: number;
  shared_short_words: number;
}

interface PuzzleSuggestion {
  letters: string[];
  letters_key: string;
  center: string;
  word_count: number;
  pangram_count: number;
  max_score: number;
  quality_grade?: 'good' | 'ok' | 'risky' | 'reject' | 'unreviewed';
  quality_label: string;
  score: number;
  overlaps: {
    previous: SuggestionOverlap;
    next: SuggestionOverlap;
  };
  reasons: string[];
  pangrams?: string[];
}

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
  const [jumpTarget, setJumpTarget] = useState('');
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
  const [suggestion, setSuggestion] = useState<PuzzleSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [declinedSuggestions, setDeclinedSuggestions] = useState<string[]>([]);
  const [pangramSpoilersVisible, setPangramSpoilersVisible] = useState(false);
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

  useEffect(() => {
    setJumpTarget(totalPuzzles > 0 ? String(currentSlot + 1) : '');
  }, [currentSlot, totalPuzzles]);

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

  const handleJump = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const displayNumber = Number.parseInt(jumpTarget, 10);
      if (
        !Number.isInteger(displayNumber) ||
        displayNumber < 1 ||
        displayNumber > totalPuzzles
      ) {
        setStatusMessage(`Anna pelinumero 1-${totalPuzzles}`, 'warning');
        return;
      }

      const targetSlot = displayNumber - 1;
      if (targetSlot === currentSlot) return;

      setSelectedCombo(null);
      setSelectedVariations([]);
      loadSlot(targetSlot);
    },
    [currentSlot, jumpTarget, loadSlot, setStatusMessage, totalPuzzles],
  );

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

  const fetchSuggestion = useCallback(
    async (
      declined: string[] = declinedSuggestions,
      includePangrams = false,
    ) => {
      setSuggestionLoading(true);
      setSuggestionError(null);
      const params = new URLSearchParams();
      if (declined.length > 0) {
        params.set('declined', declined.join(','));
      }
      if (includePangrams) {
        params.set('include_pangrams', 'true');
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/admin/suggestion${params.size ? `?${params}` : ''}`,
          {
            credentials: 'same-origin',
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setSuggestion(null);
          setSuggestionError(data.error || 'Ehdotusta ei löytynyt');
          return;
        }
        setSuggestion(data.suggestion);
        setPangramSpoilersVisible(
          includePangrams && Array.isArray(data.suggestion?.pangrams),
        );
      } catch {
        setSuggestion(null);
        setSuggestionError('Yhteysvirhe');
      } finally {
        setSuggestionLoading(false);
      }
    },
    [csrfToken, declinedSuggestions],
  );

  const handleRejectSuggestion = useCallback(async () => {
    if (!suggestion) return;
    const key = `${suggestion.letters_key}:${suggestion.center}`;
    try {
      const res = await fetch(`${API_BASE}/api/admin/suggestion-rejections`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({
          letters: suggestion.letters,
          center: suggestion.center,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestionError(data.error || 'Hylkäys epäonnistui');
        return;
      }

      const nextDeclined = [...declinedSuggestions, key];
      setDeclinedSuggestions(nextDeclined);
      await fetchSuggestion(nextDeclined);
    } catch {
      setSuggestionError('Yhteysvirhe');
    }
  }, [csrfToken, declinedSuggestions, fetchSuggestion, suggestion]);

  const handleTogglePangrams = useCallback(async () => {
    if (!suggestion) return;
    if (suggestion.pangrams) {
      setPangramSpoilersVisible((visible) => !visible);
      return;
    }
    await fetchSuggestion(declinedSuggestions, true);
  }, [declinedSuggestions, fetchSuggestion, suggestion]);

  const handleAcceptSuggestion = useCallback(async () => {
    if (!suggestion) return;
    const created = await createPuzzle(suggestion.letters, suggestion.center, {
      loadAfterCreate: false,
    });
    if (!created) return;
    setSuggestion(null);
    setDeclinedSuggestions([]);
    setPangramSpoilersVisible(false);
    setStatusMessage('Lisätty. Haetaan seuraavaa ehdotusta...', 'success');
    await fetchSuggestion([]);
  }, [createPuzzle, fetchSuggestion, setStatusMessage, suggestion]);

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
  const statusColor =
    statusType === 'error'
      ? 'var(--color-error)'
      : statusType === 'warning'
        ? 'var(--color-accent)'
        : 'var(--color-accent)';
  const statusBackground =
    statusType === 'error'
      ? 'color-mix(in srgb, var(--color-error) 12%, var(--color-bg-primary))'
      : 'color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-primary))';

  return (
    <div className="space-y-2">
      {isDirty && (
        <div
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-primary))',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-accent)',
          }}
        >
          Tallentamattomia muutoksia
        </div>
      )}
      {statusMessage && (
        <div
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: statusBackground,
            color: statusColor,
          }}
        >
          {statusMessage}
        </div>
      )}

      <section
        className="overflow-hidden rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_auto]"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center rounded p-1"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentSlot <= 0 || puzzleLoading}
                title="Edellinen peli"
                aria-label="Edellinen peli"
                className="inline-flex h-8 w-8 items-center justify-center rounded cursor-pointer disabled:cursor-default"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  opacity: currentSlot <= 0 || puzzleLoading ? 0.35 : 1,
                }}
              >
                <ChevronLeft size={17} strokeWidth={2.4} aria-hidden="true" />
              </button>
              <span
                className="min-w-20 px-2 text-center font-mono text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {puzzleLoading ? '...' : `${currentSlot + 1} / ${totalPuzzles}`}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentSlot >= totalPuzzles - 1 || puzzleLoading}
                title="Seuraava peli"
                aria-label="Seuraava peli"
                className="inline-flex h-8 w-8 items-center justify-center rounded cursor-pointer disabled:cursor-default"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  opacity:
                    currentSlot >= totalPuzzles - 1 || puzzleLoading ? 0.35 : 1,
                }}
              >
                <ChevronRight size={17} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleJump} className="flex items-center gap-2">
              <label
                htmlFor="admin-puzzle-jump"
                className="text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Peli
              </label>
              <input
                id="admin-puzzle-jump"
                type="number"
                value={jumpTarget}
                onChange={(e) => setJumpTarget(e.target.value)}
                min={1}
                max={Math.max(1, totalPuzzles)}
                disabled={puzzleLoading || totalPuzzles <= 0}
                aria-label="Siirry pelinumeroon"
                className="h-9 w-20 rounded px-2 text-center text-sm"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={puzzleLoading || totalPuzzles <= 0}
                className="h-9 rounded px-3 text-sm font-medium cursor-pointer disabled:cursor-default"
                style={{
                  ...surfaceButtonStyle,
                  opacity: puzzleLoading || totalPuzzles <= 0 ? 0.6 : 1,
                }}
              >
                Siirry
              </button>
            </form>

            {isDirty && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveSlot()}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold cursor-pointer disabled:cursor-default"
                  style={{
                    ...primaryButtonStyle,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Save size={15} strokeWidth={2.2} aria-hidden="true" />
                  {saving ? 'Tallennetaan...' : 'Tallenna'}
                </button>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium cursor-pointer disabled:cursor-default"
                  style={surfaceButtonStyle}
                >
                  <Undo2 size={15} strokeWidth={2.2} aria-hidden="true" />
                  Palauta
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={swapTarget}
                onChange={(e) => setSwapTarget(e.target.value)}
                placeholder="#"
                min={1}
                max={totalPuzzles}
                aria-label="Vaihda pelin kanssa"
                className="h-9 w-16 rounded px-2 text-center text-sm"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => void handleSwap()}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium cursor-pointer disabled:cursor-default"
                style={surfaceButtonStyle}
              >
                <Shuffle size={15} strokeWidth={2.2} aria-hidden="true" />
                Vaihda
              </button>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || totalPuzzles <= 0}
              className="inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium cursor-pointer disabled:cursor-default"
              style={{
                ...dangerButtonStyle,
                opacity: saving || totalPuzzles <= 0 ? 0.6 : 1,
              }}
            >
              <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
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
              className="inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold cursor-pointer disabled:cursor-default"
              style={{
                backgroundColor: createMode
                  ? 'color-mix(in srgb, var(--color-accent) 14%, var(--color-bg-primary))'
                  : 'var(--color-bg-primary)',
                border: createMode
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                color: createMode
                  ? 'var(--color-accent)'
                  : 'var(--color-text-primary)',
              }}
              aria-label="Luo uusi peli"
            >
              <Plus size={15} strokeWidth={2.3} aria-hidden="true" />
              Uusi
            </button>
          </div>
        </div>

        {/* New-puzzle creation form */}
        {createMode && (
          <div
            className="p-2"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-secondary))',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div
              className="mb-2 text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Uusi peli
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
              <input
                type="text"
                value={newLetters}
                onChange={(e) => setNewLetters(e.target.value)}
                placeholder="Kirjaimet (a,b,c,d,e,f,g)"
                className="h-9 rounded px-3 text-sm font-mono"
                style={inputStyle}
                aria-label="Uuden pelin kirjaimet"
              />
              <input
                type="text"
                value={newCenter}
                onChange={(e) => setNewCenter(e.target.value)}
                placeholder="Keskus"
                maxLength={1}
                className="h-9 rounded px-3 text-center text-sm font-mono"
                style={inputStyle}
                aria-label="Uuden pelin keskuskirjain"
              />
              <button
                type="button"
                onClick={handleCreateFromForm}
                disabled={saving || !newLetters.trim() || !newCenter.trim()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded px-4 text-sm font-semibold cursor-pointer disabled:cursor-default"
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    saving || !newLetters.trim() || !newCenter.trim() ? 0.5 : 1,
                }}
              >
                <Plus size={15} strokeWidth={2.3} aria-hidden="true" />
                {saving ? 'Luodaan...' : 'Luo'}
              </button>
            </div>
          </div>
        )}

        {/* No-spoiler game suggestion */}
        <div
          className="p-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="grid gap-1.5">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <WandSparkles
                    size={14}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    style={{ color: 'var(--color-accent)' }}
                  />
                  Ehdotus
                </span>

                {suggestion ? (
                  <>
                    <span className="flex flex-wrap items-center gap-0.5">
                      {suggestion.letters.map((letter) => (
                        <span
                          key={letter}
                          className="inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-semibold"
                          style={{
                            backgroundColor:
                              letter === suggestion.center
                                ? 'var(--color-accent)'
                                : 'var(--color-bg-primary)',
                            border:
                              letter === suggestion.center
                                ? '1px solid var(--color-accent)'
                                : '1px solid var(--color-border)',
                            color:
                              letter === suggestion.center
                                ? 'var(--color-on-accent)'
                                : 'var(--color-text-primary)',
                          }}
                        >
                          {letter}
                        </span>
                      ))}
                    </span>

                    <span
                      className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span>
                        <strong style={{ color: 'var(--color-text-primary)' }}>
                          {suggestion.word_count}
                        </strong>{' '}
                        sanaa
                        <span
                          className="ml-1 text-xs"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {suggestion.max_score} p
                        </span>
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        /
                      </span>
                      <span>
                        <strong style={{ color: 'var(--color-text-primary)' }}>
                          {suggestion.pangram_count}
                        </strong>{' '}
                        {suggestion.pangram_count === 1
                          ? 'pangrammi'
                          : 'pangrammia'}
                        <span
                          className="ml-1 text-xs"
                          title={suggestion.quality_label}
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {suggestion.quality_label}
                        </span>
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        /
                      </span>
                      <span>
                        <strong style={{ color: 'var(--color-text-primary)' }}>
                          {suggestion.score}
                        </strong>{' '}
                        valinta
                      </span>
                    </span>
                  </>
                ) : (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Ei haettua ehdotusta
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                <button
                  type="button"
                  onClick={() => void fetchSuggestion()}
                  disabled={suggestionLoading || saving}
                  className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-semibold cursor-pointer disabled:cursor-default"
                  style={{
                    ...surfaceButtonStyle,
                    opacity: suggestionLoading || saving ? 0.6 : 1,
                  }}
                >
                  <WandSparkles
                    size={13}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  {suggestionLoading ? 'Haetaan...' : 'Ehdota peliä'}
                </button>

                {suggestion && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleTogglePangrams()}
                      disabled={suggestionLoading || saving}
                      className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        opacity: suggestionLoading || saving ? 0.6 : 1,
                      }}
                      aria-expanded={pangramSpoilersVisible}
                    >
                      <EyeIcon />
                      {pangramSpoilersVisible
                        ? 'Piilota pangrammit'
                        : 'Näytä pangrammit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRejectSuggestion()}
                      disabled={suggestionLoading || saving}
                      className="h-7 rounded px-2 text-xs cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        opacity: suggestionLoading || saving ? 0.6 : 1,
                      }}
                    >
                      Hylkää
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAcceptSuggestion()}
                      disabled={suggestionLoading || saving}
                      className="h-7 rounded px-2 text-xs font-semibold cursor-pointer"
                      style={{
                        ...primaryButtonStyle,
                        opacity: suggestionLoading || saving ? 0.6 : 1,
                      }}
                    >
                      Hyväksy
                    </button>
                  </>
                )}
              </div>
            </div>

            {suggestionError && (
              <div className="text-xs" style={{ color: 'var(--color-error)' }}>
                {suggestionError}
              </div>
            )}

            {suggestion && (
              <>
                <div className="grid gap-1 text-xs md:grid-cols-[auto_minmax(0,1fr)]">
                  <div
                    className="flex flex-wrap gap-x-3 gap-y-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        Edellinen:
                      </span>{' '}
                      {suggestion.overlaps.previous.shared_short_words} lyhyttä,{' '}
                      {suggestion.overlaps.previous.shared_letters} kirjainta
                    </span>
                    <span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        Alku:
                      </span>{' '}
                      {suggestion.overlaps.next.shared_short_words} lyhyttä,{' '}
                      {suggestion.overlaps.next.shared_letters} kirjainta
                    </span>
                  </div>

                  {suggestion.reasons.length > 0 && (
                    <div
                      className="min-w-0 truncate"
                      title={suggestion.reasons.join(' / ')}
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {suggestion.reasons.join(' / ')}
                    </div>
                  )}
                </div>

                {pangramSpoilersVisible && suggestion.pangrams && (
                  <div
                    aria-label="Pangrammien spoilerit"
                    className="flex min-w-0 flex-wrap gap-1"
                  >
                    {suggestion.pangrams.map((pangram) => (
                      <span
                        key={pangram}
                        className="rounded px-1.5 py-0.5 font-mono text-xs"
                        style={{
                          backgroundColor: 'var(--color-bg-primary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {pangram}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Center letter selector, with "add as new puzzle" button when browsing a combo */}
        {displayVariations.length > 0 && (
          <div
            className="space-y-2 p-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
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
                    ...primaryButtonStyle,
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
          className="space-y-2 p-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
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
                  onChange={(e) =>
                    updateFilter('min_words_min', e.target.value)
                  }
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
                  onChange={(e) =>
                    updateFilter('max_words_min', e.target.value)
                  }
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
                            ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                            : combo.letters === savedLetters
                              ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)'
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
        <div className="p-2">
          <WordList
            words={words}
            letters={activeLetters}
            loading={wordsLoading}
            onBlock={handleBlock}
          />
        </div>
      </section>
    </div>
  );
}
