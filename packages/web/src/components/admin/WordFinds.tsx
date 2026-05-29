/**
 * Word-find analytics panel.
 *
 * Shows successful find counts for the selected puzzle. The list is sorted
 * hardest-first so low-count and never-found words are easiest to inspect.
 *
 * @module src/components/admin/WordFinds
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { WordFindEntry } from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface WordFindsResponse {
  puzzle_number: number;
  display_number: number;
  center: string;
  letters: string[];
  total_words: number;
  recorded_words: number;
  total_finds: number;
  words: WordFindEntry[];
}

/**
 * Per-puzzle successful-word counts for puzzle tuning.
 */
export function WordFinds() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const currentSlot = useAdminStore((s) => s.currentSlot);
  const totalPuzzles = useAdminStore((s) => s.totalPuzzles);

  const [puzzleNumber, setPuzzleNumber] = useState(currentSlot);
  const [data, setData] = useState<WordFindsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPuzzleNumber(currentSlot);
  }, [currentSlot]);

  const fetchWordFinds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/word-finds?puzzle_number=${puzzleNumber}`,
        {
          credentials: 'same-origin',
          headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        },
      );

      if (!res.ok) {
        setData(null);
        setError('Sanatilastoja ei voitu ladata.');
        return;
      }

      const nextData = (await res.json()) as WordFindsResponse;
      setData(nextData);
    } catch {
      setData(null);
      setError('Sanatilastoja ei voitu ladata.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken, puzzleNumber]);

  useEffect(() => {
    fetchWordFinds();
  }, [fetchWordFinds]);

  const maxFindCount = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.words.map((word) => word.find_count));
  }, [data]);

  const displayNumber = puzzleNumber + 1;
  const canGoPrevious = puzzleNumber > 0;
  const canGoNext = totalPuzzles === 0 || puzzleNumber < totalPuzzles - 1;

  const updateDisplayNumber = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;

    const maxDisplayNumber = Math.max(1, totalPuzzles);
    const clamped = Math.min(Math.max(parsed, 1), maxDisplayNumber);
    setPuzzleNumber(clamped - 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPuzzleNumber((n) => Math.max(0, n - 1))}
            disabled={!canGoPrevious}
            className="px-2 py-1 rounded text-sm cursor-pointer disabled:cursor-default"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              opacity: canGoPrevious ? 1 : 0.4,
            }}
          >
            Edellinen
          </button>
          <label
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Peli
            <input
              type="number"
              min={1}
              max={Math.max(1, totalPuzzles)}
              value={displayNumber}
              onChange={(event) => updateDisplayNumber(event.target.value)}
              className="w-16 rounded px-2 py-1 text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              setPuzzleNumber((n) =>
                totalPuzzles > 0 ? Math.min(totalPuzzles - 1, n + 1) : n + 1,
              )
            }
            disabled={!canGoNext}
            className="px-2 py-1 rounded text-sm cursor-pointer disabled:cursor-default"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              opacity: canGoNext ? 1 : 0.4,
            }}
          >
            Seuraava
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ladataan...
        </div>
      ) : error ? (
        <div className="text-sm" style={{ color: 'var(--color-accent)' }}>
          {error}
        </div>
      ) : data ? (
        <>
          <div
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {data.total_finds} löytöä, {data.recorded_words}/{data.total_words}{' '}
            sanaa löydetty ainakin kerran. Keskus{' '}
            <span
              className="font-mono"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {data.center}
            </span>
            .
          </div>

          <div
            className="max-h-72 overflow-y-auto rounded"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            {data.words.length === 0 ? (
              <div
                className="text-xs p-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Ei sanoja.
              </div>
            ) : (
              <ul
                className="divide-y"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {data.words.map((item) => {
                  const width =
                    item.find_count > 0
                      ? Math.max(4, (item.find_count / maxFindCount) * 100)
                      : 0;

                  return (
                    <li
                      key={item.word}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      <span
                        className="font-mono flex-1 min-w-0 truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.word}
                      </span>
                      <div
                        className="w-24 h-2 rounded overflow-hidden"
                        style={{ backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${width}%`,
                            backgroundColor: 'var(--color-accent)',
                          }}
                        />
                      </div>
                      <span
                        className="w-8 text-right text-xs"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {item.find_count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
