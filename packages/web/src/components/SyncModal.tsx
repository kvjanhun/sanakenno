import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, LogOut, Mail, QrCode } from 'lucide-react';
import isEmail from 'validator/lib/isEmail';
import { useAuthStore } from '../store/useAuthStore';

export interface SyncModalProps {
  show: boolean;
  onClose: () => void;
}

type ViewMode = 'options' | 'email' | 'sent' | 'qr';

export function SyncModal({
  show,
  onClose,
}: SyncModalProps): React.JSX.Element | null {
  const transferToken = useAuthStore((s) => s.transferToken);
  const isLinked = useAuthStore((s) => s.isLinked);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const [mode, setMode] = useState<ViewMode>('options');
  const [codeInput, setCodeInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const connectUrl = useMemo(() => {
    if (!transferToken) return '';
    return `https://sanakenno.fi/connect?connect=${encodeURIComponent(transferToken)}`;
  }, [transferToken]);

  useEffect(() => {
    if (!show) {
      setMode('options');
      setCodeInput('');
      setEmailInput('');
      useAuthStore.getState().clearTransferToken();
      return;
    }
    if (isLinked && !transferToken) {
      void useAuthStore.getState().createTransfer();
    }
  }, [show, isLinked, transferToken]);

  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  useEffect(() => {
    if (mode !== 'qr' || !qrCanvasRef.current || !connectUrl) return;
    const draw = async () => {
      const mod = await import('qrcode');
      await mod.toCanvas(qrCanvasRef.current, connectUrl, {
        width: 240,
        margin: 1,
      });
    };
    void draw();
  }, [mode, connectUrl]);

  const copyText = useCallback(async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }, []);

  const handleUseCode = useCallback(async () => {
    const token = codeInput.trim();
    if (!token) return;
    await useAuthStore.getState().useTransfer(token);
    if (!useAuthStore.getState().error) onClose();
  }, [codeInput, onClose]);

  const handleLogout = useCallback(async () => {
    await useAuthStore.getState().logout();
    onClose();
  }, [onClose]);

  const handleSendEmail = useCallback(async () => {
    const email = emailInput.trim();
    if (!isEmail(email)) {
      useAuthStore.setState({ error: 'Tarkista sähköpostiosoite.' });
      return;
    }
    await useAuthStore.getState().createTransfer(email);
    if (!useAuthStore.getState().error) setMode('sent');
  }, [emailInput]);

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Lisää laite</h2>
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

        {mode === 'options' && !isLinked && (
          <div className="space-y-3">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Synkronoi edistymisesi ja tilastosi muille laitteille.
            </p>
            <button
              type="button"
              onClick={() => void useAuthStore.getState().createTransfer()}
              className="w-full py-2 px-4 rounded-lg cursor-pointer border-none font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                opacity: isLoading ? 0.6 : 1,
              }}
              disabled={isLoading}
            >
              Synkronoi muille laitteille
            </button>
            <hr style={{ borderColor: 'var(--color-text-tertiary)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Sinulla on koodi?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  if (error) useAuthStore.setState({ error: null });
                }}
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-text-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => void handleUseCode()}
                className="py-2 px-3 rounded-lg font-medium cursor-pointer border-none"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  opacity: isLoading || !codeInput.trim() ? 0.6 : 1,
                }}
                disabled={isLoading || !codeInput.trim()}
              >
                Yhdistä
              </button>
            </div>
          </div>
        )}

        {mode === 'options' && isLinked && (
          <div className="space-y-3">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Avaa Sanakenno toisella laitteella ja käytä alla olevaa linkkiä
              tai koodia.
            </p>
            <button
              type="button"
              onClick={() => void copyText(connectUrl)}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              disabled={isLoading || !connectUrl}
            >
              <Copy size={16} />
              Kopioi linkki
            </button>
            <button
              type="button"
              onClick={() => void copyText(transferToken ?? '')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              disabled={isLoading || !transferToken}
            >
              <Copy size={16} />
              Kopioi koodi
            </button>
            <button
              type="button"
              onClick={() => setMode('qr')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              disabled={isLoading || !connectUrl}
            >
              <QrCode size={16} />
              Näytä QR-koodi
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              disabled={isLoading}
            >
              <Mail size={16} />
              Lähetä sähköpostiin
            </button>
            <hr style={{ borderColor: 'var(--color-text-tertiary)' }} />
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <LogOut size={16} />
              Kirjaudu ulos
            </button>
          </div>
        )}

        {mode === 'email' && (
          <div className="space-y-3">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Lähetä yhdistyslinkki sähköpostiin.
            </p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Sähköpostiosoitettasi ei tallenneta.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (error) useAuthStore.setState({ error: null });
              }}
              placeholder="sinä@esimerkki.fi"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="w-1/2 py-2 px-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--color-text-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Takaisin
              </button>
              <button
                type="button"
                onClick={() => void handleSendEmail()}
                className="w-1/2 py-2 px-4 rounded-lg font-medium cursor-pointer border-none"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  opacity: isLoading || !emailInput.trim() ? 0.6 : 1,
                }}
                disabled={isLoading || !emailInput.trim()}
              >
                Lähetä
              </button>
            </div>
          </div>
        )}

        {mode === 'sent' && (
          <div className="space-y-3">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Tarkista sähköpostisi.
            </p>
            <button
              type="button"
              onClick={() => setMode('options')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            >
              Takaisin
            </button>
          </div>
        )}

        {mode === 'qr' && (
          <div className="space-y-3 text-center">
            <canvas ref={qrCanvasRef} className="mx-auto rounded" />
            <button
              type="button"
              onClick={() => setMode('options')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            >
              Takaisin
            </button>
          </div>
        )}

        {error && (
          <p
            style={{
              color: '#ef4444',
              fontSize: '0.875rem',
              marginTop: '0.75rem',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
