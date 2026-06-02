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
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
  const [rejections, setRejections] = useState<SuggestionRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const fetchRejections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/suggestion-rejections`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });

      if (!res.ok) {
        setRejections([]);
        setStatusMessage('Hylättyjä ehdotuksia ei voitu ladata.', 'error');
        return;
      }

      const data = await res.json();
      setRejections(data.rejections || []);
    } catch {
      setRejections([]);
      setStatusMessage('Hylättyjä ehdotuksia ei voitu ladata.', 'error');
    } finally {
      setLoading(false);
    }
  }, [csrfToken, setStatusMessage]);

  useEffect(() => {
    fetchRejections();
  }, [fetchRejections]);

  const restoreSuggestion = async (rejection: SuggestionRejection) => {
    setRestoringId(rejection.id);
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
        setStatusMessage(data.error || 'Palautus epäonnistui.', 'error');
        return;
      }

      setRejections((prev) => prev.filter((item) => item.id !== rejection.id));
      setStatusMessage('Ehdotus palautettu takaisin jonoon!', 'success');
    } catch {
      setStatusMessage('Palautus epäonnistui.', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const surfaceButtonStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <section
      className="max-w-4xl mx-auto space-y-6 animate-fade-in"
      aria-label="Hylätyt ehdotukset"
    >
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
              <ArchiveRestore
                className="h-5 w-5"
                style={{ color: 'var(--color-accent)' }}
              />
              <h2
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Hylätyt ehdotukset
              </h2>
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Lista pysyvästi hylätyistä kirjainyhdistelmistä, jotka on
              poistettu peliehdotuksista. Palauta takaisin kiertoon
              tarvittaessa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {loading ? 'Ladataan...' : `${rejections.length} hylättyä`}
            </span>
            <button
              type="button"
              onClick={() => void fetchRejections()}
              disabled={loading}
              title="Päivitä lista"
              aria-label="Päivitä lista"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-xs hover:scale-[1.05] active:scale-[0.95] transition-all cursor-pointer disabled:cursor-default disabled:opacity-50"
              style={surfaceButtonStyle}
            >
              <RefreshCw
                size={15}
                strokeWidth={2.4}
                className={loading ? 'animate-spin' : ''}
              />
            </button>
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
              Ladataan hylättyjä ehdotuksia...
            </div>
          </div>
        ) : rejections.length === 0 ? (
          <div className="px-6 py-16 text-center max-w-sm mx-auto">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-primary))',
              }}
            >
              <ArchiveRestore
                size={22}
                strokeWidth={2}
                style={{ color: 'var(--color-accent)' }}
              />
            </div>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Ei hylättyjä ehdotuksia
            </p>
            <p
              className="mt-1.5 text-xs leading-relaxed"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Kaikki hylätyt peli-ehdotukset ovat tyhjänä tai palautettu
              takaisin ehdotusjonoon.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[36rem]">
              <thead>
                <tr
                  className="text-xs font-bold uppercase tracking-wider border-b"
                  style={{
                    color: 'var(--color-text-tertiary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <th className="px-6 py-4 font-semibold">
                    Peliratkaisun kirjaimet
                  </th>
                  <th className="px-6 py-4 font-semibold text-center">
                    Keskuskirjain
                  </th>
                  <th className="px-6 py-4 font-semibold">Hylkäyspäivä</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Toiminto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {rejections.map((rejection) => (
                  <tr
                    key={rejection.id}
                    className="hover:bg-[color-mix(in srgb,var(--color-text-primary)_1%,transparent)] transition-all"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        {rejection.letters.map((letter) => {
                          const isCenter = letter === rejection.center;
                          return (
                            <span
                              key={`${rejection.id}-${letter}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-sm font-bold shadow-xs select-none"
                              style={{
                                backgroundColor: isCenter
                                  ? 'var(--color-accent)'
                                  : 'var(--color-bg-primary)',
                                color: isCenter
                                  ? 'var(--color-on-accent)'
                                  : 'var(--color-text-primary)',
                                border: isCenter
                                  ? '1px solid var(--color-accent)'
                                  : '1px solid var(--color-border)',
                              }}
                            >
                              {letter}
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="font-mono font-bold text-sm uppercase px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: 'var(--color-bg-primary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {rejection.center}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-xs font-medium"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {new Date(rejection.rejected_at + 'Z').toLocaleDateString(
                        'fi-FI',
                        {
                          day: 'numeric',
                          month: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void restoreSuggestion(rejection)}
                        disabled={restoringId !== null}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-xs hover:border-accent hover:text-accent hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
                        style={surfaceButtonStyle}
                      >
                        <ArchiveRestore size={13} strokeWidth={2.4} />
                        <span>
                          {restoringId === rejection.id
                            ? 'Palautetaan...'
                            : 'Palauta'}
                        </span>
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
