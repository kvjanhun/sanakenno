/**
 * Word list modal for past puzzles ("reveal answers").
 *
 * Mirrors the iOS puzzle-words screen. Fetches the full word list from
 * `/api/puzzle/:n/words` and displays it as a 3-column grid, with words
 * already found by the player highlighted. Opening this modal sets a
 * `revealed_N` flag in localStorage so subsequent gameplay on that
 * puzzle no longer accumulates stats.
 *
 * @module src/components/PuzzleWordsModal
 */

import { useEffect, useState } from 'react';
import { storage, config } from '../platform';
import { ModalShell } from './ModalShell';

/** Locally persisted state shape (subset). */
interface SavedGameState {
  foundWords?: string[];
}

/** Props for {@link PuzzleWordsModal}. */
export interface PuzzleWordsModalProps {
  show: boolean;
  onClose: () => void;
  puzzleNumber: number | null;
}

/**
 * Word list modal component.
 */
export function PuzzleWordsModal({
  show,
  onClose,
  puzzleNumber,
}: PuzzleWordsModalProps): React.JSX.Element | null {
  const [words, setWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || puzzleNumber === null) return;

    const saved = storage.load<SavedGameState>(
      `sanakenno_state_${puzzleNumber}`,
    );
    setFoundWords(new Set(saved?.foundWords ?? []));

    // Mark this puzzle as revealed — submitWord will skip stats updates
    // for any future play on it.
    storage.setRaw(`revealed_${puzzleNumber}`, 'true');

    setLoading(true);
    setError('');
    setWords([]);

    fetch(`${config.apiBase}/api/puzzle/${puzzleNumber}/words`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ words: string[] }>;
      })
      .then((data) => {
        setWords([...data.words].sort((a, b) => a.localeCompare(b, 'fi')));
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [show, puzzleNumber]);

  if (!show || puzzleNumber === null) return null;

  const foundCount = words.filter((w) => foundWords.has(w)).length;

  return (
    <ModalShell
      title={`Kenno #${puzzleNumber + 1}`}
      titleId="puzzle-words-title"
      onClose={onClose}
      className="flex flex-col"
      style={{ height: '80vh', overflowY: 'hidden' }}
    >
      {!loading && !error && (
        <div
          className="text-xs mb-3"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {foundCount}/{words.length} löydetty
        </div>
      )}

      {loading && (
        <div
          className="flex-1 text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ladataan...
        </div>
      )}

      {error && (
        <div
          className="flex-1 text-sm py-4 text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Sanalistaa ei voitu ladata.
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ul className="grid grid-cols-3 gap-x-3 gap-y-1.5 list-none p-0 m-0">
            {words.map((word) => {
              const found = foundWords.has(word);
              return (
                <li
                  key={word}
                  className="text-sm"
                  style={{
                    color: found
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-tertiary)',
                    fontWeight: found ? 600 : 400,
                  }}
                >
                  {word}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ModalShell>
  );
}
