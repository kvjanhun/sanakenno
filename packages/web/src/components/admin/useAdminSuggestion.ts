import { useCallback, useState } from 'react';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface SuggestionOverlap {
  slot: number | null;
  shared_letters: number;
  shared_short_words: number;
}

export interface PuzzleSuggestion {
  letters: string[];
  letters_key: string;
  center: string;
  word_count: number;
  pangram_count: number;
  max_score: number;
  quality_grade?: 'good' | 'ok' | 'risky' | 'reject' | 'unreviewed';
  quality_label: string;
  score: number;
  overlaps: {
    previous: SuggestionOverlap;
    next: SuggestionOverlap;
  };
  reasons: string[];
  pangrams?: string[];
}

/**
 * Owns no-spoiler game suggestion fetching, rejection, spoilers, and accept flow.
 */
export function useAdminSuggestion({
  csrfToken,
  createPuzzle,
  setStatusMessage,
}: {
  csrfToken: string | null;
  createPuzzle: (
    letters: string[],
    center: string,
    options?: { loadAfterCreate?: boolean },
  ) => Promise<boolean>;
  setStatusMessage: (
    message: string | null,
    type?: 'success' | 'error' | 'warning',
  ) => void;
}) {
  const [suggestion, setSuggestion] = useState<PuzzleSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [declinedSuggestions, setDeclinedSuggestions] = useState<string[]>([]);
  const [pangramSpoilersVisible, setPangramSpoilersVisible] = useState(false);

  const fetchSuggestion = useCallback(
    async (
      declined: string[] = declinedSuggestions,
      includePangrams = false,
    ) => {
      setSuggestionLoading(true);
      setSuggestionError(null);
      const params = new URLSearchParams();
      if (declined.length > 0) {
        params.set('declined', declined.join(','));
      }
      if (includePangrams) {
        params.set('include_pangrams', 'true');
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/admin/suggestion${params.size ? `?${params}` : ''}`,
          {
            credentials: 'same-origin',
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setSuggestion(null);
          setSuggestionError(data.error || 'Ehdotusta ei löytynyt');
          return;
        }
        setSuggestion(data.suggestion);
        setPangramSpoilersVisible(
          includePangrams && Array.isArray(data.suggestion?.pangrams),
        );
      } catch {
        setSuggestion(null);
        setSuggestionError('Yhteysvirhe');
      } finally {
        setSuggestionLoading(false);
      }
    },
    [csrfToken, declinedSuggestions],
  );

  const handleRejectSuggestion = useCallback(async () => {
    if (!suggestion) return;
    const key = `${suggestion.letters_key}:${suggestion.center}`;
    try {
      const res = await fetch(`${API_BASE}/api/admin/suggestion-rejections`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({
          letters: suggestion.letters,
          center: suggestion.center,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestionError(data.error || 'Hylkäys epäonnistui');
        return;
      }

      const nextDeclined = [...declinedSuggestions, key];
      setDeclinedSuggestions(nextDeclined);
      await fetchSuggestion(nextDeclined);
    } catch {
      setSuggestionError('Yhteysvirhe');
    }
  }, [csrfToken, declinedSuggestions, fetchSuggestion, suggestion]);

  const handleTogglePangrams = useCallback(async () => {
    if (!suggestion) return;
    if (suggestion.pangrams) {
      setPangramSpoilersVisible((visible) => !visible);
      return;
    }
    await fetchSuggestion(declinedSuggestions, true);
  }, [declinedSuggestions, fetchSuggestion, suggestion]);

  const handleAcceptSuggestion = useCallback(async () => {
    if (!suggestion) return;
    const created = await createPuzzle(suggestion.letters, suggestion.center, {
      loadAfterCreate: false,
    });
    if (!created) return;
    setSuggestion(null);
    setDeclinedSuggestions([]);
    setPangramSpoilersVisible(false);
    setStatusMessage('Lisätty. Haetaan seuraavaa ehdotusta...', 'success');
    await fetchSuggestion([]);
  }, [createPuzzle, fetchSuggestion, setStatusMessage, suggestion]);

  return {
    suggestion,
    suggestionLoading,
    suggestionError,
    pangramSpoilersVisible,
    fetchSuggestion,
    handleRejectSuggestion,
    handleTogglePangrams,
    handleAcceptSuggestion,
  };
}
