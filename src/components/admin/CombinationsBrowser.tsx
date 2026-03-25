/**
 * Filterable, sortable, paginated combinations browser.
 *
 * Allows the admin to search pre-computed 7-letter combinations
 * by required/excluded letters, pangram count, word count ranges,
 * and rotation membership. Expandable rows show center variations.
 *
 * @module src/components/admin/CombinationsBrowser
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CombinationEntry,
  VariationData,
} from '../../store/useAdminStore.js';
import { useAdminStore } from '../../store/useAdminStore.js';
import { VariationsGrid } from './VariationsGrid.js';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface Filters {
  requires: string;
  excludes: string;
  min_pangrams: string;
  max_pangrams: string;
  min_words: string;
  max_words: string;
  in_rotation: string;
}

const DEFAULT_FILTERS: Filters = {
  requires: '',
  excludes: '',
  min_pangrams: '',
  max_pangrams: '',
  min_words: '',
  max_words: '',
  in_rotation: '',
};

export function CombinationsBrowser() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState('words_max');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [results, setResults] = useState<CombinationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchCombinations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.requires) params.set('requires', filters.requires);
    if (filters.excludes) params.set('excludes', filters.excludes);
    if (filters.min_pangrams) params.set('min_pangrams', filters.min_pangrams);
    if (filters.max_pangrams) params.set('max_pangrams', filters.max_pangrams);
    if (filters.min_words) params.set('min_words', filters.min_words);
    if (filters.max_words) params.set('max_words', filters.max_words);
    if (filters.in_rotation) params.set('in_rotation', filters.in_rotation);
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', String(page));
    params.set('per_page', String(perPage));

    try {
      const res = await fetch(`${API_BASE}/api/admin/combinations?${params}`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.combinations);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch {
      // Ignore network errors
    }
    setLoading(false);
  }, [filters, sort, order, page, perPage, csrfToken]);

  // Debounced fetch on filter change
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
    setPage(1);
  };

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const sortIndicator = (col: string) => {
    if (sort !== col) return '';
    return order === 'asc' ? ' ^' : ' v';
  };

  const handleSelectCombo = (letters: string, center: string) => {
    const letterArr = letters.split('');
    useAdminStore.setState({
      activeLetters: letters,
      activeCenter: center,
    });
    useAdminStore.getState().previewCombo(letterArr, center);
  };

  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div
        className="grid grid-cols-2 gap-2 p-3 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sisältää
          </label>
          <input
            type="text"
            value={filters.requires}
            onChange={(e) => updateFilter('requires', e.target.value)}
            placeholder="esim. äö"
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ei sisällä
          </label>
          <input
            type="text"
            value={filters.excludes}
            onChange={(e) => updateFilter('excludes', e.target.value)}
            placeholder="esim. xyz"
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Pangrammit min
          </label>
          <input
            type="number"
            value={filters.min_pangrams}
            onChange={(e) => updateFilter('min_pangrams', e.target.value)}
            min={0}
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Pangrammit max
          </label>
          <input
            type="number"
            value={filters.max_pangrams}
            onChange={(e) => updateFilter('max_pangrams', e.target.value)}
            min={0}
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sanoja min (paras)
          </label>
          <input
            type="number"
            value={filters.min_words}
            onChange={(e) => updateFilter('min_words', e.target.value)}
            min={0}
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sanoja max (paras)
          </label>
          <input
            type="number"
            value={filters.max_words}
            onChange={(e) => updateFilter('max_words', e.target.value)}
            min={0}
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div className="col-span-2">
          <label
            className="block text-xs mb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Kierrossa
          </label>
          <select
            value={filters.in_rotation}
            onChange={(e) => updateFilter('in_rotation', e.target.value)}
            className="w-full px-2 py-1 rounded text-sm"
            style={inputStyle}
          >
            <option value="">Kaikki</option>
            <option value="true">Kyllä</option>
            <option value="false">Ei</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        {loading ? 'Ladataan...' : `${total} yhdistelmää`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          style={{ borderCollapse: 'collapse' }}
        >
          <thead>
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
                Sanoja (max){sortIndicator('words_max')}
              </th>
              <th
                className="text-right py-1 px-2 cursor-pointer"
                onClick={() => handleSort('words_min')}
              >
                Sanoja (min){sortIndicator('words_min')}
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
            {results.map((combo) => (
              <ComboRow
                key={combo.letters}
                combo={combo}
                expanded={expandedRow === combo.letters}
                onToggle={() =>
                  setExpandedRow(
                    expandedRow === combo.letters ? null : combo.letters,
                  )
                }
                onSelectCenter={(center) =>
                  handleSelectCombo(combo.letters, center)
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: page <= 1 ? 0.3 : 1,
            }}
          >
            &lt;
          </button>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pages, page + 1))}
            disabled={page >= pages}
            className="px-2 py-1 rounded cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: page >= pages ? 0.3 : 1,
            }}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

// --- Combo row sub-component ---

function ComboRow({
  combo,
  expanded,
  onToggle,
  onSelectCenter,
}: {
  combo: CombinationEntry;
  expanded: boolean;
  onToggle: () => void;
  onSelectCenter: (center: string) => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer"
        onClick={onToggle}
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: expanded
            ? 'var(--color-bg-secondary)'
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
      {expanded && (
        <tr>
          <td colSpan={5} className="p-3">
            <VariationsGrid
              variations={combo.variations as VariationData[]}
              activeCenter=""
              onSelect={onSelectCenter}
            />
          </td>
        </tr>
      )}
    </>
  );
}
