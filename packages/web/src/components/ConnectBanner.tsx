/**
 * Full-screen overlay for account/device connect-token flows.
 *
 * @module src/components/ConnectBanner
 */

import { useEffect, useState } from 'react';
import { animated, useReducedMotion, useTransition } from '@react-spring/web';
import { Copy } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { share } from '../platform';
import { PRESENCE_SPRING } from '../utils/motion';

/** Props for {@link ConnectBanner}. */
export interface ConnectBannerProps {
  /** Current transfer token, or null when the overlay is closed. */
  token: string | null;
  /** Whether the app is running from an installed PWA shell. */
  isStandalone: boolean;
  /** Whether the installed-app instructions view is active. */
  showPwaInstructions: boolean;
  /** Copy a token and show the installed-app instructions. */
  onCopyPwaCode: (token: string) => void | Promise<void>;
  /** Return from the instructions view to the choice view. */
  onBackFromPwaInstructions: () => void;
  /** Close the overlay. */
  onClose: () => void;
}

/**
 * Render the connect-token modal with retained close animation content.
 */
export function ConnectBanner({
  token,
  isStandalone,
  showPwaInstructions,
  onCopyPwaCode,
  onBackFromPwaInstructions,
  onClose,
}: ConnectBannerProps): React.JSX.Element {
  const [displayToken, setDisplayToken] = useState<string | null>(token);
  const [displayPwaInstructions, setDisplayPwaInstructions] =
    useState(showPwaInstructions);
  const prefersReducedMotion = useReducedMotion();
  const show = token !== null;

  useEffect(() => {
    if (!show) return;
    if (token) setDisplayToken(token);
    setDisplayPwaInstructions(showPwaInstructions);
  }, [show, showPwaInstructions, token]);

  const activeToken = show && token ? token : displayToken;
  const transitions = useTransition(show && activeToken !== null, {
    from: { overlayOpacity: 0, panelOpacity: 0, scale: 0.985, y: 8 },
    enter: { overlayOpacity: 1, panelOpacity: 1, scale: 1, y: 0 },
    leave: { overlayOpacity: 0, panelOpacity: 0, scale: 0.985, y: 8 },
    config: PRESENCE_SPRING,
    immediate: prefersReducedMotion === true,
  });

  if (!activeToken) return <>{null}</>;

  return (
    <>
      {transitions((spring, item) =>
        item ? (
          <animated.div
            aria-hidden={!show}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: spring.overlayOpacity.to(
                (opacity) => `rgba(0, 0, 0, ${opacity * 0.5})`,
              ),
              pointerEvents: show ? 'auto' : 'none',
            }}
          >
            <animated.div
              className="rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-xl"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                opacity: spring.panelOpacity,
                scale: spring.scale,
                transformOrigin: '50% 52%',
                y: spring.y,
              }}
            >
              {displayPwaInstructions ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    Yhdistä sovelluksessa
                  </h2>
                  <div
                    className="p-3 rounded-lg text-sm text-center font-medium"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Koodi kopioitu leikepöydälle! 📋
                  </div>
                  <div
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                    }}
                    className="space-y-3"
                  >
                    <p>
                      Avaa laitteellesi asennettu <strong>Sanakenno</strong>{' '}
                      aloitusnäytöltäsi ja toimi seuraavasti:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>
                        Avaa <strong>Asetukset</strong> (rataskuvake ⚙️).
                      </li>
                      <li>
                        Valitse <strong>Tallennus ja synkronointi</strong>.
                      </li>
                      <li>
                        Liitä koodi kohtaan{' '}
                        <strong>
                          &quot;Yhdistä tämä laite olemassa olevaan tiliin&quot;
                        </strong>
                        .
                      </li>
                      <li>
                        Paina <strong>Yhdistä</strong>-painiketta.
                      </li>
                    </ol>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      className="w-full py-2 px-3 rounded-lg border-none font-medium cursor-pointer text-xs flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                      }}
                      onClick={() => void share.copyToClipboard(activeToken)}
                    >
                      <Copy
                        size={14}
                        style={{ color: 'var(--color-accent)' }}
                      />
                      <span>Kopioi koodi uudelleen</span>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="w-1/2 py-2 px-4 rounded-lg border cursor-pointer text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          borderColor: 'var(--color-text-tertiary)',
                          color: 'var(--color-text-primary)',
                        }}
                        onClick={onBackFromPwaInstructions}
                      >
                        Takaisin
                      </button>
                      <button
                        type="button"
                        className="w-1/2 py-2 px-4 rounded-lg font-medium cursor-pointer border-none text-sm"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-on-accent)',
                        }}
                        onClick={onClose}
                      >
                        Valmis
                      </button>
                    </div>
                  </div>
                </div>
              ) : isStandalone ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Yhdistä laite</h2>
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                    }}
                  >
                    Haluatko yhdistää tämän laitteen ja sovelluksen tiliisi?
                  </p>
                  <button
                    type="button"
                    className="w-full py-2 px-4 rounded-lg font-medium cursor-pointer border-none"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'var(--color-on-accent)',
                    }}
                    onClick={() => {
                      onClose();
                      void useAuthStore.getState().useTransfer(activeToken);
                    }}
                  >
                    Yhdistä tähän sovellukseen
                  </button>
                  <button
                    type="button"
                    className="w-full bg-transparent border-none cursor-pointer text-sm"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    onClick={onClose}
                  >
                    Peruuta
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Yhdistä laite</h2>
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                    }}
                  >
                    Miten haluat yhdistää tämän laitteen?
                  </p>
                  <button
                    type="button"
                    className="w-full py-2 px-4 rounded-lg font-medium cursor-pointer border-none"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'var(--color-on-accent)',
                    }}
                    onClick={() => {
                      onClose();
                      void useAuthStore.getState().useTransfer(activeToken);
                    }}
                  >
                    Yhdistä tähän selaimeen
                  </button>
                  <button
                    type="button"
                    className="w-full py-2 px-4 rounded-lg border cursor-pointer font-medium text-sm text-center"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-text-tertiary)',
                      color: 'var(--color-text-primary)',
                    }}
                    onClick={() => void onCopyPwaCode(activeToken)}
                  >
                    Yhdistä asennetussa sovelluksessa (PWA)
                  </button>
                  <div
                    className="pt-3 border-t flex flex-col items-center space-y-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <a
                      href={`sanakenno://auth?connect=${encodeURIComponent(activeToken)}`}
                      style={{
                        color: 'var(--color-text-tertiary)',
                        fontSize: '0.8rem',
                      }}
                      className="underline hover:text-primary"
                      onClick={onClose}
                    >
                      Avaa vanhassa iOS-sovelluksessa
                    </a>
                    <button
                      type="button"
                      className="w-full bg-transparent border-none cursor-pointer text-sm pt-1"
                      style={{ color: 'var(--color-text-tertiary)' }}
                      onClick={onClose}
                    >
                      Peruuta
                    </button>
                  </div>
                </div>
              )}
            </animated.div>
          </animated.div>
        ) : null,
      )}
    </>
  );
}
