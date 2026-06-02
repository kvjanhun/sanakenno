/**
 * Blocked words list with unblock functionality.
 *
 * @module src/components/admin/BlockedWords
 */

import { useState, useEffect, useCallback } from 'react';
import { Ban, Trash2 } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import type { BlockedWord } from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function BlockedWords() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const [blockedWords, setBlockedWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/blocked`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedWords(data.blocked_words);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [csrfToken]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleUnblock = async (id: number, word: string) => {
    if (!window.confirm(`Poista esto sanalta "${word}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/block/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      if (res.ok) {
        setBlockedWords((prev) => prev.filter((w) => w.id !== id));
      }
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div
        className="py-10 text-center text-sm"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ladataan...
      </div>
    );
  }

  if (blockedWords.length === 0) {
    return (
      <section className="w-full" aria-label="Estetyt sanat">
        <div
          className="rounded-lg px-3 py-6 text-center"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Ban
            size={28}
            strokeWidth={1.8}
            aria-hidden="true"
            className="mx-auto mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Ei estettyjä sanoja
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full" aria-label="Estetyt sanat">
      <div
        className="overflow-hidden rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-2 py-1 text-xs"
          style={{
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {blockedWords.length} sanaa
        </div>
        <div className="max-h-[min(34rem,70vh)] overflow-auto">
          <table className="w-auto min-w-[24rem] max-w-full text-xs">
            <thead
              className="sticky top-0 z-10"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <tr
                className="text-left text-xs"
                style={{
                  color: 'var(--color-text-tertiary)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <th className="px-2 py-1 font-semibold">Sana</th>
                <th className="px-2 py-1 font-semibold">Estetty</th>
                <th className="px-2 py-1 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {blockedWords.map((bw) => (
                <tr
                  key={bw.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td
                    className="px-2 py-0.5 font-mono"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {bw.word}
                  </td>
                  <td
                    className="px-2 py-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {new Date(bw.blocked_at + 'Z').toLocaleDateString('fi-FI')}
                  </td>
                  <td className="px-2 py-0.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleUnblock(bw.id, bw.word)}
                      title="Poista esto"
                      aria-label={`Poista esto sanalta ${bw.word}`}
                      className="inline-flex h-5 w-5 items-center justify-center rounded cursor-pointer"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-error) 10%, var(--color-bg-primary))',
                        border: '1px solid var(--color-error)',
                        color: 'var(--color-error)',
                      }}
                    >
                      <Trash2 size={12} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
