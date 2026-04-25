import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, LogOut, Mail, QrCode, RefreshCw } from 'lucide-react';
import isEmail from 'validator/lib/isEmail';
import { THEME_IDS } from '@sanakenno/shared';
import type { ThemeId } from '@sanakenno/shared';
import { useAuthStore } from '../store/useAuthStore';
import { share } from '../platform';
import { usePaletteStore } from '../store/usePaletteStore';
import {
  useThemePreferenceStore,
  resolveScheme,
} from '../store/useThemePreferenceStore';

/** Mirrors the mobile PALETTE_ORDER for consistent UI across platforms. */
const PALETTE_LABELS: Record<ThemeId, string> = {
  hehku: 'Hehku',
  meri: 'Meri',
  metsa: 'Metsä',
  yo: 'Yö',
  aamu: 'Aamu',
  mono: 'Hiili',
};

/** Accent swatch colour for a palette in the resolved scheme. */
function paletteAccent(id: ThemeId, scheme: 'light' | 'dark'): string {
  const map: Record<ThemeId, { light: string; dark: string }> = {
    hehku: { light: '#ff643e', dark: '#e05030' },
    meri: { light: '#0d9488', dark: '#2dd4bf' },
    metsa: { light: '#15803d', dark: '#22c55e' },
    yo: { light: '#6366f1', dark: '#818cf8' },
    aamu: { light: '#d97706', dark: '#f59e0b' },
    mono: { light: '#111827', dark: '#f3f4f6' },
  };
  return map[id][scheme];
}

function PalettePicker(): React.JSX.Element {
  const themeId = usePaletteStore((s) => s.themeId);
  const setThemeId = usePaletteStore((s) => s.setThemeId);
  const preference = useThemePreferenceStore((s) => s.preference);
  const scheme = resolveScheme(preference);

  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Väriteema
      </p>
      <div className="flex justify-between gap-2">
        {THEME_IDS.map((id) => {
          const isSelected = id === themeId;
          const accent = paletteAccent(id, scheme);
          const isMonoDark = id === 'mono' && scheme === 'dark';
          return (
            <button
              key={id}
              type="button"
              onClick={() => setThemeId(id)}
              aria-label={PALETTE_LABELS[id]}
              aria-pressed={isSelected}
              className="flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-0"
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: accent,
                  border: isSelected
                    ? '2px solid var(--color-text-primary)'
                    : '1px solid var(--color-border)',
                  boxSizing: 'border-box',
                }}
              >
                {isSelected ? (
                  <Check
                    size={16}
                    strokeWidth={3}
                    color={isMonoDark ? '#000' : '#fff'}
                  />
                ) : null}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {PALETTE_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface SyncModalProps {
  show: boolean;
  onClose: () => void;
}

type ViewMode = 'options' | 'email' | 'sent' | 'qr' | 'confirmRotate';

export function SyncModal({
  show,
  onClose,
}: SyncModalProps): React.JSX.Element | null {
  const playerKey = useAuthStore((s) => s.playerKey);
  const isLinked = useAuthStore((s) => s.isLinked);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const [mode, setMode] = useState<ViewMode>('options');
  const [codeInput, setCodeInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const connectUrl = useMemo(() => {
    if (!playerKey) return '';
    return `https://sanakenno.fi/connect?connect=${encodeURIComponent(playerKey)}`;
  }, [playerKey]);

  useEffect(() => {
    if (!show) {
      setMode('options');
      setCodeInput('');
      setEmailInput('');
      useAuthStore.getState().clearError();
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
    const copied = await share.copyToClipboard(text);
    if (!copied) {
      useAuthStore.setState({ error: 'Tekstin kopiointi epäonnistui.' });
    }
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
    await useAuthStore.getState().sendTransferEmail(email);
    if (!useAuthStore.getState().error) setMode('sent');
  }, [emailInput]);

  const handleConfirmRotate = useCallback(async () => {
    await useAuthStore.getState().rotatePlayerKey();
    if (!useAuthStore.getState().error) setMode('options');
  }, []);

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
              Tallenna edistymisesi, tilastosi ja asetuksesi, synkronoi
              halutessasi muille laitteille.
            </p>
            <button
              type="button"
              onClick={() => useAuthStore.getState().revealShareOptions()}
              className="w-full py-2 px-4 rounded-lg cursor-pointer border-none font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-on-accent)',
                opacity: isLoading ? 0.6 : 1,
              }}
              disabled={isLoading}
            >
              Synkronoi muille laitteille
            </button>
            <hr style={{ borderColor: 'var(--color-text-tertiary)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>Lisää koodi:</p>
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
                  color: 'var(--color-on-accent)',
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
            <PalettePicker />
            <hr style={{ borderColor: 'var(--color-text-tertiary)' }} />
            {playerKey ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Avaa Sanakenno toisella laitteella ja käytä alla olevaa linkkiä
                tai koodia.
              </p>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Tältä laitteelta ei vielä löydy pysyvää tunnistetta. Paina
                "Vaihda tunniste" luodaksesi uuden.
              </p>
            )}
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
              onClick={() => void copyText(playerKey ?? '')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              disabled={isLoading || !playerKey}
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
              disabled={isLoading || !playerKey}
            >
              <Mail size={16} />
              Lähetä sähköpostiin
            </button>
            <hr style={{ borderColor: 'var(--color-text-tertiary)' }} />
            <button
              type="button"
              onClick={() => setMode('confirmRotate')}
              className="w-full py-2 px-4 rounded-lg border cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-text-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              disabled={isLoading}
            >
              <RefreshCw size={16} />
              Vaihda tunniste
            </button>
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

        {mode === 'confirmRotate' && (
          <div className="space-y-3">
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Tunnisteen vaihtamisen jälkeen käyttämäsi laitteet pitää
              synkronoida uudelleen uudella tunnisteella. Jatka silti?
            </p>
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
                Peruuta
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRotate()}
                className="w-1/2 py-2 px-4 rounded-lg font-medium cursor-pointer border-none"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                  opacity: isLoading ? 0.6 : 1,
                }}
                disabled={isLoading}
              >
                Vaihda tunniste
              </button>
            </div>
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
                  color: 'var(--color-on-accent)',
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
