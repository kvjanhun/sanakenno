/**
 * Blocked words list with unblock functionality.
 *
 * @module src/components/admin/BlockedWords
 */

import { useState, useEffect, useCallback } from 'react';
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
        className="text-sm py-4 text-center"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ladataan...
      </div>
    );
  }

  if (blockedWords.length === 0) {
    return (
      <div
        className="text-sm py-4 text-center"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ei estettyjä sanoja
      </div>
    );
  }

  return (
    <div>
      <div
        className="text-xs mb-2"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {blockedWords.length} estettyä sanaa
      </div>
      <div className="space-y-1">
        {blockedWords.map((bw) => (
          <div
            key={bw.id}
            className="flex items-center justify-between py-1 px-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ color: 'var(--color-text-primary)' }}>
              {bw.word}
              <span
                className="ml-2 text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {new Date(bw.blocked_at + 'Z').toLocaleDateString('fi-FI')}
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleUnblock(bw.id, bw.word)}
              className="text-xs px-2 py-0.5 rounded cursor-pointer"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Poista esto
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
