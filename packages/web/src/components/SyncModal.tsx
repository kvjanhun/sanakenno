import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, LogOut, Mail, QrCode, RefreshCw } from 'lucide-react';
import isEmail from 'validator/lib/isEmail';
import { useAuthStore } from '../store/useAuthStore';
import { share } from '../platform';
import { ModalShell } from './ModalShell';

export interface SyncModalProps {
  show: boolean;
  onClose: () => void;
}

type ViewMode = 'options' | 'email' | 'sent' | 'qr' | 'confirmRotate';

export function SyncModal({
  show,
  onClose,
}: SyncModalProps): React.JSX.Element {
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

  return (
    <ModalShell
      show={show}
      title="Tallennus ja synkronointi"
      titleId="sync-title"
      onClose={onClose}
      headerClassName="mb-4"
    >
      {mode === 'options' && (
        <div className="space-y-4">
          {isLinked ? (
            <div className="space-y-2">
              <h4
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Yhdistä toinen laite tähän tiliin
              </h4>
              {playerKey ? (
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                  }}
                >
                  Avaa Sanakenno toisella laitteella ja käytä alla olevaa
                  linkkiä tai koodia yhdistääksesi sen. Tämän jälkeen laitteesi
                  synkronoidaan automaattisesti.
                </p>
              ) : (
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                  }}
                >
                  Tältä laitteelta ei vielä löydy pysyvää tunnistetta. Luo uusi
                  painamalla alta &quot;Vaihda tunniste&quot;.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void copyText(connectUrl)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    opacity: isLoading || !connectUrl ? 0.6 : 1,
                  }}
                  disabled={isLoading || !connectUrl}
                >
                  <Copy size={14} style={{ color: 'var(--color-accent)' }} />
                  <span>Kopioi linkki</span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(playerKey ?? '')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    opacity: isLoading || !playerKey ? 0.6 : 1,
                  }}
                  disabled={isLoading || !playerKey}
                >
                  <Copy size={14} style={{ color: 'var(--color-accent)' }} />
                  <span>Kopioi koodi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('qr')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    opacity: isLoading || !connectUrl ? 0.6 : 1,
                  }}
                  disabled={isLoading || !connectUrl}
                >
                  <QrCode size={14} style={{ color: 'var(--color-accent)' }} />
                  <span>Näytä QR-koodi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('email')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    opacity: isLoading || !playerKey ? 0.6 : 1,
                  }}
                  disabled={isLoading || !playerKey}
                >
                  <Mail size={14} style={{ color: 'var(--color-accent)' }} />
                  <span>Sähköposti</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('confirmRotate')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw
                    size={14}
                    style={{ color: 'var(--color-accent)' }}
                  />
                  <span>Vaihda tunniste</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <LogOut size={14} style={{ color: 'var(--color-accent)' }} />
                  <span>Kirjaudu ulos</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Yhdistä tämä laite olemassa olevaan tiliin
                </h4>
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                  }}
                >
                  Syötä toiselta laitteelta saatu koodi yhdistääksesi tämän
                  laitteen siihen.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      if (error) useAuthStore.setState({ error: null });
                    }}
                    placeholder="Syötä koodi tähän"
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
                    className="py-2 px-4 rounded-lg font-medium cursor-pointer border-none"
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

              <div
                className="pt-4 border-t space-y-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                  }}
                >
                  Tai ota synkronointi käyttöön tällä laitteella tallentaaksesi
                  pelitilanteen ja yhdistääksesi muita laitteita tähän tiliin.
                </p>
                <button
                  type="button"
                  onClick={() => useAuthStore.getState().revealShareOptions()}
                  className="w-full py-2 px-4 rounded-lg cursor-pointer border-none font-medium text-xs"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-on-accent)',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                  disabled={isLoading}
                >
                  Ota synkronointi käyttöön tälle laitteelle
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'confirmRotate' && (
        <div className="space-y-3">
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Tunnisteen vaihtamisen jälkeen käyttämäsi laitteet pitää synkronoida
            uudelleen uudella tunnisteella. Jatka silti?
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
            color: 'var(--color-error)',
            fontSize: '0.875rem',
            marginTop: '0.75rem',
          }}
        >
          {error}
        </p>
      )}
    </ModalShell>
  );
}
