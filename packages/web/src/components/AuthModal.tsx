/**
 * Player authentication modal.
 *
 * Two states:
 *   1. Email entry form — player enters their email address.
 *   2. "Check your email" — after requestLink() succeeds, shows the email
 *      address and a resend button.
 *
 * When the player is logged in and opens the modal, it shows their email
 * and a logout button.
 *
 * All user-facing strings are in Finnish.
 *
 * @module src/components/AuthModal
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

/** Props for {@link AuthModal}. */
export interface AuthModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * Auth modal component.
 */
export function AuthModal({
  show,
  onClose,
}: AuthModalProps): React.JSX.Element | null {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const email = useAuthStore((s) => s.email);
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const { requestLink, logout } = useAuthStore.getState();

  const [inputEmail, setInputEmail] = useState('');

  useEffect(() => {
    if (!show) {
      setInputEmail('');
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputEmail.trim()) return;
      await requestLink(inputEmail.trim());
    },
    [inputEmail, requestLink],
  );

  const handleResend = useCallback(async () => {
    if (!pendingEmail) return;
    await requestLink(pendingEmail);
  }, [pendingEmail, requestLink]);

  const handleLogout = useCallback(async () => {
    await logout();
    onClose();
  }, [logout, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-xl p-6 max-w-sm w-full mx-4"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {isLoggedIn ? 'Oma tili' : 'Kirjaudu sisään'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-xl"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label="Sulje"
          >
            ×
          </button>
        </div>

        {/* Logged-in view */}
        {isLoggedIn && (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Olet kirjautunut sisään sähköpostilla:
            </p>
            <p className="font-medium">{email}</p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Tilastosi synkronoidaan automaattisesti tällä laitteella.
            </p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            >
              Kirjaudu ulos
            </button>
          </div>
        )}

        {/* Pending email view — magic link sent */}
        {!isLoggedIn && pendingEmail && (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Tarkista sähköpostisi! Lähetimme kirjautumislinkin osoitteeseen:
            </p>
            <p className="font-medium">{pendingEmail}</p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Linkki on voimassa 15 minuuttia. Klikkaa sitä samalla laitteella
              tai avaa se tässä selaimessa.
            </p>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Lähetetään…' : 'Lähetä uudelleen'}
            </button>
          </div>
        )}

        {/* Email entry form */}
        {!isLoggedIn && !pendingEmail && (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Kirjaudu sisään sähköpostilla. Lähetämme sinulle kirjautumislinkin
              — ei salasanaa tarvita.
            </p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Voit aloittaa pelaamisen heti ja kirjautua myöhemmin, jolloin
              kertyneet tilastosi tallentuvat ja siirtyvät muille laitteillesi.
            </p>
            <div>
              <label
                htmlFor="auth-email"
                className="block mb-1 text-sm font-medium"
              >
                Sähköpostiosoite
              </label>
              <input
                id="auth-email"
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="sinä@esimerkki.fi"
                autoComplete="email"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-text-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading || !inputEmail.trim()}
              className="w-full py-2 px-4 rounded-lg font-medium cursor-pointer border-none"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                opacity: isLoading || !inputEmail.trim() ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Lähetetään…' : 'Lähetä kirjautumislinkki'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
