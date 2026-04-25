/**
 * Archive modal showing all available puzzles with pagination.
 *
 * Fetches puzzle metadata from /api/archive?all=true and displays each day
 * with date, letter preview, and play status derived from localStorage.
 *
 * @module src/components/ArchiveModal
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rankForScore } from '@sanakenno/shared';
import { loadFromStorage } from '../utils/storage';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Shape of a persisted game state (subset needed for status check). */
interface PersistedState {
  score: number;
  foundWords: string[];
}

/** Shape of an archive entry from the API. */
interface ArchiveEntry {
  date: string;
  puzzle_number: number;
  letters: string[];
  center: string;
  is_today: boolean;
  max_score: number;
}

/** Derived play status for display. */
interface PlayStatus {
  played: boolean;
  rank: string | null;
  wordsFound: number;
}

/** Props for {@link ArchiveModal}. */
export interface ArchiveModalProps {
  show: boolean;
  onClose: () => void;
  onSelectPuzzle: (puzzleNumber: number, date: string | null) => void;
  /** Currently loaded puzzle number (to highlight). */
  currentPuzzleNumber: number | null;
}

/** Check localStorage for play status on a given puzzle. */
function getPlayStatus(puzzleNumber: number, maxScore: number): PlayStatus {
  const data = loadFromStorage<PersistedState>(
    `sanakenno_state_${puzzleNumber}`,
  );
  if (!data || !data.foundWords || data.foundWords.length === 0) {
    return { played: false, rank: null, wordsFound: 0 };
  }
  return {
    played: true,
    rank: rankForScore(data.score, maxScore),
    wordsFound: data.foundWords.length,
  };
}

/** Format a date string as Finnish short date (e.g. "ma 31.3."). */
function formatFinnishDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

const PAST_PAGE_SIZE = 8;

/**
 * Archive modal component.
 */
export function ArchiveModal({
  show,
  onClose,
  onSelectPuzzle,
  currentPuzzleNumber,
}: ArchiveModalProps): React.JSX.Element | null {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);

  const fetchArchive = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/archive?all=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEntries(await res.json());
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (show) fetchArchive();
  }, [show, fetchArchive]);

  const todayEntry = useMemo(
    () => entries.find((entry) => entry.is_today) ?? null,
    [entries],
  );
  const pastEntries = useMemo(
    () => entries.filter((entry) => !entry.is_today),
    [entries],
  );
  const pageCount = Math.max(1, Math.ceil(pastEntries.length / PAST_PAGE_SIZE));
  const visiblePastEntries = pastEntries.slice(
    page * PAST_PAGE_SIZE,
    page * PAST_PAGE_SIZE + PAST_PAGE_SIZE,
  );

  useEffect(() => {
    if (page < pageCount) return;
    setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-4 flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-primary)', height: '80vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2
            id="archive-title"
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Arkisto
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-lg bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label="Sulje"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div
            className="flex-1 text-sm py-4 text-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ladataan...
          </div>
        ) : error ? (
          <div
            className="flex-1 text-sm py-4 text-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Arkiston lataus epäonnistui.
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {[...(todayEntry ? [todayEntry] : []), ...visiblePastEntries].map(
                (entry) => {
                  const status = getPlayStatus(
                    entry.puzzle_number,
                    entry.max_score,
                  );
                  const isCurrent = entry.puzzle_number === currentPuzzleNumber;

                  return (
                    <button
                      key={entry.date}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer border-none"
                      style={{
                        backgroundColor: entry.is_today
                          ? 'var(--color-bg-secondary)'
                          : 'transparent',
                        boxShadow: isCurrent
                          ? 'inset 0 0 0 2px var(--color-accent)'
                          : undefined,
                      }}
                      onClick={() =>
                        onSelectPuzzle(
                          entry.puzzle_number,
                          entry.is_today ? null : entry.date,
                        )
                      }
                    >
                      {/* Date + puzzle number */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatFinnishDate(entry.date)}
                          {entry.is_today && (
                            <span
                              className="ml-1.5 text-xs"
                              style={{ color: 'var(--color-accent)' }}
                            >
                              tänään
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          Kenno #{entry.puzzle_number + 1}
                        </div>
                      </div>

                      {/* Letter preview */}
                      <div
                        className="flex items-baseline gap-0.5 text-xs font-[var(--font-mono)]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {entry.letters.map((l, i) => (
                          <span
                            key={i}
                            style={{
                              color:
                                l === entry.center
                                  ? 'var(--color-accent)'
                                  : 'var(--color-text-secondary)',
                              fontWeight: l === entry.center ? 700 : 400,
                            }}
                          >
                            {l.toUpperCase()}
                          </span>
                        ))}
                      </div>

                      {/* Play status */}
                      <div className="shrink-0 w-20 text-right truncate text-xs">
                        {status.played && (
                          <span
                            title={`${status.wordsFound} sanaa, ${status.rank}`}
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {status.rank}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-md border bg-transparent text-sm cursor-pointer disabled:cursor-default"
                  style={{
                    color:
                      page === 0
                        ? 'var(--color-text-tertiary)'
                        : 'var(--color-text-primary)',
                    borderColor: 'var(--color-border)',
                    opacity: page === 0 ? 0.5 : 1,
                  }}
                >
                  Edellinen
                </button>
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  aria-label={`Sivu ${page + 1} / ${pageCount}`}
                >
                  {page + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(pageCount - 1, value + 1))
                  }
                  disabled={page >= pageCount - 1}
                  className="px-3 py-1.5 rounded-md border bg-transparent text-sm cursor-pointer disabled:cursor-default"
                  style={{
                    color:
                      page >= pageCount - 1
                        ? 'var(--color-text-tertiary)'
                        : 'var(--color-text-primary)',
                    borderColor: 'var(--color-border)',
                    opacity: page >= pageCount - 1 ? 0.5 : 1,
                  }}
                >
                  Seuraava
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
