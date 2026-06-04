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
  Grid,
  Search,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
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
  const isActive = useAdminStore((s) => s.isActive);
  const words = useAdminStore((s) => s.words);
  const wordsLoading = useAdminStore((s) => s.wordsLoading);
  const puzzleLoading = useAdminStore((s) => s.puzzleLoading);
  const saving = useAdminStore((s) => s.saving);
  const statusMessage = useAdminStore((s) => s.statusMessage);
  const statusType = useAdminStore((s) => s.statusType);
  const csrfToken = useAdminStore((s) => s.csrfToken);

  const loadSlot = useAdminStore((s) => s.loadSlot);
  const saveSlot = useAdminStore((s) => s.saveSlot);
  const swapSlots = useAdminStore((s) => s.swapSlots);
  const deleteSlot = useAdminStore((s) => s.deleteSlot);
  const reactivateSlot = useAdminStore((s) => s.reactivateSlot);
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
      } else {
        // Just update local state which handles highlights, stats and calculates isDirty
        setActiveCenter(center);
      }
    },
    [selectedCombo, previewCombo, setActiveCenter],
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

  const handleReactivate = useCallback(() => {
    if (
      window.confirm(
        `Palautetaanko peli #${currentSlot + 1} takaisin kiertoon?`,
      )
    ) {
      reactivateSlot();
    }
  }, [currentSlot, reactivateSlot]);

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
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 py-4 sm:px-4">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:items-stretch">
        {/* LEFT COLUMN: Active Puzzle Controls & AI Suggestions */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-start">
          {/* CARD 1: Pelin hallinta (Active Puzzle / Preview) */}
          <section
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Row 1: Title and Indicator wrapper for mobile, plain elements for desktop */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                {/* Title */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl font-semibold bg-indigo-500/10 text-indigo-400 shrink-0">
                    {selectedCombo ? (
                      <SlidersHorizontal
                        size={16}
                        className="sm:h-[18px] sm:w-[18px]"
                      />
                    ) : (
                      <Grid
                        size={18}
                        className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                      />
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

                {/* Unsaved Changes Status Announcement (mobile: next to Title inside the wrapper) */}
                <div className="sm:hidden">
                  {(isDirty ||
                    statusMessage === 'Tallenna' ||
                    statusMessage === 'Tallennettu' ||
                    (statusMessage && statusType === 'success')) && (
                    <div className="flex justify-end">
                      {isDirty ? (
                        <div
                          className="flex items-center gap-1.5 bg-[color-mix(in srgb,var(--color-accent)_10%,var(--color-bg-secondary))] px-2.5 py-1 rounded-lg border animate-fade-in"
                          style={{ borderColor: 'var(--color-accent)' }}
                        >
                          <div
                            className="flex items-center gap-1 text-[10px] font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => saveSlot()}
                              disabled={saving}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold shadow-xs hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                              style={primaryButtonStyle}
                            >
                              {saving ? 'Tallennetaan...' : 'Tallenna'}
                            </button>
                            <button
                              type="button"
                              onClick={handleRestore}
                              disabled={saving}
                              className="p-1 rounded-lg border hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
                              style={surfaceButtonStyle}
                              title="Kumoa muutokset"
                            >
                              <Undo2 size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 animate-fade-in">
                          <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                          <span>Tallennettu</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Unsaved Changes Status Announcement (desktop: in the center) */}
              <div className="hidden sm:flex flex-1 justify-center px-4 min-w-0">
                {(isDirty ||
                  statusMessage === 'Tallenna' ||
                  statusMessage === 'Tallennettu' ||
                  (statusMessage && statusType === 'success')) && (
                  <>
                    {isDirty ? (
                      <div
                        className="flex items-center gap-3 bg-[color-mix(in srgb,var(--color-accent)_10%,var(--color-bg-secondary))] px-3.5 py-1.5 rounded-xl border animate-fade-in"
                        style={{ borderColor: 'var(--color-accent)' }}
                      >
                        <div
                          className="flex items-center gap-1.5 text-xs font-bold shrink-0"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          <span className="hidden md:inline">Muutoksia</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => saveSlot()}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                            style={primaryButtonStyle}
                          >
                            {saving ? 'Tallennetaan...' : 'Tallenna'}
                          </button>
                          <button
                            type="button"
                            onClick={handleRestore}
                            disabled={saving}
                            className="p-1.5 rounded-lg border hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
                            style={surfaceButtonStyle}
                            title="Kumoa muutokset"
                          >
                            <Undo2 size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 animate-fade-in shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="hidden md:inline">
                          Kaikki muutokset tallennettu
                        </span>
                        <span className="md:hidden">Tallennettu</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Navigation Carousel with integrated selector (Only active in rotation mode, hidden in preview combo) */}
              {!selectedCombo && (
                <div className="w-full sm:w-auto flex justify-end">
                  <form
                    onSubmit={handleJump}
                    className="inline-flex items-center rounded-xl p-0.5 sm:p-1 shadow-sm gap-1 shrink-0"
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
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        #
                      </span>
                      <input
                        type="number"
                        value={jumpTarget}
                        onChange={(e) => setJumpTarget(e.target.value)}
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
                      onClick={handleNext}
                      disabled={
                        currentSlot >= totalPuzzles - 1 || puzzleLoading
                      }
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
                <div className="w-full sm:w-auto flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCombo(null);
                      setSelectedVariations([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[color-mix(in srgb,var(--color-text-primary)_5%,transparent)] border shadow-sm cursor-pointer transition-all shrink-0"
                    style={surfaceButtonStyle}
                  >
                    ← Kiertoon
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-3">
              {/* Variations Grid */}
              {displayVariations.length > 0 && (
                <div className="space-y-2">
                  <VariationsGrid
                    variations={displayVariations}
                    activeCenter={activeCenter}
                    onSelect={handleCenterSelect}
                  />
                </div>
              )}

              {/* Quick Actions / Configuration */}
              <div
                className="pt-3 border-t space-y-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {/* If previewing select combo */}
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
                      onClick={handleCreateFromCombo}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
                      style={primaryButtonStyle}
                    >
                      {saving ? 'Lisätään...' : 'Lisää uutena pelinä'}
                    </button>
                  </div>
                )}

                {/* Grid of slot operations */}
                {!selectedCombo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Swap controls */}
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
                        onChange={(e) => setSwapTarget(e.target.value)}
                        placeholder="#"
                        min={1}
                        max={totalPuzzles}
                        className="h-9 w-20 rounded-lg px-2 text-center text-sm border focus:outline-none focus:ring-1 focus:ring-accent"
                        style={inputStyle}
                        aria-label="Vaihda pelin sijainti"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSwap()}
                        disabled={saving}
                        className="h-9 rounded-lg px-3 text-xs font-semibold inline-flex items-center gap-1 hover:scale-[1.02] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        style={surfaceButtonStyle}
                      >
                        <Shuffle size={13} strokeWidth={2.4} />
                        Vaihda
                      </button>
                    </div>

                    {/* Dirty State / Create Manual / Delete / Commands */}
                    <div className="flex flex-col justify-end gap-2">
                      {/* Primary save/restore when dirty */}
                      {isDirty && (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => saveSlot()}
                            disabled={saving}
                            className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                            style={primaryButtonStyle}
                          >
                            <Save size={14} />
                            Tallenna muutokset
                          </button>
                          <button
                            type="button"
                            onClick={handleRestore}
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
                            onClick={handleDelete}
                            disabled={saving || totalPuzzles <= 0}
                            className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold hover:bg-[color-mix(in srgb,var(--color-error)_12%,var(--color-bg-primary))] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            style={{
                              ...dangerButtonStyle,
                            }}
                          >
                            <Trash2 size={13} />
                            Poista peli #{currentSlot + 1}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReactivate}
                            disabled={saving}
                            className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            style={{
                              ...primaryButtonStyle,
                            }}
                          >
                            <RefreshCw size={13} />
                            Palauta kiertoon
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCreateMode((v) => !v);
                            setNewLetters('');
                            setNewCenter('');
                          }}
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

            {/* New manual game form */}
            {createMode && (
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
                      onChange={(e) => setNewLetters(e.target.value)}
                      placeholder="7 kirjainta (esim. a,b,c,d,e,f,g)"
                      className="h-10 w-full rounded-lg px-3 text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-accent"
                      style={inputStyle}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={newCenter}
                      onChange={(e) => setNewCenter(e.target.value)}
                      placeholder="Keskus"
                      maxLength={1}
                      className="h-10 w-full rounded-lg px-3 text-center text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-accent uppercase"
                      style={inputStyle}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleCreateFromForm}
                      disabled={
                        saving || !newLetters.trim() || !newCenter.trim()
                      }
                      className="h-10 w-full rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
                      style={primaryButtonStyle}
                    >
                      Luo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* CARD 2: Peliehdotukset (AI Game Suggestions Assistant) */}
          <section
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
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
                    Ehdota automaattisesti laadukkaita, arvioituja pelejä
                    kiertoon
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void fetchSuggestion()}
                disabled={suggestionLoading || saving}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-sm hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
                style={surfaceButtonStyle}
              >
                <WandSparkles size={13} />
                {suggestionLoading ? 'Haetaan...' : 'Ehdota peliä'}
              </button>
            </div>

            {/* Body with reserved height to match suggestion UI */}
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
                  {/* Visual Letters of the Suggestion */}
                  <div className="flex flex-col gap-2">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Ehdotetun pelin kirjaimet
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.letters.map((letter) => (
                        <span
                          key={letter}
                          className="h-10 w-10 rounded-xl font-mono font-bold text-lg flex items-center justify-center shadow-xs select-none border"
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

                  {/* KPI Metrics Dashboard inside suggestions */}
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
                        <span className="text-xs font-normal opacity-70">
                          sanaa
                        </span>
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
                        <span className="text-xs font-normal opacity-70">
                          kpl
                        </span>
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

                  {/* Overlaps and Metadata Info */}
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
                          {suggestion.overlaps.previous.shared_short_words}{' '}
                          lyhyttä /{' '}
                          {suggestion.overlaps.previous.shared_letters}{' '}
                          kirjainta
                        </span>
                        <span>
                          <strong className="opacity-70">Alku:</strong>{' '}
                          {suggestion.overlaps.next.shared_short_words} lyhyttä
                          / {suggestion.overlaps.next.shared_letters} kirjainta
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

                  {/* Spoilers & Pangrams view */}
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

                  {/* Actions bottom bar */}
                  <div
                    className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => void handleTogglePangrams()}
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
                        onClick={() => void handleRejectSuggestion()}
                        className="flex-1 sm:flex-initial h-9 rounded-lg px-4 text-xs font-semibold hover:bg-[color-mix(in srgb,var(--color-error)_12%,var(--color-bg-primary))] transition-all shadow-xs border cursor-pointer"
                        style={dangerButtonStyle}
                      >
                        Hylkää
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAcceptSuggestion()}
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
        </div>

        {/* RIGHT COLUMN: Word List Card (replaces Search on desktop) */}
        <div className="lg:col-span-5 flex flex-col lg:h-full">
          {/* CARD 4: Sanalista (Word List) */}
          <section
            className="rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1 lg:h-full lg:overflow-hidden lg:min-h-0"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 p-5 border-b shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <Search size={18} />
              </span>
              <div>
                <h2
                  className="text-md font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Sanalista
                </h2>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Pelin kaikki sallitut sanat. Vie hiiri sanan päälle ja paina
                  roskakoria estääksesi sen pysyvästi.
                </p>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto min-h-0 lg:max-h-full">
              <WordList
                words={words}
                letters={activeLetters}
                loading={wordsLoading}
                onBlock={handleBlock}
              />
            </div>
          </section>
        </div>

        {/* BOTTOM COLUMN: Combinations Browser Search (takes full width) */}
        <div className="lg:col-span-12">
          {/* CARD 3: Yhdistelmähaku (Combinations Search) */}
          <section
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
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

            {/* Search form controls */}
            <div className="p-5 space-y-4">
              {/* Primary Text Queries */}
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
                    onChange={(e) => updateFilter('requires', e.target.value)}
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
                    onChange={(e) => updateFilter('excludes', e.target.value)}
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
                    onChange={(e) =>
                      updateFilter('in_rotation', e.target.value)
                    }
                    className="w-full h-9 px-3 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                    style={inputStyle}
                  >
                    <option value="">Kaikki yhdistelmät</option>
                    <option value="true">Nykyisessä kierrossa (*)</option>
                    <option value="false">Kierron ulkopuoliset</option>
                  </select>
                </div>
              </div>

              {/* Numeric ranges inputs under collapsible/mini columns */}
              <div className="space-y-3">
                <span
                  className="text-xs font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Yhdistelmätason rajoitukset
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      Pangrammit
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={filters.min_pangrams}
                        onChange={(e) =>
                          updateFilter('min_pangrams', e.target.value)
                        }
                        placeholder="min"
                        className="w-full h-8 px-1 rounded text-center text-xs"
                        style={inputStyle}
                        aria-label="Pangrammeja vähintään"
                      />
                      <span className="text-xs text-neutral-400">–</span>
                      <input
                        type="number"
                        value={filters.max_pangrams}
                        onChange={(e) =>
                          updateFilter('max_pangrams', e.target.value)
                        }
                        placeholder="max"
                        className="w-full h-8 px-1 rounded text-center text-xs"
                        style={inputStyle}
                        aria-label="Pangrammeja enintään"
                      />
                    </div>
                  </div>

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
                      Väh. sanoja/keskus
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={filters.min_words_min}
                        onChange={(e) =>
                          updateFilter('min_words_min', e.target.value)
                        }
                        placeholder="min"
                        className="w-full h-8 px-1 rounded text-center text-xs"
                        style={inputStyle}
                        aria-label="Vähemmän sanojen määrä vähintään"
                      />
                      <span className="text-xs text-neutral-400">–</span>
                      <input
                        type="number"
                        value={filters.max_words_min}
                        onChange={(e) =>
                          updateFilter('max_words_min', e.target.value)
                        }
                        placeholder="max"
                        className="w-full h-8 px-1 rounded text-center text-xs"
                        style={inputStyle}
                        aria-label="Vähemmän sanojen määrä enintään"
                      />
                    </div>
                  </div>

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
                      Naj. sanoja/keskus
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={filters.min_words}
                        onChange={(e) =>
                          updateFilter('min_words', e.target.value)
                        }
                        placeholder="min"
                        className="w-full h-8 px-1 rounded text-center text-xs"
                        style={inputStyle}
                        aria-label="Enemmän sanojen määrä vähintään"
                      />
                      <span className="text-xs text-neutral-400">–</span>
                      <input
                        type="number"
                        value={filters.max_words}
                        onChange={(e) =>
                          updateFilter('max_words', e.target.value)
                        }
                        placeholder="max"
                        className="w-full h-8 px-1 rounded text-center text-xs"
                        style={inputStyle}
                        aria-label="Enemmän sanojen määrä enintään"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable results table inside card */}
              <div
                className="rounded-xl border overflow-hidden mt-4 shadow-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                  <table
                    className="w-full text-xs"
                    style={{ borderCollapse: 'collapse' }}
                  >
                    <thead
                      className="sticky top-0 z-10"
                      style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <tr style={{ color: 'var(--color-text-secondary)' }}>
                        <th
                          className="text-left py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                          onClick={() => handleSort('letters')}
                        >
                          Kirjaimet{sortIndicator('letters')}
                        </th>
                        <th
                          className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                          onClick={() => handleSort('pangrams')}
                        >
                          Pg{sortIndicator('pangrams')}
                        </th>
                        <th
                          className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                          onClick={() => handleSort('words_max')}
                        >
                          Max{sortIndicator('words_max')}
                        </th>
                        <th
                          className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                          onClick={() => handleSort('words_min')}
                        >
                          Min{sortIndicator('words_min')}
                        </th>
                        <th
                          className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
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
                            className="py-8 text-center text-[11px]"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            Ladataan yhdistelmiä...
                          </td>
                        </tr>
                      )}
                      {!comboLoading && comboResults.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-[11px]"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            Ei hakua vastaavia tuloksia.
                          </td>
                        </tr>
                      )}
                      {!comboLoading &&
                        comboResults.map((combo) => (
                          <tr
                            key={combo.letters}
                            className="cursor-pointer transition-colors"
                            onClick={() => handleSelectCombo(combo)}
                            style={{
                              borderBottom: '1px solid var(--color-border)',
                              backgroundColor:
                                selectedCombo === combo.letters
                                  ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                                  : combo.letters === savedLetters
                                    ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                                    : 'transparent',
                            }}
                          >
                            <td
                              className="py-2.5 px-3 font-mono font-semibold uppercase text-xs"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {combo.letters}
                              {combo.in_rotation && (
                                <span
                                  className="ml-1.5 inline-block text-[10px] font-bold px-1 rounded bg-indigo-500/10"
                                  style={{ color: 'var(--color-accent)' }}
                                  title="On jo kiertoryhmässä"
                                >
                                  *
                                </span>
                              )}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {combo.total_pangrams}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {combo.max_word_count}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {combo.min_word_count}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
