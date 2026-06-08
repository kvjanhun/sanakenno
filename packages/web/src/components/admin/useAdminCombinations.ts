import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CombinationEntry,
  VariationData,
} from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface CombinationFilters {
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

export const DEFAULT_COMBINATION_FILTERS: CombinationFilters = {
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

/**
 * Owns admin combination-search filters, sorting, fetching, and row selection.
 */
export function useAdminCombinations({
  csrfToken,
  savedLetters,
}: {
  csrfToken: string | null;
  savedLetters: string;
}) {
  const [filters, setFilters] = useState<CombinationFilters>(
    DEFAULT_COMBINATION_FILTERS,
  );
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

  useEffect(() => {
    if (savedLetters) {
      setFilters((prev) => ({ ...prev, requires: savedLetters }));
    }
  }, [savedLetters]);

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
      // Keep the current result set when a background refresh fails.
    } finally {
      setComboLoading(false);
    }
  }, [csrfToken, filters, order, sort]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchCombinations();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchCombinations]);

  const updateFilter = useCallback(
    (key: keyof CombinationFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSort = useCallback(
    (col: string) => {
      if (sort === col) {
        setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSort(col);
        setOrder('desc');
      }
    },
    [sort],
  );

  const sortIndicator = useCallback(
    (col: string) => {
      if (sort !== col) return '';
      return order === 'asc' ? ' ^' : ' v';
    },
    [order, sort],
  );

  const clearSelection = useCallback(() => {
    setSelectedCombo(null);
    setSelectedVariations([]);
  }, []);

  const handleSelectCombo = useCallback(
    (combo: CombinationEntry) => {
      if (selectedCombo === combo.letters) {
        clearSelection();
        return;
      }
      setSelectedCombo(combo.letters);
      setSelectedVariations(combo.variations as VariationData[]);
    },
    [clearSelection, selectedCombo],
  );

  return {
    filters,
    updateFilter,
    sortIndicator,
    handleSort,
    comboResults,
    comboTotal,
    comboLoading,
    selectedCombo,
    selectedVariations,
    clearSelection,
    handleSelectCombo,
  };
}
