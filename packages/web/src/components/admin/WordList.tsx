/**
 * Word list display for admin puzzle editor.
 *
 * Shows valid words in columns, pangrams highlighted in accent color.
 * Each word has a block button to permanently remove it.
 *
 * @module src/components/admin/WordList
 */

import { useMemo } from 'react';

interface WordListProps {
  words: string[];
  letters: string;
  loading: boolean;
  onBlock: (word: string) => void;
}

/**
 * Check if a word uses all 7 letters (pangram).
 */
function isPangram(word: string, letters: string): boolean {
  const letterSet = new Set(letters);
  return [...letterSet].every((l) => word.includes(l));
}

export function WordList({ words, letters, loading, onBlock }: WordListProps) {
  const sorted = useMemo(() => [...words].sort(), [words]);
  const pangramCount = useMemo(
    () => sorted.filter((w) => isPangram(w, letters)).length,
    [sorted, letters],
  );

  if (loading) {
    return (
      <div
        className="text-sm py-4 text-center"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ladataan sanoja...
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div
        className="text-sm py-4 text-center"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ei sanoja
      </div>
    );
  }

  return (
    <div>
      <div
        className="text-xs mb-2"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {words.length} sanaa, {pangramCount} pangrammia
      </div>
      <div
        className="grid gap-x-4 gap-y-0.5 text-sm"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        }}
      >
        {sorted.map((word) => {
          const pg = isPangram(word, letters);
          return (
            <div key={word} className="flex items-center gap-1 group">
              <button
                type="button"
                onClick={() => onBlock(word)}
                className="opacity-0 group-hover:opacity-100 text-xs cursor-pointer px-1"
                style={{
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                }}
                title={`Estä "${word}"`}
              >
                x
              </button>
              <span
                style={{
                  color: pg
                    ? 'var(--color-accent)'
                    : 'var(--color-text-primary)',
                  fontWeight: pg ? 700 : 400,
                }}
              >
                {word}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
