/**
 * Blocked words list with unblock functionality.
 *
 * @module src/components/admin/BlockedWords
 */

import { useState, useEffect, useCallback } from 'react';
import { Ban, Search, X } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import type { BlockedWord } from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function BlockedWords() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
  const [blockedWords, setBlockedWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      } else {
        setStatusMessage('Estettyjä sanoja ei voitu ladata.', 'error');
      }
    } catch {
      setStatusMessage('Estettyjä sanoja ei voitu ladata.', 'error');
    }
    setLoading(false);
  }, [csrfToken, setStatusMessage]);

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
        setStatusMessage(`Sana "${word}" poistettu estolistalta!`, 'success');
      } else {
        setStatusMessage('Sanapoisto epäonnistui.', 'error');
      }
    } catch {
      setStatusMessage('Sanapoisto epäonnistui.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div
        className="overflow-hidden rounded-2xl border shadow-xs"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Ban
                className="h-5 w-5"
                style={{ color: 'var(--color-accent)' }}
              />
              <h2
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Estetyt sanat
              </h2>
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Lista sanakirjasta estetyistä sanoista, joita ei hyväksytä pelien
              ratkaisuissa ja arvausvaiheissa.
            </p>
          </div>

          <div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 inline-block"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {loading ? 'Ladataan...' : `${blockedWords.length} sanaa`}
            </span>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
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
              Ladataan estettyjä sanoja...
            </div>
          </div>
        ) : blockedWords.length === 0 ? (
          <div className="px-6 py-16 text-center max-w-sm mx-auto">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-primary))',
              }}
            >
              <Ban
                size={22}
                strokeWidth={2}
                style={{ color: 'var(--color-accent)' }}
              />
            </div>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Ei estettyjä sanoja
            </p>
            <p
              className="mt-1.5 text-xs leading-relaxed"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Yhtään sanaa ei ole tällä hetkellä estettynä sanahaussa.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Search Bar */}
            <div
              className="px-6 py-3.5 border-b flex items-center gap-3 bg-[color-mix(in srgb,var(--color-text-primary)_1.5%,transparent)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="relative flex-1 max-w-sm">
                <Search
                  className="absolute left-3 top-2.5 h-4 w-4"
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Etsi estettyä sanaa..."
                  className="w-full pl-9 pr-3 h-9 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-accent font-medium shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 hover:text-red-500 transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Näytetään{' '}
                {
                  blockedWords.filter((bw) =>
                    bw.word
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase().trim()),
                  ).length
                }{' '}
                / {blockedWords.length} sanaa
              </span>
            </div>

            {/* Tags Cloud Box */}
            <div className="p-6">
              {blockedWords.filter((bw) =>
                bw.word
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase().trim()),
              ).length === 0 ? (
                <div
                  className="py-12 text-center"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <p className="text-sm font-semibold">
                    Ei hakua vastaavia estettyjä sanoja
                  </p>
                </div>
              ) : (
                <div className="max-h-[30rem] overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2.5">
                    {blockedWords
                      .filter((bw) =>
                        bw.word
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase().trim()),
                      )
                      .map((bw) => {
                        const blockDate = new Date(
                          bw.blocked_at + 'Z',
                        ).toLocaleDateString('fi-FI', {
                          day: 'numeric',
                          month: 'numeric',
                          year: 'numeric',
                        });
                        return (
                          <div
                            key={bw.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-xs transition-all hover:scale-[1.02] bg-[var(--color-bg-primary)] hover:border-[var(--color-accent)]/45"
                            style={{ borderColor: 'var(--color-border)' }}
                            title={`Estetty: ${blockDate}`}
                          >
                            <span
                              className="font-mono font-bold text-sm tracking-wide"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {bw.word.toUpperCase()}
                            </span>
                            <div className="h-3 w-px bg-[var(--color-border)]" />
                            <button
                              type="button"
                              onClick={() => void handleUnblock(bw.id, bw.word)}
                              title={`Poista sana "${bw.word}" estetyistä`}
                              aria-label={`Poista sana ${bw.word} estetyistä`}
                              className="text-neutral-400 hover:text-red-500 rounded-md hover:bg-red-500/10 p-0.5 transition-all cursor-pointer"
                            >
                              <X size={14} strokeWidth={2.4} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
