/**
 * Dedicated admin view for permanently rejected game suggestions.
 *
 * Lists persisted suggestion rejections and lets admins restore them so they
 * become eligible for the suggestion queue again.
 *
 * @module src/components/admin/SuggestionRejections
 */

import { useCallback, useEffect, useState } from 'react';
import { ArchiveRestore, RefreshCw } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface SuggestionRejection {
  id: number;
  letters_key: string;
  letters: string[];
  center: string;
  rejected_at: string;
}

/**
 * Rejected suggestion management panel.
 */
export function SuggestionRejections() {
  const csrfToken = useAdminStore((s) => s.csrfToken);
  const [rejections, setRejections] = useState<SuggestionRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRejections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/suggestion-rejections`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });

      if (!res.ok) {
        setRejections([]);
        setError('Hylättyjä ehdotuksia ei voitu ladata.');
        return;
      }

      const data = await res.json();
      setRejections(data.rejections || []);
    } catch {
      setRejections([]);
      setError('Hylättyjä ehdotuksia ei voitu ladata.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  useEffect(() => {
    fetchRejections();
  }, [fetchRejections]);

  const restoreSuggestion = async (rejection: SuggestionRejection) => {
    setRestoringId(rejection.id);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/suggestion-rejections/${rejection.id}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Palautus epäonnistui.');
        return;
      }

      setRejections((prev) => prev.filter((item) => item.id !== rejection.id));
    } catch {
      setError('Palautus epäonnistui.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section className="space-y-2" aria-label="Hylätyt ehdotukset">
      {error && (
        <div
          className="rounded px-2 py-1 text-xs"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-error) 12%, var(--color-bg-primary))',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      <div
        className="overflow-hidden rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex items-center justify-between gap-2 px-2 py-1.5"
          style={{
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <span className="text-xs">
            {loading ? 'Ladataan...' : `${rejections.length} hylättyä`}
          </span>
          <button
            type="button"
            onClick={() => void fetchRejections()}
            disabled={loading}
            title="Päivitä lista"
            aria-label="Päivitä lista"
            className="inline-flex h-6 w-6 items-center justify-center rounded cursor-pointer disabled:cursor-default"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        {loading ? (
          <div
            className="py-8 text-center text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ladataan...
          </div>
        ) : rejections.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ArchiveRestore
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
              Ei hylättyjä ehdotuksia
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Pysyvästi hylätyt ehdotukset ilmestyvät tähän.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-auto min-w-[36rem] max-w-full text-xs">
              <thead>
                <tr
                  className="text-left text-xs"
                  style={{
                    color: 'var(--color-text-tertiary)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <th className="px-2 py-1 font-semibold">Kirjaimet</th>
                  <th className="px-2 py-1 font-semibold">Keskus</th>
                  <th className="px-2 py-1 font-semibold">Hylätty</th>
                  <th className="px-2 py-1 text-right font-semibold">
                    Toiminto
                  </th>
                </tr>
              </thead>
              <tbody>
                {rejections.map((rejection) => (
                  <tr
                    key={rejection.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td className="px-2 py-1">
                      <span
                        className="inline-flex items-center gap-0.5 font-mono text-xs"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {rejection.letters.map((letter) => (
                          <span
                            key={`${rejection.id}-${letter}`}
                            className="inline-flex h-5 w-5 items-center justify-center rounded"
                            style={{
                              backgroundColor:
                                letter === rejection.center
                                  ? 'var(--color-accent)'
                                  : 'var(--color-bg-primary)',
                              color:
                                letter === rejection.center
                                  ? 'var(--color-on-accent)'
                                  : 'var(--color-text-primary)',
                              border:
                                letter === rejection.center
                                  ? '1px solid var(--color-accent)'
                                  : '1px solid var(--color-border)',
                            }}
                          >
                            {letter}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td
                      className="px-2 py-1 font-mono"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {rejection.center}
                    </td>
                    <td
                      className="px-2 py-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {new Date(rejection.rejected_at + 'Z').toLocaleDateString(
                        'fi-FI',
                      )}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => void restoreSuggestion(rejection)}
                        disabled={restoringId !== null}
                        title="Palauta ehdotus jonoon"
                        className="inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-xs font-semibold cursor-pointer disabled:cursor-default"
                        style={{
                          backgroundColor: 'var(--color-bg-primary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                          opacity: restoringId !== null ? 0.6 : 1,
                        }}
                      >
                        <ArchiveRestore
                          size={14}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                        {restoringId === rejection.id
                          ? 'Palautetaan...'
                          : 'Palauta'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
