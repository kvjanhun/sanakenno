/**
 * Word-find analytics panel.
 *
 * Shows successful find counts for the selected puzzle. The list is sorted
 * hardest-first so low-count and never-found words are easiest to inspect.
 *
 * @module src/components/admin/WordFinds
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);

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
        setStatusMessage('Sanatilastoja ei voitu ladata.', 'error');
        return;
      }

      const nextData = (await res.json()) as WordFindsResponse;
      setData(nextData);
    } catch {
      setData(null);
      setError('Sanatilastoja ei voitu ladata.');
      setStatusMessage('Sanatilastoja ei voitu ladata.', 'error');
    } finally {
      setLoading(false);
    }
  }, [csrfToken, puzzleNumber, setStatusMessage]);

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
    <div className="space-y-6">
      {/* Top Pagination & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          className="flex items-center gap-1.5 p-1 rounded-xl border bg-[var(--color-bg-primary)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={() => setPuzzleNumber((n) => Math.max(0, n - 1))}
            disabled={!canGoPrevious}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer disabled:cursor-default disabled:opacity-30 hover:bg-[color-mix(in srgb,var(--color-accent)_6%,var(--color-bg-secondary))]"
            style={{ color: 'var(--color-text-primary)' }}
            title="Edellinen peli"
          >
            <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>

          <label
            className="flex items-center gap-1.5 px-2 text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span>Peli:</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, totalPuzzles)}
              value={displayNumber}
              onChange={(event) => updateDisplayNumber(event.target.value)}
              className="w-16 h-8 rounded-lg text-center font-mono font-bold transition-all focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer disabled:cursor-default disabled:opacity-30 hover:bg-[color-mix(in srgb,var(--color-accent)_6%,var(--color-bg-secondary))]"
            style={{ color: 'var(--color-text-primary)' }}
            title="Seuraava peli"
          >
            <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Kirjaimet:
            </span>
            <div className="flex items-center gap-1">
              <span
                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold uppercase shadow-xs select-none"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                }}
                title={`Keskuskirjain: ${data.center}`}
              >
                {data.center}
              </span>
              {data.letters.map((letter) => (
                <span
                  key={letter}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold uppercase border select-none bg-[var(--color-bg-primary)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center space-y-3">
          <div
            className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{
              borderColor: 'var(--color-accent)',
              borderTopColor: 'transparent',
            }}
          />
          <div
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ladataan sanatilastoja...
          </div>
        </div>
      ) : error ? (
        <div
          className="py-8 text-center space-y-2 border-2 border-dashed rounded-2xl"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--color-accent)' }}
          >
            {error}
          </p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Quick Metrics KPI cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className="p-4 rounded-xl border bg-[var(--color-bg-primary)] shadow-2xs space-y-1"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Löydetyt sanat / Kaikki
              </span>
              <div
                className="text-lg font-extrabold font-mono"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {data.recorded_words} / {data.total_words}
              </div>
              <div
                className="text-[10px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {Math.round((data.recorded_words / data.total_words) * 100)}%
                sanastosta löydetty ainakin kerran
              </div>
            </div>

            <div
              className="p-4 rounded-xl border bg-[var(--color-bg-primary)] shadow-2xs space-y-1"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Löytöjä yhteensä
              </span>
              <div
                className="text-lg font-extrabold font-mono"
                style={{ color: 'var(--color-accent)' }}
              >
                {data.total_finds}
              </div>
              <div
                className="text-[10px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Onnistuneita havaintoja seurantajaksolla
              </div>
            </div>

            <div
              className="p-4 rounded-xl border bg-[var(--color-bg-primary)] shadow-2xs space-y-1"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Uniikit pelisanat
              </span>
              <div
                className="text-lg font-extrabold font-mono"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {data.total_words}
              </div>
              <div
                className="text-[10px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Pulmaluupin vastaussanakirjan koko
              </div>
            </div>
          </div>

          {/* Words table list */}
          <div
            className="max-h-[30rem] overflow-y-auto rounded-xl border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-primary)',
            }}
          >
            {data.words.length === 0 ? (
              <div
                className="text-xs p-6 text-center"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Tässä pelissä ei ole tilastoraportteja.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    <th
                      className="px-5 py-3 text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Sana
                    </th>
                    <th
                      className="px-5 py-3 text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Arvauskertojen jakauma
                    </th>
                    <th
                      className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Määrä
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {data.words.map((item) => {
                    const findPercentage =
                      item.find_count > 0
                        ? Math.round((item.find_count / maxFindCount) * 100)
                        : 0;

                    const width = Math.max(3, findPercentage);

                    return (
                      <tr
                        key={item.word}
                        className="hover:bg-[color-mix(in srgb,var(--color-accent)_2%,var(--color-bg-secondary))] transition-colors group"
                      >
                        <td className="px-5 py-3 text-sm">
                          <span
                            className="font-mono font-bold tracking-wide text-sm"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {item.word}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 max-w-[20rem]">
                            <div
                              className="h-2 flex-1 rounded-full overflow-hidden"
                              style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                              }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${width}%`,
                                  backgroundColor:
                                    item.find_count > 0
                                      ? 'var(--color-accent)'
                                      : 'var(--color-border)',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] w-8 text-right font-medium">
                              {findPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className="font-mono font-bold px-2 py-0.5 rounded-md text-xs bg-[var(--color-bg-secondary)]"
                            style={{
                              color:
                                item.find_count > 0
                                  ? 'var(--color-accent)'
                                  : 'var(--color-text-tertiary)',
                            }}
                          >
                            {item.find_count}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
